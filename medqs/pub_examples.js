  // =====================================================================
  // 公開範例庫（第 1 批：假設檢定＋樣本數規劃）
  // 用網路上公開的教科書／官方文件範例驗算本站計算，並可一鍵載入到對應工具。
  // 數據只收錄：美國政府公開資料（NIST）、軟體官方文件的小型範例表、或文件中的少量數值，均標註出處。
  // 非醫材產業的範例照實標示原產業，不改寫成醫材情境。
  // 每筆的「發表值」是來源文件寫的數字；「本站」由本站計算引擎即時算出（不是 AI 產生）。
  // =====================================================================
  const PUB_SRC = {
    sas: { t: "SAS/STAT 13.1 PROC TTEST Example 99.3 Paired Comparisons（收縮壓）", u: "https://support.sas.com/documentation/cdl/en/statug/66103/HTML/default/statug_ttest_examples03.htm", lic: "SAS 官方文件；只收錄 12 組數據並標註出處" },
    nistT: { t: "NIST/SEMATECH e-Handbook §1.3.5.3 Two-Sample t-Test（AUTO83B）", u: "https://itl.nist.gov/div898/handbook/eda/section3/eda353.htm", lic: "美國政府公開資料" },
    nistA: { t: "NIST Dataplot 參考手冊 ONE WAY ANALYSIS OF VARIANCE（Program 1）", u: "https://itl.nist.gov/div898/software/dataplot/refman1/auxillar/onewayan.htm", lic: "美國政府公開資料" },
    rW: { t: "R 官方文件 wilcox.test 範例（Hollander & Wolfe 資料）", u: "https://search.r-project.org/R/refmans/stats/html/wilcox.test.html", lic: "R 文件（GPL）；原始數據出自 Hollander & Wolfe《Nonparametric Statistical Methods》" },
    eura: { t: "Eurachem Leaflet：Two One-Sided Tests (TOST) 範例（清潔確效回收率）", u: "https://www.eurachem.org/images/stories/leaflets/TOST/TOST_2026/TOST_leaflet.pdf", lic: "Eurachem 公開說明單；只收錄 6 個數值並標註出處" },
    nistK: { t: "NIST/SEMATECH e-Handbook §7.2.6.3 Tolerance intervals for a normal distribution", u: "https://itl.nist.gov/div898/handbook/prc/section2/prc263.htm", lic: "美國政府公開資料" },
    nistN: { t: "NIST/SEMATECH e-Handbook §7.2.2.2 Sample sizes required", u: "https://itl.nist.gov/div898/handbook/prc/section2/prc222.htm", lic: "美國政府公開資料" },
    mw: { t: "MathWorks Statistics Toolbox 文件：Selecting a Sample Size", u: "https://www.mathworks.com/help/stats/selecting-a-sample-size.html", lic: "MathWorks 官方文件；只引用條件與答案" },
    umn: { t: "Durfee & Iaizzo《Medical Device Innovation Handbook》Reliability considerations in medical device development", u: "https://pressbooks.umn.edu/mdih/chapter/reliability-considerations-in-medical-device-development", lic: "CC BY-NC 4.0；只引用表格數值" },
    pd: { t: "Packaging Digest（2019-10-18，Nelson Labs：Mach & Gygi）How to determine a valid sample size for testing your medical device package", u: "https://www.packagingdigest.com/medical-packaging/how-to-determine-a-valid-sample-size-for-testing-your-medical-device-package", lic: "雜誌文章；只引用結論數字" }
  };
  const f4 = v => isFinite(v) ? fmtSig(v, 6) : "—";
  const pubNear = (got, pub, tol) => isFinite(got) && Math.abs(got - pub) <= tol;
  const PUB_EX = [
    { id: "h-paired", tool: "hyp", med: "臨床（血壓）", title: "成對 t 檢定：12 位受試者用藥前後收縮壓", src: "sas",
      A: [120, 124, 130, 118, 140, 128, 140, 135, 126, 130, 126, 127], B: [128, 131, 131, 127, 132, 125, 141, 137, 118, 132, 129, 135], names: ["用藥前", "用藥後"], mode: "paired",
      note: "SAS 定義差值 = 用藥前 − 用藥後；本站 A − B 相同。",
      checks: ex => { const r = HT.tTestPaired(ex.A, ex.B, "two-sided", 0, 0.95); return [
        ["平均差", -1.8333, r.diff, 5e-5], ["標準誤", 1.6825, r.se, 5e-5], ["t", -1.09, r.stat, 0.005], ["自由度", 11, r.df, 0], ["p 值", 0.2992, r.p, 5e-5], ["95% CI 下限", -5.5365, r.ci[0], 5e-5], ["95% CI 上限", 1.8698, r.ci[1], 5e-5]]; } },
    { id: "h-two", tool: "hyp", med: "非醫材（汽車油耗）", title: "兩樣本 t 檢定（合併變異數）：美國車 vs 日本車油耗", src: "nistT", noload: "來源檔案無法從本站下載，只用文件上的摘要統計量驗算公式與臨界值。",
      checks: () => { const n1 = 249, n2 = 79, s1 = 6.41470, s2 = 6.10771, sp = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2)); return [
        ["合併標準差 sp", 6.34260, sp, 5e-6], ["T", -12.62059, (20.14458 - 30.48101) / (sp * Math.sqrt(1 / n1 + 1 / n2)), 5e-5], ["臨界值 t(0.975, 326)", 1.9673, HT.tInv(0.975, 326), 5e-5]]; } },
    { id: "h-anova", tool: "hyp", med: "未說明產業（教學資料）", title: "單因子 ANOVA：4 個水準、各 5 筆", src: "nistA",
      note: "本站 ANOVA 表的 F、p、SS 與 NIST 相同。但水準 4 的 Shapiro-Wilk p = 0.042 < 0.05，網站依規則改以 Kruskal-Wallis 當主檢定（結論同為顯著），ANOVA 表標「僅供參考」；NIST 範例沒有檢查常態性。",
      groups: [[6.9, 5.4, 5.8, 4.6, 4.0], [8.3, 6.8, 7.8, 9.2, 6.5], [8.0, 10.5, 8.1, 6.9, 9.3], [5.8, 3.8, 6.1, 5.6, 6.2]], names: ["水準1", "水準2", "水準3", "水準4"],
      checks: ex => { const a = HT.oneWayAnova(ex.groups); return [["組間 SS", 38.82, a.rows[0].ss, 5e-6], ["組內 SS", 21.292, a.rows[1].ss, 5e-6], ["F", 9.7238, a.F, 5e-5], ["p 值", 0.000684, a.p, 5e-7]]; } },
    { id: "h-wsr", tool: "hyp", med: "臨床（憂鬱量表，治療前後）", title: "Wilcoxon 符號等級檢定：9 位病人第 1 次與第 2 次量表分數", src: "rW",
      A: [1.83, 0.50, 1.62, 2.48, 1.68, 1.88, 1.55, 3.06, 1.30], B: [0.878, 0.647, 0.598, 2.05, 1.06, 1.29, 1.06, 3.14, 1.29], names: ["第1次", "第2次"], mode: "paired", alt: "greater",
      note: "R 文件只列程式，沒有印出結果；發表值取 R 執行結果 V = 40、p = 0.01953（精確分布），並以 SciPy 1.18.1 重算相同。網站會依前提檢定選主檢定，Wilcoxon 列在「檢定比較」表中。",
      checks: ex => { const r = HT.wilcoxon(ex.A, ex.B, "greater", 0); return [["V（正號等級和）", 40, r.stat, 0], ["p 值（單尾）", 0.01953, r.p, 5e-6]]; } },
    { id: "h-mwu", tool: "hyp", med: "醫學研究（胎盤膜通透常數）", title: "Mann-Whitney 檢定：兩組胎盤膜的通透常數", src: "rW",
      A: [0.80, 0.83, 1.89, 1.04, 1.45, 1.38, 1.91, 1.64, 0.73, 1.46], B: [1.15, 0.88, 0.90, 0.74, 1.21], names: ["第1組", "第2組"], mode: "ind", alt: "greater",
      note: "R 文件只列程式；發表值取 R 執行結果 W = 35、p = 0.1272，並以 SciPy 重算相同。Mann-Whitney 列在「檢定比較」表中。",
      checks: ex => { const r = HT.mannWhitney(ex.A, ex.B, "greater", 0); return [["W（U）", 35, r.stat, 0], ["p 值（單尾）", 0.1272, r.p, 5e-5]]; } },
    { id: "h-tost1", tool: "hyp", med: "醫藥製造（清潔確效：殘留回收率）", title: "同等性 TOST（單組對目標值）：6 次回收率 vs 100%", src: "eura",
      one: [95.1, 101.3, 100.4, 98.3, 97, 96.9], target: 100, eqd: 6.4,
      note: "來源的界限不對稱（−20 ～ +6.4）；本站只做對稱 ±Δ，載入時用較嚴的 ±6.4，結論相同。來源文中同時寫 n = 6 與 n = 5，計算用的自由度是 5（= 6 − 1）。CI 下限來源四捨五入為 −3.8。",
      checks: ex => { const r = SS.tostTest(ex.one.map(() => ex.target), ex.one, ex.eqd, 0.05, true); return [
        ["平均差 D", -1.83, r.d, 0.005], ["標準差 s", 2.33, r.s, 0.005], ["標準誤", 0.95, r.se, 0.005], ["t(0.95, 5)", 2.015, r.tcrit, 5e-4], ["90% CI 上限", 0.085, r.hi, 5e-4], ["90% CI 下限", -3.8, r.lo, 0.05], ["判定同等", 1, r.ok ? 1 : 0, 0]]; } },
    { id: "h-tolk", tool: "hyp", med: "非醫材（NIST 教學）", title: "常態允差區間係數 k：N = 43、涵蓋 90%、信心 99%", src: "nistK", noload: "來源只給係數，沒有原始數據。",
      note: "雙邊 k：NIST 該例用 Howe 近似式得 2.217（本站以相同近似式重算 2.2173）；本站採精確積分 2.2228，以 SciPy 數值積分重算相同。差 0.006 是近似式誤差，不是計算錯誤；精確值較保守。",
      checks: () => [["單邊 k₁（非中心 t）", 1.8740, HT.tolK1(43, 0.90, 0.99), 5e-5], ["雙邊 k₂（來源為近似式）", 2.217, HT.tolK2(43, 0.90, 0.99), 5e-4, "來源用近似式"]] },
    { id: "s-nist1", tool: "ss", sub: "power", med: "非醫材（NIST 教學）", title: "t 檢定樣本數：單尾 α = 0.05、檢定力 90%、Δ = 1σ", src: "nistN",
      pw: { design: "one", alt: "greater", sd: 1, delta: 1, target: "0.9", alpha: "0.05" },
      note: "NIST 先用常態近似得 9，再用 t 分布迭代修正為 11；本站用非中心 t 精確計算也是 11。",
      checks: () => [["所需 n", 11, HT.tSampleSize("one", 1, 1, 0.05, "greater", 0.9), 0]] },
    { id: "s-nist2", tool: "ss", sub: "power", med: "非醫材（NIST 教學）", title: "t 檢定樣本數：雙尾 α = 0.05、檢定力 90%、Δ = 1σ", src: "nistN",
      pw: { design: "one", alt: "two-sided", sd: 1, delta: 1, target: "0.9", alpha: "0.05" },
      note: "NIST 表格用常態近似（σ 視為已知）得 11；本站用非中心 t（σ 用樣本估計）得 13。方法不同，本站較保守；若 σ 真的已知才可用 11。",
      checks: () => [["所需 n（來源為常態近似）", 11, HT.tSampleSize("one", 1, 1, 0.05, "two-sided", 0.9), 0, "方法不同"]] },
    { id: "s-mw", tool: "ss", sub: "power", med: "非醫材（通用教學）", title: "t 檢定樣本數：μ₀ = 100 → 110、σ = 20、雙尾、檢定力 80%", src: "mw",
      pw: { design: "one", alt: "two-sided", sd: 20, delta: 10, target: "0.8", alpha: "0.05" },
      note: "同一頁另一例「σ 已知、單尾」得 25 用的是 z 檢定；本站一律用 t（σ 需估計），單尾會得 27，不列為比對。",
      checks: () => [["所需 n", 34, HT.tSampleSize("one", 10, 20, 0.05, "two-sided", 0.8), 0]] },
    { id: "s-prop", tool: "ss", sub: "prop", med: "非醫材（通用教學）", title: "單一比例樣本數（精確二項）：p₀ = 30% → 33%、單尾、檢定力 80%", src: "mw",
      pr: { p0: 30, p1: 33, alt: "greater", target: "0.8", alpha: "0.05" },
      note: "精確二項的檢定力隨 n 鋸齒起伏；MathWorks 取「範圍內第一個達標的 n」= 1478，與本站相同。本站另會列出「之後全部達標」的 n。",
      checks: () => [["所需 n（第一個達標）", 1478, SS.prop1N(0.30, 0.33, 0.05, "greater", 0.80).n, 0]] },
    { id: "s-umn", tool: "ss", sub: "attr", med: "醫材（設計驗證可靠度）", title: "成功試驗法（0 失效）：95% 信心、95% 可靠度", src: "umn", src2: "pd",
      at: { c: "0.95", r: "0.95", cc: "0" },
      note: "書中稱 95/95 是常見的醫材確效門檻。Packaging Digest（Nelson Labs，醫療包裝）同樣寫 95/95、0 失效需 59 個。",
      checks: () => [["所需 n", 59, HT.crSampleSize(0.95, 0.95, 0), 0]] },
    { id: "s-umnT", tool: "ss", sub: "attr", med: "醫材（設計驗證可靠度）", title: "成功試驗法對照表（4 種可靠度 × 4 種信心，共 16 格）", src: "umn",
      at: { c: "0.9", r: "0.99", cc: "0" },
      note: "16 格中 14 格相同。書中「可靠度 99%」那一列的 114／149／228 其實等於可靠度 98% 的答案（ln0.10/ln0.98 = 113.97 → 114），同一列 99.9% 信心的 688 才符合 99%；判斷是來源表誤植。本站值 230／299／459 可用 n = ln(1−C)/ln(R) 手算核對。",
      checks: () => { const C = [0.90, 0.95, 0.99, 0.999], R = [0.999, 0.99, 0.95, 0.90], E = [[2302, 2995, 4603, 6905], [114, 149, 228, 688], [45, 59, 90, 135], [22, 29, 44, 66]], out = [];
        R.forEach((r, i) => C.forEach((c, j) => out.push([`R ${r * 100}%／C ${c * 100}%`, E[i][j], HT.crSampleSize(c, r, 0), 0, i === 1 && j < 3 ? "來源誤植" : ""]))); return out; } }
  ];
  // 單筆比對：回傳 [{lab, pub, got, ok, flag}]
  function pubRun(ex) {
    let rows = []; try { rows = ex.checks(ex); } catch (e) { return [{ lab: "執行錯誤", pub: NaN, got: NaN, ok: false, flag: String(e.message || e) }]; }
    return rows.map(([lab, pub, got, tol, flag]) => ({ lab, pub, got, ok: pubNear(got, pub, tol), flag: flag || "" }));
  }
  // 判定：全部相符 = 相符；有「方法不同／近似／來源誤植」說明的差異 = 有差異已說明；其餘 = 不符
  function pubVerdict(rows) {
    if (rows.every(r => r.ok)) return ["ok", "相符"];
    if (rows.every(r => r.ok || r.flag)) return ["warn", "差異已說明"];
    return ["ng", "不符"];
  }
  const pubLoadable = ex => !ex.noload;
  // ---- 載入到工具 ----
  function pubLoad(id) {
    const ex = PUB_EX.find(x => x.id === id); if (!ex || ex.noload) return;
    const S = PUB_SRC[ex.src], tag = `【公開範例】${ex.title}（出處：${S.t}；原產業：${ex.med}）`;
    if (ex.tool === "hyp") {
      closePanel(); route("hypothesis"); setSub("compare");
      let text;
      if (ex.groups) { const L = Math.max(...ex.groups.map(g => g.length)); text = [ex.names.join("\t")].concat(Array.from({ length: L }, (_, i) => ex.groups.map(g => g[i] ?? "").join("\t"))).join("\n"); }
      else if (ex.one) text = ["回收率 (%)"].concat(ex.one).join("\n");
      else text = [ex.names.join("\t")].concat(ex.A.map((v, i) => `${v}\t${ex.B[i] ?? ""}`)).join("\n");
      $("pasteBox").value = text;
      state.force = null; state.swap = false;
      state.mode = ex.mode === "paired" ? "paired" : "ind"; setPressed("modeChips", "mode", state.mode);
      state.alt = ex.alt || "two-sided"; setPressed("altChips", "alt", state.alt);
      state.goal = ex.eqd ? "equiv" : "diff"; setPressed("goalChips", "goal", state.goal); $("hypEqDelta").value = ex.eqd ? String(ex.eqd) : ""; updateSettingsUI();
      $("alphaSel").value = "0.05"; $("delta0").value = "0";
      $("target").value = ex.target != null ? String(ex.target) : ""; $("lsl").value = ""; $("usl").value = "";
      const tb = $("hypProblem"); tb.value = tag; tb.dataset.auto = tag;
      reparse(false); run();
      $("runHint").textContent = "已載入公開範例，可對照下方結果與來源發表值。" + (ex.note ? " " + ex.note : "");
      $("panel").scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    closePanel(); route("sample");
    const tab = $("ssTabs").querySelector(`[data-tsub="${ex.sub}"]`); if (tab) tab.click();
    const chip = (gid, v) => { const b = $(gid) && $(gid).querySelector(`[data-v="${v}"]`); if (b && b.getAttribute("aria-pressed") !== "true") b.click(); };
    const put = (fid, v) => { const el = $(fid); if (!el) return; el.value = String(v); el.dispatchEvent(new Event(el.tagName === "SELECT" ? "change" : "input", { bubbles: true })); };
    $("sampleProblem").value = tag;
    if (ex.pw) { const p = ex.pw; chip("pwDesign", p.design); chip("pwSolve", "n"); chip("pwAlt", p.alt); put("pwSd", p.sd); put("pwDelta", p.delta); put("pwTarget", p.target); put("pwAlpha", p.alpha); $("pwRun").click(); $("pwHint").textContent = "公開範例：" + (ex.note || ""); $("pwPanel").scrollIntoView({ behavior: "smooth", block: "start" }); }
    if (ex.pr) { const p = ex.pr; chip("prDesign", "one"); chip("prSolve", "n"); chip("prAlt", p.alt); put("prP0", p.p0); put("prP1", p.p1); put("prTarget", p.target); put("prAlpha", p.alpha); $("prRun").click(); $("prHint").textContent = "公開範例：" + (ex.note || ""); $("prRun").closest(".card").scrollIntoView({ behavior: "smooth", block: "start" }); }
    if (ex.at) { const p = ex.at; chip("atMode", "plan"); put("atC", p.c); put("atR", p.r); put("atCc", p.cc); $("atRun").click(); $("atHint").textContent = "公開範例：" + (ex.note || ""); $("atPanel").scrollIntoView({ behavior: "smooth", block: "start" }); }
  }
  // ---- 下拉選單（假設檢定、樣本數規劃、案件存取共用） ----
  function pubOptions(tool) {
    const list = PUB_EX.filter(x => (!tool || x.tool === tool) && pubLoadable(x));
    const grp = (t, lab) => { const xs = list.filter(x => x.tool === t); return xs.length ? `<optgroup label="${lab}">` + xs.map(x => `<option value="${x.id}">${esc(x.title)}｜${esc(x.med)}</option>`).join("") + `</optgroup>` : ""; };
    return `<option value="">— 選擇公開範例 —</option>` + grp("hyp", "假設檢定") + grp("ss", "樣本數規劃");
  }
  const pubSrcLink = k => { const S = PUB_SRC[k]; return `<a class="link" href="${S.u}" target="_blank" rel="noopener">${esc(S.t)}</a>`; };
  function pubDescHTML(ex) {
    if (!ex) return "";
    const S = PUB_SRC[ex.src], rows = pubRun(ex), [cls, txt] = pubVerdict(rows);
    return `<span class="status ${cls}">${txt}</span> 原產業：${esc(ex.med)}。出處：${pubSrcLink(ex.src)}（${esc(S.lic)}）${ex.src2 ? "；另見 " + pubSrcLink(ex.src2) : ""}。${ex.note ? esc(ex.note) : ""}`;
  }
  function pubMountSelect(selId, descId, tool, onPick) {
    const sel = $(selId); if (!sel) return;
    sel.innerHTML = pubOptions(tool);
    sel.addEventListener("change", () => {
      const ex = PUB_EX.find(x => x.id === sel.value), d = $(descId);
      if (d) d.innerHTML = pubDescHTML(ex);
      if (ex && onPick) onPick(ex);
    });
  }
  pubMountSelect("pubHypSel", "pubHypDesc", "hyp", ex => pubLoad(ex.id));
  pubMountSelect("pubSsSel", "pubSsDesc", "ss", ex => pubLoad(ex.id));
  pubMountSelect("pubCaseSel", "pubCaseDesc", "", ex => pubLoad(ex.id));
  // ---- 確效頁：公開範例對照表 ----
  function pubValRender() {
    const box = $("valPub"); if (!box) return;
    let nOk = 0, nWarn = 0, nNg = 0;
    const body = PUB_EX.map(ex => {
      const rows = pubRun(ex), [cls, txt] = pubVerdict(rows), S = PUB_SRC[ex.src];
      if (cls === "ok") nOk++; else if (cls === "warn") nWarn++; else nNg++;
      const det = rows.map(r => `<tr><td>${esc(r.lab)}</td><td class="num">${f4(r.pub)}</td><td class="num">${f4(r.got)}</td><td>${r.ok ? '<span class="status ok">相符</span>' : r.flag ? `<span class="status warn">${esc(r.flag)}</span>` : '<span class="status ng">不符</span>'}</td></tr>`).join("");
      return `<tr><td>${ex.tool === "hyp" ? "假設檢定" : "樣本數規劃"}</td><td><b>${esc(ex.title)}</b><br><span class="hint">${esc(ex.med)}</span></td><td><span class="status ${cls}">${txt}</span></td>
        <td>${pubSrcLink(ex.src)}${ex.src2 ? "<br>另見 " + pubSrcLink(ex.src2) : ""}<br><span class="hint">${esc(S.lic)}</span></td>
        <td>${pubLoadable(ex) ? `<button class="btn small" type="button" data-pubload="${ex.id}">載入</button>` : `<span class="hint">${esc(ex.noload)}</span>`}</td></tr>
        <tr class="pub-det"><td></td><td colspan="4"><details><summary>比對明細（${rows.length} 項）</summary>${ex.note ? `<p class="hint">${esc(ex.note)}</p>` : ""}<table class="mini"><tr><th>項目</th><th>發表值</th><th>本站</th><th>判定</th></tr>${det}</table></details></td></tr>`;
    }).join("");
    box.innerHTML = `<tr><th>工具</th><th>範例</th><th>結果</th><th>出處</th><th></th></tr>` + body;
    const s = $("valPubSum"); if (s) s.textContent = `共 ${PUB_EX.length} 例：相符 ${nOk}、差異已說明 ${nWarn}、不符 ${nNg}。`;
  }
  document.addEventListener("click", e => { const b = e.target.closest("[data-pubload]"); if (b) pubLoad(b.dataset.pubload); });
  pubValRender();
  $("valBtn") && $("valBtn").addEventListener("click", pubValRender);
