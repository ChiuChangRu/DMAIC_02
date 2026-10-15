  // =====================================================================
  // 魚骨圖 · PDCA 一頁報告：只呈現魚骨圖分頁現有的資料，缺的欄位留空白（列印後手寫補齊）
  // 不改變問答流程；不由 AI 補欄位。版面為自行設計的五段式（記錄／分析／原因／對策／驗證）。
  // =====================================================================
  const PD_LIGHT = "--surface:#FFFFFF;--bg:#F5F1EA;--ink:#1F2933;--muted:#5A6570;--line:#D9D0BF;--grid:#ECE6DA;--teal:#4F7F7A;--teal-soft:#E2EEEC;--copper:#B87333;--copper-soft:#F7E8D9;--copper-text:#985C24;--qic-a:#3E9C8F;--qic-b:#E06A2C;";
  const pdIco = {
    rec: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6 L44 40 H4 Z" fill="var(--qic-b)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 18 v11" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="34.5" r="2.4" fill="var(--ink)"/></svg>`,
    ana: `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke-linecap="round"><circle cx="20" cy="20" r="12" stroke="var(--qic-a)" stroke-width="4"/><path d="M29 29 L42 42" stroke="var(--ink)" stroke-width="5"/><path d="M13 20h14M20 13v14" stroke="var(--ink)" stroke-width="2.5" opacity=".5"/></svg>`,
    why: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 6 H42 L28 24 V38 L20 43 V24 Z" fill="var(--qic-a)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/><text x="34" y="46" font-size="15" font-weight="800" fill="var(--qic-b)" font-family="var(--font-body)">5?</text></svg>`,
    act: `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M30 6a9 9 0 0 0-8 12L8 32a4 4 0 0 0 6 6l14-14a9 9 0 0 0 12-8l-6 3-5-5z" fill="var(--qic-b)" stroke="var(--ink)" stroke-width="2.5"/></svg>`,
    chk: `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="6" width="28" height="36" rx="4" fill="var(--teal-soft)" stroke="var(--ink)" stroke-width="2.5"/><path d="M15 17l3 3 6-6M15 29l3 3 6-6" stroke="var(--qic-a)" stroke-width="3.2"/><path d="M28 18h4M28 30h4" stroke="var(--ink)" stroke-width="2.5"/></svg>`,
    ring: `<svg viewBox="0 0 64 64" aria-hidden="true"><g font-family="var(--font-body)" font-weight="800" font-size="13" text-anchor="middle"><path d="M32 4a28 28 0 0 1 28 28H46a14 14 0 0 0-14-14z" fill="var(--qic-a)"/><path d="M60 32a28 28 0 0 1-28 28V46a14 14 0 0 0 14-14z" fill="var(--qic-b)"/><path d="M32 60A28 28 0 0 1 4 32h14a14 14 0 0 0 14 14z" fill="var(--teal)"/><path d="M4 32A28 28 0 0 1 32 4v14a14 14 0 0 0-14 14z" fill="var(--copper)"/><text x="44" y="22" fill="#fff">P</text><text x="45" y="51" fill="#fff">D</text><text x="20" y="51" fill="#fff">C</text><text x="20" y="22" fill="#fff">A</text></g></svg>`
  };
  const pdBlank = n => Array.from({ length: n }, () => `<span class="pd-line"></span>`).join("");
  function pdCauses() {
    const use = fb.factors.filter(f => f.st === "use"), rank = f => (f.key && f.verify ? 0 : f.key ? 1 : f.verify ? 2 : 3);
    return use.slice().sort((a, b) => rank(a) - rank(b)).slice(0, 3);
  }
  function pdcaHtml(forFile) {
    const prob = fb.problem.trim(), n = st => fb.factors.filter(f => f.st === st).length;
    const nKey = fb.factors.filter(f => f.st === "use" && f.key).length, nVer = fb.factors.filter(f => f.st !== "excl" && f.verify).length;
    const today = new Date().toISOString().slice(0, 10);
    const sec = (ico, tag, title, body) => `<section class="pd-sec"><div class="pd-ico">${pdIco[ico]}<span class="pd-tag">${tag}</span></div><div class="pd-body"><h4>${title}</h4>${body}</div></section>`;
    // 1 記錄問題
    const rec = `<table class="pd-tbl pd-kv"><tbody>
      <tr><th>問題（What）</th><td>${prob ? esc(prob) : pdBlank(1)}</td></tr>
      <tr><th>地點（Where）</th><td>${pdBlank(1)}</td></tr>
      <tr><th>時間（When）</th><td>${pdBlank(1)}</td></tr>
      <tr><th>人員（Who）</th><td>${pdBlank(1)}</td></tr></tbody></table>`;
    // 2 分析問題
    const svg = fbDiagram();
    const ana = `<div class="pd-ana"><div class="pd-fish">${svg ? svg.replace(/ width="\d+(\.\d+)?" height="\d+(\.\d+)?" style="max-width:[^"]*"/, ' width="100%"') : `<p class="pd-empty">尚未建立魚骨圖分類。</p>`}</div>
</div>
      <p class="pd-note">問題陳述見魚頭（右側方框）。魚骨圖只畫「採用」的原因：採用 ${n("use")}（★ 重要 ${nKey}、◇ 待驗證 ${nVer}）、候選 ${n("cand")}、排除 ${n("excl")}。候選與排除理由見「原因清單」。</p>`;
    // 3 找出原因（5 個為什麼）
    const cs = pdCauses(), L = ["A", "B", "C"];
    const head = L.map((l, i) => { const f = cs[i]; return `<th><span class="pd-abc">${l}</span>${f ? `${f.key ? "★ " : ""}${f.verify ? "◇ " : ""}${esc(fbCatName(f))}` : ""}</th>`; }).join("");
    const cell = (f, r) => { if (!f) return pdBlank(1); if (r === 0) return esc(f.text); if (r === 1) { const s = f.subs.filter(x => x.st === "use").map(x => x.text); return s.length ? esc(s.join("；")) : pdBlank(1); } return pdBlank(1); };
    const why = `<table class="pd-tbl pd-why"><thead><tr><th class="pd-wn">為什麼</th>${head}</tr></thead><tbody>${[0, 1, 2, 3, 4].map(r => `<tr><th class="pd-wn">${r + 1}</th>${L.map((_, i) => `<td>${cell(cs[i], r)}</td>`).join("")}</tr>`).join("")}</tbody></table>
      <p class="pd-note">第 1 層為魚骨圖的原因（優先取 ★ 重要、◇ 待驗證），第 2 層為其子因子；第 3～5 層請往下追問「為什麼」後補上。</p>`;
    // 4 採取對策
    const acts = fb.factors.filter(f => f.st !== "excl" && f.verify).map(f => "驗證：" + f.text);
    const rows = acts.concat(Array(Math.max(0, 4 - acts.length)).fill(""));
    const act = `<table class="pd-tbl pd-act"><thead><tr><th>對策／行動（What）</th><th class="pd-w">負責人（Who）</th><th class="pd-w">完成日（When）</th></tr></thead><tbody>${rows.map(a => `<tr><td>${a ? esc(a) : pdBlank(1)}</td><td>${pdBlank(1)}</td><td>${pdBlank(1)}</td></tr>`).join("")}</tbody></table>`;
    // 5 驗證結果
    const box = t => `<li><span class="pd-box"></span>${t}</li>`;
    const chk = `<div class="pd-chk"><div><div class="pd-cap">結果</div><ul>${box("達到目標")}${box("部分改善")}${box("未達目標")}</ul></div>
      <div><div class="pd-cap">標準化</div><ul>${box("新增標準")}${box("更新既有標準")}${box("文件編號：<span class=\"pd-line pd-in\"></span>")}</ul></div>
      <div><div class="pd-cap">核准</div><ul class="pd-sign"><li>達成率：<span class="pd-line pd-in pd-sh"></span> %</li>${box("PDCA 結案核准")}<li>核准人：<span class="pd-line pd-in"></span></li><li>日期：<span class="pd-line pd-in"></span></li></ul></div></div>`;
    const body = `<div class="pd-sheet"${forFile ? "" : ` id="pdcaSheet"`}>
      <header class="pd-head"><div><div class="pd-eyebrow">醫材品質統計工作台 · 魚骨圖</div><h3>PDCA 問題解決報告</h3><div class="pd-meta">產出日期 ${today}${pdCaseName()}</div></div><div class="pd-ring">${pdIco.ring}</div></header>
      ${sec("rec", "P", "1　記錄問題", rec)}${sec("ana", "P", "2　分析問題（魚骨圖）", ana)}${sec("why", "P", "3　找出原因（5 個為什麼）", why)}${sec("act", "D", "4　採取對策", act)}${sec("chk", "C · A", "5　驗證結果與標準化", chk)}
      <footer class="pd-foot">本報告只呈現魚骨圖分頁現有的內容；空白欄位請補齊後歸檔（CAPA／調查報告）。原因的依據與排除理由以「原因清單」為準。</footer></div>`;
    return body;
  }
  function pdCaseName() { try { return caseCur ? "　案件：" + esc(caseCur.name) : ""; } catch (_) { return ""; } }
  function pdcaRender() { const w = $("pdcaWrap"); if (w) w.innerHTML = pdcaHtml(false); }
  function pdcaCss() {   // 從頁面樣式表取出 .pd- 開頭的規則，給下載檔使用
    let out = "";
    for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch (_) { continue; } for (const r of rules) if (r.cssText && /\.pd-/.test(r.cssText) && !/@media print/.test(r.cssText)) out += r.cssText + "\n"; }
    return out;
  }
  (function pdcaInit() {
    if (!$("pdcaWrap")) return;
    $("pdcaPrint").addEventListener("click", () => {
      pdcaRender();
      let host = $("pdPrintHost"); if (!host) { host = document.createElement("div"); host.id = "pdPrintHost"; document.body.appendChild(host); }
      host.innerHTML = pdcaHtml(true); document.body.classList.add("pd-printing");
      const done = () => { document.body.classList.remove("pd-printing"); host.innerHTML = ""; window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done);
      try { window.print(); } catch (_) { done(); fbNote("這個檢視無法開啟列印視窗，請改用「下載報告檔」，用瀏覽器開啟後再列印。"); }
      
    });
    $("pdcaDl").addEventListener("click", () => {
      const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PDCA 問題解決報告</title><style>:root{${PD_LIGHT}--font-body:${cssVar("--font-body") || "sans-serif"};}body{margin:0;background:#EDEAE4;font-family:var(--font-body);color:var(--ink)}.pd-sheet{margin:16px auto}@media print{body{background:#fff}.pd-sheet{margin:0;box-shadow:none;border:0}}\n${pdcaCss()}</style></head><body>${pdcaHtml(true)}</body></html>`;
      fbSaveFile(fbName("html").replace(/^魚骨圖_/, "PDCA報告_"), html);
    });
    pdcaRender();
  })();
