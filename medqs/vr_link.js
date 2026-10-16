  // =====================================================================
  // 驗證結果 ↔ 驗證項目：分析工具的結果「驗證結束，並儲存到報告」→ PDCA 報告第 5 段各項結論＋附錄（統計驗證報告）
  // 統計類項目在分析工具存入（保留每一次存入，除非使用者刪除）；不用統計的項目在 PDCA 報告直接選結論、寫依據。
  // 資料：fb.vplan[i].apx = [{ id, at, tool, st, note, html }]、fb.vplan[i].vr = { st, note }（不用統計的項目）
  // =====================================================================
  const VR_ST = { ok: "原因成立", ng: "原因不成立", tbd: "待定" };
  const VR_OUTS = { previewBody: "假設檢定", ctOut: "假設檢定－次數資料", tlOut: "假設檢定－統計允差區間", regOut: "相關與回歸", spcOut: "SPC 管制圖", grrOut: "MSA－Gage R&R", biasOut: "MSA－偏差", linOut: "MSA－線性", stabOut: "MSA－穩定性", attrOut: "MSA－屬性一致性", doeOut: "DOE", mixOut: "DOE－混料設計", tgOut: "田口方法" };
  const vrNonStat = x => /不用統計|不需統計/.test(x.tool || "") || !!(x.ss && x.ss.q === "none");
  const vrItems = () => (fb.vplan || []).filter(x => x.on);
  const vrStatItems = () => vrItems().filter(x => !vrNonStat(x));
  // 目前的結論：統計類取最後一次存入；不用統計的取報告上填的
  function vrNow(x) {
    if (vrNonStat(x)) { const v = x.vr || {}; return { st: v.st || "", note: v.note || "", n: 0 }; }
    const L = x.apx || []; const a = L[L.length - 1]; return a ? { st: a.st, note: a.note, n: L.length } : { st: "", note: "", n: 0 };
  }
  // ---------------- 樣本數：規劃 vs 實際 ----------------
  const vrLines = id => (($(id) || {}).value || "").trim().split(/\n+/).map(l => l.trim()).filter(Boolean);
  const vrNumRow = l => l.split(/[,\t;]+|\s{2,}/).filter(c => c !== "" && isFinite(+c)).length;
  function vrActual(id, body) {
    const txt = body.innerText || "", mk = (t, per, tot, first) => ({ txt: t, per, tot, first });
    try {
      if (id === "previewBody") { const ns = [...txt.matchAll(/n = (\d+)/g)].map(m => +m[1]); if (ns.length) { const tot = ns.reduce((a, b) => a + b, 0); return mk(ns.every(v => v === ns[0]) ? (ns.length > 1 ? `每組 ${ns[0]}（${ns.length} 組，共 ${tot}）` : `n = ${ns[0]}`) : `各組 ${ns.join("／")}（共 ${tot}）`, Math.min(...ns), tot, Math.min(...ns)); } }
      if (id === "ctOut") { const ns = CT.M.map(r => r.reduce((a, v) => a + (+v || 0), 0)); const tot = ns.reduce((a, b) => a + b, 0); return mk(ns.every(v => v === ns[0]) ? `每組 ${ns[0]}（${ns.length} 組，共 ${tot}）` : `各組 ${ns.join("／")}（共 ${tot}）`, Math.min(...ns), tot, Math.min(...ns)); }
      if (id === "grrOut") { const L = vrLines("grrData").slice(1).map(l => l.split(/[,\t]+/)); if (L.length) { const ops = new Set(L.map(r => r[0])).size, parts = new Set(L.map(r => r[1])).size, tr = Math.max(1, (L[0] || []).length - 2), tot = L.length * tr; return mk(`${parts} 件 × ${ops} 人 × ${tr} 次（共 ${tot} 筆）`, parts, tot, parts); } }
      if (id === "attrOut") { const n = vrLines("attrData").length - 1, A = +$("attrA").value || 0, T = +$("attrT").value || 0; if (n > 0) return mk(`${n} 件 × ${A} 人 × ${T} 次`, n, n * A * T, n); }
      if (id === "spcOut") { const L = vrLines("spcData").filter(l => vrNumRow(l) > 0); if (L.length) { const m = vrNumRow(L[0]), tot = L.reduce((a, l) => a + vrNumRow(l), 0); return mk(m > 1 ? `${L.length} 組 × 每組 ${m}（共 ${tot}）` : `${L.length} 點`, L.length, tot, L.length); } }
      if (id === "doeOut" && doe && doe.design) { const runs = doe.design.matrix.length, r = doe.r || 1, tot = runs * r; return mk(`${runs} 組 × 重複 ${r} 次（共 ${tot} 次實驗）`, r, tot, r); }
    } catch (_) {}
    const m = txt.match(/(?:^|\n)\s*n\s*\n\s*(\d+)/); if (m) return mk(`n = ${m[1]}`, +m[1], +m[1], +m[1]);
    return null;
  }
  function vrPlanNum(t) { t = String(t || ""); let m;
    if (/每組/.test(t) && (m = t.match(/每組\s*n?\s*=?\s*(\d+)/))) return { k: "per", v: +m[1] };
    if ((m = t.match(/共\s*(\d+)/))) return { k: "tot", v: +m[1] };
    if ((m = t.match(/n\s*=\s*(\d+)/))) return { k: "first", v: +m[1] };
    if ((m = t.match(/(\d+)/))) return { k: "first", v: +m[1] }; return null; }
  function vrParseAct(t) { t = String(t || ""); const per = (t.match(/每組\s*(\d+)/) || [])[1], tot = (t.match(/共\s*(\d+)/) || [])[1], first = (t.match(/(\d+)/) || [])[1]; return { txt: t, per: +(per || first || NaN), tot: +(tot || first || NaN), first: +(first || NaN) }; }
  const vrDev = (plan, act) => { const p = vrPlanNum(plan); if (!p || !act) return false; const a = act[p.k]; return isFinite(a) && a < p.v; };
  const vrPlanOf = x => { const s = x.ss || {}; if (!s.q || s.q === "none") return null; const lab = s.q === "rule" ? "依標準或公司程序規定" : ((typeof SV_Q !== "undefined" && SV_Q.find(o => o[0] === s.q)) || ["", ""])[1]; return { q: s.q, n: s.n || "", meth: lab, sum: s.sum || (s.why || "").split("\n")[0] }; };
  const VR_METH = /(Welch t 檢定|Student t 檢定|配對 t 檢定|單一樣本 t 檢定|Mann-Whitney U 檢定|Wilcoxon[^，；。）]*|Kruskal-Wallis[^，；。）]*|Welch ANOVA|單因子 ANOVA|Pearson 卡方|卡方檢定|Fisher 精確檢定|TOST[^，；。]*|無母數允差區間|常態允差區間)/;
  function vrMeth(id, body, tool) {
    const t = body.innerText || "", m = t.match(VR_METH); if (m) return m[1];
    if (id === "grrOut") return "Gage R&R" + ((t.match(/ANOVA 法|平均全距法/) || [""])[0] ? "（" + (t.match(/ANOVA 法|平均全距法/) || [""])[0] + "）" : "");
    if (id === "attrOut") return "屬性一致性（Kappa）"; if (id === "regOut") return "簡單線性回歸";
    if (id === "spcOut") { const c = t.match(/(I-MR|X̄-R|X̄-S|np|p|c|u)\s*管制圖/); return (c ? c[1] + " " : "") + "管制圖（判異規則）"; }
    if (id === "doeOut") return (String(tool || "").replace(/^DOE(－[^：]*)?：?/, "") || "DOE") ; if (id === "tlOut") return /無母數/.test(t) ? "無母數允差區間" : "常態允差區間";
    return tool || "";
  }
  function vrKey(id, note, body) {
    const t = (note || "") + "\n" + (body ? body.innerText : ""); let m;
    if (id === "grrOut" && (m = t.match(/%GRR\s*=\s*[\d.]+%/))) return m[0] + ((m = t.match(/ndc\s*=\s*\d+/)) ? "、" + m[0] : "");
    if (id === "attrOut" && (m = t.match(/κ\s*=\s*-?[\d.]+/))) return m[0];
    if (id === "tlOut" && (m = t.match(/[≥≤]\s*-?[\d.]+/))) return "允差界限 " + m[0];
    if (id === "spcOut") return (/超出|觸發/.test(note || "") && !/沒有點超出/.test(note || "") ? "有失控點" : "在管制內") + ((m = t.match(/Cpk\s*=?\s*([\d.]+)/)) ? "、Cpk = " + m[1] : "");
    if (id === "doeOut" && (m = t.match(/\d+ 個顯著效應/))) return m[0];
    if ((m = t.match(/斜率 p\s*[<=]\s*[\d.]+/))) return m[0];
    if ((m = t.match(/p\s*[<=]\s*[\d.]+/))) return m[0];
    return String(note || "").slice(0, 40);
  }
  // ---------------- 分析工具結果下方：存成驗證結果 ----------------
  const vrHas = body => !!body.querySelector(".verdict, svg, .kv, .bignum, table");
  function vrAuto(body) {
    const v0 = body.querySelector(".verdict") || body, v = v0.cloneNode(true); v.querySelectorAll(".pill, button").forEach(e => e.remove());
    v.querySelectorAll("p, div, h3, h4, li, br").forEach(e => e.insertAdjacentText("beforebegin", "\n"));   // 區塊之間斷句（離線節點的 textContent 不含換行）
    const t = (v.textContent || "").split(/\n+/).map(s => s.replace(/\s+/g, " ").trim()).filter(Boolean).slice(0, 2).join("；").replace(/。；/g, "；");
    return t.slice(0, 220);
  }
  function vrSlotHtml(id, open) {
    const L = vrStatItems();
    if (!open) { const d = L.filter(x => (x.apx || []).length).length; return `<button type="button" class="vr-open" data-vropen="${id}">✓ 驗證結束，並儲存到報告${L.length ? `　<span class="vr-prog">統計驗證已完成 ${d}／${L.length}</span>` : ""}</button>`; }
    if (!L.length) return `<div class="vr-pick"><b>✓ 驗證結束，並儲存到報告</b><p class="hint" style="margin:4px 0 0">還沒有需要統計的驗證項目。請先在 ③ 驗證計畫勾選驗證項目（驗證策略不是「不用統計」的）。</p><div class="vr-row vr-end"><button type="button" class="sv-btn" data-vrclose="${id}">關閉</button></div></div>`;
    const body = $(id), auto = body ? vrAuto(body) : "", tool = VR_OUTS[id] || "";
    const guess = L.find(x => x.id === vrFocus) || L.find(x => tool && (x.tool || "").includes(tool.split("－")[0]) && !(x.apx || []).length) || L.find(x => tool && (x.tool || "").includes(tool.split("－")[0])) || L.find(x => !(x.apx || []).length) || L[0];
    const act = body ? vrActual(id, body) : null, own = VR_OWN[id] ? vrItems().find(y => y.id === VR_OWN[id]) : null;
    return `<div class="vr-pick" data-vrbox="${id}"><b>✓ 驗證結束，並儲存到報告</b><span class="hint">　這份結果畫面會附在 PDCA 報告後面（附錄）</span>
      <div class="vr-row"><label>驗證項目</label><select data-vrit="1">${L.map(x => `<option value="${x.id}"${x === guess ? " selected" : ""}>${esc(x.cause || "（未命名）")}${x.tool ? "（" + esc(x.tool) + "）" : ""}${(x.apx || []).length ? `　已存 ${(x.apx || []).length} 份` : ""}</option>`).join("")}</select></div>
      <div class="vr-row"><label>結論 <span class="vr-req">必選</span></label>${Object.entries(VR_ST).map(([k, t]) => `<button type="button" class="vr-chip" data-vrst="${k}" aria-pressed="false">${t}</button>`).join("")}</div>
      <div class="vr-row vr-col"><label>依據（系統依結果產生，可修改）</label><input type="text" data-vrnote="1" value="${esc(auto)}"></div>
      ${own && own !== guess ? `<p class="vr-ownwarn">⚠ 畫面上的結果是「${esc(own.cause)}」的數據算出來的，不是選的這一項。請確認，或先貼上這一項的數據重新分析。</p>` : ""}
      <div class="vr-plan" data-vrplan="1">${vrPlanBox(guess, act ? act.txt : "")}</div>
      <div class="vr-row vr-end"><span class="hint" data-vrhint="1"></span><button type="button" class="sv-btn" data-vrclose="${id}">取消</button><button type="button" class="sv-btn vr-save" data-vrsave="${id}">✓ 驗證結束，儲存到報告</button></div></div>`;
  }
  // 樣本數規劃 vs 實際數量（存入時記錄；少於規劃要寫偏離理由）
  function vrPlanBox(x, actTxt) {
    const pl = x ? vrPlanOf(x) : null, dev = pl ? vrDev(pl.n, vrParseAct(actTxt)) : false;
    return `<div class="vr-row"><label>樣本數規劃</label><span>${pl ? `<b>${esc(pl.n)}</b>　<span class="hint">${esc(pl.meth)}${pl.sum ? "：" + esc(pl.sum) : ""}</span>` : `<span class="hint">這一項還沒有樣本數規劃（請到 ④ 樣本數規劃）</span>`}</span></div>
      <div class="vr-row"><label>實際數量</label><input type="text" data-vract="1" value="${esc(actTxt || "")}" placeholder="例如：每組 16" style="max-width:340px"><span class="vr-devflag">${pl && actTxt ? (dev ? "⚠ 少於規劃" : "✓ 符合規劃") : ""}</span></div>
      ${dev ? `<div class="vr-row vr-col vr-devrow"><label>偏離理由（必填）</label><input type="text" data-vrdev="1" placeholder="例如：試產量不足，只取得 12 件；檢定力約 xx%，結論需保守解讀"></div>` : ""}`;
  }
  function vrSlot(id, open) {
    const body = $(id); if (!body) return;
    let s = body.nextElementSibling; if (!s || !s.classList.contains("vr-slot")) { s = document.createElement("div"); s.className = "vr-slot"; body.after(s); }
    if (!vrHas(body)) { s.hidden = true; s.innerHTML = ""; return; }
    if (s.dataset.open === "1" && !open && s.innerHTML) return;   // 正在填寫，不重畫
    s.hidden = false; s.dataset.open = open ? "1" : ""; s.innerHTML = vrSlotHtml(id, open);
  }
  function vrSnap(body) {   // 只存結果卡：去掉按鈕、輸入框與互動元件
    const c = body.cloneNode(true);
    c.querySelectorAll("button, input, select, textarea, script, .ss2hyp, .ask-slot, .vr-slot, details > summary ~ .run-row").forEach(e => e.remove());
    c.querySelectorAll("[id]").forEach(e => e.removeAttribute("id"));
    c.querySelectorAll("*").forEach(e => { [...e.attributes].forEach(a => { if (/^on/i.test(a.name)) e.removeAttribute(a.name); }); });
    let h = c.innerHTML.replace(/\s{2,}/g, " ");
    if (h.length > 400000) h = h.replace(/<svg[\s\S]*?<\/svg>/g, "<p>（圖表過大未存入）</p>");
    return h.slice(0, 400000);
  }
  // 驗證策略 → 對應的分析頁
  function vrRoute(tool) {
    const t = String(tool || "");
    if (/次數|不良率|卡方/.test(t)) return ["hypothesis", "count"]; if (/允差/.test(t)) return ["hypothesis", "tol"]; if (/假設檢定/.test(t)) return ["hypothesis", "compare"];
    if (/回歸|相關/.test(t)) return ["regression"]; if (/SPC|管制/.test(t)) return ["spc"];
    if (/MSA/.test(t)) return ["msa", /偏差/.test(t) ? "bias" : /線性/.test(t) ? "lin" : /穩定/.test(t) ? "stab" : /屬性/.test(t) ? "attr" : "grr"];
    if (/混料/.test(t)) return ["doe", "mix"]; if (/DOE|實驗設計/.test(t)) return ["doe", "fact"]; if (/田口/.test(t)) return ["taguchi"];
    return ["hypothesis", "compare"];
  }
  function vrNextHtml() {
    const left = vrStatItems().filter(y => !(y.apx || []).length);
    if (!left.length) return `<div class="vr-next-box"><b>統計驗證都完成了。</b>不用統計的項目請到 PDCA 報告第 5 段選結論、寫依據。　<button type="button" class="sv-btn vr-save" data-route-go="pdca">前往 PDCA 報告 →</button></div>`;
    return `<div class="vr-next-box"><b>還沒驗證的（${left.length} 項）：</b>按「驗證這一項 →」會到對應的分析頁，貼上這一項的數據再分析。<ul>${left.map(x => `<li><span>${esc(x.cause)}<small>${esc(x.tool || "")}</small></span><button type="button" class="sv-btn p" data-vrnext="${x.id}">驗證這一項 →</button></li>`).join("")}</ul></div>`;
  }
  // ---------------- 每個驗證項目各存一份分析數據（同一個工具給多個項目用，不互相蓋掉） ----------------
  const VR_RUN = { previewBody: () => run(), ctOut: () => ctRun(), tlOut: () => $("tlRun").click(), regOut: () => $("regRun").click(), spcOut: () => spcRun(), grrOut: () => grrRun(), biasOut: () => biasRun(), linOut: () => linRun(), stabOut: () => stabRun(), attrOut: () => attrRun(), doeOut: () => doeRun(), mixOut: () => $("mixRun").click(), tgOut: () => $("tgRun").click() };
  const VR_OWN = {};   // 結果區 id → 目前畫面上的結果屬於哪個驗證項目
  let vrRestoring = false;
  function vrOutOf(x) { const [r, sub] = vrRoute(x.tool); return r === "hypothesis" ? ({ count: "ctOut", tol: "tlOut" }[sub] || "previewBody") : r === "regression" ? "regOut" : r === "spc" ? "spcOut" : r === "msa" ? (sub || "grr") + "Out" : r === "doe" ? (sub === "mix" ? "mixOut" : "doeOut") : r === "taguchi" ? "tgOut" : "previewBody"; }
  const vrSkipEl = el => !el.id || el.type === "file" || el.type === "button" || /Problem$|ProblemSrc$/.test(el.id) || el.closest(".vf-bar, .crumb, .vr-slot, #aiPanel");
  function vrSnapView(route, outId) {
    const v = document.querySelector(`[data-view="${route}"]`); if (!v) return null;
    const f = {}, c = {}, s = {};
    v.querySelectorAll("input, select, textarea").forEach(el => { if (vrSkipEl(el)) return; f[el.id] = el.type === "checkbox" ? !!el.checked : String(el.value).slice(0, 200000); });
    v.querySelectorAll(".chips[id]").forEach(g => { const b = g.querySelector('[aria-pressed="true"]'); if (!b) return; const a = ["v", "mode", "alt", "goal"].find(k => b.dataset[k] != null); if (a) c[g.id] = [a, b.dataset[a]]; });
    v.querySelectorAll(".subtabs[id], .subtabs").forEach((g, i) => { const b = g.querySelector('[aria-selected="true"]'); if (b) s[g.id || route + ":" + i] = b.dataset.tsub || b.dataset.sub || ""; });
    const ex = {};
    try { if (route === "doe") { ex.doeF = JSON.parse(JSON.stringify(doeF)); ex.doeY = doe ? JSON.parse(JSON.stringify(doe.y)) : null; ex.mixY = mix ? JSON.parse(JSON.stringify(mix.y)) : null; } } catch (_) {}
    try { if (route === "taguchi") { ex.tgF = JSON.parse(JSON.stringify(tgF)); ex.tgNoise = tgNoise.slice(); ex.tgY = tg ? JSON.parse(JSON.stringify(tg.y)) : null; } } catch (_) {}
    return { route, out: outId, f, c, s, ex };
  }
  function vrRestoreView(x) {
    const a = x.ana; if (!a || !a.snap) return false; const S = a.snap, v = document.querySelector(`[data-view="${S.route}"]`); if (!v) return false;
    vrRestoring = true;
    try {
      Object.entries(S.s || {}).forEach(([k, val]) => { const g = k.includes(":") ? v.querySelectorAll(".subtabs")[+k.split(":")[1]] : $(k); const b = g && g.querySelector(`[data-tsub="${val}"], [data-sub="${val}"]`); if (b && b.getAttribute("aria-selected") !== "true") b.click(); });
      Object.entries(S.c || {}).forEach(([id, [k, val]]) => { const g = $(id), b = g && g.querySelector(`[data-${k}="${val}"]`); if (b && b.getAttribute("aria-pressed") !== "true") b.click(); });
      const ids = Object.keys(S.f || {}).filter(id => $(id) && v.contains($(id)));
      const ord = id => $(id).tagName === "TEXTAREA" ? 0 : $(id).tagName === "SELECT" ? 1 : 2;
      const put = id => { const el = $(id), val = S.f[id]; if (el.type === "checkbox") { if (el.checked !== !!val) { el.checked = !!val; el.dispatchEvent(new Event("change", { bubbles: true })); } return; } if (el.value === String(val)) return; el.value = String(val); if (id !== "tlBox") el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true })); };
      ids.sort((p, q) => ord(p) - ord(q)).forEach(put);
      ids.filter(id => $(id).tagName === "SELECT").forEach(put);   // 選單選項可能要等數據貼上後才出現（例如回歸的 X／Y）
      const E = S.ex || {};
      if (S.route === "doe") { if (Array.isArray(E.doeF)) E.doeF.forEach((f, i) => { if (doeF[i] && f) doeF[i] = Object.assign({}, f); }); doeFactorsUI(); if (E.doeY && S.out === "doeOut") doeGenerate(E.doeY); if (E.mixY && S.out === "mixOut") mixGenerate(E.mixY); }
      if (S.route === "taguchi") { if (Array.isArray(E.tgF)) E.tgF.forEach((f, i) => { if (tgF[i] && f) tgF[i] = JSON.parse(JSON.stringify(f)); }); if (Array.isArray(E.tgNoise)) E.tgNoise.forEach((n, i) => { if (i < tgNoise.length) tgNoise[i] = n; }); tgFactorsUI(); tgNoiseUI(); if (E.tgY) tgGenerate(E.tgY); }
      if (S.out === "previewBody") { try { reparse(false); } catch (_) {} }
      const r = VR_RUN[S.out]; if (r) r();
      VR_OWN[S.out] = x.id;
    } catch (e) { console.warn("vrRestoreView", e); }
    vrRestoring = false; return true;
  }
  function vrSave(id) {
    const box = document.querySelector(`[data-vrbox="${id}"]`), body = $(id); if (!box || !body) return;
    const hint = box.querySelector("[data-vrhint]"), it = box.querySelector("[data-vrit]").value, st = (box.querySelector("[data-vrst][aria-pressed='true']") || {}).dataset;
    const note = box.querySelector("[data-vrnote]").value.trim();
    if (!st) { hint.textContent = "⚠ 還沒存：請先選結論（原因成立／不成立／待定）"; const r = box.querySelector("[data-vrst]").parentElement; r.classList.add("vr-need"); r.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    if (!note) { hint.textContent = "請寫依據。"; return; }
    const x = vrItems().find(y => y.id === it); if (!x) return;
    const actTxt = (box.querySelector("[data-vract]") || {}).value || "", pl = vrPlanOf(x), dev = pl ? vrDev(pl.n, vrParseAct(actTxt)) : false, devWhy = ((box.querySelector("[data-vrdev]") || {}).value || "").trim();
    if (dev && !devWhy) { hint.textContent = "⚠ 實際數量少於規劃：請寫偏離理由。"; const d = box.querySelector("[data-vrdev]"); if (d) d.focus(); return; }
    const title = (body.closest(".preview") && body.closest(".preview").querySelector(".preview-head b")) ? body.closest(".preview").querySelector(".preview-head b").textContent.trim() : "";
    const toolStr = (VR_OUTS[id] || "") + (title && title !== "尚未分析" && !(VR_OUTS[id] || "").includes(title) ? "：" + title : "");
    (x.apx || (x.apx = [])).push({ id: fid(), at: Date.now(), tool: toolStr, st: st.vrst, note, html: vrSnap(body), plan: pl, act: actTxt.trim(), dev, devWhy, meth: vrMeth(id, body, toolStr), key: vrKey(id, note, body) });
    fbSave(); try { pdcaRender(); } catch (_) {} try { flowRender(); } catch (_) {} try { vfRender(); } catch (_) {}
    try { const rt = (document.querySelector(`[data-view] #${id}`) || body).closest("[data-view]").dataset.view; x.ana = { snap: vrSnapView(rt, id), at: Date.now() }; VR_OWN[id] = x.id; fbSave(); } catch (_) {}
    const s = body.nextElementSibling; if (s) { s.dataset.open = ""; s.innerHTML = `<div class="vr-done">✓ 已存入「${esc(x.cause)}」的驗證結果（${VR_ST[st.vrst]}），會附在 PDCA 報告附錄。　<button type="button" class="linkbtn" data-route-go="pdca">看 PDCA 報告</button>　<button type="button" class="linkbtn" data-vropen="${id}">再存一份</button></div>${vrNextHtml()}`; }
    const left = vrStatItems().filter(y => !(y.apx || []).length);
    if (left.length) { setTimeout(() => vrGo(left[0], x.cause), 600); return; }   // 自動到下一個未驗證的統計因子
    setTimeout(() => { const b = document.querySelector('.toolnav [data-route="pdca"]'); if (b) b.click(); window.scrollTo({ top: 0, behavior: "smooth" }); }, 600);
    try { fbNote(`已儲存「${x.cause}」到報告。統計驗證都完成了，請在 PDCA 報告第 5 段填寫不用統計項目的結論。`); } catch (_) {}
  }
  document.addEventListener("change", e => {
    const it = e.target.closest(".vr-pick [data-vrit]"); if (it) { const box = it.closest(".vr-pick"), x = vrItems().find(y => y.id === it.value), pb = box.querySelector("[data-vrplan]"), a = box.querySelector("[data-vract]"); if (pb) pb.innerHTML = vrPlanBox(x, a ? a.value : ""); return; }
    const ac = e.target.closest(".vr-pick [data-vract]"); if (ac) { const box = ac.closest(".vr-pick"), x = vrItems().find(y => y.id === box.querySelector("[data-vrit]").value), pb = box.querySelector("[data-vrplan]"), dv = (box.querySelector("[data-vrdev]") || {}).value || ""; if (pb) { pb.innerHTML = vrPlanBox(x, ac.value); const d = pb.querySelector("[data-vrdev]"); if (d) d.value = dv; } }
    const fs = e.target.closest("[data-vfsel]"); if (fs) { vrFocus = fs.value; const x = vrItems().find(y => y.id === vrFocus); if (x) { vrSetProblem(x, fs.dataset.vfsel); if (x.ana && x.ana.snap && VR_OWN[vrOutOf(x)] !== x.id && x.ana.snap.route === fs.dataset.vfsel) vrRestoreView(x); } vfRender(); }
  });
  (function vrInit() {
    Object.keys(VR_OUTS).forEach(id => { const b = $(id); if (!b) return; new MutationObserver(() => { if (!vrRestoring && vrFocus && vrHas(b)) { const fx = vrItems().find(y => y.id === vrFocus); if (fx && vrOutOf(fx) === id) VR_OWN[id] = vrFocus; } vrSlot(id); try { vfRender(); } catch (_) {} }).observe(b, { childList: true, subtree: false }); vrSlot(id); });
    document.addEventListener("click", e => {
      const o = e.target.closest("[data-vropen]"); if (o) { vrSlot(o.dataset.vropen, true); return; }
      const c = e.target.closest("[data-vrclose]"); if (c) { const s = $(c.dataset.vrclose).nextElementSibling; if (s) s.dataset.open = ""; vrSlot(c.dataset.vrclose); return; }
      const st = e.target.closest(".vr-pick [data-vrst]"); if (st) { st.parentElement.classList.remove("vr-need"); st.parentElement.querySelectorAll("[data-vrst]").forEach(b => b.setAttribute("aria-pressed", String(b === st))); const h = st.closest(".vr-pick").querySelector("[data-vrhint]"); if (h) h.textContent = ""; return; }
      const sv = e.target.closest("[data-vrsave]"); if (sv) { vrSave(sv.dataset.vrsave); return; }
      const vl = e.target.closest("[data-vfload]"); if (vl) { const x = vrItems().find(y => y.id === vl.dataset.vfload); if (x) { vrRestoreView(x); vfRender(); } return; }
      const fg = e.target.closest("[data-vfgo]"); if (fg) { const x = vrItems().find(y => y.id === fg.dataset.vfgo); if (x) { const b = document.querySelector('.toolnav [data-route="sample"]'); if (b) b.click(); setTimeout(() => { try { svView(x); } catch (_) {} }, 120); } return; }
      const nx = e.target.closest("[data-vrnext]"); if (nx) { const x = vrItems().find(y => y.id === nx.dataset.vrnext); if (x) vrGo(x); }
    });
  })();
  // 附錄編號（和報告附錄的順序一致）；跳到 PDCA 報告的那一份附錄
  function vrApxNos(x) { let k = 0, out = []; vrItems().forEach(y => { if (vrNonStat(y)) return; (y.apx || []).forEach(() => { k++; if (y.id === x.id) out.push(k); }); }); return out; }
  function vrGoApx(x) {
    const ns = vrApxNos(x); if (!ns.length) return; const b = document.querySelector('.toolnav [data-route="pdca"]'); if (b) b.click();
    setTimeout(() => { const t = $("pdapx-" + ns[ns.length - 1]); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); }, 250);
  }
  document.addEventListener("click", e => { const r = e.target.closest("[data-vrres]"); if (!r) return; const x = vrItems().find(y => y.id === r.dataset.vrres); if (x) vrGoApx(x); });
  const VR_PROB = { hypothesis: "hypProblem", regression: "regressionProblem", spc: "spcProblem", msa: "msaProblem", doe: "doeProblem", taguchi: "taguchiProblem" };
  function vrSetProblem(x, r) { const pb = $(VR_PROB[r]); if (pb) { pb.value = `驗證項目：${x.cause}${x.method ? "。驗證方式：" + x.method : ""}`; pb.dataset.auto = pb.value; } }
  // ---------------- 分析頁最上方：目前驗證中的因子 ----------------
  let vrFocus = "";
  const VF_VIEWS = { hypothesis: "viewAnalyze", regression: "viewReg", spc: "viewSPC", msa: "viewMSA", doe: "viewDOE", taguchi: "viewTaguchi" };
  function vfRender() {
    Object.entries(VF_VIEWS).forEach(([r, vid]) => {
      const v = $(vid); if (!v) return; let bar = v.querySelector(".vf-bar");
      if (!bar) { const h = v.querySelector(".tool-head"); if (!h) return; bar = document.createElement("div"); bar.className = "vf-bar"; h.after(bar); }
      const L = vrStatItems(); if (!L.length) { bar.hidden = true; return; }
      const mine = x => vrRoute(x.tool)[0] === r, sorted = L.filter(mine).concat(L.filter(x => !mine(x)));
      const cur = L.find(y => y.id === vrFocus && mine(y)) || L.filter(mine).find(y => !(y.apx || []).length) || L.find(mine) || L.find(y => y.id === vrFocus);
      const x = cur, pl = x ? vrPlanOf(x) : null, nA = x ? (x.apx || []).length : 0;
      bar.hidden = false;
      bar.innerHTML = `<div class="vf-row"><b>目前驗證</b><select data-vfsel="${r}" aria-label="目前驗證的因子"><option value="">— 選擇要驗證的因子 —</option>${sorted.map(y => `<option value="${y.id}"${x && y.id === x.id ? " selected" : ""}>${mine(y) ? "" : "（其他工具）"}${esc(y.cause || "（未命名）")}${(y.apx || []).length ? "　✓ 已存" : ""}</option>`).join("")}</select>
        ${x ? `<span class="vf-st ${nA ? "ok" : ""}">${nA ? `已存 ${nA} 份` : "尚未存結果"}</span>${nA ? `<button type="button" class="linkbtn" data-vrres="${x.id}">📊 看已存的結果（附錄 ${vrApxNos(x).join("、")}）</button>` : ""}` : `<span class="hint">選了之後，存結果時會自動帶這一項，並顯示它的樣本數規劃。</span>`}</div>
        ${x ? (() => { const out = vrOutOf(x), ow = VR_OWN[out], owx = ow ? L.find(y => y.id === ow) : null; if (ow === x.id) return `<div class="vf-row vf-sub"><span class="vf-own ok">下方是這一項的數據與結果</span></div>`; return `<div class="vf-row vf-sub">${owx ? `<span class="vf-own">⚠ 下方目前是「${esc(owx.cause)}」的數據</span>` : ""}${x.ana && x.ana.snap ? `<button type="button" class="btn small" data-vfload="${x.id}">載入這一項存過的數據</button>` : `<span class="hint">這一項還沒有數據：${owx ? "請清掉下方數據，" : ""}貼上這一項的數據後分析</span>`}</div>`; })() : ""}
        ${x ? `<div class="vf-row vf-sub"><span>策略：${esc(x.tool || "—")}${mine(x) ? "" : `　<b class="vf-warn">這一項的策略不是這個工具</b>`}</span><span>樣本數規劃：${pl ? `<b>${esc(pl.n)}</b>（${esc(pl.meth)}${pl.sum ? "：" + esc(pl.sum.slice(0, 80)) : ""}）` : `<span class="vf-warn">尚未規劃</span>`}</span>${pl && x.ss && x.ss.inp ? `<button type="button" class="linkbtn" data-vfgo="${x.id}">🔍 查看計算</button>` : ""}</div>` : ""}`;
    });
  }
  setTimeout(() => { try { vfRender(); Object.values(VF_VIEWS).forEach(vid => { const v = $(vid); if (v) new MutationObserver(() => { if (!v.hidden) vfRender(); }).observe(v, { attributes: true, attributeFilter: ["hidden"] }); }); } catch (_) {} }, 0);
  function vrGo(x, done) {   // 到這一個驗證項目的分析頁（存入後自動呼叫）
    navCtx = "plan";
    { const [r, sub] = vrRoute(x.tool);
        if (r === "hypothesis" && sub === "compare" && currentView === "hypothesis") { try { $("clearBtn").click(); } catch (_) {} }   // 同一頁換下一項：清掉上一項的數據（已存在附錄）
        try { gotoTool(r, sub); } catch (_) { const b = document.querySelector(`.toolnav [data-route="${r}"]`); if (b) b.click(); }
        vrFocus = x.id; vrSetProblem(x, r);
        const out = vrOutOf(x);
        if (x.ana && x.ana.snap && VR_OWN[out] !== x.id) setTimeout(() => { vrRestoreView(x); vfRender(); }, 60);
        vfRender();
        try { fbNote(`${done ? `已儲存「${done}」到報告。` : ""}現在驗證「${x.cause}」：貼上這一項的數據後分析，再按結果下方的「驗證結束，並儲存到報告」。`); } catch (_) {}
        setTimeout(() => { const v = document.querySelector(`[data-view="${r}"]`); (v || document.body).scrollIntoView({ behavior: "smooth", block: "start" }); }, 80); }
  }
  // ---------------- PDCA 報告：第 5 段各項結論、附錄 ----------------
  function vrTableHtml(mode) {
    const L = vrItems(); if (!L.length) return "";
    const keep = mode === "screen", edit = mode !== "print"; let k = 0;
    const apxNo = {}; L.forEach(x => { if (!vrNonStat(x) && (x.apx || []).length) apxNo[x.id] = (x.apx || []).map(() => ++k); });
    const stCell = (x, v) => {
      if (!vrNonStat(x)) return v.st ? `<span class="pd-vr-${v.st}">${VR_ST[v.st]}</span>` : `<span class="pd-vr-none">尚未驗證</span>`;
      if (!edit) return v.st ? `<span class="pd-vr-${v.st}">${VR_ST[v.st]}</span>` : `<span class="pd-line"></span>`;
      return `<select class="pd-vrsel"${keep ? ` data-vrx="${x.id}"` : ""}><option value="">請選擇</option>${Object.entries(VR_ST).map(([s, t]) => `<option value="${s}"${v.st === s ? " selected" : ""}>${t}</option>`).join("")}</select>`;
    };
    const noteCell = (x, v) => {
      if (!vrNonStat(x) || !edit) return v.note ? esc(v.note) : vrNonStat(x) ? `<span class="pd-line"></span>` : "";
      return `<div class="pd-ed"${keep ? ` data-vrn="${x.id}"` : ""} contenteditable="plaintext-only" spellcheck="false" title="點一下可以修改">${esc(v.note)}</div>`;
    };
    return `<div class="pd-cap">各驗證項目的結論</div><table class="pd-tbl pd-vr"><thead><tr><th>驗證項目</th><th class="pd-tool">驗證策略</th><th style="width:100px">結論</th><th>依據</th><th style="width:58px">附錄</th></tr></thead><tbody>${L.map(x => { const v = vrNow(x); return `<tr><td>${esc(x.cause)}</td><td>${esc(x.tool || "")}</td><td>${stCell(x, v)}</td><td>${noteCell(x, v)}</td><td>${apxNo[x.id] ? apxNo[x.id].map(n => "附錄 " + n).join("<br>") : "—"}</td></tr>`; }).join("")}</tbody></table>
      <p class="pd-note">統計類項目的結論來自 ⑤ 統計分析「驗證結束，並儲存到報告」（多份時以最後一份為準）；不用統計的項目在這裡選結論、寫依據。</p>`;
  }
  function vrApxHtml(mode) {
    const keep = mode === "screen"; let k = 0, out = "";
    const num = {};
    vrItems().forEach(x => { if (vrNonStat(x)) return; (x.apx || []).forEach(a => { k++; (num[x.id] = num[x.id] || []).push(k);
      const pl = a.plan || vrPlanOf(x), dev = a.plan ? a.dev : false;
      const planLine = `<div class="pd-apxplan"><b>樣本數規劃：</b>${pl ? `${esc(pl.meth)}${pl.sum ? "（" + esc(pl.sum) + "）" : ""} → ${esc(pl.n)}` : "未規劃"}；<b>實際：</b>${a.act ? esc(a.act) : "（舊版未記錄）"}${a.act && pl ? (dev ? `，<b class="pd-vr-ng">少於規劃</b>；偏離理由：${esc(a.devWhy || "")}` : "，符合規劃") : ""}</div>`;
      out += `<section class="pd-apx1" id="pdapx-${k}"><h4>附錄 ${k}　${esc(x.cause)}</h4><div class="pd-note">${esc(a.tool || "")}｜存入 ${new Date(a.at).toISOString().slice(0, 10)}｜結論：<b class="pd-vr-${a.st}">${VR_ST[a.st] || ""}</b>｜依據：${esc(a.note || "")}${keep ? `　<button type="button" class="pd-mini pd-noprint" data-vrdel="${x.id}|${a.id}">刪除這份</button>` : ""}</div>${planLine}<div class="pd-apxb">${a.html}</div></section>`; }); });
    const L = vrItems(); if (!L.some(x => !vrNonStat(x))) return "";
    let nOk = 0, nDev = 0, nNo = 0, ix = 0;
    const cut = (t, n) => { t = String(t || ""); return t.length > n ? t.slice(0, n) + "…" : t; };
    const plCell = pl => pl ? esc(cut(pl.sum || pl.meth, 70)) : "未規劃";
    const rows = L.map(x => {
      if (vrNonStat(x)) { const v = x.vr || {}; return `<tr><td>—</td><td>${esc(x.cause)}</td><td>${esc(x.tool || "")}</td><td class="pd-sm-pl">不需統計${x.ss && x.ss.why ? "：" + esc(cut(x.ss.why.split("\n")[0], 40)) : ""}</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>${v.st ? `<span class="pd-vr-${v.st}">${VR_ST[v.st]}</span>` : "未填"}</td><td>—</td></tr>`; }
      const A = x.apx || [], a = A[A.length - 1], pl = (a && a.plan) || vrPlanOf(x);
      ix++;
      if (!a) { nNo++; return `<tr><td>${ix}</td><td>${esc(x.cause)}</td><td>${esc(x.tool || "")}</td><td class="pd-sm-pl">${plCell(pl)}</td><td>${pl ? esc(pl.n) : "—"}</td><td>—</td><td>—</td><td>—</td><td>—</td><td><span class="pd-vr-none">尚未驗證</span></td><td>—</td></tr>`; }
      const cmp = !a.act ? "（未記錄）" : !pl ? "—" : a.dev ? `⚠ 少於規劃${a.devWhy ? "：" + esc(a.devWhy) : ""}` : "✓ 符合";
      if (a.act && pl) { if (a.dev) nDev++; else nOk++; }
      const refs = (num[x.id] || []).map(n => mode === "screen" ? `<a href="#pdapx-${n}" data-apxgo="${n}">附錄 ${n}</a>` : `<a href="#pdapx-${n}">附錄 ${n}</a>`).join("<br>");
      return `<tr class="${a.dev ? "pd-sm-dev" : ""}"><td>${ix}</td><td>${esc(x.cause)}</td><td>${esc(x.tool || "")}</td><td class="pd-sm-pl">${plCell(pl)}</td><td>${pl ? esc(pl.n) : "—"}</td><td>${esc(a.act || "—")}</td><td>${cmp}</td><td>${esc(a.meth || a.tool || "")}</td><td>${esc(a.key || "")}</td><td><span class="pd-vr-${a.st}">${VR_ST[a.st] || ""}</span></td><td>${refs}</td></tr>`;
    }).join("");
    const sum = `<section class="pd-sm" id="pdapx-0"><h4>附錄 0　統計驗證總表</h4><table class="pd-tbl pd-smt"><colgroup><col style="width:3%"><col style="width:13%"><col style="width:10%"><col style="width:19%"><col style="width:9%"><col style="width:9%"><col style="width:11%"><col style="width:9%"><col style="width:7%"><col style="width:6%"><col style="width:6%"></colgroup><thead><tr><th>#</th><th>驗證項目</th><th>驗證策略</th><th>樣本數規劃（方法與條件）</th><th>規劃數量</th><th>實際數量</th><th>規劃 vs 實際</th><th>統計方法</th><th>主要結果</th><th>結論</th><th>報告</th></tr></thead><tbody>${rows}</tbody></table>
      <p class="pd-note">統計驗證 ${L.filter(x => !vrNonStat(x)).length} 項：符合規劃 ${nOk} 項、少於規劃 ${nDev} 項${nNo ? `、尚未驗證 ${nNo} 項` : ""}。多份結果時以最後一份為準；點「附錄 N」看完整結果，樣本數計算見報告第 4 段。</p></section>`;
    return `<div class="pd-apx"><h3 class="pd-apxh">附錄　統計驗證報告</h3>${sum}${out}</div>`;
  }
  (function vrPdInit() {
    const w = $("pdcaWrap"); if (!w) return;
    w.addEventListener("change", e => { const s = e.target.closest("[data-vrx]"); if (!s) return; const x = vrItems().find(y => y.id === s.dataset.vrx); if (!x) return; x.vr = Object.assign({}, x.vr, { st: s.value }); fbSave(); try { pdcaStatus(); flowRender(); } catch (_) {} });
    w.addEventListener("input", e => { const d = e.target.closest("[data-vrn]"); if (!d) return; const x = vrItems().find(y => y.id === d.dataset.vrn); if (!x) return; x.vr = Object.assign({}, x.vr, { note: d.innerText.replace(/\n+$/, "") }); fbSave(); });
    w.addEventListener("click", e => { const g = e.target.closest("[data-apxgo]"); if (g) { e.preventDefault(); const t = $("pdapx-" + g.dataset.apxgo); if (t) t.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
      const d = e.target.closest("[data-vrdel]"); if (!d) return;
      if (!d.dataset.armed) { d.dataset.armed = "1"; d.textContent = "確定刪除？再按一次"; setTimeout(() => { if (d.isConnected) { delete d.dataset.armed; d.textContent = "刪除這份"; } }, 5000); return; }
      const [xi, ai] = d.dataset.vrdel.split("|"), x = (fb.vplan || []).find(y => y.id === xi); if (!x) return; x.apx = (x.apx || []).filter(a => a.id !== ai); fbSave(); pdcaRender(); try { flowRender(); } catch (_) {} });
  })();
