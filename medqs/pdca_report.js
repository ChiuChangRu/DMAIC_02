  // =====================================================================
  // 魚骨圖 · PDCA 一頁報告：只呈現魚骨圖分頁現有的資料，缺的欄位留空白（列印後手寫補齊）
  // 不改變問答流程；不由 AI 補欄位。版面為自行設計的五段式（記錄／分析／原因／對策／驗證）。
  // =====================================================================
  const PD_LIGHT = "--surface:#FFFFFF;--bg:#F5F1EA;--ink:#1F2933;--muted:#5A6570;--line:#D9D0BF;--grid:#ECE6DA;--teal:#4F7F7A;--teal-soft:#E2EEEC;--copper:#B87333;--copper-soft:#F7E8D9;--copper-text:#985C24;--qic-a:#3E9C8F;--qic-b:#E06A2C;--chart-a:#1A8A74;--chart-b:#B66B31;--good:#2E7A4C;--good-soft:#E1F0E6;--bad:#B03A3A;--bad-soft:#F6E1E0;--warn-soft:#FBF1DC;--warn-ink:#7A5410;--code-bg:#FCFAF6;--navy-soft:#E3E8EE;--grid:#ECE6DA;";
  const pdIco = {
    rec: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 6 L44 40 H4 Z" fill="var(--qic-b)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/><path d="M24 18 v11" stroke="var(--ink)" stroke-width="4" stroke-linecap="round"/><circle cx="24" cy="34.5" r="2.4" fill="var(--ink)"/></svg>`,
    ana: `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke-linecap="round"><circle cx="20" cy="20" r="12" stroke="var(--qic-a)" stroke-width="4"/><path d="M29 29 L42 42" stroke="var(--ink)" stroke-width="5"/><path d="M13 20h14M20 13v14" stroke="var(--ink)" stroke-width="2.5" opacity=".5"/></svg>`,
    why: `<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M6 6 H42 L28 24 V38 L20 43 V24 Z" fill="var(--qic-a)" stroke="var(--ink)" stroke-width="2.5" stroke-linejoin="round"/><text x="34" y="46" font-size="15" font-weight="800" fill="var(--qic-b)" font-family="var(--font-body)">5?</text></svg>`,
    act: `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M30 6a9 9 0 0 0-8 12L8 32a4 4 0 0 0 6 6l14-14a9 9 0 0 0 12-8l-6 3-5-5z" fill="var(--qic-b)" stroke="var(--ink)" stroke-width="2.5"/></svg>`,
    hist: `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M38 18a15 15 0 1 0 2 12" stroke="var(--qic-b)" stroke-width="4"/><path d="M40 8v10H30" stroke="var(--ink)" stroke-width="3.5"/><path d="M24 15v10l6 4" stroke="var(--ink)" stroke-width="3"/></svg>`,
    chk: `<svg viewBox="0 0 48 48" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="6" width="28" height="36" rx="4" fill="var(--teal-soft)" stroke="var(--ink)" stroke-width="2.5"/><path d="M15 17l3 3 6-6M15 29l3 3 6-6" stroke="var(--qic-a)" stroke-width="3.2"/><path d="M28 18h4M28 30h4" stroke="var(--ink)" stroke-width="2.5"/></svg>`,
    ring: `<svg viewBox="0 0 64 64" aria-hidden="true"><g font-family="var(--font-body)" font-weight="800" font-size="13" text-anchor="middle"><path d="M32 4a28 28 0 0 1 28 28H46a14 14 0 0 0-14-14z" fill="var(--qic-a)"/><path d="M60 32a28 28 0 0 1-28 28V46a14 14 0 0 0 14-14z" fill="var(--qic-b)"/><path d="M32 60A28 28 0 0 1 4 32h14a14 14 0 0 0 14 14z" fill="var(--teal)"/><path d="M4 32A28 28 0 0 1 32 4v14a14 14 0 0 0-14 14z" fill="var(--copper)"/><text x="44" y="22" fill="#fff">P</text><text x="45" y="51" fill="#fff">D</text><text x="20" y="51" fill="#fff">C</text><text x="20" y="22" fill="#fff">A</text></g></svg>`
  };
  const pdBlank = n => Array.from({ length: n }, () => `<span class="pd-line"></span>`).join("");
  function pdCauses() {
    const use = fb.factors.filter(f => f.st === "use"), rank = f => (f.key && f.verify ? 0 : f.key ? 1 : f.verify ? 2 : 3);
    return use.slice().sort((a, b) => rank(a) - rank(b)).slice(0, 3);
  }
  // 手動修改：存在 fb.pdca（跟著魚骨圖自動存檔、匯出、案件存檔）。t = 文字欄位覆寫，c = 勾選框，rows = 對策多加的列數
  function pdState() { if (!fb.pdca || typeof fb.pdca !== "object") fb.pdca = {}; const P = fb.pdca; if (!P.t || typeof P.t !== "object") P.t = {}; if (!P.c || typeof P.c !== "object") P.c = {}; if (!(P.rows >= 0)) P.rows = 0; return P; }
  // mode：screen = 輔助工具（可填、會存檔）；file = 下載檔（可填、不存檔）；print = 列印（純文字）
  function pdcaHtml(mode) {
    mode = mode || "screen"; const forFile = mode !== "screen";
    const P = pdState(), edit = mode !== "print", keep = mode === "screen";
    const ED = (k, auto, inl) => {   // 可編輯欄位：有手動修改用修改值，沒有就用自動內容；都沒有就留空白線
      auto = auto || ""; const ov = Object.prototype.hasOwnProperty.call(P.t, k) ? P.t[k] : null, val = ov != null ? ov : auto;
      if (!edit) return val ? `<span class="pd-tx${inl ? " pd-in" : ""}">${esc(val)}</span>` : `<span class="pd-line${inl ? " pd-in" : ""}"></span>`;
      return `<div class="pd-ed${inl ? " pd-in" : ""}${keep && ov != null ? " pd-mod" : ""}" contenteditable="plaintext-only" spellcheck="false"${keep ? ` data-k="${k}" data-auto="${esc(auto)}"` : ""} title="點一下可以修改">${esc(val)}</div>`;
    };
    const BOX = (k, t) => { const on = !!P.c[k]; return `<li>${edit ? `<button type="button" class="pd-box${on ? " on" : ""}" data-c="${keep ? k : ""}" aria-pressed="${on}" aria-label="${t.replace(/<[^>]+>/g, "")}"></button>` : `<span class="pd-box${on ? " on" : ""}"></span>`}${t}</li>`; };
    const prob = fb.problem.trim(), n = st => fb.factors.filter(f => f.st === st).length;
    const nKey = fb.factors.filter(f => f.st === "use" && f.key).length, nVer = fb.factors.filter(f => f.st !== "excl" && f.verify).length;
    const today = new Date().toISOString().slice(0, 10), det = fb.detail || {};
    const sec = (ico, tag, title, body) => `<section class="pd-sec"><div class="pd-ico">${pdIco[ico]}<span class="pd-tag">${tag}</span></div><div class="pd-body"><h4>${title}</h4>${body}</div></section>`;
    // 1 記錄問題
    const rec = `<table class="pd-tbl pd-kv"><tbody>
      <tr><th>問題（What）</th><td>${ED("rec.what", prob)}</td></tr>
      <tr><th>地點（Where）</th><td>${ED("rec.where", "")}</td></tr>
      <tr><th>時間（When）</th><td>${ED("rec.when", (det.when || "").trim())}</td></tr>
      <tr><th>人員（Who）</th><td>${ED("rec.who", "")}</td></tr></tbody></table>`;
    // 2 分析問題（魚骨圖本身請在上方修改）
    const svg = fbDiagram();
    const ana = `<div class="pd-ana"><div class="pd-fish">${svg ? svg.replace(/ width="\d+(\.\d+)?" height="\d+(\.\d+)?" style="max-width:[^"]*"/, ' width="100%"') : `<p class="pd-empty">尚未建立魚骨圖分類。</p>`}</div></div>
      <p class="pd-note">問題陳述見魚頭（右側方框）。魚骨圖只畫「採用」的原因：採用 ${n("use")}（★ 重要 ${nKey}、◇ 待驗證 ${nVer}）、候選 ${n("cand")}、排除 ${n("excl")}。候選與排除理由見「原因清單」。${keep ? "魚骨圖請在上方 STEP 2 修改。" : ""}</p>
      ${P.t["ana.note"] || edit ? `<div class="pd-cap pd-cap2">補充說明</div>${ED("ana.note", "")}` : ""}`;
    // 3 找出原因（5 個為什麼）
    const cs = pdCauses(), L = ["A", "B", "C"];
    const head = L.map((l, i) => { const f = cs[i]; return `<th><span class="pd-abc">${l}</span>${f ? `${f.key ? "★ " : ""}${f.verify ? "◇ " : ""}${esc(fbCatName(f))}` : ""}</th>`; }).join("");
    const auto = (f, r) => { if (!f) return ""; if (r === 0) return f.text; if (r === 1) return f.subs.filter(x => x.st === "use").map(x => x.text).join("；"); return ""; };
    const why = `<table class="pd-tbl pd-why"><thead><tr><th class="pd-wn">為什麼</th>${head}</tr></thead><tbody>${[0, 1, 2, 3, 4].map(r => `<tr><th class="pd-wn">${r + 1}</th>${L.map((_, i) => `<td>${ED(`why.${i}.${r}`, auto(cs[i], r))}</td>`).join("")}</tr>`).join("")}</tbody></table>
      <p class="pd-note">第 1 層為魚骨圖的原因（優先取 ★ 重要、◇ 待驗證），第 2 層為其子因子；第 3～5 層請往下追問「為什麼」後補上。</p>`;
    // 4 採取對策：有勾選的驗證項目就用勾選的；沒有才用「◇ 待驗證」自動列（避免同一原因出現兩次）
    const vp = (fb.vplan || []).filter(x => x.on);
    const ssN = x => { const s = x.ss; if (!s || !s.q) return ""; return s.q === "none" ? "不適用（不需統計）" : s.n || ""; };
    const ssW = x => { const s = x.ss; if (!s || !s.q) return ""; return s.why || ""; };
    const acts = vp.length ? vp.map(x => ({ what: "驗證：" + x.cause + (x.method ? " — " + x.method : ""), tool: x.tool, n: ssN(x), why: ssW(x) })) : fb.factors.filter(f => f.st !== "excl" && f.verify).map(f => ({ what: "驗證：" + f.text, tool: "" }));
    const nRow = Math.max(4, acts.length) + P.rows;
    const act = `<table class="pd-tbl pd-act"><thead><tr><th>對策／行動（What）</th><th class="pd-tool">驗證策略</th><th class="pd-ss">樣本數與理由</th><th class="pd-w">負責人</th><th class="pd-w">完成日</th></tr></thead><tbody>${Array.from({ length: nRow }, (_, i) => `<tr><td>${ED(`act.${i}.what`, acts[i] ? acts[i].what : "")}</td><td>${ED(`act.${i}.tool`, acts[i] ? acts[i].tool : "")}</td><td class="pd-ssc"><div class="pd-ssn">${ED(`act.${i}.n`, acts[i] ? acts[i].n || "" : "")}</div><div class="pd-ssw">${ED(`act.${i}.why`, acts[i] ? acts[i].why || "" : "")}</div></td><td>${ED(`act.${i}.who`, "")}</td><td>${ED(`act.${i}.when`, "")}</td></tr>`).join("")}</tbody></table>
      ${keep && vp.length ? `<p class="pd-note">對策取自 ③ 驗證計畫勾選的 ${vp.length} 個驗證項目；樣本數與理由取自「樣本數規劃」頁的驗證項目清單。</p>` : ""}${edit ? `<div class="pd-rowbtn pd-noprint"><button type="button" class="pd-mini" data-pd="addrow">＋ 新增一列</button>${keep && P.rows ? `<button type="button" class="pd-mini" data-pd="delrow">－ 刪除最後一列</button>` : ""}</div>` : ""}`;
    // 5 驗證結果
    let vrT = ""; try { vrT = vrTableHtml(mode); } catch (_) {}
    const chk = vrT + `<div class="pd-chk"><div><div class="pd-cap">結果</div><ul>${BOX("res.ok", "達到目標")}${BOX("res.part", "部分改善")}${BOX("res.ng", "未達目標")}</ul>${P.t["res.note"] || edit ? `<div class="pd-chk-note">${ED("res.note", "")}</div>` : ""}</div>
      <div><div class="pd-cap">標準化</div><ul>${BOX("std.new", "新增標準")}${BOX("std.upd", "更新既有標準")}<li>${edit ? "" : ""}文件編號：${ED("std.doc", "", true)}</li></ul></div>
      <div><div class="pd-cap">核准</div><ul class="pd-sign"><li>達成率：${ED("ap.rate", "", true)} %</li>${BOX("ap.ok", "PDCA 結案核准")}<li>核准人：${ED("ap.who", "", true)}</li><li>日期：${ED("ap.date", "", true)}</li></ul></div></div>`;
    let rds = null; try { rds = rdState(); } catch (_) {}
    const RL = { ng: "未達目標", part: "部分改善", ok: "達到目標" }, stepLab = ["定義問題", "魚骨圖", "驗證項目", "樣本數", "統計分析", "PDCA 報告"];
    const hist = rds && rds.list.length ? sec("hist", "歷程", "6　前幾輪的結果", `<table class="pd-tbl pd-hist"><thead><tr><th style="width:62px">輪次</th><th style="width:74px">日期</th><th style="width:92px">從哪一步開始</th><th style="width:76px">結果</th><th>說明</th></tr></thead><tbody>${rds.list.map(x => `<tr><td>第 ${x.n} 輪</td><td>${new Date(x.date).toISOString().slice(0, 10)}</td><td>${x.from >= 0 ? stepLab[x.from] : "—"}</td><td>${RL[x.result] || ""}</td><td>${esc(x.note || "")}</td></tr>`).join("")}<tr><td>第 ${rds.n} 輪</td><td>—</td><td>${rds.from >= 0 ? stepLab[rds.from] : "—"}</td><td>進行中</td><td>本報告</td></tr></tbody></table><p class="pd-note">各輪的完整內容封存在案件中，可在流程列「各輪紀錄」查看或匯出。</p>`) : "";
    const nMod = Object.keys(P.t).length + Object.values(P.c).filter(Boolean).length;
    const body = `<div class="pd-sheet"${forFile ? "" : ` id="pdcaSheet"`}>
      <header class="pd-head"><div><div class="pd-eyebrow">PDCA品質輔助系統 · 魚骨圖</div><h3>PDCA 問題解決報告</h3><div class="pd-meta">產出日期 ${today}${pdCaseName()}</div></div><div class="pd-ring">${pdIco.ring}</div></header>
      ${sec("rec", "P", "1　記錄問題", rec)}${sec("ana", "P", "2　分析問題（魚骨圖）", ana)}${sec("why", "P", "3　找出原因（5 個為什麼）", why)}${sec("act", "D", "4　採取對策", act)}${sec("chk", "C · A", "5　驗證結果與標準化", chk)}${hist}
      <footer class="pd-foot">${nMod ? "本報告含人工補充與修改的內容。" : "本報告只呈現魚骨圖分頁現有的內容。"}空白欄位請補齊後歸檔（CAPA／調查報告）。原因的依據與排除理由以「原因清單」為準。</footer>${(() => { try { return vrApxHtml(mode); } catch (_) { return ""; } })()}</div>`;
    return body;
  }
  function pdCaseName() { try { return caseCur ? "　案件：" + esc(caseCur.name) : ""; } catch (_) { return ""; } }
  function pdModHint() { const P = pdState(), n = Object.keys(P.t).length + Object.values(P.c).filter(Boolean).length + P.rows, b = $("pdcaReset"); if (b && !b.dataset.armed) { b.hidden = !n; b.textContent = `清除手動修改（${n}）`; } }
  function pdcaStatus() {
    const box = $("pdcaStatus"); if (!box) return; const P = pdState();
    const use = fb.factors.filter(f => f.st === "use"), ver = fb.factors.filter(f => f.st !== "excl" && f.verify), vp = (fb.vplan || []).filter(x => x.on);
    const blank = ["rec.where", "rec.when", "rec.who"].filter(k => !(P.t[k] || "").trim() && !(k === "rec.when" && (fb.detail && fb.detail.when || "").trim())).map(k => ({ "rec.where": "地點", "rec.when": "時間", "rec.who": "人員" })[k]);
    const nMod = Object.keys(P.t).length + Object.values(P.c).filter(Boolean).length;
    const res = P.c["res.ok"] ? "達到目標" : P.c["res.part"] ? "部分改善" : P.c["res.ng"] ? "未達目標" : "";
    const row = (ok, t, d, go) => `<li class="${ok ? "ok" : "todo"}"><span class="pd-st-ic">${ok ? "✓" : "○"}</span><span><b>${t}</b>　${d}${go ? `　<button type="button" class="linkbtn" data-route-go="${go}">前往</button>` : ""}</span></li>`;
    let rdn = null; try { const o = rdState(); if (o.list.length) rdn = o; } catch (_) {}
    box.innerHTML = `${rdn ? `<p class="pd-round">目前是<b>第 ${rdn.n} 輪</b>，前 ${rdn.list.length} 輪的結果列在報告第 6 段。</p>` : ""}<ul class="pd-st">
      ${row(!!fb.problem.trim(), "1 記錄問題", fb.problem.trim() ? (blank.length ? `問題已帶入；${blank.join("、")}尚未填寫（可在下方報告補填）` : "問題、地點、時間、人員都有內容") : "尚未填寫問題點", fb.problem.trim() ? "" : "home")}
      ${row(use.length > 0, "2 分析問題", use.length ? `魚骨圖已採用 ${use.length} 個原因` : "魚骨圖還沒有採用的原因", use.length ? "" : "fishbone")}
      ${row(use.length > 0, "3 找出原因", use.length ? `A／B／C 取前 ${Math.min(3, use.length)} 個原因；第 3～5 層需自行追問補填` : "需先在魚骨圖採用原因", "")}
      ${row(vp.length > 0 || ver.length > 0, "4 採取對策", vp.length ? `採用 ③ 驗證計畫勾選的 ${vp.length} 個驗證項目` : ver.length ? `暫用 ${ver.length} 個「◇ 待驗證」原因；建議到 ③ 驗證計畫勾選驗證項目` : "還沒有驗證項目", vp.length ? "" : "plan")}
      ${vp.length ? (() => { const ok = vp.filter(x => { try { return svOk(x); } catch (_) { return false; } }).length, nb = vp.filter(x => { try { return svNoBasis(x); } catch (_) { return false; } }).length; return row(ok === vp.length && !nb, "4 樣本數與理由", ok < vp.length ? `${ok}／${vp.length} 個驗證項目已有樣本數與理由；沒寫是稽核缺失（ISO 13485 §7.3.6）` : nb ? `${nb} 個項目的理由還有空白（＿＿）或「請填」沒寫` : `${vp.length} 個驗證項目都有樣本數與理由`, ok < vp.length || nb ? "plan" : ""); })() : ""}
      ${(() => { let L = []; try { L = vrItems(); } catch (_) {} if (!L.length) return ""; const st = L.filter(x => !vrNonStat(x)), ns = L.filter(x => vrNonStat(x)), a = st.filter(x => (x.apx || []).length).length, b = ns.filter(x => (x.vr || {}).st).length;
        return row(a === st.length && b === ns.length, "5 各項驗證結論", `統計類 ${a}／${st.length} 項已存入結果${st.length ? "（在 ⑤ 統計分析的結果下方按「驗證結束，並儲存到報告」）" : ""}；不用統計 ${b}／${ns.length} 項已填結論（在下方報告第 5 段）`, a < st.length ? "plan" : ""); })()}
      ${row(!!res, "5 驗證結果", res ? `已勾選：${res}` : "驗證完成後，在下方報告勾選結果與核准", "")}
    </ul><p class="hint">${nMod ? `報告上有 ${nMod} 處手動填寫或勾選（黃底）。` : "報告上還沒有手動填寫的內容。"}可識別資料（人名、單位、醫院）請自行判斷是否填在這裡，或下載後再填。</p>`;
  }
  let pdStT = 0; function pdStatusSoon() { clearTimeout(pdStT); pdStT = setTimeout(() => { try { pdcaStatus(); flowRender(); } catch (_) {} }, 300); }   // 報告上填寫、勾選後更新上方狀態
  function pdcaRender() { try { pdcaStatus(); } catch (_) {} try { svRender(); } catch (_) {} try { vfRender(); } catch (_) {} try { hubRender(); } catch (_) {} const w = $("pdcaWrap"); if (!w) return; if (w.contains(document.activeElement) && document.activeElement.classList.contains("pd-ed")) return; w.innerHTML = pdcaHtml("screen"); pdModHint(); }
  function pdcaCss() {   // 從頁面樣式表取出 .pd- 開頭的規則，給下載檔使用
    let out = "";
    for (const sh of document.styleSheets) { let rules; try { rules = sh.cssRules; } catch (_) { continue; } for (const r of rules) if (r.cssText && /\.pd-/.test(r.cssText) && !/@media print/.test(r.cssText)) out += r.cssText + "\n"; }
    return out;
  }
  (function pdcaInit() {
    if (!$("pdcaWrap")) return;
    $("pdcaPrint").addEventListener("click", () => {
      pdState().out = true; fbSave();
      pdcaRender();
      let host = $("pdPrintHost"); if (!host) { host = document.createElement("div"); host.id = "pdPrintHost"; document.body.appendChild(host); }
      host.innerHTML = pdcaHtml("print"); document.body.classList.add("pd-printing");
      const done = () => { document.body.classList.remove("pd-printing"); host.innerHTML = ""; window.removeEventListener("afterprint", done); };
      window.addEventListener("afterprint", done);
      try { window.print(); } catch (_) { done(); fbNote("這個檢視無法開啟列印視窗，請改用「下載報告檔」，用瀏覽器開啟後再列印。"); }
      
    });
    $("pdcaDl").addEventListener("click", () => {
      pdState().out = true; fbSave();
      const bar = `<div class="pd-bar pd-noprint"><b>這個檔案可以直接填寫：</b>點空白欄位打字、點方框勾選、「＋ 新增一列」加對策。<b>填的內容不會存檔，重新整理或關閉就會消失</b>，請用右邊按鈕存成 PDF。<button type="button" onclick="window.print()">列印／存成 PDF</button></div>`;
      const js = `document.addEventListener("click",function(e){var b=e.target.closest(".pd-box");if(b){b.classList.toggle("on");return;}var a=e.target.closest("[data-pd=addrow]");if(a){var tb=document.querySelector(".pd-act tbody"),r=tb.lastElementChild.cloneNode(true);r.querySelectorAll(".pd-ed").forEach(function(x){x.textContent="";});tb.appendChild(r);}});document.addEventListener("paste",function(e){var el=e.target.closest&&e.target.closest(".pd-ed");if(!el)return;e.preventDefault();document.execCommand("insertText",false,(e.clipboardData||window.clipboardData).getData("text/plain"));});`;
      const html = `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PDCA 問題解決報告</title><style>:root{${PD_LIGHT}--font-body:${cssVar("--font-body") || "sans-serif"};}body{margin:0;background:#EDEAE4;font-family:var(--font-body);color:var(--ink)}.pd-sheet{margin:12px auto 24px}.pd-bar{max-width:860px;margin:12px auto 0;padding:10px 14px;background:#FFF4D6;border:1px solid #E8B86A;border-radius:6px;font-size:13.5px;line-height:1.6}.pd-bar button{margin-left:8px;font:inherit;font-weight:700;background:#A34A16;color:#fff;border:0;border-radius:6px;padding:4px 12px;cursor:pointer}\n${pdcaCss()}\n@media print{body{background:#fff}.pd-noprint{display:none!important}.pd-sheet{margin:0!important;box-shadow:none!important;border:0!important;padding:0!important;zoom:.78}.pd-ed{background:none!important;box-shadow:none!important}.pd-tbl th,.pd-tbl td{padding:3px 7px}.pd-body{padding:5px 0 6px 10px}.pd-fish svg{max-height:330px}.pd-ed:empty{min-height:1.2em}.pd-cap2:has(+ .pd-ed:empty),.pd-cap2 + .pd-ed:empty,.pd-chk-note:has(.pd-ed:empty){display:none}.pd-ed:empty{border-bottom:1px dashed #B9B0A0}.pd-sec,.pd-tbl tr{break-inside:avoid}@page{size:A4;margin:10mm}}</style></head><body>${bar}${pdcaHtml("file")}<script>${js}<\/script></body></html>`;
      fbSaveFile(fbName("html").replace(/^魚骨圖_/, "PDCA報告_"), html);
    });
    document.addEventListener("click", e => { const g = e.target.closest("[data-goto-pdca],[data-route-go]"); if (!g) return; const to = g.dataset.routeGo || "pdca"; const b = document.querySelector(`.toolnav [data-route="${to}"]`); if (b) b.click(); window.scrollTo({ top: 0, behavior: "smooth" }); });
    const wrap = $("pdcaWrap");
    wrap.addEventListener("input", e => { const el = e.target.closest(".pd-ed"); if (!el || !el.dataset.k) return; const P = pdState(), k = el.dataset.k, v = el.innerText.replace(/\n+$/, "");
      if (v === (el.dataset.auto || "")) delete P.t[k]; else P.t[k] = v; el.classList.toggle("pd-mod", k in P.t); pdModHint(); fbSave(); pdStatusSoon(); });
    wrap.addEventListener("paste", e => { const el = e.target.closest(".pd-ed"); if (!el) return; e.preventDefault(); const t = (e.clipboardData || window.clipboardData).getData("text/plain"); try { document.execCommand("insertText", false, t); } catch (_) {} });
    wrap.addEventListener("click", e => {
      const b = e.target.closest(".pd-box[data-c]"); if (b) { const P = pdState(), k = b.dataset.c; if (P.c[k]) delete P.c[k]; else P.c[k] = true; b.classList.toggle("on", !!P.c[k]); b.setAttribute("aria-pressed", String(!!P.c[k])); pdModHint(); fbSave(); pdStatusSoon(); return; }
      const r = e.target.closest("[data-pd]"); if (!r) return; const P = pdState();
      if (r.dataset.pd === "addrow") P.rows++; else if (r.dataset.pd === "delrow" && P.rows > 0) { const i = document.querySelectorAll("#pdcaSheet .pd-act tbody tr").length - 1; ["what", "tool", "n", "why", "who", "when"].forEach(c => delete P.t[`act.${i}.${c}`]); P.rows--; }
      pdcaRender(); fbSave(); });
    $("pdcaReset").addEventListener("click", e => { const b = e.currentTarget;
      if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "確定清除？再按一次（無法復原）"; setTimeout(() => { delete b.dataset.armed; pdModHint(); }, 5000); return; }
      delete b.dataset.armed; fb.pdca = {}; pdcaRender(); fbSave(); fbNote("已清除報告上的手動修改。"); });
    pdcaRender();
  })();

  // =====================================================================
  // STEP 3 驗證項目清單：AI 建議（verify 區塊）→ 使用者勾選、修改 → 帶入 PDCA 報告第 4 段
  // =====================================================================
  function vpParse(text) {
    const m = String(text).match(/```verify\s*([\s\S]*?)```/); if (!m) return null;
    try { const o = JSON.parse(m[1]); const it = (Array.isArray(o.items) ? o.items : []).filter(x => x && typeof x.cause === "string" && x.cause.trim()).slice(0, 20)
      .map(x => ({ cause: x.cause.trim().slice(0, 160), method: String(x.method || "").trim().slice(0, 300), data: String(x.data || "").trim().slice(0, 300), tool: String(x.tool || "").trim().slice(0, 120) }));
      return it.length ? it : null; } catch (_) { return null; }
  }
  function vpChatHtml(items) {
    return `<div class="fb-sug vp-sug"><p class="hint">AI 建議 ${items.length} 個驗證項目（標 * 為推論）。列入清單後，在 ③ 驗證計畫勾選要採用的；可以修改每一欄。</p><button type="button" class="btn small primary" data-vpadd="${esc(JSON.stringify(items))}">列入 ③ 驗證計畫（${items.length} 項）</button></div>`;
  }
  const vpKey = x => (x.cause + "|" + x.method).replace(/\s+/g, "");
  // 相似原因判斷（AI 問兩次時寫法略有不同）：去掉標點、* 後比較字元雙字組重疊（Dice ≥ 0.6）
  const vpNorm = t => String(t || "").replace(/[\s*＊，。、；：:,.;（）()「」『』！!？?－\-／/]/g, "");
  function vpSim(a, b) {
    a = vpNorm(a); b = vpNorm(b); if (!a || !b) return 0; if (a === b || a.includes(b) || b.includes(a)) return 1;
    const g = s => { const m = new Map(); for (let i = 0; i < s.length - 1; i++) { const k = s.slice(i, i + 2); m.set(k, (m.get(k) || 0) + 1); } return m; };
    const A = g(a), B = g(b); let hit = 0; A.forEach((v, k) => { hit += Math.min(v, B.get(k) || 0); });
    return 2 * hit / Math.max(1, a.length - 1 + b.length - 1);
  }
  const VP_SIM = 0.6;
  // 魚骨圖標「◇ 待驗證」（且未排除）的原因，自動帶入驗證項目清單；使用者可以改、刪、自行新增
  // fid＝對應的魚骨圖原因；fbt＝帶入時的原因文字（使用者沒改過原因時，魚骨圖改字會跟著更新）；刪掉的記在 fb.vpSkip，不再帶回
  function vpSyncFb() {
    if (!fb || !Array.isArray(fb.factors)) return 0;
    const L = fb.vplan || (fb.vplan = []), skip = new Set(fb.vpSkip || []); let n = 0, ch = false;
    fb.factors.filter(f => f.verify && f.st !== "excl" && String(f.text || "").trim()).forEach(f => {
      const t = f.text.trim(), lk = L.find(y => y.fid === f.id);
      if (lk) { if (lk.fbt && lk.cause === lk.fbt && t !== lk.fbt) { lk.cause = t; lk.fbt = t; ch = true; } return; }
      if (skip.has(f.id)) return;
      const sim = L.find(y => !y.fid && vpSim(y.cause, t) >= VP_SIM); if (sim) { sim.fid = f.id; ch = true; return; }
      L.push({ id: fid(), on: true, fid: f.id, fbt: t, cause: t, method: "", data: "", tool: "" }); n++; ch = true;
    });
    if (ch) fbSave();
    return n;
  }
  function vpSkipAdd(x) { if (x && x.fid) { fb.vpSkip = (fb.vpSkip || []).filter(v => v !== x.fid).concat(x.fid); } }
  function vpFbOf(x) { return x.fid ? fb.factors.find(f => f.id === x.fid) : null; }
  function vpRender() {
    const box = $("fbVplan"); if (!box) return; const ae = document.activeElement; if (box.contains(ae) && (ae.classList.contains("vp-ed") || (ae.tagName === "INPUT" && ae.classList.contains("vp-tool")))) return;
    vpSyncFb(); const L = fb.vplan || (fb.vplan = []);
    const ed = (x, k, ph) => `<div class="vp-ed" contenteditable="plaintext-only" spellcheck="false" data-id="${x.id}" data-f="${k}" data-ph="${ph}">${esc(x[k])}</div>`;
    const nOn = L.filter(x => x.on).length;
    const dupOf = L.map((x, i) => { for (let j = 0; j < i; j++) if (vpSim(L[j].cause, x.cause) >= VP_SIM) return j + 1; return 0; });
    box.innerHTML = `<div class="vp-head"><b>驗證項目清單</b><span class="hint">${L.length ? `共 ${L.length} 項，已勾選 ${nOn} 項；勾選的會帶入 PDCA 報告第 4 段「採取對策」。` : "在 ② 魚骨圖 把原因標「◇ 待驗證」會自動帶入；也可以按「請 AI 建議驗證策略」或自行新增。"}</span></div>
      ${L.length ? `<div class="scroll-x"><table class="vp-tbl"><thead><tr><th class="vp-c">採用</th><th>原因</th><th>驗證方式</th><th>收集資料</th><th>驗證策略</th><th class="vp-c"></th></tr></thead><tbody>${L.map(x => `<tr class="${x.on ? "on" : ""}"><td class="vp-c"><input type="checkbox" data-vpon="${x.id}"${x.on ? " checked" : ""} aria-label="採用：${esc(x.cause)}"></td><td>${ed(x, "cause", "原因")}${(f => f ? `<div class="vp-src">🐟 魚骨圖帶入${f.verify ? "" : "（魚骨圖已取消 ◇）"}</div>` : "")(vpFbOf(x))}${dupOf[L.indexOf(x)] ? `<div class="vp-dup">與第 ${dupOf[L.indexOf(x)]} 項相似，確認後可刪除或合併</div>` : ""}</td><td>${ed(x, "method", "驗證方式")}</td><td>${ed(x, "data", "收集資料")}</td><td>${vpToolCell(x)}</td><td class="vp-c"><button type="button" class="vp-del" data-vpdel="${x.id}" aria-label="刪除這一項">×</button></td></tr>`).join("")}</tbody></table></div>` : ""}
      <div class="run-row" style="margin-top:6px"><button type="button" class="btn small" data-vpnew="1">＋ 自行新增項目</button>${L.some(x => !x.on) ? `<button type="button" class="btn small" data-vpclean="1">刪除未勾選的項目</button>` : ""}</div>`;
  }
  const VP_TOOLS = ["假設檢定－單組對目標值", "假設檢定－兩組獨立", "假設檢定－兩組成對", "假設檢定－三組以上（ANOVA）", "假設檢定－同等性（TOST）", "假設檢定－次數資料（不良率、卡方）", "假設檢定－統計允差區間", "相關與回歸", "MSA－Gage R&R", "MSA－偏差／線性／穩定性", "MSA－屬性一致性", "SPC－管制圖與製程能力", "DOE－實驗設計", "田口方法", "樣本數規劃", "不用統計－文件審查／比對", "不用統計－修改 IFU／標示", "不用統計－設計變更／防呆", "不用統計－100% 全檢", "不用統計－供應商管制（COA、稽核）", "不用統計－引用既有資料或文獻", "不用統計－工程判斷"];
  // 驗證策略：一般下拉選單（datalist 在格子有字時只列出相符的選項，看起來像不能改）；選「自行輸入…」才換成文字框
  let vpCustom = "";
  function vpToolCell(x) {
    const v = x.tool || "";
    if (vpCustom === x.id) return `<input class="vp-tool" data-id="${x.id}" value="${esc(v)}" placeholder="輸入驗證策略，按 Enter 完成" aria-label="驗證策略（自行輸入）">`;
    const stat = VP_TOOLS.filter(t => !/^不用統計/.test(t)), non = VP_TOOLS.filter(t => /^不用統計/.test(t)), other = v && !VP_TOOLS.includes(v);
    const o = t => `<option value="${esc(t)}"${t === v ? " selected" : ""}>${esc(t)}</option>`;
    return `<select class="vp-tool" data-id="${x.id}" aria-label="驗證策略">${v ? "" : `<option value="" selected>請選擇</option>`}${other ? `<option value="${esc(v)}" selected>${esc(v)}</option>` : ""}<optgroup label="統計工具">${stat.map(o).join("")}</optgroup><optgroup label="不用統計">${non.map(o).join("")}</optgroup><optgroup label="其他"><option value="__custom">✎ 自行輸入…</option></optgroup></select>`;
  }
  function vpChanged(full) { fbSave(); if (full) vpRender(); try { pdcaRender(); } catch (_) {} }
  (function vpInit() {
    const box = $("fbVplan"); if (!box) return;
    box.addEventListener("input", e => { const ti = e.target.closest("input.vp-tool"); if (!ti) return; const x = (fb.vplan || []).find(y => y.id === ti.dataset.id); if (!x) return; x.tool = ti.value; fbSave(); try { pdcaRender(); } catch (_) {} });
    box.addEventListener("change", e => { const s = e.target.closest("select.vp-tool"); if (!s) return; const x = (fb.vplan || []).find(y => y.id === s.dataset.id); if (!x) return;
      if (s.value === "__custom") { vpCustom = x.id; vpRender(); const i = box.querySelector(`input.vp-tool[data-id="${x.id}"]`); if (i) { i.focus(); i.select(); } return; }
      x.tool = s.value; vpChanged(true); });
    const vpDone = i => { if (vpCustom !== i.dataset.id) return; vpCustom = ""; setTimeout(() => vpChanged(true), 0); };
    box.addEventListener("focusout", e => { const i = e.target.closest("input.vp-tool"); if (i) vpDone(i); });
    box.addEventListener("keydown", e => { const i = e.target.closest("input.vp-tool"); if (i && e.key === "Enter") { e.preventDefault(); i.blur(); } });
    box.addEventListener("input", e => { const el = e.target.closest(".vp-ed"); if (!el) return; const x = (fb.vplan || []).find(y => y.id === el.dataset.id); if (!x) return; x[el.dataset.f] = el.innerText.replace(/\n+$/, ""); vpChanged(false); });
    box.addEventListener("paste", e => { const el = e.target.closest(".vp-ed"); if (!el) return; e.preventDefault(); try { document.execCommand("insertText", false, (e.clipboardData || window.clipboardData).getData("text/plain")); } catch (_) {} });
    box.addEventListener("change", e => { const c = e.target.closest("[data-vpon]"); if (!c) return; const x = (fb.vplan || []).find(y => y.id === c.dataset.vpon); if (x) { x.on = c.checked; vpChanged(true); } });
    box.addEventListener("click", e => {
      const d = e.target.closest("[data-vpdel]"); if (d) { vpSkipAdd((fb.vplan || []).find(y => y.id === d.dataset.vpdel)); fb.vplan = (fb.vplan || []).filter(y => y.id !== d.dataset.vpdel); vpChanged(true); return; }
      if (e.target.closest("[data-vpnew]")) { (fb.vplan || (fb.vplan = [])).push({ id: fid(), on: true, cause: "", method: "", data: "", tool: "" }); vpChanged(true); const last = box.querySelector("tbody tr:last-child .vp-ed"); if (last) last.focus(); return; }
      const cl = e.target.closest("[data-vpclean]"); if (cl) { if (!cl.dataset.armed) { cl.dataset.armed = "1"; cl.textContent = "確定刪除未勾選的？再按一次"; return; } (fb.vplan || []).filter(y => !y.on).forEach(vpSkipAdd); fb.vplan = (fb.vplan || []).filter(y => y.on); vpChanged(true); }
    });
    document.addEventListener("click", e => {   // AI 回答下的「列入清單」
      const b = e.target.closest("[data-vpadd]"); if (!b || b.disabled) return;
      let items; try { items = JSON.parse(b.dataset.vpadd); } catch (_) { return; }
      const L = fb.vplan || (fb.vplan = []), have = new Set(L.map(vpKey)); let n = 0;
      let skip = 0, fill = 0;
      items.forEach(x => {
        const y = L.find(y => vpKey(y) === vpKey(x) || vpSim(y.cause, x.cause) >= VP_SIM);
        if (y) { let hit = false; ["method", "data", "tool"].forEach(k => { if (!String(y[k] || "").trim() && x[k]) { y[k] = x[k]; hit = true; } }); if (hit) fill++; else skip++; return; }   // 清單已有（例如魚骨圖帶入的）：只補空白欄位，不覆蓋使用者寫的
        L.push({ id: fid(), on: false, cause: x.cause, method: x.method, data: x.data, tool: x.tool }); n++; });
      b.disabled = true; b.textContent = n || fill ? [n ? `已列入 ${n} 項` : "", fill ? `已補上 ${fill} 項的空白欄位` : "", skip ? `${skip} 項已在清單中，略過` : ""].filter(Boolean).join("；") : "這些原因都已在清單中";
      vpChanged(true);
      try { closePanel(); $("aiDot").hidden = false; const bx = $("fbVplan"); if (bx) setTimeout(() => bx.scrollIntoView({ behavior: "smooth", block: "start" }), 50); } catch (_) {}   // 跟帶入魚骨圖一樣：AI 收成右下角按鈕
      fbNote(n || fill ? `${n ? `已把 ${n} 個驗證項目列入 ③ 驗證計畫清單，請勾選要採用的` : ""}${n && fill ? "；" : ""}${fill ? `已替 ${fill} 個清單中的項目補上 AI 建議（只填空白欄位）` : ""}${skip ? `；略過 ${skip} 個已有內容的原因` : ""}。` : "這些原因都已在清單中且已有內容，沒有變更。");
    });
    vpRender();
  })();
