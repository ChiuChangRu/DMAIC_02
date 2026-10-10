  // ---------- fishbone ----------
  const FB_STORE = "mdqs.fishbone.v1";
  const FB_SETS = {
    m6: { name: "6M", cats: ["人員", "機器", "材料", "方法", "環境", "量測"] },
    med: { name: "醫材版", cats: ["設計", "材料", "製程", "滅菌", "包裝", "使用"] }
  };
  const FB_ALIAS = { "man": "人員", "manpower": "人員", "people": "人員", "machine": "機器", "equipment": "機器", "material": "材料", "materials": "材料", "method": "方法", "methods": "方法", "environment": "環境", "mother nature": "環境", "measurement": "量測", "design": "設計", "process": "製程", "sterilization": "滅菌", "packaging": "包裝", "use": "使用", "作業方法": "方法", "製程方法": "方法", "作業人員": "人員", "人": "人員", "人力": "人員", "機": "機器", "設備": "機器", "模具": "機器", "料": "材料", "原料": "材料", "物料": "材料", "法": "方法", "工法": "方法", "環": "環境", "測": "量測", "測量": "量測", "量測系統": "量測", "檢驗": "量測", "製造": "製程", "使用者": "使用", "臨床使用": "使用" };
  // Template causes: [text, 6M category, 醫材版 category, sub-causes]. General causes only — not company data; pending the owner's review.
  const FB_RULES = [
    "你是醫療器材研發與品質部門的品質工程顧問，協助使用者用魚骨圖（特性要因圖）整理問題的可能原因。請用繁體中文回答，絕對不要使用簡體中文。",
    "規則：",
    "1. 依【目前魚骨圖】的問題點與分類回答。使用者已排除的原因不要再建議，除非使用者詢問。",
    "2. 建議新的可能原因時，在回答最後附上 fishbone 區塊（格式見下），分類名稱必須是目前的分類之一。網頁會把它們列為「候選」，由使用者決定是否採用；不要說已經幫使用者加入或採用。",
    "3. 原因要具體、可驗證（可量測或可檢查），避免「人員疏失」這類籠統說法；可以簡短說明怎麼驗證。",
    "4. 區分事實與推論：推論或判斷在句尾加 *。不要編造數據、法規條文或標準編號。",
    "5. 問題點描述不清楚時，先指出缺少什麼（產品、發生時間、比例、規格），再給建議。",
    "6. 回答精簡，使用短段落或條列。使用者質疑時依邏輯重新檢查，不要只是附和。",
    "7. 使用者詢問驗證方式或統計方法時，只推薦【網站工具與模式】中的工具與模式；標示「建置中」的要註明尚未提供，並給目前可用的替代做法。不要做統計計算或編造數字。",
    "fishbone 區塊格式（JSON，放在 ```fishbone 與 ``` 之間，只在有新建議時附上）：",
    "```fishbone",
    '{"problem": "（選填：只有建議改寫問題點時才填）", "factors": [{"cat": "分類名稱", "text": "可能原因", "subs": ["子因子（選填）"]}]}',
    "```"
  ].join("\n");
  const FB_HOME_RULE = [
    "8. 若使用者的問題適合先用魚骨圖整理原因（例如不良、破裂、滅菌失敗、客訴），可在回答最後附上 fishbone 區塊，分類使用 6M：人員、機器、材料、方法、環境、量測。網頁會顯示「帶入魚骨圖」按鈕，帶入後只列為候選，由使用者決定是否採用。格式：",
    "```fishbone",
    '{"problem": "問題點（一句話）", "factors": [{"cat": "6M 分類", "text": "可能原因", "subs": ["子因子（選填）"]}]}',
    "```"
  ].join("\n");
  const ST_LABEL = { cand: "候選", use: "採用", excl: "排除" };
  const SRC_LABEL = { tpl: "範本", ai: "AI", user: "手動", ext: "檢索外部案例" };
  let fbSeq = 0;
  const fid = () => "x" + Date.now().toString(36) + (fbSeq++).toString(36);
  function fbNew() {
    const cats = {};
    for (const k in FB_SETS) cats[k] = FB_SETS[k].cats.map(n => ({ id: fid(), name: n }));
    return { v: 1, problem: "", detail: { prod: "", when: "", rate: "", spec: "" }, set: "m6", cats, factors: [], ext: null };
  }
  let fb = fbNew();
  let fbFilter = "all";
  const fbCats = () => fb.cats[fb.set];
  const normName = s => { s = String(s || "").replace(/[（(].*?[)）]/g, "").replace(/^\d+[.、]\s*/, "").trim(); const k = s.toLowerCase(); return FB_ALIAS[k] || FB_ALIAS[s] || s; };
  const normText = s => String(s || "").replace(/[\s，。、,.;；:：（）()「」]/g, "").toLowerCase();
  function catIdByName(set, name) {
    const n = normName(name); if (!n) return null;
    const cs = fb.cats[set] || [];
    let c = cs.find(c => normName(c.name) === n);
    if (!c) { const raw = String(name || ""); c = cs.find(c => c.name && (raw.includes(c.name) || (n.length >= 2 && c.name.includes(n)))); }
    return c ? c.id : null;
  }
  function fbEmpty() { return !fb.problem.trim() && !fb.factors.length; }
  function fbHasText(t) { const n = normText(t); return fb.factors.some(f => normText(f.text) === n); }
  function fbAddFactor(text, catNames, src, subs, st, ref) {
    text = String(text || "").trim().slice(0, 160);
    if (!text || fbHasText(text)) return null;
    const cat = {};
    for (const k in FB_SETS) cat[k] = catNames && catNames[k] ? catIdByName(k, catNames[k]) : null;
    const f = { id: fid(), text, st: st || (src === "user" ? "use" : "cand"), src, ref: ref ? String(ref).slice(0, 60) : "", key: false, verify: false, reason: "", cat,
      subs: (subs || []).map(s => String(s || "").trim().slice(0, 120)).filter(Boolean).slice(0, 8).map(s => ({ id: fid(), text: s, st: src === "user" ? "use" : "cand", src })) };
    fb.factors.push(f);
    return f;
  }
  function fbApplySug(sug, adopt) {
    let n = 0, un = 0, dup = 0;
    for (const f of sug.factors) {
      const names = {};
      for (const k in FB_SETS) names[k] = f.cat;
      const x = fbAddFactor(f.text, names, f.src === "ext" || f.ref ? "ext" : "ai", f.subs, adopt ? "use" : "cand", f.ref);
      if (!x) { dup++; continue; }
      if (adopt) x.subs.forEach(s => { s.st = "use"; });
      n++; if (!x.cat[fb.set]) un++;
    }
    return { n, un, dup };
  }
  function sugMsg(r, adopt) {
    return `已加入 ${r.n} 個原因（${adopt ? "採用，已畫進魚骨圖" : "列為候選，在 STEP 2「待決定」按「採用」才會畫進魚骨圖"}）` + (r.un ? `；${r.un} 個分類對不上，放在「未分類」` : "") + (r.dup ? `；${r.dup} 個已在清單中，略過` : "") + "。";
  }
  // ---- persistence (this browser only) ----
  let fbSaveT = 0, fbLoaded = false;
  function fbChatState() {
    if (chatKey === "fishbone") return { turns, log: chatLog, lastCtx: chatLastCtx, prefix: chatPrefix };
    const c = chats.fishbone; return c ? { turns: c.turns, log: c.log || [], lastCtx: c.lastCtx || "", prefix: c.prefix || "" } : { turns: [], log: [], lastCtx: "", prefix: "" };
  }
  let fbLastSaved = null;
  function fbSaveNow() {
    try {
      const v = JSON.stringify({ fb, chat: fbChatState() });
      if (v === fbLastSaved) return;          // nothing changed: do not write (avoids sync ping-pong between open copies)
      fbLastSaved = v; localStorage.setItem(FB_STORE, v);
    } catch (_) {}
  }
  function fbSave() { clearTimeout(fbSaveT); fbSaveT = setTimeout(fbSaveNow, 400); }
  function fbValid(o) { return o && typeof o === "object" && o.cats && Array.isArray(o.factors) && typeof o.problem === "string"; }
  function fbRepair(o) {
    const d = fbNew();
    for (const k in FB_SETS) if (!Array.isArray(o.cats[k]) || !o.cats[k].length) o.cats[k] = d.cats[k];
    if (!FB_SETS[o.set]) o.set = "m6";
    if (!o.detail || typeof o.detail !== "object") o.detail = d.detail;
    if (!o.ext || typeof o.ext !== "object") o.ext = null;
    o.factors = o.factors.filter(f => f && typeof f.text === "string").map(f => ({ id: f.id || fid(), ref: typeof f.ref === "string" ? f.ref : "", text: f.text, st: ST_LABEL[f.st] ? f.st : "cand", src: SRC_LABEL[f.src] ? f.src : "user", key: !!f.key, verify: !!f.verify, reason: f.reason || "", cat: f.cat && typeof f.cat === "object" ? f.cat : {},
      subs: (Array.isArray(f.subs) ? f.subs : []).filter(x => x && typeof x.text === "string").map(x => ({ id: x.id || fid(), text: x.text, st: ST_LABEL[x.st] ? x.st : "cand", src: SRC_LABEL[x.src] ? x.src : "user" })) }));
    return o;
  }
  function fbLoadChat(ch) {
    const log = Array.isArray(ch && ch.log) ? ch.log : [], t = Array.isArray(ch && ch.turns) ? ch.turns : [];
    const c = { turns: t, log, lastCtx: (ch && ch.lastCtx) || "", prefix: (ch && ch.prefix) || "", html: logHtml(log, "fishbone") };
    if (chatKey === "fishbone") { chatGen++; turns = c.turns; chatLog = c.log; chatLastCtx = c.lastCtx; chatPrefix = c.prefix; $("msgs").innerHTML = c.html; updateChatControls(); }
    else chats.fishbone = c;
  }
  // 每次開啟頁面都從空白開始；上次的魚骨圖只另存為備份，需要時在魚骨圖分頁按「還原」
  const FB_BACKUP = "mdqs.fishbone.backup";
  let fbBackup = null;
  function fbLoad() {
    try {
      const raw = localStorage.getItem(FB_STORE);
      if (raw) {
        const o = JSON.parse(raw);
        if (o && fbValid(o.fb) && (o.fb.problem.trim() || o.fb.factors.length)) { localStorage.setItem(FB_BACKUP, JSON.stringify({ at: Date.now(), fb: o.fb, chat: o.chat })); }
        localStorage.removeItem(FB_STORE);
      }
      const b = localStorage.getItem(FB_BACKUP);
      fbBackup = b ? JSON.parse(b) : null;
      if (fbBackup && !fbValid(fbBackup.fb)) fbBackup = null;
    } catch (_) { fbBackup = null; }
    fbLoaded = false;
  }
  function fbRestoreLineRender() {
    const el = $("fbRestoreLine"); if (!el) return;
    if (!fbBackup) { el.hidden = true; return; }
    const p = (fbBackup.fb.problem || "").trim(), d = new Date(fbBackup.at || 0);
    el.innerHTML = `上次的魚骨圖已另存備份（${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}${p ? "，問題點：「" + esc(p.slice(0, 30)) + (p.length > 30 ? "…" : "") + "」" : ""}）。<button type="button" class="linkbtn" id="fbRestoreBtn">還原</button>`;
    el.hidden = false;
  }
  function fbRestoreBackup() {
    if (!fbBackup) return;
    const doIt = () => { fb = fbRepair(JSON.parse(JSON.stringify(fbBackup.fb))); fbLoadChat(fbBackup.chat); popClose(); fbRenderEditor(); fbSaveNow(); $("fbRestoreLine").hidden = true; fbNote("已還原上次的魚骨圖。"); };
    if (fbEmpty()) { doIt(); return; }
    fbAsk("還原會取代目前的魚骨圖與魚骨圖的 AI 對話，確定嗎？", [{ label: "還原", primary: true, fn: doIt }, { label: "取消" }]);
  }
  // ---- confirm banner (no browser dialogs inside the artifact frame) ----
  function fbAsk(msg, actions, tone) {
    const box = $("fbBanner");
    box.classList.toggle("danger", tone === "danger");
    box.innerHTML = `<p>${esc(msg)}</p><div class="run-row">${actions.map((a, i) => `<button type="button" class="btn small${a.primary ? " primary" : ""}" data-i="${i}">${esc(a.label)}</button>`).join("")}</div>`;
    box.hidden = false;
    box.onclick = e => { const b = e.target.closest("[data-i]"); if (!b) return; box.hidden = true; box.onclick = null; const a = actions[+b.dataset.i]; a.fn && a.fn(); };
    box.scrollIntoView({ block: "nearest" });
  }
  function fbNote(msg) { $("fbMsg").textContent = msg; clearTimeout(fbNote.t); fbNote.t = setTimeout(() => { $("fbMsg").textContent = ""; }, 6000); }
  function fbReset() { fb = fbNew(); fbFilter = "all"; }
  // ---- render: editor ----
  function catOptions(cur, withBlank) {
    return (withBlank ? `<option value="">未分類（請指定）</option>` : "") + fbCats().map(c => `<option value="${c.id}"${c.id === cur ? " selected" : ""}>${esc(c.name)}</option>`).join("");
  }
  const delBtn = (act, extra) => `<button type="button" class="fb-del" data-act="${act}"${extra || ""}>刪除</button>`;
  function candHtml(f) {
    const cur = f.cat[fb.set], subs = f.subs.filter(x => x.st !== "excl");
    return `<li class="fb-f st-cand" data-f="${f.id}">
      <div class="fb-f-main"><input type="text" class="fb-f-text" data-act="text" value="${esc(f.text)}" aria-label="原因"><span class="fb-src src-${f.src}">${SRC_LABEL[f.src] || ""}</span>${f.ref ? `<span class="fb-catname">出處：${esc(f.ref)}</span>` : ""}</div>
      ${subs.length ? `<p class="fb-subline">子因子：${subs.map(x => esc(x.text)).join("、")}</p>` : ""}
      <div class="fb-tools"><select data-act="move" aria-label="分類">${catOptions(cur, !cur)}</select>
        <button type="button" class="btn small primary" data-act="fst" data-st="use">採用</button>
        <button type="button" class="btn small" data-act="fst" data-st="excl">排除</button>
        <button type="button" class="fb-tlink" data-act="ask">問 AI</button>${delBtn("del")}</div>
    </li>`;
  }
  function exclHtml(f) {
    return `<li class="fb-f st-excl" data-f="${f.id}">
      <div class="fb-f-main"><span class="fb-x-text">${esc(f.text)}</span><span class="fb-catname">${esc(fbCatName(f))}</span><span class="fb-src src-${f.src}">${SRC_LABEL[f.src] || ""}</span></div>
      <input type="text" class="fb-reason${f.reason.trim() ? "" : " empty"}" data-act="reason" value="${esc(f.reason)}" placeholder="排除理由（建議填寫，例如：已確認模溫紀錄正常）" aria-label="排除理由">
      <div class="fb-tools"><button type="button" class="btn small" data-act="fst" data-st="use">恢復採用</button><button type="button" class="fb-tlink" data-act="fst" data-st="cand">改回候選</button>${delBtn("del")}</div>
    </li>`;
  }
  function subRow(f, x) {
    return `<li class="fb-f st-${x.st}" data-f="${f.id}" data-s="${x.id}">
      <div class="fb-f-main"><span class="fb-x-text">${esc(x.text)}</span><span class="fb-catname">子因子 · ${esc(f.text)}</span></div>
      <div class="fb-tools">${x.st === "cand" ? `<button type="button" class="btn small primary" data-act="sst" data-st="use">採用</button><button type="button" class="btn small" data-act="sst" data-st="excl">排除</button>` : `<button type="button" class="btn small" data-act="sst" data-st="use">恢復採用</button>`}${delBtn("sdel")}</div>
    </li>`;
  }
  function fbRenderEditor() {
    $("fbProblem").value = fb.problem;
    ["prod", "when", "rate", "spec"].forEach(k => { $("fb_" + k).value = fb.detail[k] || ""; });
    setChip("fbSet", fb.set);
    const ids = new Set(fbCats().map(c => c.id));
    const cand = fb.factors.filter(f => f.st === "cand"), excl = fb.factors.filter(f => f.st === "excl");
    const un = fb.factors.filter(f => f.st === "use" && !ids.has(f.cat[fb.set]));
    const subC = [], subX = [];
    fb.factors.filter(f => f.st === "use").forEach(f => f.subs.forEach(x => { if (x.st === "cand") subC.push(subRow(f, x)); else if (x.st === "excl") subX.push(subRow(f, x)); }));
    let h = "";
    if (un.length) h += `<section class="fb-group fb-un"><h3>需要指定分類（${un.length}）</h3><p class="hint">這些原因已採用，但在目前的分類方式中沒有分類，所以沒畫在圖上。</p><ul class="fb-list">${un.map(f => `<li class="fb-f st-use" data-f="${f.id}"><div class="fb-f-main"><span class="fb-x-text">${esc(f.text)}</span></div><div class="fb-tools"><select data-act="move" aria-label="分類">${catOptions("", true)}</select>${delBtn("del")}</div></li>`).join("")}</ul></section>`;
    h += `<section class="fb-group"><h3>待決定（${cand.length + subC.length}）</h3>${cand.length + subC.length ? `<ul class="fb-list">${cand.map(candHtml).join("")}${subC.join("")}</ul>` : `<p class="hint">沒有待決定的原因。AI 建議的原因會先出現在這裡。</p>`}</section>`;
    h += `<section class="fb-group"><h3>已排除（${excl.length + subX.length}）</h3>${excl.length + subX.length ? `<ul class="fb-list">${excl.map(exclHtml).join("")}${subX.join("")}</ul>` : `<p class="hint">還沒有排除的原因。排除的原因與理由會保留在這裡，也會列入原因清單與匯出檔。</p>`}</section>`;
    $("fbCats").innerHTML = h;
    try { renderExtBoxes(); } catch (_) {}
    fbRenderOut();
  }
  // ---- render: diagram ----
  const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  function wrapText(t, max) {
    const cwOf = ch => /[⺀-￿]/.test(ch) ? 1 : 0.55;
    const total = [...String(t)].reduce((a, ch) => a + cwOf(ch), 0);
    if (total > max) max = Math.min(max, total / Math.ceil(total / max) + 1.2);
    const out = []; let line = "", w = 0;
    for (const ch of String(t)) {
      const cw = /[⺀-￿]/.test(ch) ? 1 : 0.55;
      if (w + cw > max && line && !/[）)】」』，。、；：！？,.;:!?%]/.test(ch)) { let carry = "";
        if (/[A-Za-z0-9]/.test(ch) && /[A-Za-z0-9]$/.test(line)) { const m = line.match(/[A-Za-z0-9.\-]+$/); if (m && m[0].length < line.length && m[0].length <= 12) { carry = m[0]; line = line.slice(0, -m[0].length); } }
        while (line.length > 1 && /[（(【「『]$/.test(line)) { carry = line.slice(-1) + carry; line = line.slice(0, -1); } out.push(line.trimEnd()); line = carry; w = [...carry].reduce((a, c) => a + cwOf(c), 0); if (ch === " ") continue; }
      line += ch; w += cw;
    }
    if (line) out.push(line);
    return out.length ? out : [""];
  }
  function fbDiagram(edit) {
    const at = (k, v) => edit ? ` data-${k}="${v}" class="fb-hit"` : "";
    const cats = fbCats();
    const items = cats.map(c => fb.factors.filter(f => f.cat[fb.set] === c.id && f.st === "use").map(f => ({ f, lines: wrapText((f.key ? "★ " : "") + (f.verify ? "◇ " : "") + f.text, 12.5), subs: f.subs.filter(s => s.st === "use").map(s => wrapText(s.text, 12.5)), sobj: f.subs.filter(s => s.st === "use") })));
    const RH = 22, GAP = 10, TW = 200, n = cats.length;
    const rowsOf = list => list.reduce((a, it) => a + it.lines.length + it.subs.reduce((b, s) => b + s.length, 0), 0);
    const hItems = list => rowsOf(list) * RH + Math.max(0, list.length - 1) * GAP;
    if (!n) return "";
    const top = [], bot = [];
    cats.forEach((c, i) => (i % 2 ? bot : top).push(i));
    const hOf = idx => Math.max(110, ...idx.map(i => hItems(items[i]) + 64));
    const Ht = hOf(top), Hb = bot.length ? hOf(bot) : 60, Hm = Math.max(Ht, Hb);
    const K = Math.min(0.42, 100 / Hm);
    const cols = Math.ceil(n / 2), colW = TW + 30 + Hm * K, L = 16;
    const spineY = 54 + Ht;
    const bx = c => L + TW + 14 + c * colW;
    const lastEnd = bx(cols - 1) + Hm * K;
    const headX = lastEnd + 36;
    const pLines = wrapText(fb.problem.trim() || "（尚未填寫問題點）", 9.5).slice(0, 10);
    const headH = Math.max(72, pLines.length * 27 + 30), headW = 240;
    const W = headX + headW + 16, Hh = spineY + Hb + 52;
    let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${Math.max(Hh, spineY + headH / 2 + 16)}" width="${W}" height="${Math.max(Hh, spineY + headH / 2 + 16)}" style="max-width:${W}px" role="img" aria-label="魚骨圖：${esc(fb.problem)}" font-family="var(--font-body)">`;
    s += `<rect width="100%" height="100%" fill="var(--surface)"/>`;
    s += `<line x1="${L}" y1="${spineY}" x2="${headX}" y2="${spineY}" stroke="var(--ink)" stroke-width="3"/>`;
    s += `<path d="M${headX - 14} ${spineY - 8} L${headX} ${spineY} L${headX - 14} ${spineY + 8} Z" fill="var(--ink)"/>`;
    s += `<g${at("head", 1)}><rect x="${headX}" y="${spineY - headH / 2}" width="${headW}" height="${headH}" rx="10" fill="var(--copper-soft)" stroke="var(--copper)" stroke-width="2"/>`;
    pLines.forEach((t, i) => { s += `<text x="${headX + headW / 2}" y="${spineY - (pLines.length - 1) * 13.5 + i * 27 + 7}" text-anchor="middle" font-size="19" font-weight="700" fill="var(--ink)">${esc(t)}</text>`; });
    s += "</g>";
    const bone = (i, isTop) => {
      const c = cats[i], col = Math.floor(i / 2), H = isTop ? Ht : Hb, x0 = bx(col);
      const yEnd = isTop ? spineY - H : spineY + H;
      const xAt = y => x0 + (isTop ? y - yEnd : yEnd - y) * K;
      s += `<line x1="${x0}" y1="${yEnd}" x2="${xAt(spineY)}" y2="${spineY}" stroke="var(--teal)" stroke-width="2.5"/>`;
      const lab = c.name, lw = Math.max(80, [...lab].reduce((a, ch) => a + (/[⺀-￿]/.test(ch) ? 19 : 11), 0) + 34);
      const ly = isTop ? yEnd - 40 : yEnd + 4;
      s += `<g${at("cat", c.id)}><rect x="${x0 - lw / 2}" y="${ly}" width="${lw}" height="36" rx="18" fill="var(--teal-soft)" stroke="var(--teal)" stroke-width="2"/><text x="${x0}" y="${ly + 25}" text-anchor="middle" font-size="18" font-weight="700" fill="var(--ink)">${esc(lab)}</text></g>`;
      let y = isTop ? yEnd + 36 : spineY + 32;
      for (const it of items[i]) {
        it.lines.forEach((t, j) => {
          const xb = xAt(y);
          if (j === 0) s += `<line x1="${xb - 9}" y1="${y - 5}" x2="${xb}" y2="${y - 5}" stroke="var(--teal)" stroke-width="1.5"/>`;
          s += `<text${at("f", it.f.id)} x="${xb - 12}" y="${y}" text-anchor="end" font-size="15" ${it.f.key ? 'font-weight="700" fill="var(--copper-text)"' : 'fill="var(--ink)"'}>${esc(t)}<title>${esc(it.f.text)}</title></text>`;
          y += RH;
        });
        it.subs.forEach((sl, si) => sl.forEach((t, j) => {
          const xb = xAt(y);
          s += `<text${at("f", it.f.id)}${edit ? ` data-s="${it.sobj[si].id}"` : ""} x="${xb - 24}" y="${y}" text-anchor="end" font-size="13.5" fill="var(--muted)">${j === 0 ? "· " : ""}${esc(t)}</text>`;
          y += RH;
        }));
        y += GAP;
      }
    };
    top.forEach(i => bone(i, true));
    bot.forEach(i => bone(i, false));
    return s + "</svg>";
  }
  function fbRows() {
    const R = [], cats = fbCats(), ids = new Set(cats.map(c => c.id));
    const push = (cname, f) => {
      R.push([cname, f.text, "原因", ST_LABEL[f.st], SRC_LABEL[f.src] + (f.ref ? "（" + f.ref + "）" : ""), [f.key ? "重要" : "", f.verify ? "待驗證" : ""].filter(Boolean).join("、"), f.st === "excl" ? f.reason : ""]);
      f.subs.forEach(s => R.push([cname, s.text, "子因子（" + f.text + "）", ST_LABEL[s.st], SRC_LABEL[s.src], "", ""]));
    };
    cats.forEach(c => fb.factors.filter(f => f.cat[fb.set] === c.id).forEach(f => push(c.name, f)));
    fb.factors.filter(f => !ids.has(f.cat[fb.set])).forEach(f => push("未分類", f));
    return R;
  }
  const FB_HEAD = ["分類", "原因", "層級", "狀態", "來源", "標記", "排除理由"];
  function fbRenderOut() {
    const n = st => fb.factors.filter(f => f.st === st).length;
    $("fbCounts").textContent = `採用 ${n("use")} · 候選 ${n("cand")} · 排除 ${n("excl")}`;
    $("fbSvg").innerHTML = fbView === "list" ? fbListView() : fbDiagram(true);
    const rows = fbRows();
    $("fbTable").innerHTML = `<thead><tr>${FB_HEAD.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>` +
      (rows.length ? rows.map(r => `<tr class="${r[3] === "排除" ? "fb-row-excl" : r[3] === "候選" ? "fb-row-cand" : ""}">${r.map(c => `<td>${esc(c)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="7" class="hint">還沒有原因。可以請 AI 建議，或在各分類直接新增。</td></tr>`) + "</tbody>";
    fbRenderVerify();
    const nc = fb.factors.filter(f => f.st === "cand").length;
    $("fbCandBar").hidden = !nc;
    $("fbCandN").textContent = nc;
    $("fbClearTpl").hidden = !fb.factors.some(f => f.st === "cand" && f.src === "tpl");
    fbSave();
  }
  function fbCatName(f) { const c = fbCats().find(c => c.id === f.cat[fb.set]); return c ? c.name : "未分類"; }
  function fbRenderVerify() {
    const ver = fb.factors.filter(f => f.verify && f.st !== "excl");
    const keys = fb.factors.filter(f => f.key && !f.verify && f.st === "use");
    const row = (f, tag) => `<tr><td>${esc(fbCatName(f))}</td><td>${esc(f.text)}</td><td>${tag}</td></tr>`;
    const tools = `<p class="help">驗證工具：<button type="button" class="linkbtn" data-go="sample" data-sub="power">樣本數規劃</button>（先決定要測幾個）、<button type="button" class="linkbtn" data-go="msa">MSA</button>（量測系統是否可信）、<button type="button" class="linkbtn" data-go="hypothesis" data-sub="compare">假設檢定</button>（條件改變前後是否不同）、<button type="button" class="linkbtn" data-go="spc">SPC</button>（製程是否穩定）、<button type="button" class="linkbtn" data-go="doe">DOE</button>（哪些參數有影響）、<button type="button" class="linkbtn" data-go="taguchi">田口方法</button>（讓產品對雜音不敏感）。</p>`;
    const row2 = (f, tag) => `<tr><td>${esc(fbCatName(f))}</td><td>${esc(f.text)}</td><td>${tag}</td><td><button type="button" class="linkbtn" data-pkfb="hyp" data-fid="${f.id}">→ 假設檢定比較</button></td></tr>`;
    const meas = ver.concat(keys).some(f => /量測|測量|量具|檢測|Measure/i.test(fbCatName(f)));
    const carry = `<div class="run-row fb-carry"><span class="group-label">帶入統計工具的確認區：</span><button type="button" class="btn small" data-pkfb="doe">→ DOE</button><button type="button" class="btn small" data-pkfb="taguchi">→ 田口方法</button><button type="button" class="btn small" data-pkfb="spc">→ SPC 分層欄位</button></div><p class="hint">帶入的是上表的原因名稱，到確認區後可改成因子名稱（例如「封口溫度不足」→「封口溫度 (°C)」）；水準、數量等數字要自己填。${meas ? "" : ""}</p>${meas ? `<p class="note warn">有「量測」相關的原因：建議先做 <button type="button" class="linkbtn" data-go="msa">MSA</button>，確認量測系統可信，再用量測數據驗證其他原因*。</p>` : ""}`;
    $("fbVerify").innerHTML = (ver.length || keys.length)
      ? `<div class="scroll-x"><table><thead><tr><th>分類</th><th>原因</th><th>標記</th><th></th></tr></thead><tbody>${ver.map(f => row2(f, "◇ 待驗證" + (f.key ? "、★ 重要" : ""))).join("")}${keys.map(f => row2(f, "★ 重要（未標待驗證）")).join("")}</tbody></table></div>${carry}${tools}`
      : `<p class="hint">還沒有標記「◇ 待驗證」的原因。在 STEP 2 的原因下方按「◇ 待驗證」即可加入。</p>${tools}`;
  }
  function fbToolsText() {
    const T = typeof TOOLS !== "undefined" ? TOOLS : [];
    return ["【網站工具與模式】"].concat(T.map(t => `- ${t.name}（${t.status === "ready" ? "可使用" : "建置中"}）：${t.desc}${t.modes ? "；模式：" + t.modes.join("、") : ""}`)).join("\n");
  }
  let fbView = "diagram";
  try { fbView = localStorage.getItem("mdqs.fbview") || (window.matchMedia("(max-width: 600px)").matches ? "list" : "diagram"); } catch (_) {}
  function fbListView() {
    const mark = f => (f.key ? "★ " : "") + (f.verify ? "◇ " : "");
    return `<div class="fb-lv"><button type="button" class="fb-lv-head" data-head="1"><span class="hint">問題點</span>${esc(fb.problem.trim() || "（尚未填寫問題點）")}</button>` +
      fbCats().map(c => { const fs = fb.factors.filter(f => f.cat[fb.set] === c.id && f.st === "use");
        return `<section class="fb-lv-cat"><button type="button" class="fb-lv-catname" data-cat="${c.id}">${esc(c.name)} <span>＋</span></button>${fs.length ? `<ul>${fs.map(f => `<li><button type="button" class="fb-lv-f${f.key ? " key" : ""}" data-f="${f.id}">${mark(f)}${esc(f.text)}</button>${f.subs.some(x => x.st === "use") ? `<ul>${f.subs.filter(x => x.st === "use").map(x => `<li><button type="button" class="fb-lv-s" data-f="${f.id}" data-s="${x.id}">${esc(x.text)}</button></li>`).join("")}</ul>` : ""}</li>`).join("")}</ul>` : `<p class="hint">（尚無採用的原因，點分類名稱新增）</p>`}</section>`; }).join("") + "</div>";
  }
  chipGroup("fbView", v => { fbView = v; try { localStorage.setItem("mdqs.fbview", v); } catch (_) {} popClose(); $("fbZoom").hidden = v === "list"; fbRenderOut(); });
  setChip("fbView", fbView); $("fbZoom").hidden = fbView === "list";
  // ---- edit directly on the diagram ----
  let pop = null;
  function popClose() { $("fbPop").hidden = true; pop = null; }
  function popOpen(target, html, init) {
    const box = $("fbPop"), host = $("fbSvgWrap").getBoundingClientRect(), r = target.getBoundingClientRect();
    box.innerHTML = html; box.hidden = false;
    const w = Math.min(340, host.width - 16);
    box.style.width = w + "px";
    box.style.left = Math.max(8, Math.min(host.width - w - 8, r.left - host.left + r.width / 2 - w / 2)) + "px";
    box.style.top = (r.bottom - host.top + 8) + "px";
    init && init(box);
    const f = box.querySelector("input, textarea"); if (f) { f.focus(); if (f.select) f.select(); }
  }
  const segHtml = st => `<span class="fb-seg" role="group" aria-label="狀態">${["cand", "use", "excl"].map(x => `<button type="button" data-pst="${x}" aria-pressed="${st === x}">${ST_LABEL[x]}</button>`).join("")}</span>`;
  function popFactorHtml(f, sub) {
    const o = sub || f;
    if (sub) return `<label class="fb-pop-lab">子因子（屬於：${esc(f.text)}）</label><input type="text" data-p="text" value="${esc(o.text)}">
      <div class="fb-pop-row">${segHtml(o.st)}</div>
      <div class="fb-pop-row"><button type="button" class="fb-del" data-p="del">刪除</button><button type="button" class="btn small primary" data-p="done">完成</button></div>`;
    return `<label class="fb-pop-lab">原因</label><input type="text" data-p="text" value="${esc(o.text)}">
      <div class="fb-pop-row">${segHtml(o.st)}<button type="button" class="fb-tgl" data-p="key" aria-pressed="${f.key}">★ 重要</button><button type="button" class="fb-tgl" data-p="verify" aria-pressed="${f.verify}">◇ 待驗證</button></div>
      <div class="fb-pop-reason"${f.st === "excl" ? "" : " hidden"}><label class="fb-pop-lab">排除理由（建議填寫）</label><input type="text" data-p="reason" value="${esc(f.reason)}" placeholder="例如：已確認模溫紀錄正常"><p class="hint" style="margin:0">已排除：圖上不再顯示，原因與理由保留在「已排除」。</p></div>
      <div class="fb-pop-row"><label class="fb-pop-lab" for="fbPopMove">分類</label><select id="fbPopMove" data-p="move">${catOptions(f.cat[fb.set], !f.cat[fb.set])}</select></div>
      <div class="fb-pop-row"><input type="text" data-p="newsub" placeholder="新增子因子，按 Enter"><button type="button" class="btn small" data-p="addsub">加入</button></div>
      <div class="fb-pop-row"><span><button type="button" class="fb-tlink" data-p="ask">問 AI</button> · <button type="button" class="fb-del" data-p="del">刪除</button></span><button type="button" class="btn small primary" data-p="done">完成</button></div>`;
  }
  $("fbSvg").addEventListener("click", e => {
    const el = e.target.closest("[data-f], [data-cat], [data-head]"); if (!el) { popClose(); return; }
    if (el.dataset.head) {
      pop = { kind: "head" };
      popOpen(el, `<label class="fb-pop-lab">問題點</label><textarea data-p="text" rows="3">${esc(fb.problem)}</textarea><div class="fb-pop-row"><span class="hint">修改會同步到 STEP 1</span><button type="button" class="btn small primary" data-p="done">完成</button></div>`);
    } else if (el.dataset.cat) {
      const c = fbCats().find(c => c.id === el.dataset.cat); if (!c) return;
      pop = { kind: "cat", c };
      popOpen(el, `<label class="fb-pop-lab">分類名稱</label><input type="text" data-p="text" value="${esc(c.name)}"><label class="fb-pop-lab">在這個分類新增原因</label><div class="fb-pop-row"><input type="text" data-p="new" placeholder="輸入後按 Enter"><button type="button" class="btn small" data-p="add">加入</button></div><p class="hint" style="margin:0">新增的原因直接畫進圖中。</p><div class="fb-pop-row"><span><button type="button" class="fb-tlink" data-p="catai">請 AI 補充這個分類</button> · <button type="button" class="fb-del" data-p="catdel">刪除這個分類</button></span><button type="button" class="btn small primary" data-p="done">完成</button></div>`);
    } else {
      const f = fb.factors.find(x => x.id === el.dataset.f); if (!f) return;
      const sub = el.dataset.s ? f.subs.find(x => x.id === el.dataset.s) : null;
      pop = { kind: sub ? "sub" : "f", f, sub };
      popOpen(el, popFactorHtml(f, sub));
    }
  });
  $("fbPop").addEventListener("input", e => {
    if (!pop) return;
    const v = e.target.value, k = e.target.dataset.p;
    if (k === "reason" && pop.f) { pop.f.reason = v; fbRenderEditor(); return; }
    if (k !== "text") return;
    if (pop.kind === "head") fb.problem = v;
    else if (pop.kind === "cat") pop.c.name = v;
    else (pop.sub || pop.f).text = v;
    fbRenderEditor();
  });
  $("fbPop").addEventListener("change", e => {
    if (!pop || e.target.dataset.p !== "move" || !e.target.value) return;
    pop.f.cat[fb.set] = e.target.value; fbRenderEditor(); fbNote(`已移到「${fbCatName(pop.f)}」。`);
  });
  function popAdd() {
    const inp = $("fbPop").querySelector('[data-p="new"]'), t = inp.value.trim(); if (!t) return;
    if (fbHasText(t)) { inp.setCustomValidity("這個原因已經在清單裡"); inp.reportValidity(); inp.setCustomValidity(""); return; }
    const f = fbAddFactor(t, null, "user"); f.cat[fb.set] = pop.c.id; inp.value = ""; fbRenderEditor(); inp.focus();
  }
  function popAddSub() {
    const inp = $("fbPop").querySelector('[data-p="newsub"]'), t = inp.value.trim(); if (!t || !pop.f) return;
    pop.f.subs.push({ id: fid(), text: t.slice(0, 120), st: "use", src: "user" }); inp.value = ""; fbRenderEditor(); inp.focus(); fbNote(`已新增子因子「${t}」。`);
  }
  $("fbPop").addEventListener("keydown", e => {
    if (e.key === "Escape") { popClose(); return; }
    if (e.key === "Enter" && e.target.tagName === "INPUT") { e.preventDefault(); const k = e.target.dataset.p; if (k === "new") popAdd(); else if (k === "newsub") popAddSub(); else popClose(); }
  });
  function armDelete(b, label) {
    if (b.dataset.armed) return true;
    b.dataset.armed = "1"; b.textContent = label || "確定刪除？再按一次（刪除後無法恢復；要保留紀錄請改用「排除」）";
    setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "刪除"; } }, 5000);
    return false;
  }
  $("fbPop").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b || !pop) return;
    const o = pop.sub || pop.f;
    if (b.dataset.p === "done") popClose();
    else if (b.dataset.p === "add") popAdd();
    else if (b.dataset.p === "addsub") popAddSub();
    else if (b.dataset.p === "ask") openPanel({ label: "原因", quote: pop.f.text });
    else if (b.dataset.p === "catai") { const c = pop.c; popClose(); fbAskAI(`請針對「${c.name}」這個分類，補充可能的原因（避免和目前已列出的重複），用 fishbone 區塊列出。`, { label: "分類", quote: c.name }); }
    else if (b.dataset.p === "catdel") {
      const c = pop.c, n = fb.factors.filter(f => f.cat[fb.set] === c.id).length;
      if (n && !b.dataset.ok) { b.dataset.ok = "1"; b.textContent = `確定刪除？${n} 個原因會移到「需要指定分類」，再按一次`; return; }
      fb.cats[fb.set] = fbCats().filter(x => x.id !== c.id);
      popClose(); fbRenderEditor(); fbNote(`已刪除分類「${c.name}」${n ? `，其中 ${n} 個原因請重新指定分類` : ""}。`);
    }
    else if (b.dataset.pst) {
      o.st = b.dataset.pst;
      if (!pop.sub && o.st === "use") o.subs.forEach(x => { if (x.st === "cand") x.st = "use"; });
      fbRenderEditor();
      b.parentElement.querySelectorAll("[data-pst]").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
      const r = $("fbPop").querySelector(".fb-pop-reason");
      if (r) { r.hidden = o.st !== "excl"; if (o.st === "excl") r.querySelector("input").focus(); }
      if (o.st === "cand") fbNote(`「${o.text}」改為候選，移到「待決定」。`);
      else if (o.st === "excl" && pop.sub) fbNote(`子因子「${o.text}」已排除，保留在「已排除」。`);
    }
    else if (b.dataset.p === "key" || b.dataset.p === "verify") { pop.f[b.dataset.p] = !pop.f[b.dataset.p]; b.setAttribute("aria-pressed", String(pop.f[b.dataset.p])); fbRenderEditor(); }
    else if (b.dataset.p === "del") {
      if (!armDelete(b)) return;
      if (pop.sub) pop.f.subs = pop.f.subs.filter(x => x !== pop.sub); else fb.factors = fb.factors.filter(x => x !== pop.f);
      fbNote(`已刪除「${o.text}」。`); popClose(); fbRenderEditor();
    }
  });
  document.addEventListener("pointerdown", e => { if (pop && !e.target.closest("#fbPop") && !e.target.closest("#fbSvg")) popClose(); });
  // ---- editor events ----
  const fbSetChip = chipGroup("fbSet", v => { fb.set = v; fbRenderEditor(); });
  $("fbProblem").addEventListener("input", () => { fb.problem = $("fbProblem").value; fbRenderOut(); });
  ["prod", "when", "rate", "spec"].forEach(k => $("fb_" + k).addEventListener("input", () => { fb.detail[k] = $("fb_" + k).value; fbSave(); }));
  const findF = el => { const li = el.closest("[data-f]"); return li ? fb.factors.find(f => f.id === li.dataset.f) : null; };
  $("fbCats").addEventListener("input", e => {
    const t = e.target, act = t.dataset.act, f = findF(t);
    if (act === "text" && f) { f.text = t.value; fbRenderOut(); }
    else if (act === "reason" && f) { f.reason = t.value; t.classList.toggle("empty", !t.value.trim()); fbRenderOut(); }
  });
  $("fbCats").addEventListener("change", e => {
    const t = e.target;
    if (t.dataset.act === "move" && t.value) { const f = findF(t); if (f) { f.cat[fb.set] = t.value; fbRenderEditor(); fbNote(`「${f.text}」分類改為「${fbCatName(f)}」。`); } }
  });
  $("fbCats").addEventListener("click", e => {
    const b = e.target.closest("button[data-act]"); if (!b) return;
    const act = b.dataset.act, f = findF(b);
    const sid = b.closest("[data-s]") && b.closest("[data-s]").dataset.s;
    if (act === "fst" && f) {
      f.st = b.dataset.st;
      if (f.st === "use") f.subs.forEach(x => { if (x.st === "cand") x.st = "use"; });
      fbRenderEditor();
      if (f.st === "use") fbNote(f.cat[fb.set] ? `「${f.text}」已採用，畫進魚骨圖（${fbCatName(f)}）。` : `「${f.text}」已採用，請指定分類。`);
      else if (f.st === "excl") { fbNote(`「${f.text}」已排除，建議填寫排除理由。`); const inp = $("fbCats").querySelector(`[data-f="${f.id}"]:not([data-s]) .fb-reason`); if (inp) inp.focus(); }
      else fbNote(`「${f.text}」改回候選。`);
    }
    else if (act === "sst" && f) { const x = f.subs.find(y => y.id === sid); if (x) { x.st = b.dataset.st; fbRenderEditor(); } }
    else if (act === "sdel" && f) { if (!armDelete(b)) return; f.subs = f.subs.filter(y => y.id !== sid); fbRenderEditor(); }
    else if (act === "del" && f) { if (!armDelete(b)) return; fb.factors = fb.factors.filter(x => x !== f); fbRenderEditor(); fbNote(`已刪除「${f.text}」。`); }
    else if (act === "ask" && f) openPanel({ label: "原因", quote: f.text });
  });
  $("fbAddCat").addEventListener("click", () => {
    const c = { id: fid(), name: "新分類" }; fbCats().push(c); fbRenderEditor();
    const el = $("fbSvg").querySelector(`[data-cat="${c.id}"]`); if (el) el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  });
  $("fbClearTpl").addEventListener("click", () => {
    const n = fb.factors.filter(f => f.st === "cand" && f.src === "tpl").length; if (!n) return;
    fbAsk(`要刪除 ${n} 個舊版範本帶入、還沒決定的候選原因嗎？AI 建議、手動加入、已採用與已排除的都不受影響。`, [{ label: "刪除範本候選", primary: true, fn: () => { fb.factors = fb.factors.filter(f => !(f.st === "cand" && f.src === "tpl")); fbRenderEditor(); fbNote(`已刪除 ${n} 個範本候選。`); } }, { label: "取消" }]);
  });
  $("fbAllUse").addEventListener("click", () => { let n = 0; fb.factors.forEach(f => { if (f.st === "cand") { f.st = "use"; n++; f.subs.forEach(x => { if (x.st === "cand") x.st = "use"; }); } }); fbRenderEditor(); fbNote(n ? `已把 ${n} 個候選改為採用。` : "沒有候選原因。"); });
  $("fbClearCand").addEventListener("click", () => {
    const n = fb.factors.filter(f => f.st === "cand").length; if (!n) { fbNote("沒有候選原因。"); return; }
    fbAsk(`要刪除全部 ${n} 個候選原因嗎？已採用和已排除的不受影響。`, [{ label: "刪除候選", primary: true, fn: () => { fb.factors = fb.factors.filter(f => f.st !== "cand"); fbRenderEditor(); } }, { label: "取消" }]);
  });
  $("fbPlanAI").addEventListener("click", () => fbAskAI("請針對標記「待驗證」的原因（沒有的話，針對已採用的原因，重要的優先）逐一建議：怎麼驗證（實驗或檢查方式）、要收集什麼資料、用本網站哪個工具與模式分析，以及樣本數用哪個工具估算。用條列，精簡。這次不需要 fishbone 區塊。", { label: "驗證規劃", quote: "" }));
  $("fbCheckProblem").addEventListener("click", () => fbAskAI("請檢查目前的問題點描述是否具體、可量測：缺少哪些資訊（產品、發生時間、比例、規格）？需要的話，用 fishbone 區塊的 problem 欄位建議改寫（factors 可以是空陣列）。", { label: "問題點", quote: fb.problem.slice(0, 60) }));
  function fbAskAI(q, ctx, o) {
    openPanel(ctx || undefined);
    if (!sample) return;
    if (busy) { fbNote("AI 正在回答上一個問題。"); return; }
    setCtx(null); ask(q, o);
  }
  // ---- suggestions from AI ----
  function fbSplit(text, final) {
    const i = text.indexOf("```fishbone");
    if (i < 0) return { clean: text, sug: null };
    const j = text.indexOf("```", i + 11);
    if (j < 0) return { clean: text.slice(0, i), sug: null };
    const clean = text.slice(0, i) + text.slice(j + 3);
    if (!final) return { clean, sug: null };
    try {
      const o = JSON.parse(text.slice(i + 11, j));
      const factors = (Array.isArray(o.factors) ? o.factors : []).filter(f => f && typeof f.text === "string" && f.text.trim()).slice(0, 40)
        .map(f => ({ cat: String(f.cat || ""), text: f.text.trim().slice(0, 160), subs: Array.isArray(f.subs) ? f.subs.filter(x => typeof x === "string").slice(0, 8) : [], src: f.src === "ext" ? "ext" : "", ref: typeof f.ref === "string" ? f.ref : "" }));
      const problem = typeof o.problem === "string" && !/選填/.test(o.problem) ? o.problem.trim().slice(0, 200) : "";
      return { clean, sug: factors.length || problem ? { problem, factors } : null };
    } catch (_) { return { clean, sug: null }; }
  }
  function sugButton(sug, key) {
    if (!sug) return "";
    const n = sug.factors.length, data = esc(JSON.stringify(sug));
    if (key === "home") return `<div class="fb-sug">${n ? `<details class="sug-peek" open><summary>AI 建議的 ${n} 個原因</summary><ul>${sug.factors.map(f => `<li><span class="sug-cat">${esc(f.cat || "未分類")}</span>${esc(f.text)}</li>`).join("")}</ul></details>` : ""}<button class="btn small primary" type="button" data-sug="${data}" data-mode="cand">帶入魚骨圖${n ? `（${n} 項候選）` : ""}</button></div>`;
    if (!n) return `<div class="fb-sug"><button class="btn small primary" type="button" data-sug="${data}" data-mode="cand">查看建議的問題點</button></div>`;
    // 列出每個原因（依分類），可勾選後再加入；已在魚骨圖的不勾
    const groups = []; sug.factors.forEach((f, i) => { const c = f.cat || "未分類"; let g = groups.find(x => x[0] === c); if (!g) groups.push(g = [c, []]); g[1].push([f, i]); });
    const rows = groups.map(([c, fs]) => `<div class="sug-grp"><div class="sug-cat">${esc(c)}</div>${fs.map(([f, i]) => { const dup = fbHasText(f.text); return `<label class="sug-item${dup ? " dup" : ""}"><input type="checkbox" data-k="${i}"${dup ? " disabled" : " checked"}><span class="sug-text">${esc(f.text)}${f.subs && f.subs.length ? `<small>子因子：${esc(f.subs.join("、"))}</small>` : ""}${dup ? `<small class="sug-dup">已在魚骨圖</small>` : ""}</span><button type="button" class="linkbtn sug-ask" data-askf="${esc(f.text)}">問 AI</button></label>`; }).join("")}</div>`).join("");
    if (sug.factors.every(f => fbHasText(f.text))) return `<div class="fb-sug fb-sug-list"><p class="hint">AI 建議的 ${n} 個原因都已經在魚骨圖中（候選在 STEP 2「待決定」），不用再加入。</p>${rows}</div>`;
    return `<div class="fb-sug fb-sug-list"><p class="hint">AI 建議 ${n} 個原因（推論，請確認是否適用）。取消勾選不適用的，再按下方按鈕：</p>${rows}
      <div class="run-row"><button class="btn small primary" type="button" data-sug="${data}" data-mode="cand">勾選的加入候選</button><button class="btn small" type="button" data-sug="${data}" data-mode="use">勾選的直接採用</button><button class="linkbtn" type="button" data-sugall="1">全選／全不選</button></div></div>`;
  }
  function fbTakeSug(sug, adopt) {
    const r = fbApplySug(sug, adopt);
    fbRenderEditor();
    if (sug.factors.length) fbNote(sugMsg(r, adopt));
    if (sug.problem && sug.problem !== fb.problem.trim()) {
      fbAsk(`AI 建議把問題點改為：「${sug.problem}」`, [{ label: "採用這個寫法", primary: true, fn: () => { fb.problem = sug.problem; fbRenderEditor(); } }, { label: "維持原本的" }]);
    }
  }
  function homeTranscript(homeLog) {
    const recent = homeLog.slice(-20);
    return "【使用者先前在定義問題與 AI 的對話（最近 " + Math.ceil(recent.length / 2) + " 輪）】\n" + recent.map(m => (m.role === "user" ? "使用者：" : "AI：") + fbSplit(m.text, false).clean.trim()).join("\n");
  }
  function carryToFishbone(sug, homeLog) {
    const lastQ = ([...homeLog].reverse().find(m => m.role === "user") || {}).text || "";
    const doCarry = keepChat => {
      if (!keepChat) resetChat();
      if (homeAtt.items.length && !fbAtt.items.length) { fbAtt.items = homeAtt.items.map(a => Object.assign({}, a, { sent: false })); fbAtt.render(); }
      chatPrefix = homeTranscript(homeLog);
      appendLog([{ role: "note", text: "以下延續自定義問題的對話" }, ...homeLog.map(m => Object.assign({}, m, { carried: true })), { role: "note", text: "定義問題對話到此。可以按「請 AI 先追問細節」讓 AI 補齊問題點，或直接提問。" }]);
      updateChatControls(); fbSaveNow(); openPanel();
    };
    const apply = replaceProblem => {
      if (replaceProblem || !fb.problem.trim()) fb.problem = (sug.problem || lastQ).slice(0, 200);
      if (homeExt) fb.ext = homeExt;
      const r = fbApplySug(sug, false); fbRenderEditor();
      fbNote("已從定義問題帶入問題點與對話（可直接修改）。" + (sug.factors.length ? sugMsg(r, false) : ""));
    };
    if (fbEmpty()) { apply(true); doCarry(false); return; }
    fbAsk(`要從定義問題帶入問題點${sug.factors.length ? `、${sug.factors.length} 個候選原因` : ""}與對話嗎？目前的魚骨圖已有內容：`, [
      { label: "另開新的魚骨圖", primary: true, fn: () => { fbReset(); apply(true); doCarry(false); } },
      { label: "加入目前的魚骨圖（問題點不變）", fn: () => { apply(false); doCarry(true); } },
      { label: "不要帶入" }
    ]);
  }
  // ---- carry the overview question into tools ----
  let homeVer = 0, homeSug = null;
  const carried = {};
  const toolProblems = {};
  function homeLogNow() { return (chatKey === "home" ? chatLog : (chats.home && chats.home.log) || []).filter(m => m.role !== "note"); }
  function lastHomeQ(log) { return ([...log].reverse().find(m => m.role === "user") || {}).text || ""; }
  function onHomeAnswer(text) {
    homeVer++;
    homeSug = fbSplit(text, true).sug;
  }
  function setChatPrefix(key, text) {
    if (chatKey === key) chatPrefix = text;
    else { chats[key] = chats[key] || { turns: [], html: "", log: [] }; chats[key].prefix = text; }
  }
  function autoCarry(name) {
    if (!homeVer || carried[name] === homeVer) return;
    const log = homeLogNow(); if (!log.length) return;
    carried[name] = homeVer;
    const q = lastHomeQ(log);
    if (name === "fishbone") { carryToFishbone(homeSug || { problem: "", factors: [] }, log); return; }
    if (name === "hypothesis") {
      const box = $("hypProblem");
      if (!box.value.trim() || box.dataset.auto === box.value) { box.value = q; box.dataset.auto = q; $("hypProblemSrc").textContent = "從定義問題帶入，可直接修改"; }
      else { $("hypProblemSrc").innerHTML = `定義問題有新的問題：「${esc(q.slice(0, 40))}${q.length > 40 ? "…" : ""}」 <button type="button" class="linkbtn" id="hypProblemTake">改用這個</button>`; }
      setChatPrefix("hyp", homeTranscript(log));
      return;
    }
    if (name === "spc" || name === "msa" || name === "doe" || name === "taguchi" || name === "sample") { carryProblem(name, q, log); return; }
    toolProblems[name] = q;
  }
  function fbCarryFromButton(sug) { homeSug = sug; carried.fishbone = -1; route("fishbone"); }
  $("msgs").addEventListener("click", e => {
    const g = e.target.closest("[data-goto]");
    if (g) { if (chatKey === "home") closePanel(); gotoTool(g.dataset.goto, g.dataset.sub); return; }
    const qa = e.target.closest("[data-askf]");
    if (qa) { e.preventDefault(); fbAskAI(`請說明「${qa.dataset.askf}」為什麼可能是這個問題的原因：依據是什麼（推論請標 *）、在什麼條件下才成立、要怎麼驗證？這次不需要 fishbone 區塊。`, { label: "AI 建議的原因", quote: qa.dataset.askf }); return; }
    const all = e.target.closest("[data-sugall]");
    if (all) { const cbs = [...all.closest(".fb-sug").querySelectorAll("input[data-k]:not(:disabled)")]; const on = cbs.some(c => !c.checked); cbs.forEach(c => { c.checked = on; }); return; }
    const b = e.target.closest("[data-sug]"); if (!b || b.disabled) return;
    let sug; try { sug = JSON.parse(b.dataset.sug); } catch (_) { return; }
    const box = b.closest(".fb-sug"), adopt = b.dataset.mode === "use";
    const cbs = box.querySelectorAll("input[data-k]");
    if (cbs.length) {
      const pick = new Set([...cbs].filter(c => c.checked && !c.disabled).map(c => +c.dataset.k));
      if (!pick.size && !sug.problem) { box.insertAdjacentHTML("beforeend", `<p class="hint">沒有勾選任何原因。</p>`); return; }
      sug = Object.assign({}, sug, { factors: sug.factors.filter((_, i) => pick.has(i)) });
      cbs.forEach(c => { c.disabled = true; });
    }
    box.querySelectorAll("button[data-sug], button[data-sugall]").forEach(x => { x.disabled = true; });
    if (chatKey === "home") { b.textContent = "已帶入"; fbCarryFromButton(sug); return; }
    const before = fb.factors.length;
    fbTakeSug(sug, adopt);
    const r = { n: fb.factors.length - before };
    box.insertAdjacentHTML("beforeend", `<p class="hint">${esc($("fbMsg").textContent || (r.n ? "已加入。" : "這些原因都已經在清單裡。"))}</p>`);
  });
  function fbContext() {
    const d = fb.detail, L = ["【目前魚骨圖】", "問題點：" + (fb.problem.trim() || "（尚未填寫）")];
    const det = [["產品／批號", d.prod], ["發生時間", d.when], ["不良率或件數", d.rate], ["不符合的規格", d.spec]].filter(x => x[1] && x[1].trim()).map(x => x[0] + "：" + x[1].trim());
    if (det.length) L.push("補充：" + det.join("；"));
    L.push(`分類方式：${FB_SETS[fb.set] ? FB_SETS[fb.set].name : ""}（${fbCats().map(c => c.name).join("、")}）`);
    const fx = f => f.text + (f.key ? "［重要］" : "") + (f.verify ? "［待驗證］" : "") + (f.subs.length ? "（子因子：" + f.subs.map(s => s.text + (s.st !== "use" ? "／" + ST_LABEL[s.st] : "")).join("、") + "）" : "");
    const ids = new Set(fbCats().map(c => c.id));
    const groups = fbCats().map(c => [c.name, fb.factors.filter(f => f.cat[fb.set] === c.id)]);
    const un = fb.factors.filter(f => !ids.has(f.cat[fb.set])); if (un.length) groups.push(["未分類", un]);
    groups.forEach(([name, fs]) => {
      const part = st => fs.filter(f => f.st === st);
      const seg = [];
      if (part("use").length) seg.push("採用：" + part("use").map(fx).join("、"));
      const cAI = part("cand").filter(f => f.src !== "tpl"), cT = part("cand").filter(f => f.src === "tpl");
      if (cAI.length) seg.push("候選（尚未決定）：" + cAI.map(fx).join("、"));
      if (cT.length) seg.push("範本候選（通用清單，尚未確認是否適用本問題，不可視為已知原因）：" + cT.map(fx).join("、"));
      if (part("excl").length) seg.push("排除：" + part("excl").map(f => f.text + (f.reason ? `（理由：${f.reason}）` : "")).join("、"));
      L.push(`- ${name}：${seg.length ? seg.join("；") : "（無）"}`);
    });
    if (fb.ext) L.push("", extText(fb.ext));
    return L.join("\n");
  }
  // ---- export / import ----
  let downloads = null;
  // 不在 claude.ai 中（例如 GitHub Pages）時，用一般瀏覽器下載
  const plainDownloads = { save: async ({ filename, data }) => { const blob = data instanceof Blob ? data : new Blob([data], { type: "application/octet-stream" }); const u = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = u; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 4000); } };
  (async () => { try { downloads = window.claude && window.claude.use ? await window.claude.use("downloads") : plainDownloads; } catch (_) { downloads = null; } $("fbDl").hidden = !downloads; $("fbNoDl").hidden = !!downloads; })();
  const fbName = ext => `魚骨圖_${(fb.problem.trim() || "未命名").replace(/[\\/:*?"<>|\s]+/g, "_").slice(0, 24)}_${new Date().toISOString().slice(0, 10)}.${ext}`;
  async function fbSaveFile(filename, data) {
    if (!downloads) { fbNote("這個檢視無法下載檔案。"); return; }
    try { await downloads.save({ filename, data }); }
    catch (e) { if (e && e.code !== "declined") fbNote(e && e.code === "rate_limited" ? "已有下載確認視窗開啟，請稍候。" : "無法下載檔案。"); }
  }
  function fbResolvedSvg() {
    let svg = fbDiagram(); if (!svg) return "";
    const font = cssVar("--font-body");
    svg = svg.replace(/var\((--[a-z0-9-]+)\)/g, (m, n) => n === "--font-body" ? font.replace(/"/g, "'") : cssVar(n));
    return svg;
  }
  $("fbPng").addEventListener("click", () => {
    const svg = fbResolvedSvg(); if (!svg) return;
    const img = new Image();
    img.onload = () => {
      const sc = 2, cv = document.createElement("canvas");
      cv.width = img.width * sc; cv.height = img.height * sc;
      const g = cv.getContext("2d"); g.scale(sc, sc); g.drawImage(img, 0, 0);
      cv.toBlob(b => b ? fbSaveFile(fbName("png"), b) : fbNote("無法產生圖片。"), "image/png");
    };
    img.onerror = () => fbNote("無法產生圖片，請改下載 SVG。");
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
  $("fbSvgDl").addEventListener("click", () => { const svg = fbResolvedSvg(); if (svg) fbSaveFile(fbName("svg"), '<?xml version="1.0" encoding="UTF-8"?>\n' + svg); });
  const csvCell = v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  $("fbCsv").addEventListener("click", () => fbSaveFile(fbName("csv"), "﻿" + [FB_HEAD, ...fbRows()].map(r => r.map(c => csvCell(String(c))).join(",")).join("\r\n")));
  $("fbCopy").addEventListener("click", async () => {
    const tsv = [FB_HEAD, ...fbRows()].map(r => r.map(c => String(c).replace(/[\t\n]/g, " ")).join("\t")).join("\n");
    try { await navigator.clipboard.writeText(tsv); fbNote("已複製，可直接貼到 Excel 或 Word。"); }
    catch (_) { const ta = $("fbCopyBox"); ta.hidden = false; ta.value = tsv; ta.focus(); ta.select(); fbNote("瀏覽器不允許自動複製，已選取下方文字，請按 Ctrl+C。"); }
  });
  $("fbExport").addEventListener("click", () => fbSaveFile(fbName("json"), JSON.stringify({ app: "醫材品質統計工作台", kind: "fishbone", v: 1, savedAt: new Date().toISOString(), fb, chat: fbChatState() }, null, 1)));
  $("fbImportBtn").addEventListener("click", () => $("fbFile").click());
  $("fbFile").addEventListener("change", async () => {
    const file = $("fbFile").files[0]; $("fbFile").value = ""; if (!file) return;
    let o; try { o = JSON.parse(await file.text()); } catch (_) { fbNote("檔案格式不正確。"); return; }
    if (!o || o.kind !== "fishbone" || !fbValid(o.fb)) { fbNote("這不是本工具匯出的魚骨圖檔案。"); return; }
    const go = () => { if (busy && ctl) ctl.abort(); fb = fbRepair(o.fb); fbFilter = "all"; fbLoadChat(o.chat); fbRenderEditor(); fbSaveNow(); fbNote(`已匯入「${file.name}」。`); };
    if (fbEmpty()) go();
    else fbAsk("匯入會取代目前的魚骨圖與對話。需要保留的話，請先按「匯出檔案」。", [{ label: "取代", primary: true, fn: go }, { label: "取消" }]);
  });
  // 開始新問題：清除所有和「問題」有關的內容（定義問題、魚骨圖、各工具的問題描述與 AI 對話、外部案例、附件），
  // 避免上一個問題的資料殘留；各工具已輸入的數據與計算結果不動。keepQ：保留首頁輸入框的文字與尚未送出的附件
  function newProblemReset(keepQ) {
    const steps = [
      () => { if (busy && ctl) ctl.abort(); }, popClose, fbReset, () => fbLoadChat(null), () => fbAtt.clear(),
      () => { Object.keys(chats).forEach(k => { delete chats[k]; }); Object.keys(styleSent).forEach(k => { delete styleSent[k]; }); resetChat(); },
      () => { homeVer = 0; homeSug = null; Object.keys(carried).forEach(k => { delete carried[k]; }); Object.keys(toolProblems).forEach(k => { delete toolProblems[k]; }); },
      () => { homeExt = null; $("extOut").hidden = true; $("extOutBody").innerHTML = ""; $("kmOut").hidden = true; kmResetSent(); },
      () => { if (keepQ) { homeAtt.items = homeAtt.items.filter(a => !a.sent); homeAtt.render(); } else { homeAtt.clear(); $("homeQ").value = ""; } },
      () => ["hyp", "spc", "msa", "doe", "taguchi", "sample"].forEach(k => { const bx = $(k + "Problem"), sr = $(k + "ProblemSrc"); if (bx) { bx.value = ""; bx.dataset.auto = ""; } if (sr) sr.textContent = ""; }),
      () => setRecommend(null), () => { $("homeChoice").hidden = true; $("fbBanner").hidden = true; }
    ];
    for (const f of steps) { try { f(); } catch (e) { console.warn("reset", e); } }
    if (!fbEmpty()) fb = fbNew();
    fbLoaded = false;
    try { fbRenderEditor(); } catch (e) { console.warn("reset render", e); }
    fbSaveNow();
  }
  function fbWipe() {
    newProblemReset(false);
    fbNote("已全部清除（定義問題、魚骨圖、各工具的問題描述與 AI 對話、外部案例與附件），可以開始新的問題。");
    try { window.scrollTo(0, $("viewFishbone").offsetTop); } catch (_) {}
  }
  // 重新開啟頁面時還原了上次的魚骨圖：第一次進魚骨圖時提醒
  function fbRestoreNotice() {
    fbRestoreLineRender(); fbLoaded = false; return;
    fbLoaded = false;
    const p = fb.problem.trim();
    fbAsk(`這是上次留下的魚骨圖${p ? `（問題點：「${p.slice(0, 40)}${p.length > 40 ? "…" : ""}」）` : ""}。要繼續使用，還是清除後開始新問題？`, [{ label: "繼續使用", primary: true }, { label: "清除，開始新問題", fn: fbWipe }]);
  }
  function fbClearAll() {
    if (fbEmpty() && !fbChatState().log.length && !fbAtt.items.length && !(chats.home && chats.home.turns && chats.home.turns.length)) { fbWipe(); return; }
    fbAsk("還沒清除：請按「確定全部清除」。會清除問題點、所有原因（含已排除）、附件、外部案例，以及定義問題、魚骨圖與各工具的問題描述和 AI 對話；清除後 AI 不會再看到之前的內容。各工具已輸入的數據不受影響。需要保留魚骨圖的話，請先到下方按「匯出檔案」。", [{ label: "確定全部清除", primary: true, fn: fbWipe }, { label: "取消" }], "danger");
  }
  $("fbNewBtn").addEventListener("click", fbClearAll);
  $("fbClearAll").addEventListener("click", fbClearAll);
  window.addEventListener("pagehide", fbSaveNow);
  document.addEventListener("click", e => { if (e.target.closest("#fbRestoreBtn")) fbRestoreBackup(); });
  // ---- attachments: photos, Word, PDF, text (read in this browser, sent to the viewer's own Claude) ----
  const PDFJS = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/";
  const ATT_TEXT_MAX = 60000, PDF_PAGE_MAX = 40, IMG_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  let imgLimits = null, attSeq = 0;
  async function attInitLimits() {
    try { imgLimits = sample && sample.limits ? ((await sample.limits()) || {}).images || null : null; } catch (_) { imgLimits = null; }
    attRender();
  }
  function loadScript(src) {
    return new Promise((ok, bad) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => bad(new Error("load")); document.head.appendChild(s); });
  }
  let pdfP = null;
  function pdfLib() {
    if (!pdfP) pdfP = (async () => {
      if (!window.pdfjsWorker) await loadScript(PDFJS + "pdf.worker.min.js");
      if (!window.pdfjsLib) await loadScript(PDFJS + "pdf.min.js");
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS + "pdf.worker.min.js";
      return window.pdfjsLib;
    })().catch(e => { pdfP = null; throw e; });
    return pdfP;
  }
  const canvasBlob = (cv, q) => new Promise(r => cv.toBlob(r, "image/jpeg", q || 0.85));
  async function renderPage(pg) {
    const v0 = pg.getViewport({ scale: 1 }), sc = Math.min(2.5, 1600 / Math.max(v0.width, v0.height));
    const vp = pg.getViewport({ scale: sc }), cv = document.createElement("canvas");
    cv.width = Math.round(vp.width); cv.height = Math.round(vp.height);
    const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height);
    await pg.render({ canvasContext: g, viewport: vp }).promise;
    return canvasBlob(cv);
  }
  async function readPdf(a, file) {
    let lib;
    try { lib = await pdfLib(); } catch (_) { throw new Error("無法載入 PDF 讀取程式（需要連到 cdnjs.cloudflare.com）。"); }
    let doc;
    try { doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, disableFontFace: true, cMapUrl: PDFJS + "cmaps/", cMapPacked: true, standardFontDataUrl: PDFJS + "standard_fonts/" }).promise; }
    catch (e) { throw new Error(e && e.name === "PasswordException" ? "PDF 有密碼保護，請先解除。" : "無法讀取這個 PDF。"); }
    a.doc = doc;
    const n = Math.min(doc.numPages, PDF_PAGE_MAX), out = [];
    let scanned = 0;
    for (let i = 1; i <= n; i++) {
      const pg = await doc.getPage(i);
      const tc = await pg.getTextContent();
      const t = tc.items.map(x => x.str + (x.hasEOL ? "\n" : "")).join("").replace(/[ \t]+\n/g, "\n").trim();
      if (t.replace(/\s/g, "").length >= 8) out.push(`【第 ${i} 頁】\n${t}`);
      else {
        scanned++;
        if (a.images.length < 6) { const b = await renderPage(pg); if (b) { a.images.push(b); a.imgNames.push(`${file.name} 第 ${i} 頁`); a.pagesDone.push(i); } }
      }
    }
    a.text = out.join("\n\n");
    a.info = `${doc.numPages} 頁` + (doc.numPages > n ? `（只讀前 ${n} 頁）` : "") + (scanned ? `，${scanned} 頁沒有文字（掃描頁）` + (a.images.length ? `，轉成 ${a.images.length} 張圖片` : "") : "");
  }
  async function unzip(buf) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf), dec = new TextDecoder();
    let e = -1;
    for (let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error("zip");
    const n = dv.getUint16(e + 10, true), files = {};
    let p = dv.getUint32(e + 16, true);
    for (let k = 0; k < n && dv.getUint32(p, true) === 0x02014b50; k++) {
      const nl = dv.getUint16(p + 28, true);
      files[dec.decode(u8.subarray(p + 46, p + 46 + nl))] = { method: dv.getUint16(p + 10, true), csize: dv.getUint32(p + 20, true), lo: dv.getUint32(p + 42, true) };
      p += 46 + nl + dv.getUint16(p + 30, true) + dv.getUint16(p + 32, true);
    }
    return {
      names: Object.keys(files),
      async get(name) {
        const f = files[name]; if (!f) return null;
        const start = f.lo + 30 + dv.getUint16(f.lo + 26, true) + dv.getUint16(f.lo + 28, true);
        const data = u8.slice(start, start + f.csize);
        if (f.method === 0) return data;
        if (f.method !== 8 || typeof DecompressionStream === "undefined") throw new Error("inflate");
        return new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer());
      }
    };
  }
  async function readDocx(a, file) {
    let z, xml;
    try { z = await unzip(await file.arrayBuffer()); xml = await z.get("word/document.xml"); } catch (_) { xml = null; }
    if (!xml) throw new Error("無法讀取這個 Word 檔（請確認是 .docx；舊版 .doc 請另存為 .docx）。");
    const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const d = new DOMParser().parseFromString(new TextDecoder().decode(xml), "application/xml");
    const paraText = p => { let t = ""; p.querySelectorAll("*").forEach(n => { if (n.namespaceURI !== W) return; if (n.localName === "t") t += n.textContent; else if (n.localName === "tab") t += "\t"; else if (n.localName === "br" || n.localName === "cr") t += "\n"; }); return t; };
    const lines = [], body = d.getElementsByTagNameNS(W, "body")[0];
    const walk = el => {
      for (const n of el.children) {
        if (n.namespaceURI !== W) continue;
        if (n.localName === "p") { const t = paraText(n).trim(); if (t) lines.push(t); }
        else if (n.localName === "tbl") {
          for (const tr of n.children) if (tr.localName === "tr") lines.push("| " + [...tr.children].filter(c => c.localName === "tc").map(tc => [...tc.children].filter(x => x.localName === "p").map(paraText).join(" ").trim()).join(" | ") + " |");
        } else if (n.localName === "sdt" || n.localName === "sdtContent") walk(n);
      }
    };
    if (body) walk(body);
    a.text = lines.join("\n");
    const media = z.names.filter(nm => /^word\/media\/.+\.(png|jpe?g|gif|webp)$/i.test(nm));
    for (const nm of media) {
      if (a.images.length >= 4) break;
      const u = await z.get(nm).catch(() => null);
      if (!u || u.length < 12000) continue;
      const ext = nm.split(".").pop().toLowerCase();
      a.images.push(new Blob([u], { type: ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "image/" + ext }));
      a.imgNames.push(`${file.name} 內的圖片 ${a.images.length}`);
    }
    a.info = `${a.text.length.toLocaleString()} 字` + (media.length ? `，內含 ${media.length} 張圖片` + (a.images.length ? `（送出 ${a.images.length} 張較大的）` : "（都太小，不送出）") : "");
  }
  const KIND = { image: "照片", pdf: "PDF", docx: "Word", text: "文字" };
  function makeAttBox(cfg) {
    const box = { items: [], cfg };
    box.render = () => {
      $(cfg.list).innerHTML = box.items.map(a => `<li class="fb-att st-${a.status}" data-a="${a.id}"><span class="fb-att-kind">${KIND[a.kind] || "?"}</span><span class="fb-att-name" title="${esc(a.name)}">${esc(a.name)}</span><span class="fb-att-info">${a.status === "reading" ? "讀取中…" : a.status === "err" ? esc(a.err) : esc(a.info) + (a.sent ? "（已送給 AI）" : "")}</span><button type="button" class="fb-del" data-x="${a.id}" aria-label="移除 ${esc(a.name)}">×</button></li>`).join("");
      const ok = box.items.filter(a => a.status === "ok"), nImg = ok.reduce((n, a) => n + a.images.length, 0);
      const reading = box.items.some(a => a.status === "reading");
      if (cfg.ask) $(cfg.ask).disabled = !ok.length || reading || !sample || busy;
      const notes = [];
      if (nImg && !imgLimits) notes.push("這個檢視無法把圖片傳給 AI，只會送出文字內容。");
      else if (imgLimits && nImg > imgLimits.maxCount) notes.push(`共 ${nImg} 張圖片，每次最多送 ${imgLimits.maxCount} 張，會依清單順序送前 ${imgLimits.maxCount} 張。`);
      if (box.items.length && !sample && aiChecked) notes.push("目前無法使用 AI（需要在 claude.ai 開啟本頁並登入）。");
      $(cfg.note).textContent = notes.join(" "); $(cfg.note).hidden = !notes.length;
      cfg.onChange && cfg.onChange(box);
    };
    box.clear = () => { box.items = []; box.render(); };
    box.ready = () => box.items.filter(a => a.status === "ok");
    box.reading = () => box.items.some(a => a.status === "reading");
    box.add = async files => {
      for (const file of files) {
        const ext = (file.name.split(".").pop() || "").toLowerCase();
        const a = { id: "a" + (attSeq++), name: file.name || "貼上的圖片.png", size: file.size, kind: "", status: "reading", info: "", text: "", images: [], imgNames: [], pagesDone: [], err: "", file };
        if (IMG_TYPES.includes(file.type)) a.kind = "image";
        else if (ext === "pdf" || file.type === "application/pdf") a.kind = "pdf";
        else if (ext === "docx") a.kind = "docx";
        else if (["txt", "csv", "md", "tsv"].includes(ext) || /^text\//.test(file.type)) a.kind = "text";
        else {
          a.status = "err";
          a.err = ext === "doc" ? "舊版 Word（.doc）請另存為 .docx。" : ["heic", "heif"].includes(ext) ? "HEIC 照片請先轉成 JPG。" : ["xls", "xlsx"].includes(ext) ? "Excel 請複製數據貼到假設檢定，或另存為 PDF。" : "不支援這種檔案；可用照片（JPG、PNG）、PDF、Word（.docx）或文字檔。";
        }
        box.items.push(a); box.render();
        if (a.status === "err") continue;
        try {
          if (a.kind === "image") {
            const max = imgLimits ? imgLimits.maxInputBytes : 20 * 1024 * 1024;
            if (file.size > max) throw new Error(`圖片太大（上限 ${Math.round(max / 1048576)} MB）。`);
            a.images.push(file); a.imgNames.push(file.name || "貼上的圖片"); a.info = "照片";
          } else if (a.kind === "pdf") await readPdf(a, file);
          else if (a.kind === "docx") await readDocx(a, file);
          else { a.text = (await file.text()).slice(0, ATT_TEXT_MAX); a.info = `${a.text.length.toLocaleString()} 字`; }
          if (!a.text.trim() && !a.images.length) throw new Error("沒有讀到文字或圖片。");
          a.status = "ok";
        } catch (e) { a.status = "err"; a.err = (e && e.message) || "讀取失敗。"; }
        box.render();
      }
    };
    // build the text + images to send with a question
    box.collect = async unsentOnly => {
      const ok = box.ready().filter(a => !(unsentOnly && a.sent)); if (!ok.length) return null;
      const extraImgs = new Map();
      if (cfg.pdfImg && $(cfg.pdfImg).checked && imgLimits) {
        $(cfg.note).hidden = false; $(cfg.note).textContent = "正在把 PDF 頁面轉成圖片…";
        let room = imgLimits.maxCount - ok.reduce((n, a) => n + a.images.length, 0);
        for (const a of ok) {
          if (a.kind !== "pdf" || !a.doc || room <= 0) continue;
          const list = [];
          for (let i = 1; i <= Math.min(a.doc.numPages, PDF_PAGE_MAX) && room > 0; i++) {
            if (a.pagesDone.includes(i)) continue;
            try { const bl = await renderPage(await a.doc.getPage(i)); if (bl) { list.push({ b: bl, name: `${a.name} 第 ${i} 頁` }); room--; } } catch (e) { console.warn("pdf render", e); }
          }
          extraImgs.set(a.id, list);
        }
        box.render();
      }
      let budget = ATT_TEXT_MAX; const parts = [];
      for (const a of ok) {
        if (!a.text || budget <= 0) continue;
        const t = a.text.slice(0, budget); budget -= t.length;
        parts.push(`【附件：${a.name}】\n${t}${t.length < a.text.length ? "\n（後面內容過長，已省略）" : ""}`);
      }
      let imgs = [];
      if (imgLimits) ok.forEach(a => { a.images.forEach((bl, i) => imgs.push({ b: bl, name: a.imgNames[i] || a.name })); (extraImgs.get(a.id) || []).forEach(x => imgs.push(x)); });
      imgs = imgs.slice(0, imgLimits ? imgLimits.maxCount : 0);
      const imgNote = imgs.length ? `另附 ${imgs.length} 張圖片，依序為：${imgs.map((x, i) => `${i + 1}. ${x.name}`).join("；")}。` : "";
      return { parts, imgs, imgNote, names: ok.map(a => a.name), items: ok };
    };
    $(cfg.list).addEventListener("click", e => { const x = e.target.closest("[data-x]"); if (!x) return; box.items = box.items.filter(a => a.id !== x.dataset.x); box.render(); });
    $(cfg.pick).addEventListener("click", () => $(cfg.file).click());
    $(cfg.file).addEventListener("change", () => { const f = [...$(cfg.file).files]; $(cfg.file).value = ""; box.add(f); });
    const drop = $(cfg.drop);
    ["dragenter", "dragover"].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add("over"); }));
    ["dragleave", "drop"].forEach(t => drop.addEventListener(t, () => drop.classList.remove("over")));
    drop.addEventListener("drop", e => { e.preventDefault(); if (e.dataTransfer && e.dataTransfer.files.length) box.add([...e.dataTransfer.files]); });
    if (cfg.paste) $(cfg.paste).addEventListener("paste", e => {
      const fs = [...((e.clipboardData && e.clipboardData.files) || [])].filter(f => IMG_TYPES.includes(f.type));
      if (fs.length) { e.preventDefault(); box.add(fs); cfg.onPaste && cfg.onPaste(); }
    });
    return box;
  }
  const fbAtt = makeAttBox({ list: "fbAttList", note: "fbAttNote", ask: "fbAttAsk", pick: "fbAttPick", file: "fbAttFile", drop: "fbDrop", pdfImg: "fbPdfImg", paste: "fbProblem", onPaste: () => fbNote("已把貼上的圖片加入附件。") });
  const homeAtt = makeAttBox({ list: "homeAttList", note: "homeAttNote", pick: "homeAttPick", file: "homeAttFile", drop: "homeDrop", pdfImg: "homePdfImg", paste: "homeQ" });
  function attRender() { fbAtt.render(); homeAtt.render(); }
  $("fbAttAsk").addEventListener("click", async () => {
    if (!fbAtt.ready().length) return;
    $("fbAttAsk").disabled = true;
    const c = await fbAtt.collect(false);
    const q = "請根據我附上的資料整理這個問題：先用文字描述你從附件（文件內容與圖片）中看到的事實與現象，例如外觀、位置、數據與規格；看不清楚或無法判斷的地方請直接說明，不要猜測。接著建議具體的問題點寫法，並依目前的分類列出可能原因。最後附上 fishbone 區塊（problem 填建議的問題點）。";
    fbAskAI("請依附件整理問題點與可能原因。", null, { extra: ["【整理方式】" + q, c.imgNote, ...c.parts].filter(Boolean).join("\n\n"), images: c.imgs.map(x => x.b), label: "你 · 附件：" + c.names.join("、") });
  });
  $("fbZoom").addEventListener("click", () => { const on = $("fbSvg").classList.toggle("full"); $("fbZoom").setAttribute("aria-pressed", String(on)); $("fbZoom").textContent = on ? "符合寬度" : "原始大小"; popClose(); });
