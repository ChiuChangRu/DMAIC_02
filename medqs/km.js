
  // =====================================================================
  // 公司 KM／個人知識資料：上傳 .md，問 AI 時先檢索最相關的段落一起送出（只在這個瀏覽器處理）
  // =====================================================================
  const KM_STORE = "mdqs.km.v1", KM_KEEP = "mdqs.km.keep", KM_MAX_STORE = 3500000;
  let kmFiles = [], kmChunks = [], kmDF = {};
  const kmSentBy = {};
  function kmTokens(s) {
    s = String(s || "").toLowerCase();
    const out = [];
    (s.match(/[a-z0-9][a-z0-9.\-+/]*[a-z0-9]|[a-z0-9]/g) || []).forEach(w => { if (w.length >= 2) out.push(w); });
    const cjk = s.replace(/[^㐀-鿿]+/g, " ").split(" ").filter(Boolean);
    cjk.forEach(seg => { if (seg.length === 1) out.push(seg); for (let i = 0; i + 1 < seg.length; i++) out.push(seg.slice(i, i + 2)); });
    return out;
  }
  function kmSplit(name, text) {
    const lines = String(text).replace(/\r/g, "").split("\n"), chunks = [], path = [];
    let buf = [], len = 0;
    const flush = () => { const t = buf.join("\n").trim(); if (t) chunks.push({ file: name, head: path.filter(Boolean).join(" › "), text: t }); buf = []; len = 0; };
    for (const ln of lines) {
      const h = ln.match(/^(#{1,6})\s+(.*)$/);
      if (h) { flush(); const lv = h[1].length; path.length = lv; path[lv - 1] = h[2].trim(); continue; }
      buf.push(ln); len += ln.length;
      if (len > 700 && !ln.trim()) flush();
      else if (len > 1100) flush();
    }
    flush();
    return chunks;
  }
  function kmBuild() {
    kmChunks = []; kmDF = {};
    kmFiles.forEach(f => kmSplit(f.name, f.text).forEach(c => kmChunks.push(c)));
    kmChunks.forEach((c, i) => {
      c.id = i;
      const tf = {}; kmTokens(c.head + " " + c.text).forEach(t => { tf[t] = (tf[t] || 0) + 1; });
      c.tf = tf; c.n = Object.values(tf).reduce((a, b) => a + b, 0) || 1;
      Object.keys(tf).forEach(t => { kmDF[t] = (kmDF[t] || 0) + 1; });
    });
  }
  // 依問題找出最相關的段落（字詞與中文雙字詞的 TF-IDF 分數）；至少要有 2 個不同的詞命中
  function kmSearch(q, k) {
    if (!kmChunks.length) return [];
    const qt = [...new Set(kmTokens(q))], N = kmChunks.length;
    const scored = kmChunks.map(c => {
      let s = 0, hit = 0;
      qt.forEach(t => { const f = c.tf[t]; if (f) { hit++; s += Math.log(1 + N / kmDF[t]) * (1 + Math.log(f)); } });
      return { c, s: s / Math.sqrt(Math.max(30, c.n)), hit };
    }).filter(x => x.hit >= 2 && x.s > 0).sort((a, b) => b.s - a.s);
    return scored.slice(0, k || 6).map(x => x.c);
  }
  function kmBlock(hits) {
    return ["【公司 KM／個人知識資料（使用者上傳的內部文件摘錄，依問題自動檢索）】",
      "使用方式：與問題相關時優先參考，引用時在句尾標註來源編號（例如［KM-2］）；KM 是內部經驗或規定，和一般知識或法規不一致時要明確說明差異；不要把 KM 沒寫的內容說成 KM 寫的；不相關的摘錄直接忽略。",
      ...hits.map((c, i) => `［KM-${i + 1}］${c.file}${c.head ? " › " + c.head : ""}\n${c.text.length > 900 ? c.text.slice(0, 900) + "…" : c.text}`)].join("\n\n");
  }
  function kmActive() { return $("kmChk").checked && kmChunks.length > 0; }
  // 給 ask() 用：回傳要加入的區塊與這次參考的段落（同一段對話已送過的段落不重送）
  function kmForAsk(key, question) {
    if (!kmActive()) return null;
    const extra = key === "fishbone" ? " " + fb.problem : key === "home" ? "" : " " + ((($(({ hyp: "hyp" }[key] || key) + "Problem") || {}).value) || "");
    const sent = kmSentBy[key] = kmSentBy[key] || new Set();
    const hits = kmSearch(question + extra, 6).filter(c => !sent.has(c.id));
    if (!hits.length) return null;
    return { block: kmBlock(hits), hits, commit: () => hits.forEach(c => sent.add(c.id)) };
  }
  function kmResetSent() { Object.keys(kmSentBy).forEach(k => { delete kmSentBy[k]; }); }
  function kmNoteText(hits) { return "已參考 KM：" + hits.map((c, i) => `［KM-${i + 1}］${c.file}${c.head ? " › " + c.head : ""}`).join("；"); }
  function kmRender() {
    const n = kmFiles.length;
    $("kmList").innerHTML = kmFiles.map((f, i) => `<li class="fb-att"><span class="fb-att-kind">MD</span><span class="fb-att-name" title="${esc(f.name)}">${esc(f.name)}</span><span class="fb-att-info">${Math.max(1, Math.round(f.text.length / 1000))} 千字・${kmChunks.filter(c => c.file === f.name).length} 段</span><button type="button" class="fb-del" data-kmx="${i}" aria-label="移除 ${esc(f.name)}">×</button></li>`).join("");
    $("kmInfo").textContent = n ? `已載入 ${n} 個檔案、${kmChunks.length} 段。問 AI 時會自動找出最相關的段落一起送出，並標註來源。` : "";
    if (!n) $("kmChk").checked = false;
  }
  function kmPersist() {
    try {
      if (!$("kmKeep").checked) { localStorage.removeItem(KM_STORE); return; }
      const v = JSON.stringify(kmFiles.map(f => ({ name: f.name, text: f.text })));
      if (v.length > KM_MAX_STORE) { localStorage.removeItem(KM_STORE); $("kmInfo").textContent += " 檔案太大，無法保留到下次（這次仍可使用）。"; return; }
      localStorage.setItem(KM_STORE, v);
    } catch (_) {}
  }
  async function kmAdd(files) {
    for (const f of files) {
      if (!/\.(md|markdown|txt)$/i.test(f.name)) { $("kmInfo").textContent = `「${f.name}」不是 .md 檔，已略過。`; continue; }
      if (f.size > 3000000) { $("kmInfo").textContent = `「${f.name}」超過 3 MB，已略過。`; continue; }
      const text = await f.text();
      kmFiles = kmFiles.filter(x => x.name !== f.name).concat([{ name: f.name, text }]);
    }
    kmBuild(); kmResetSent(); if (kmFiles.length) $("kmChk").checked = true; kmRender(); kmPersist();
  }
  $("kmPick").addEventListener("click", () => $("kmFile").click());
  $("kmFile").addEventListener("change", e => { kmAdd([...e.target.files]); e.target.value = ""; });
  $("kmBox").addEventListener("dragover", e => { e.preventDefault(); $("kmBox").classList.add("over"); });
  $("kmBox").addEventListener("dragleave", () => $("kmBox").classList.remove("over"));
  $("kmBox").addEventListener("drop", e => { e.preventDefault(); $("kmBox").classList.remove("over"); kmAdd([...(e.dataTransfer.files || [])]); });
  $("kmList").addEventListener("click", e => { const b = e.target.closest("[data-kmx]"); if (!b) return; kmFiles.splice(+b.dataset.kmx, 1); kmBuild(); kmResetSent(); kmRender(); kmPersist(); });
  $("kmKeep").addEventListener("change", () => { try { localStorage.setItem(KM_KEEP, $("kmKeep").checked ? "1" : "0"); } catch (_) {} kmPersist(); });
  (() => {
    try {
      $("kmKeep").checked = localStorage.getItem(KM_KEEP) === "1";
      const raw = $("kmKeep").checked ? localStorage.getItem(KM_STORE) : null;
      if (raw) { kmFiles = JSON.parse(raw).filter(f => f && f.name && typeof f.text === "string"); kmBuild(); $("kmChk").checked = kmFiles.length > 0; }
    } catch (_) { kmFiles = []; }
    kmRender();
  })();
