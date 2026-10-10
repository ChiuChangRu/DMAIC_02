  // =====================================================================
  // 相關與回歸（計算在 regress.js：window.RG）
  // 舊資料初步分析：相關係數矩陣、散佈圖、簡單線性迴歸、規格反推
  // 匯入：Excel／CSV 由程式讀取；PDF 先由程式擷取文字層；掃描檔與照片才請 AI 轉錄，轉錄結果須人工逐格核對才可填入
  // =====================================================================
  const RGX = window.RG;
  const r2Txt = v => v > 0.9999 && v < 1 ? fmt(v * 100, 5) + "%" : pc(v * 100, 2);
  const pTxt = p => { const t = fmtP(p); return t.charAt(0) === "<" ? "p " + t : "p = " + t; };
  const REG = { cols: [], n: 0, res: null, src: "", ctx: "", excl: new Set() };
  const regNum = v => { const t = String(v == null ? "" : v).trim().replace(/，/g, ","); if (t === "") return null; const x = Number(t.replace(/^\+/, "")); return isFinite(x) ? x : NaN; };
  // ---- 解析貼上的表格 ----
  function regParse(text) {
    const lines = String(text || "").split(/\r?\n/).map(l => l.replace(/\s+$/, "")).filter(l => l.trim());
    if (!lines.length) return { error: "" };
    const split = l => { const s = l.replace(/　/g, " "); return /\t/.test(s) ? s.split("\t").map(x => x.trim()) : /[,;，]/.test(s) ? s.split(/\s*[,;，]\s*/) : s.trim().split(/\s+/); };
    let rows = lines.map(split);
    const first = rows[0], firstNum = first.every(c => c === "" || isFinite(regNum(c)));
    const header = firstNum ? first.map((_, i) => "欄" + (i + 1)) : first.map((c, i) => (c || "").trim() || "欄" + (i + 1));
    if (!firstNum) rows = rows.slice(1);
    const k = Math.max(header.length, ...rows.map(r => r.length));
    while (header.length < k) header.push("欄" + (header.length + 1));
    // 欄名重複時加上序號
    const seen = {}; header.forEach((h, i) => { if (seen[h]) header[i] = h + "（" + (++seen[h]) + "）"; else seen[h] = 1; });
    const cols = header.map((name, j) => {
      const raw = rows.map(r => (r[j] == null ? "" : String(r[j]).trim()));
      const vals = raw.map(regNum), bad = vals.filter(v => Number.isNaN(v)).length, filled = raw.filter(x => x !== "").length;
      if (!filled) return { name, type: "empty", raw, v: vals };
      if (!bad) return { name, type: "num", raw, v: vals.map(v => (v === null ? NaN : v)), miss: raw.length - filled };
      const lv = [...new Set(raw.filter(x => x !== ""))];
      return { name, type: lv.length <= 12 ? "cat" : "text", raw, levels: lv, v: vals };
    }).filter(c => c.type !== "empty");
    return { cols, n: rows.length };
  }
  function regOpts(sel, list, keep, none) {
    const old = keep != null ? keep : sel.value;
    sel.innerHTML = (none ? `<option value="">${none}</option>` : "") + list.map(c => `<option value="${esc(c.name)}">${esc(c.name)}</option>`).join("");
    if (list.some(c => c.name === old)) sel.value = old;
  }
  function regDetect(keepSel) {
    const p = regParse($("regData").value);
    if (p.error !== undefined) { REG.cols = []; REG.n = 0; $("regDetect").textContent = ""; ["regY", "regX"].forEach(id => { $(id).innerHTML = ""; }); regOpts($("regGroup"), [], "", "不分層"); return; }
    REG.cols = p.cols; REG.n = p.n;
    const nums = p.cols.filter(c => c.type === "num"), cats = p.cols.filter(c => c.type === "cat");
    const ks = keepSel || {};
    regOpts($("regY"), nums, ks.y); regOpts($("regX"), nums, ks.x); regOpts($("regGroup"), cats, ks.g != null ? ks.g : $("regGroup").value, "不分層");
    if (!ks.y && !ks.x && nums.length >= 2 && $("regY").value === $("regX").value) { $("regY").value = nums[nums.length - 1].name; $("regX").value = nums[0].name; }
    const miss = nums.reduce((a, c) => a + (c.miss || 0), 0);
    $("regDetect").innerHTML = `讀到 ${p.n} 列、${p.cols.length} 欄：數值欄 ${nums.length} 個${cats.length ? `、分層用文字欄 ${cats.length} 個（${cats.map(c => esc(c.name)).join("、")}）` : ""}${p.cols.some(c => c.type === "text") ? `、其他文字欄 ${p.cols.filter(c => c.type === "text").length} 個（不同值太多，不使用）` : ""}。${miss ? `有 ${miss} 個空格：計算時只用兩欄都有值的列。` : ""}${nums.length < 2 ? ' <span class="status ng">至少要 2 個數值欄。</span>' : ""}${REG.src ? `<br>${esc(REG.src)}` : ""}`;
    regColsRender();
  }
  // 數據框：每一欄的型態、筆數、範圍；勾選要納入相關係數矩陣的欄
  function regColsRender() {
    const box = $("regCols");
    if (!REG.cols.length) { box.innerHTML = ""; box.hidden = true; return; }
    box.hidden = false;
    const fin = c => c.v.filter(isFinite);
    box.innerHTML = `<details class="fb-more" open><summary>數據框（${REG.n} 列 × ${REG.cols.length} 欄）：勾選要放進相關係數矩陣的欄</summary><div class="scroll-x"><table class="mini"><thead><tr><th>納入矩陣</th><th>欄名</th><th>型態</th><th class="num">筆數</th><th>範圍／類別</th></tr></thead><tbody>${REG.cols.map(c => {
      const f = c.type === "num" ? fin(c) : null;
      return `<tr><td>${c.type === "num" ? `<input type="checkbox" data-regcol="${esc(c.name)}"${REG.excl.has(c.name) ? "" : " checked"} aria-label="${esc(c.name)} 納入相關矩陣">` : ""}</td><td>${esc(c.name)}</td><td>${c.type === "num" ? "數值" : c.type === "cat" ? "文字（可分層）" : "文字（不使用）"}</td><td class="num">${c.type === "num" ? f.length : c.raw.filter(x => x !== "").length}</td><td>${c.type === "num" ? (f.length ? `${nf(Math.min(...f), 5)} ～ ${nf(Math.max(...f), 5)}` : "—") : c.type === "cat" ? esc(c.levels.slice(0, 6).join("、") + (c.levels.length > 6 ? "…" : "")) : `${c.levels.length} 種不同值`}</td></tr>`;
    }).join("")}</tbody></table></div><p class="hint">也可以直接在下方「相關係數矩陣」點任一格，改看那兩欄的散佈圖與迴歸。</p></details>`;
  }
  $("regCols").addEventListener("change", e => {
    const cb = e.target.closest("[data-regcol]"); if (!cb) return;
    if (cb.checked) REG.excl.delete(cb.dataset.regcol); else REG.excl.add(cb.dataset.regcol);
    if (REG.res) regRun();
  });
  $("regData").addEventListener("input", () => { REG.src = ""; regDetect(); regStale(); });
  ["regY", "regX", "regGroup", "regConf", "regLsl", "regUsl", "regOrder"].forEach(id => $(id).addEventListener(id === "regLsl" || id === "regUsl" ? "input" : "change", () => { if (id === "regY" || id === "regX") $("regSrc").hidden = true; regStale(); }));
  function regStale() { if (REG.res) $("regHint").textContent = "資料或設定已變更，請重新按「執行分析」。"; }

  // ---- 範例 ----
  function regExample() {
    const r = rng(2026), L = ["熱封溫度 (°C)\t熱封時間 (s)\t車間濕度 (%)\t膜材批\t熱封強度 (N/15mm)"];
    for (let i = 0; i < 40; i++) {
      const T = 172 + 16 * r(), t = 2.4 + 0.8 * r(), h = 45 + 15 * r(), m = r() < 0.5 ? "M1" : "M2";
      const y = 0.28 * T - 32.4 + 1.6 * (t - 2.8) + (m === "M2" ? -0.9 : 0) + 0.65 * gauss(r);
      L.push([T.toFixed(1), t.toFixed(2), h.toFixed(0), m, y.toFixed(1)].join("\t"));
    }
    $("regData").value = L.join("\n"); REG.src = "範例資料（虛構數值）：40 批熱封紀錄。";
    regDetect({ y: "熱封強度 (N/15mm)", x: "熱封溫度 (°C)", g: "" });
    $("regLsl").value = "15"; $("regUsl").value = ""; $("regOrder").checked = true;
    regRun();
    $("regHint").textContent = "範例：先看相關係數矩陣找出關聯最強的參數，再看散佈圖；可試著把「分層」改成膜材批。";
  }
  $("regEx").addEventListener("click", regExample);
  $("regClear").addEventListener("click", () => { $("regData").value = ""; REG.src = ""; REG.res = null; regDetect(); $("regSheets").hidden = true; $("regTitle").textContent = "尚未分析"; $("regOut").innerHTML = `<p class="help">貼上資料、選好 X 與 Y 後，按「執行分析」。</p>`; $("regHint").textContent = ""; $("regSrc").hidden = true; regImpClose(); toolChanged("regression"); });

  // ---- 分析 ----
  const regCol = name => REG.cols.find(c => c.name === name);
  const regUnit = name => { const m = String(name).match(/[（(]([^（）()]+)[)）]\s*$/); return m ? m[1] : ""; };
  function regRun() {
    const fail = m => { $("regHint").innerHTML = `<span class="status ng">${m}</span>`; };
    regDetect({ y: $("regY").value, x: $("regX").value, g: $("regGroup").value });
    const nums = REG.cols.filter(c => c.type === "num");
    if (nums.length < 2) return fail("至少要 2 個數值欄。");
    const yc = regCol($("regY").value), xc = regCol($("regX").value);
    if (!yc || !xc) return fail("請選擇 X 與 Y。");
    if (yc === xc) return fail("X 與 Y 要選不同的欄。");
    const P = RGX.pairs(xc.v, yc.v);
    const conf = +$("regConf").value || 0.95, L = RGX.linreg(P.x, P.y, { conf });
    if (L.error) return fail(L.error);
    const pe = RGX.pearson(P.x, P.y, conf), sp = RGX.spearman(P.x, P.y), quad = RGX.quadCheck(P.x, P.y);
    const sw = L.n >= 3 && L.n <= 5000 && L.sse > 0 ? HT.shapiroWilk(L.res) : null;
    const lsl = inNum("regLsl"), usl = inNum("regUsl");
    if (Number.isNaN(lsl) || Number.isNaN(usl)) return fail("規格要填數字。");
    const spec = lsl != null || usl != null ? RGX.specWindow(L, lsl, usl, conf) : null;
    const gc = $("regGroup").value ? regCol($("regGroup").value) : null;
    let grp = null;
    if (gc) {
      const lab = P.idx.map(i => gc.raw[i] || "（空白）"), lv = [...new Set(lab)];
      const per = lv.map(g => { const ii = lab.map((x, k) => x === g ? k : -1).filter(k => k >= 0), gx = ii.map(k => P.x[k]), gy = ii.map(k => P.y[k]); const f = gx.length >= 3 && new Set(gx).size > 1 ? RGX.linreg(gx, gy, { conf }) : null; return { g, n: ii.length, fit: f && !f.error ? f : null, meanRes: ii.reduce((a, k) => a + L.res[k], 0) / ii.length, res: ii.map(k => L.res[k]) }; });
      const an = per.length >= 2 && per.every(q => q.n >= 2) ? HT.oneWayAnova(per.map(q => q.res)) : null;
      grp = { name: gc.name, lab, per, an };
    }
    const mcols = nums.filter(c => !REG.excl.has(c.name) || c === xc || c === yc).slice(0, 15);
    const mat = RGX.corrMatrix(mcols.map(c => ({ name: c.name, v: c.v })), conf);
    const big = L.sres.map((r, i) => ({ i, r })).filter(o => Math.abs(o.r) > 2), hiLev = L.lev.map((h, i) => ({ i, h })).filter(o => o.h > 6 / L.n);
    REG.res = { L, pe, sp, quad, sw, spec, grp, mat, nums: mcols.map(c => c.name), P, xName: xc.name, yName: yc.name, conf, lsl, usl, big, hiLev, order: $("regOrder").checked, total: REG.n };
    regRender(); toolChanged("regression");
    $("regHint").textContent = "";
  }
  $("regRun").addEventListener("click", regRun);
  function regWarnings(R) {
    const L = R.L, W = [], a = 0.05;
    W.push(["info", `<b>相關不等於因果</b>：舊資料裡，${esc(R.xName)} 高的批次可能同時有其他條件不同（例如膜材批、設備、人員）*。要確認是不是 ${esc(R.xName)} 造成的，請用 DOE 安排實驗驗證。 <button type="button" class="linkbtn" id="regToDoe">→ 帶入 DOE 確認區</button>`]);
    if (L.n < 10) W.push(["warn", `成對資料只有 ${L.n} 組，相關係數與斜率的信賴區間會很寬。`]);
    if (R.P.x.length < R.total) W.push(["info", `共 ${R.total} 列，其中 ${R.total - R.P.x.length} 列 X 或 Y 是空白，未納入計算。`]);
    if (R.quad && R.quad.p < a) W.push(["warn", `資料有<b>曲線</b>趨勢（二次項 ${pTxt(R.quad.p)}），直線模型可能不適合*；請看殘差圖，必要時縮小 X 範圍分段看，或用 DOE 加中心點確認。`]);
    if (R.sw && R.sw.p < a) W.push(["warn", `殘差不像常態分布（Shapiro-Wilk ${pTxt(R.sw.p)}）：斜率的檢定通常仍可參考*，但<b>預測區間與規格反推可能不準</b>。`]);
    if (R.big.length) W.push(["warn", `${R.big.length} 筆的標準化殘差絕對值大於 2（第 ${R.big.slice(0, 8).map(o => R.P.idx[o.i] + 1).join("、")} 列${R.big.length > 8 ? "…" : ""}）：請確認是否為紀錄錯誤或特殊狀況*（|殘差| > 2 為常用的提醒門檻*）。`]);
    if (R.hiLev.length) W.push(["warn", `${R.hiLev.length} 筆的 X 遠離其他資料（槓桿值大於 3 × 2 / n*；第 ${R.hiLev.slice(0, 8).map(o => R.P.idx[o.i] + 1).join("、")} 列），會明顯影響斜率。`]);
    if (R.order && isFinite(L.dw) && (L.dw < 1.5 || L.dw > 2.5)) W.push(["warn", `殘差有時間上的相關（Durbin-Watson = ${fmt(L.dw, 2)}，接近 2 代表沒有*；小於 1.5 或大於 2.5 為常用的提醒門檻*）：可能有隨時間改變的因素（換刀、換料、季節），請看「殘差 vs 順序」圖。`]);
    if (!R.pe.error && !R.sp.error && Math.abs(R.pe.r - R.sp.rho) > 0.2) W.push(["warn", `Pearson r（${fmt(R.pe.r, 3)}）與 Spearman ρ（${fmt(R.sp.rho, 3)}）差很多：可能有離群值或非線性關係*。`]);
    if (R.grp && R.grp.an && R.grp.an.p < a) W.push(["warn", `依「${esc(R.grp.name)}」分層後，各組的殘差平均不同（ANOVA ${pTxt(R.grp.an.p)}）：「${esc(R.grp.name)}」可能是<b>干擾因子</b>*，請看分層結果，或把它也列入 DOE。`]);
    return W;
  }
  function regRender() {
    const R = REG.res, L = R.L, cp = Math.round(R.conf * 100), d = 4;
    const sig = L.pB1 < 0.05, ux = regUnit(R.xName), uy = regUnit(R.yName);
    const strength = a => a >= 0.8 ? "很強" : a >= 0.6 ? "強" : a >= 0.4 ? "中等" : a >= 0.2 ? "弱" : "很弱";
    $("regTitle").textContent = `${R.xName} → ${R.yName}`;
    const head = sig ? pill("good", "有顯著線性關係") : pill("ns", "未達顯著");
    let h = `<div class="verdict">${head}<p class="big">${sig ? `${esc(R.xName)} 和 ${esc(R.yName)} 有統計上顯著的線性關係（斜率 ${pTxt(L.pB1)}）。` : `目前資料看不出 ${esc(R.xName)} 和 ${esc(R.yName)} 有線性關係（斜率 ${pTxt(L.pB1)}）。未達顯著不代表沒有關係，可能是樣本少、X 範圍窄，或關係不是直線*。`}</p></div>`
      + kv([["r", fmt(R.pe.r, 3)], ["R²", pc(L.r2 * 100, 1)], ["斜率", nf(L.b1, 4)], ["n", L.n]]);
    h += `<ul class="reasons"><li>相關係數 r = <b>${fmt(R.pe.r, 3)}</b>（${cp}% CI ${fmt(R.pe.ci[0], 3)} ～ ${fmt(R.pe.ci[1], 3)}），關聯程度${strength(Math.abs(R.pe.r))}*</li>`
      + `<li>R² = <b>${pc(L.r2 * 100, 1)}</b>：${esc(R.yName)} 的變異中，約 ${pc(L.r2 * 100, 0)} 可以用 ${esc(R.xName)} 的直線關係解釋</li>`
      + `<li>${esc(R.xName)} 每增加 1${ux ? " " + esc(ux) : ""}，${esc(R.yName)} 平均${L.b1 >= 0 ? "增加" : "減少"} <b>${nf(Math.abs(L.b1), 4)}</b>${uy ? " " + esc(uy) : ""}（${cp}% CI ${nf(L.ciB1[0], 4)} ～ ${nf(L.ciB1[1], 4)}）</li>`
      + `<li>迴歸式：${esc(R.yName)} = ${nf(L.b0, 5)} ${L.b1 >= 0 ? "+" : "−"} ${nf(Math.abs(L.b1), 5)} × ${esc(R.xName)}（n = ${L.n}，殘差標準差 s = ${nf(L.s, 4)}）</li>`
      + `<li>資料的 X 範圍：${nf(L.xmin, 5)} ～ ${nf(L.xmax, 5)}；超出這個範圍的預測不可靠（不要外推）</li></ul>`;
    h += notes(regWarnings(R));
    $("regOut").innerHTML = h;
    $("regSheets").hidden = false;
    regScatter(); regCorrRender(); regCoef(); regResid(); regGroupRender(); regSpecRender(); regPredict();
    REG.res.ctx = regCtxBody();
  }
  // ---- 圖：散佈圖 ----
  function regScatter() {
    const R = REG.res, L = R.L, P = R.P;
    const xs = P.x, ys = P.y.concat([R.lsl, R.usl].filter(v => v != null));
    const span = L.xmax - L.xmin || 1, x0 = L.xmin - span * 0.04, x1 = L.xmax + span * 0.04;
    const grid = Array.from({ length: 61 }, (_, i) => L.xmin + (L.xmax - L.xmin) * i / 60).map(x => L.predict(x, R.conf));
    const yAll = ys.concat(grid.map(g => g.pi[0]), grid.map(g => g.pi[1]));
    const F = frame({ w: 640, h: 320, x: [x0, x1], y: [Math.min(...yAll), Math.max(...yAll)], xNumeric: true, xTitle: R.xName, yTitle: R.yName, m: { l: 64, r: 70 } });
    let s = F.open;
    s += `<polygon points="${grid.map(g => F.sx(g.x).toFixed(1) + "," + F.sy(g.ci[1]).toFixed(1)).concat(grid.slice().reverse().map(g => F.sx(g.x).toFixed(1) + "," + F.sy(g.ci[0]).toFixed(1))).join(" ")}" style="fill:var(--teal-soft)" opacity=".85"/>`;
    s += poly(grid.map(g => [F.sx(g.x), F.sy(g.pi[0])]), C.teal, 1.2, "5 4") + poly(grid.map(g => [F.sx(g.x), F.sy(g.pi[1])]), C.teal, 1.2, "5 4");
    s += poly(grid.map(g => [F.sx(g.x), F.sy(g.fit)]), C.teal, 2.2);
    [[R.lsl, "LSL"], [R.usl, "USL"]].forEach(([v, t]) => { if (v == null) return; s += `<line x1="${F.m.l}" x2="${F.W - F.m.r}" y1="${F.sy(v)}" y2="${F.sy(v)}" style="stroke:${C.bad}" stroke-width="1.3" stroke-dasharray="6 4"/><text x="${F.W - F.m.r + 6}" y="${F.sy(v) + 4}" style="fill:${C.bad};font-weight:700">${t} ${esc(nf(v, 4))}</text>`; });
    const gl = R.grp ? R.grp.per.map(q => q.g) : [], colOf = i => R.grp ? SERIES[gl.indexOf(R.grp.lab[i]) % SERIES.length] : C.navy;
    const bigSet = new Set(R.big.map(o => o.i));
    P.x.forEach((x, i) => { s += `<circle cx="${F.sx(x)}" cy="${F.sy(P.y[i])}" r="${bigSet.has(i) ? 4.6 : 3.6}" style="fill:${colOf(i)};${bigSet.has(i) ? `stroke:${C.bad};stroke-width:2` : ""}" fill-opacity=".85"><title>第 ${P.idx[i] + 1} 列${R.grp ? "（" + esc(R.grp.lab[i]) + "）" : ""}\n${esc(R.xName)} = ${esc(nf(x, 6))}\n${esc(R.yName)} = ${esc(nf(P.y[i], 6))}${bigSet.has(i) ? "\n標準化殘差 > 2" : ""}</title></circle>`; });
    if (R.grp) R.grp.per.forEach((q, k) => { if (!q.fit) return; const a = Math.min(...P.x.filter((_, i) => R.grp.lab[i] === q.g)), b = Math.max(...P.x.filter((_, i) => R.grp.lab[i] === q.g)); s += poly([[F.sx(a), F.sy(q.fit.b0 + q.fit.b1 * a)], [F.sx(b), F.sy(q.fit.b0 + q.fit.b1 * b)]], SERIES[k % SERIES.length], 1.4, "2 3"); });
    const leg = R.grp ? `<div class="legend">${R.grp.per.map((q, k) => `<span><i style="background:${SERIES[k % SERIES.length]}"></i>${esc(q.g)}（n = ${q.n}）</span>`).join("")}<span class="hint">點線：各組自己的迴歸線</span></div>` : "";
    $("regScatter").innerHTML = `<div class="chart-wrap">${s + F.close}</div>${leg}`;
  }
  // ---- 相關係數矩陣 ----
  const regCorrKind = chipGroup("regCorrKind", () => regCorrRender());
  function regCorrPick(td) {
    const R = REG.res; if (!R || !td) return;
    const a = R.nums[+td.dataset.ci], b = R.nums[+td.dataset.cj];
    let y = a, x = b; if (b === R.yName) { y = b; x = a; } else if (a !== R.yName && b === R.xName) { y = a; x = b; }
    else if (a === R.yName) { y = a; x = b; }
    regDetect({ y, x, g: $("regGroup").value }); regRun();
    $("regScatter").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  $("regCorr").addEventListener("click", e => regCorrPick(e.target.closest(".reg-cell")));
  $("regCorr").addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { const td = e.target.closest(".reg-cell"); if (td) { e.preventDefault(); regCorrPick(td); } } });
  function regCorrRender() {
    const R = REG.res; if (!R) return;
    const kind = regCorrKind(), names = R.nums, M = R.mat;
    const cell = (c, i, j) => {
      if (c.self) return `<td class="reg-self">—</td>`;
      const o = kind === "pearson" ? c.pearson : c.spearman; if (!o || o.error) return `<td class="hint">無法計算</td>`;
      const v = kind === "pearson" ? o.r : o.rho, a = Math.min(1, Math.abs(v)), sg = o.p < 0.05;
      const bg = v >= 0 ? `rgba(46,125,120,${(a * 0.55).toFixed(3)})` : `rgba(176,96,48,${(a * 0.55).toFixed(3)})`;
      return `<td class="num reg-cell${sg ? " reg-sig" : ""}" style="background:${bg}" data-ci="${i}" data-cj="${j}" tabindex="0" role="button" title="${esc(names[i])} × ${esc(names[j])}：n = ${c.n}，${pTxt(o.p)}（點一下改看這兩欄）">${fmt(v, 2)}${sg ? "*" : ""}<br><span class="hint">p ${fmtP(o.p)}</span></td>`;
    };
    $("regCorr").innerHTML = `<thead><tr><th></th>${names.map(n => `<th>${esc(n)}</th>`).join("")}</tr></thead><tbody>${M.map((row, i) => `<tr><th>${esc(names[i])}</th>${row.map((c, j) => cell(c, i, j)).join("")}</tr>`).join("")}</tbody>`;
    const y = R.yName, yi = names.indexOf(y);
    const top = yi < 0 ? [] : M[yi].map((c, j) => ({ j, c })).filter(o => !o.c.self && o.c.pearson && !o.c.pearson.error).sort((a, b) => Math.abs(b.c.pearson.r) - Math.abs(a.c.pearson.r)).slice(0, 3);
    $("regCorrNote").innerHTML = `數字後面的 * 表示 p < 0.05；綠色為正相關、橘色為負相關，顏色越深關聯越強。${top.length ? `和 ${esc(y)} 關聯最強的：${top.map(o => `${esc(names[o.j])}（r = ${fmt(o.c.pearson.r, 2)}）`).join("、")}。` : ""}${REG.cols.filter(c => c.type === "num" && !REG.excl.has(c.name)).length > 15 ? "（只顯示前 15 個勾選的數值欄）" : ""}${REG.excl.size ? `（已排除 ${REG.excl.size} 欄，可在數據框勾回）` : ""} 點任一格可改看那兩欄。 各格只用兩欄都有值的列。`;
  }
  // ---- 係數、ANOVA ----
  function regCoef() {
    const R = REG.res, L = R.L, cp = Math.round(R.conf * 100);
    $("regCoef").innerHTML = table(["項目", "係數", "標準誤", "t", "p", `${cp}% 信賴區間`], [
      ["截距", nf(L.b0, 6), nf(L.seB0, 4), fmt(L.tB0, 3), fmtP(L.pB0), `${nf(L.ciB0[0], 5)} ～ ${nf(L.ciB0[1], 5)}`],
      ["斜率（" + esc(R.xName) + "）", nf(L.b1, 6), nf(L.seB1, 4), fmt(L.tB1, 3), fmtP(L.pB1), `${nf(L.ciB1[0], 5)} ～ ${nf(L.ciB1[1], 5)}`]
    ]) + `<tfoot><tr><td colspan="6" class="hint">R² = ${r2Txt(L.r2)}，調整 R² = ${r2Txt(L.r2adj)}，殘差標準差 s = ${nf(L.s, 5)}，n = ${L.n}；Pearson r = ${fmt(R.pe.r, 4)}，Spearman ρ = ${R.sp.error ? "—" : fmt(R.sp.rho, 4)}（${R.sp.error ? "p —" : pTxt(R.sp.p)}${R.sp.ties ? "，有同分" : ""}）</td></tr></tfoot>`;
    $("regAnova").innerHTML = table(["來源", "自由度", "平方和 SS", "均方 MS", "F", "p"], [
      ["迴歸", 1, nf(L.ssr, 6), nf(L.ssr, 6), fmt(L.F, 3), fmtP(L.pF)], ["殘差", L.df, nf(L.sse, 6), nf(L.mse, 6), "", ""], ["合計", L.n - 1, nf(L.sst, 6), "", "", ""]]);
  }
  // ---- 殘差 ----
  function regResid() {
    const R = REG.res, L = R.L;
    const ch = (pts, xTitle, xs) => {
      const yy = pts.map(p => p[1]).concat([2 * L.s, -2 * L.s]);
      const F = frame({ w: 320, h: 220, x: xs, y: [Math.min(...yy), Math.max(...yy)], xNumeric: true, xTitle, yTitle: "殘差", m: { l: 54, r: 10 } });
      let s = F.open + `<line x1="${F.m.l}" x2="${F.W - F.m.r}" y1="${F.sy(0)}" y2="${F.sy(0)}" style="stroke:${C.good}" stroke-width="1.3"/>`;
      [2, -2].forEach(k => { s += `<line x1="${F.m.l}" x2="${F.W - F.m.r}" y1="${F.sy(k * L.s)}" y2="${F.sy(k * L.s)}" style="stroke:${C.muted}" stroke-dasharray="4 3"/>`; });
      pts.forEach((p, i) => { s += `<circle cx="${F.sx(p[0])}" cy="${F.sy(p[1])}" r="3.2" style="fill:${Math.abs(L.sres[i]) > 2 ? C.bad : C.navy}" fill-opacity=".85"><title>第 ${R.P.idx[i] + 1} 列：殘差 ${esc(nf(p[1], 5))}</title></circle>`; });
      return s + F.close;
    };
    const f0 = Math.min(...L.fit), f1 = Math.max(...L.fit), sp = (f1 - f0) || 1;
    let h = `<div class="reg-two"><div class="chart-wrap">${ch(L.fit.map((f, i) => [f, L.res[i]]), "預測值", [f0 - sp * 0.04, f1 + sp * 0.04])}</div>`;
    if (R.order) h += `<div class="chart-wrap">${ch(L.res.map((e, i) => [R.P.idx[i] + 1, e]), "資料列順序", [0, R.total + 1])}</div>`;
    h += `</div><p class="hint">殘差 = 實際值 − 預測值。理想情況：點在 0 上下隨機散開、沒有彎曲或漏斗形狀${R.order ? "，也沒有隨順序漂移" : ""}。虛線為 ±2s。</p>`;
    $("regResid").innerHTML = h;
    $("regFlags").innerHTML = table(["檢查", "結果", "判讀"], [
      ["曲線（二次項）", R.quad ? pTxt(R.quad.p) : "資料不足", R.quad ? (R.quad.p < 0.05 ? "有曲線趨勢*" : "看不出曲線") : "—"],
      ["殘差常態性（Shapiro-Wilk）", R.sw ? pTxt(R.sw.p) : "—", R.sw ? (R.sw.p < 0.05 ? "不像常態，預測區間可能不準" : "沒有證據偏離常態") : "—"],
      ["時間相關（Durbin-Watson）", R.order && isFinite(L.dw) ? fmt(L.dw, 3) : "未檢查（資料不是依時間排列）", R.order && isFinite(L.dw) ? (L.dw < 1.5 || L.dw > 2.5 ? "可能有時間趨勢*" : "看不出時間相關*") : "—"],
      ["大殘差（|標準化殘差| > 2）", R.big.length + " 筆", R.big.length ? "請確認紀錄*" : "—"],
      ["高槓桿點（h > 6/n）", R.hiLev.length + " 筆", R.hiLev.length ? "會明顯影響斜率*" : "—"]
    ]);
  }
  function regGroupRender() {
    const R = REG.res; $("regGroupSheet").hidden = !R.grp; if (!R.grp) return;
    $("regGroupTbl").innerHTML = table(["組別", "n", "組內斜率", "組內 R²", "殘差平均（相對整體迴歸線）"], R.grp.per.map(q => [esc(q.g), q.n, q.fit ? nf(q.fit.b1, 4) : "資料不足", q.fit ? pc(q.fit.r2 * 100, 1) : "—", nf(q.meanRes, 4)]));
    $("regGroupNote").innerHTML = R.grp.an ? `各組殘差平均的差異：ANOVA ${pTxt(R.grp.an.p)}。${R.grp.an.p < 0.05 ? "各組落在整體迴歸線的不同側，代表「" + esc(R.grp.name) + "」本身也影響 " + esc(R.yName) + "*。" : "看不出各組有系統性差異。"} 各組斜率差很多時，代表 X 的影響可能因組別而不同（交互作用）*。` : "有組別的資料太少，無法比較。";
  }
  function regSpecRender() {
    const R = REG.res, w = R.spec; $("regSpecSheet").hidden = !w; if (!w) return;
    const cp = Math.round(R.conf * 100), lim = [R.lsl != null ? "LSL " + nf(R.lsl, 5) : "", R.usl != null ? "USL " + nf(R.usl, 5) : ""].filter(Boolean).join("、");
    let h = `<p>條件：單邊 ${cp}% 預測界限（單一批的 ${esc(R.yName)} 可能落的範圍）要在規格（${lim}）內。只在資料的 X 範圍（${nf(R.L.xmin, 5)} ～ ${nf(R.L.xmax, 5)}）內找，不外推。</p>`;
    if (w.none) h += `<p class="note warn">在資料範圍內，找不到能讓預測界限落在規格內的 ${esc(R.xName)}。${w.pointLsl != null || w.pointUsl != null ? `只看迴歸線本身：${w.pointLsl != null ? `${esc(R.xName)} ≈ ${nf(w.pointLsl, 5)} 時平均剛好等於 LSL` : ""}${w.pointUsl != null ? `；${esc(R.xName)} ≈ ${nf(w.pointUsl, 5)} 時平均剛好等於 USL` : ""}（只是平均，約一半的批會不符合）。` : ""}</p>`;
    else h += `<p class="big">${esc(R.xName)} 在 <b>${nf(w.lo, 5)} ～ ${nf(w.hi, 5)}</b> 之間時，${cp}% 預測界限仍在規格內。</p>${w.edgeLo || w.edgeHi ? `<p class="hint">${w.edgeLo ? "下限" : ""}${w.edgeLo && w.edgeHi ? "與" : ""}${w.edgeHi ? "上限" : ""}剛好是資料範圍的邊界：實際可行範圍可能更寬，但資料外的情況無法判斷*。</p>` : ""}`;
    h += `<p class="note info">這是依舊資料的初步估計*，不能直接當作製程參數的允收範圍；請用 DOE 或確效（OQ／PQ）確認。</p>`;
    $("regSpec").innerHTML = h;
  }
  function regPredict() {
    const R = REG.res, out = $("regPredOut"); if (!R) { out.textContent = ""; return; }
    const v = inNum("regPredX");
    if (v == null) { out.textContent = `輸入 ${R.xName} 的值，計算預測值、平均值的信賴區間與預測區間。`; return; }
    if (Number.isNaN(v)) { out.textContent = "請輸入數字。"; return; }
    const p = R.L.predict(v, R.conf), cp = Math.round(R.conf * 100), outR = v < R.L.xmin || v > R.L.xmax;
    out.innerHTML = `${esc(R.xName)} = ${nf(v, 6)} 時：預測 ${esc(R.yName)} = <b>${nf(p.fit, 5)}</b>；平均值 ${cp}% CI ${nf(p.ci[0], 5)} ～ ${nf(p.ci[1], 5)}；單一批 ${cp}% 預測區間 ${nf(p.pi[0], 5)} ～ ${nf(p.pi[1], 5)}。${outR ? ' <span class="status ng">超出資料範圍（外推），結果不可靠。</span>' : ""}`;
  }
  $("regPredX").addEventListener("input", regPredict);
  // ---- 帶入 DOE 確認區 ----
  document.addEventListener("click", e => {
    if (!e.target.closest("#regToDoe")) return;
    const R = REG.res; if (!R || !PLANS.doe) return;
    const yi = R.nums.indexOf(R.yName);
    const cand = [R.xName].concat(yi < 0 ? [] : R.mat[yi].map((c, j) => ({ j, c })).filter(o => !o.c.self && o.c.pearson && !o.c.pearson.error && o.c.pearson.p < 0.05 && R.nums[o.j] !== R.xName).sort((a, b) => Math.abs(b.c.pearson.r) - Math.abs(a.c.pearson.r)).map(o => R.nums[o.j])).slice(0, 5);
    if (R.grp && R.grp.an && R.grp.an.p < 0.05 && cand.length < 5) cand.push(R.grp.name);
    PLANS.doe.apply({ mode: cand.length <= 4 ? "full" : "frac", factors: cand.map(nm => ({ name: nm, low: "", high: "", unit: "" })), responses: [R.yName], goal: "max" }, "reg");
    const rng2 = cand.map(nm => { const c = regCol(nm); if (!c || c.type !== "num") return null; const v = c.v.filter(isFinite); return `${nm}：${nf(Math.min(...v), 5)} ～ ${nf(Math.max(...v), 5)}`; }).filter(Boolean);
    if (rng2.length) setTimeout(() => { const n = $("pkdHint"); if (n) n.textContent = (n.textContent ? n.textContent + " " : "") + "舊資料的範圍（參考，水準請依製程經驗決定）：" + rng2.join("；") + "。"; }, 50);
  });

  // ---- AI 的內容（只送結果摘要；資料少時附原始成對數據） ----
  function regColsText() {
    return REG.cols.map(c => c.type === "num" ? `${c.name}（數值，n=${c.v.filter(isFinite).length}，範圍 ${nf(Math.min(...c.v.filter(isFinite)), 5)}～${nf(Math.max(...c.v.filter(isFinite)), 5)}）` : c.type === "cat" ? `${c.name}（文字分層欄，${c.levels.length} 類：${c.levels.slice(0, 8).join("、")}）` : `${c.name}（文字，不使用）`).join("；");
  }
  function regCtxBody() {
    const R = REG.res, L = R.L, cp = Math.round(R.conf * 100), Lx = [];
    Lx.push(`欄位：${regColsText()}`);
    Lx.push(`分析：X = ${R.xName}，Y = ${R.yName}，成對資料 n = ${L.n}（共 ${R.total} 列）；資料${R.order ? "依時間順序排列" : "未依時間排列"}`);
    Lx.push(`Pearson r = ${fmt(R.pe.r, 4)}（${cp}% CI ${fmt(R.pe.ci[0], 4)}～${fmt(R.pe.ci[1], 4)}，${pTxt(R.pe.p)}）；Spearman ρ = ${R.sp.error ? "—" : fmt(R.sp.rho, 4) + "（" + pTxt(R.sp.p) + "）"}`);
    Lx.push(`迴歸：Y = ${nf(L.b0, 6)} + ${nf(L.b1, 6)} × X；斜率 SE = ${nf(L.seB1, 4)}，${pTxt(L.pB1)}，${cp}% CI ${nf(L.ciB1[0], 5)}～${nf(L.ciB1[1], 5)}；R² = ${pc(L.r2 * 100, 2)}，調整 R² = ${pc(L.r2adj * 100, 2)}；s = ${nf(L.s, 5)}；X 範圍 ${nf(L.xmin, 5)}～${nf(L.xmax, 5)}`);
    Lx.push(`殘差檢查：二次項 p = ${R.quad ? fmtP(R.quad.p) : "—"}；Shapiro-Wilk p = ${R.sw ? fmtP(R.sw.p) : "—"}；Durbin-Watson = ${R.order && isFinite(L.dw) ? fmt(L.dw, 3) : "未檢查"}；|標準化殘差|>2：${R.big.length} 筆；高槓桿：${R.hiLev.length} 筆`);
    if (R.grp) Lx.push(`分層（${R.grp.name}）：` + R.grp.per.map(q => `${q.g} n=${q.n} 斜率=${q.fit ? nf(q.fit.b1, 4) : "—"} 殘差平均=${nf(q.meanRes, 4)}`).join("；") + (R.grp.an ? `；各組殘差平均 ANOVA ${pTxt(R.grp.an.p)}` : ""));
    if (R.spec) Lx.push(`規格：LSL=${R.lsl ?? "無"}，USL=${R.usl ?? "無"}；` + (R.spec.none ? "資料範圍內找不到可行的 X" : `單邊 ${cp}% 預測界限在規格內的 X 範圍：${nf(R.spec.lo, 5)}～${nf(R.spec.hi, 5)}${R.spec.edgeLo || R.spec.edgeHi ? "（碰到資料範圍邊界）" : ""}`));
    const nm = R.nums;
    if (nm.length > 2) Lx.push("相關係數矩陣（Pearson r，p）：" + nm.map((a, i) => nm.map((b, j) => j > i ? `${a}×${b} r=${fmt(R.mat[i][j].pearson.r, 3)} p=${fmtP(R.mat[i][j].pearson.p)}` : "").filter(Boolean).join("；")).filter(Boolean).join("；"));
    if (L.n <= 300) Lx.push(`成對原始數據（X, Y）：${R.P.x.map((x, i) => `(${x}, ${R.P.y[i]})`).join(" ")}`);
    if (REG.src) Lx.push("資料來源：" + REG.src);
    return Lx.join("\n");
  }
  function regContext() {
    if (REG.res && REG.res.ctx) return "【計算結果】\n" + REG.res.ctx;
    return "【尚未分析】\n【頁面目前的設定】\n" + (REG.cols.length ? `欄位：${regColsText()}；共 ${REG.n} 列\n` : "還沒有資料\n") + formSnapshot($("viewReg")).split("\n").filter(l => !/^相關與回歸數據/.test(l)).join("\n");
  }
  // ---- AI 建議該看哪幾欄（regplan 區塊） ----
  const RG_CHAT_RULE = [
    "【相關與回歸的規則】",
    "a. 這個工具用舊資料做初步分析；要提醒使用者：相關不等於因果，找到的關聯要用 DOE 驗證。",
    "b. 不要產生、補齊或修改任何數據；不要自己計算相關係數或迴歸，數字一律以【計算結果】為準。",
    "c. 使用者問該看哪幾欄、怎麼分析時，可以在回答最後附一個 regplan 區塊（欄名必須完全照【頁面目前的設定】或【計算結果】裡的欄位清單，不可自創）：",
    "```regplan",
    '{"y": "結果欄名", "x": "最優先看的 X 欄名", "group": "可能的干擾因子（文字分層欄名，沒有就空字串）", "why": "一句話說明理由", "watch": ["還要注意的欄或干擾因子"]}',
    "```",
    "網頁會顯示「套用欄位建議」按鈕，由使用者確認後才套用；套用後仍由使用者按「執行分析」。"
  ].join("\n");
  function rgParsePlan(text) {
    const m = String(text).match(/```regplan\s*([\s\S]*?)```/); if (!m) return null;
    try { const j = JSON.parse(m[1]); return j && typeof j === "object" ? j : null; } catch (_) { return null; }
  }
  function rgChatHtml(j) {
    const has = nm => !!regCol(nm), nums = n => { const c = regCol(n); return c && c.type === "num"; };
    const okY = nums(j.y), okX = nums(j.x), okG = !j.group || (regCol(j.group) && regCol(j.group).type === "cat");
    const bad = [!okY ? `Y「${j.y || "（空白）"}」` : "", !okX ? `X「${j.x || "（空白）"}」` : "", !okG ? `分層「${j.group}」` : ""].filter(Boolean);
    return `<div class="pk-preview"><p><b>AI 建議的分析欄位</b></p><ul><li>Y：${esc(j.y || "—")}</li><li>X：${esc(j.x || "—")}</li>${j.group ? `<li>分層：${esc(j.group)}</li>` : ""}${j.why ? `<li>理由：${esc(j.why)}</li>` : ""}${Array.isArray(j.watch) && j.watch.length ? `<li>還要注意：${esc(j.watch.join("、"))}</li>` : ""}</ul>`
      + (bad.length ? `<p class="hint">${esc(bad.join("、"))} 在目前資料中找不到（或型態不對），無法套用；請確認欄名。</p>` : `<button type="button" class="btn small primary" data-regplan="${esc(JSON.stringify({ y: j.y, x: j.x, group: j.group || "" }))}">套用欄位建議</button>`) + `</div>`;
  }
  $("msgs").addEventListener("click", e => {
    const b = e.target.closest("[data-regplan]"); if (!b) return;
    let j; try { j = JSON.parse(b.dataset.regplan); } catch (_) { return; }
    route("regression"); closePanel();
    regDetect({ y: j.y, x: j.x, g: j.group || "" });
    $("regSrc").hidden = false; $("regSrc").textContent = `來源：AI 建議・待確認（Y = ${j.y}、X = ${j.x}${j.group ? "、分層 = " + j.group : ""}）。確認後按「執行分析」。`;
    $("regRun").scrollIntoView({ behavior: "smooth", block: "center" });
  });
  $("regAi").addEventListener("click", () => {
    if (!REG.cols.length) { $("regHint").textContent = "請先貼上或匯入資料（AI 需要看到欄位名稱）。"; return; }
    openPanel();
    if (!sample) return;
    ask("請看我的資料欄位，建議要先看哪個 Y、哪個 X，以及哪些欄可能是干擾因子（可以用來分層）。說明理由（推論標 *），最後附 regplan 區塊。", { label: "你 · 請 AI 建議欄位" });
  });

  // =====================================================================
  // 匯入檔案：Excel／CSV（程式讀取）、PDF（程式擷取文字層，掃描頁可請 AI 轉錄）、照片（AI 轉錄）
  // =====================================================================
  const IMP = { file: null, kind: "", sheets: null, table: null, from: "", ai: false, imgs: [], pdf: null };
  function regImpClose() { $("regImp").hidden = true; $("regImp").innerHTML = ""; Object.assign(IMP, { file: null, kind: "", sheets: null, table: null, from: "", ai: false, imgs: [], pdf: null }); }
  $("regImpBtn").addEventListener("click", () => $("regFile").click());
  $("regFile").addEventListener("change", () => { const f = $("regFile").files[0]; $("regFile").value = ""; if (f) regImport(f); });
  const impMsg = (m, bad) => { const el = $("regImpMsg"); if (el) el.innerHTML = bad ? `<span class="status ng">${esc(m)}</span>` : esc(m); };
  function impShell(title) {
    $("regImp").hidden = false;
    $("regImp").innerHTML = `<p class="reg-imp-h"><b>匯入確認區</b> <span class="pk-src" id="regImpSrc"></span> <span class="hint">${esc(title)}</span></p><div id="regImpCtl"></div><p class="hint" id="regImpMsg"></p><div id="regImpBody"></div><div class="run-row" id="regImpAct" hidden><label class="reg-chk" id="regImpChkW" hidden><input type="checkbox" id="regImpChk"> 我已逐格核對，與原始檔案一致</label><button class="btn primary small" type="button" id="regImpGo">填入資料</button><button class="btn ghost small" type="button" id="regImpCancel">取消</button></div>`;
    $("regImpCancel").addEventListener("click", regImpClose);
    $("regImpGo").addEventListener("click", regImpApply);
    $("regImpChk").addEventListener("change", () => { $("regImpGo").disabled = !$("regImpChk").checked; });
  }
  async function regImport(file) {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (file.size > 25 * 1024 * 1024) { impShell(file.name); impMsg("檔案太大（超過 25 MB）。", true); return; }
    regImpClose(); impShell(file.name); IMP.file = file;
    try {
      if (ext === "xlsx") { IMP.kind = "xlsx"; impMsg("讀取 Excel 中…"); IMP.sheets = await readXlsx(file); impXlsxUI(); }
      else if (ext === "docx") { IMP.kind = "docx"; impMsg("讀取 Word 中…"); await impDocx(file); }
      else if (["csv", "tsv", "txt"].includes(ext)) { IMP.kind = "text"; const t = await file.text(); impShowTable(textTable(t), `程式讀取「${file.name}」`); }
      else if (ext === "pdf") { IMP.kind = "pdf"; impMsg("讀取 PDF 中…"); await impPdf(file); }
      else if (/^image\//.test(file.type)) { IMP.kind = "image"; IMP.imgs = [{ b: file, name: file.name }]; impNeedAi("照片沒有文字層，需要請 AI 轉錄表格。"); }
      else if (ext === "xls") impMsg("舊版 Excel（.xls）請另存為 .xlsx 或 CSV。", true);
      else if (["xlsm", "ods", "numbers"].includes(ext)) impMsg("請在原程式另存為 .xlsx 或 CSV 後再匯入。", true);
      else impMsg("不支援這種檔案；可用 Excel（.xlsx）、CSV、Word（.docx）、PDF 或照片。", true);
    } catch (e) { impMsg((e && e.message) || "讀取失敗。", true); }
  }
  const textTable = t => String(t).replace(/^﻿/, "").split(/\r?\n/).filter(l => l.trim()).map(l => /\t/.test(l) ? l.split("\t") : csvSplit(l));
  function csvSplit(line) { const out = []; let cur = "", q = false; for (let i = 0; i < line.length; i++) { const ch = line[i]; if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; } else if (ch === '"') q = true; else if (ch === "," || ch === ";") { out.push(cur.trim()); cur = ""; } else cur += ch; } out.push(cur.trim()); return out; }
  // ---- Excel（.xlsx）：解壓後直接讀 XML，不經過 AI ----
  async function readXlsx(file) {
    let z; try { z = await unzip(await file.arrayBuffer()); } catch (_) { throw new Error("無法讀取這個 Excel 檔（請確認是 .xlsx）。"); }
    const dec = new TextDecoder(), xml = async nm => { const u = await z.get(nm); return u ? new DOMParser().parseFromString(dec.decode(u), "application/xml") : null; };
    const wb = await xml("xl/workbook.xml"), rels = await xml("xl/_rels/workbook.xml.rels"); if (!wb) throw new Error("這個檔案不像 Excel 活頁簿。");
    const relMap = {}; if (rels) [...rels.getElementsByTagName("Relationship")].forEach(r => { relMap[r.getAttribute("Id")] = r.getAttribute("Target"); });
    const ss = []; const sst = await xml("xl/sharedStrings.xml");
    if (sst) [...sst.getElementsByTagName("si")].forEach(si => { ss.push([...si.getElementsByTagName("t")].map(t => t.textContent).join("")); });
    const sheets = [];
    for (const sh of [...wb.getElementsByTagName("sheet")]) {
      const rid = sh.getAttribute("r:id") || sh.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id");
      let tgt = relMap[rid] || ""; tgt = tgt.replace(/^\//, ""); if (!/^xl\//.test(tgt)) tgt = "xl/" + tgt;
      sheets.push({ name: sh.getAttribute("name"), path: tgt, rows: null });
    }
    const colIdx = ref => { const m = String(ref).match(/^([A-Z]+)/); let n = 0; if (m) for (const ch of m[1]) n = n * 26 + ch.charCodeAt(0) - 64; return n - 1; };
    for (const s of sheets) {
      const d = await xml(s.path); if (!d) { s.rows = []; continue; }
      const grid = [];
      [...d.getElementsByTagName("row")].forEach(r => {
        const ri = (+r.getAttribute("r") || grid.length + 1) - 1, row = grid[ri] = grid[ri] || [];
        [...r.getElementsByTagName("c")].forEach(c => {
          const t = c.getAttribute("t"), v = c.getElementsByTagName("v")[0], is = c.getElementsByTagName("is")[0];
          let val = t === "s" ? (ss[+(v && v.textContent)] || "") : t === "inlineStr" ? (is ? [...is.getElementsByTagName("t")].map(x => x.textContent).join("") : "") : t === "b" ? (v && v.textContent === "1" ? "TRUE" : "FALSE") : t === "e" ? "" : (v ? v.textContent : "");
          if (t !== "s" && t !== "inlineStr" && val !== "" && isFinite(+val)) val = String(+(+val).toPrecision(15));
          row[colIdx(c.getAttribute("r"))] = val;
        });
      });
      s.rows = trimGrid(grid);
    }
    return sheets.filter(s => s.rows && s.rows.length);
  }
  function trimGrid(g) {
    const rows = []; for (let i = 0; i < g.length; i++) rows.push((g[i] || []).map(x => (x == null ? "" : String(x))));
    while (rows.length && rows[rows.length - 1].every(x => !x.trim())) rows.pop();
    while (rows.length && rows[0].every(x => !x.trim())) rows.shift();
    const k = Math.max(0, ...rows.map(r => r.length)); let c0 = 0; while (c0 < k && rows.every(r => !(r[c0] || "").trim())) c0++;
    return rows.filter(r => r.some(x => x.trim())).map(r => { const a = []; for (let j = c0; j < k; j++) a.push(r[j] || ""); while (a.length && !a[a.length - 1].trim()) a.pop(); return a; });
  }
  function impXlsxUI() {
    if (!IMP.sheets.length) { impMsg("活頁簿裡沒有資料。", true); return; }
    $("regImpCtl").innerHTML = IMP.sheets.length > 1 ? `<div class="field" style="max-width:320px"><label for="regImpSheet">工作表</label><select id="regImpSheet">${IMP.sheets.map((s, i) => `<option value="${i}">${esc(s.name)}（${s.rows.length} 列）</option>`).join("")}</select></div>` : "";
    const show = i => impShowTable(IMP.sheets[i].rows, `程式讀取「${IMP.file.name}」工作表「${IMP.sheets[i].name}」`);
    if (IMP.sheets.length > 1) $("regImpSheet").addEventListener("change", e => show(+e.target.value));
    show(0);
    impMsg("Excel 的公式會讀取最後存檔時的計算結果；日期會變成序號數字。合併儲存格、多層標題請先在 Excel 整理成「第一列欄名、每列一筆」。");
  }
  // ---- Word（.docx）：程式讀取文件中的表格 ----
  async function impDocx(file) {
    let z, xml; try { z = await unzip(await file.arrayBuffer()); xml = await z.get("word/document.xml"); } catch (_) { xml = null; }
    if (!xml) throw new Error("無法讀取這個 Word 檔（請確認是 .docx）。");
    const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", d = new DOMParser().parseFromString(new TextDecoder().decode(xml), "application/xml");
    const txt = el => [...el.getElementsByTagNameNS(W, "t")].map(t => t.textContent).join("").trim();
    const tbls = [...d.getElementsByTagNameNS(W, "tbl")].filter(t => !t.parentNode.closest || !t.parentNode.closest("tbl")).map(t => [...t.children].filter(r => r.localName === "tr").map(tr => [...tr.children].filter(c => c.localName === "tc").map(txt))).filter(t => t.length >= 2);
    if (!tbls.length) { IMP.imgs = []; throw new Error("這個 Word 檔裡沒有表格。若數據是圖片，請截圖後用照片匯入。"); }
    IMP.sheets = tbls.map((rows, i) => ({ name: `表格 ${i + 1}`, rows }));
    $("regImpCtl").innerHTML = tbls.length > 1 ? `<div class="field" style="max-width:320px"><label for="regImpSheet">表格</label><select id="regImpSheet">${IMP.sheets.map((s, i) => `<option value="${i}">${esc(s.name)}（${s.rows.length} 列 × ${Math.max(...s.rows.map(r => r.length))} 欄）</option>`).join("")}</select></div>` : "";
    const show = i => impShowTable(IMP.sheets[i].rows, `程式讀取「${file.name}」${IMP.sheets[i].name}`);
    if (tbls.length > 1) $("regImpSheet").addEventListener("change", e => show(+e.target.value));
    show(0); impMsg("合併儲存格會變成空白格，請核對。");
  }
  // ---- PDF：先由程式擷取文字層並依座標重組表格 ----
  async function impPdf(file) {
    let lib; try { lib = await pdfLib(); } catch (_) { throw new Error("無法載入 PDF 讀取程式（需要連到 cdnjs.cloudflare.com）。"); }
    let doc; try { doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, disableFontFace: true, cMapUrl: PDFJS + "cmaps/", cMapPacked: true, standardFontDataUrl: PDFJS + "standard_fonts/" }).promise; }
    catch (e) { throw new Error(e && e.name === "PasswordException" ? "PDF 有密碼保護，請先解除。" : "無法讀取這個 PDF。"); }
    IMP.pdf = doc;
    const n = Math.min(doc.numPages, 20), rows = []; let textPages = 0;
    for (let i = 1; i <= n; i++) {
      const pg = await doc.getPage(i), tc = await pg.getTextContent();
      const items = tc.items.filter(x => x.str && x.str.trim()).map(x => ({ s: x.str.trim(), x: x.transform[4], y: x.transform[5], w: x.width || 0, h: Math.abs(x.transform[3]) || 8 }));
      if (items.length < 4) continue; textPages++;
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      const lines = []; items.forEach(it => { const ln = lines.find(l => Math.abs(l.y - it.y) <= Math.max(2, it.h * 0.45)); if (ln) ln.items.push(it); else lines.push({ y: it.y, items: [it] }); });
      lines.forEach(l => { l.items.sort((a, b) => a.x - b.x); const cells = []; let cur = null; l.items.forEach(it => { if (cur && it.x - (cur.x + cur.w) < Math.max(3, it.h * 0.6)) { cur.s += (/[一-鿿]$/.test(cur.s) ? "" : " ") + it.s; cur.w = it.x + it.w - cur.x; } else { cur = { s: it.s, x: it.x, w: it.w }; cells.push(cur); } }); rows.push(cells.map(c => c.s)); });
    }
    if (!textPages) { IMP.imgs = []; impNeedAi(`這個 PDF 沒有文字層（掃描檔），需要請 AI 轉錄表格（${doc.numPages} 頁，最多送前 4 頁）。`); return; }
    // 取最常見的欄數當表格寬度，保留該寬度的列（與緊接在上方、欄數相同的標題列）
    const cnt = {}; rows.forEach(r => { if (r.length >= 2) cnt[r.length] = (cnt[r.length] || 0) + 1; });
    const width = +Object.entries(cnt).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] || 0;
    const tbl = rows.filter(r => r.length === width);
    if (width < 2 || tbl.length < 3) { impNeedAi("PDF 有文字，但程式找不到整齊的表格。可以請 AI 轉錄，或回到 Excel 複製貼上。"); return; }
    const dropped = rows.filter(r => r.length >= 2 && r.length !== width).length;
    impShowTable(tbl, `程式從「${file.name}」的文字層擷取（${width} 欄）`);
    impMsg(`程式依文字位置重組表格，欄位可能對錯（例如空白格、跨欄標題）${dropped ? `；另有 ${dropped} 列欄數不同，已略過` : ""}。請和原檔核對；不對的話可以改請 AI 轉錄。`);
    $("regImpCtl").innerHTML = `<button class="btn small" type="button" id="regImpAiAlt">改請 AI 轉錄</button>`;
    $("regImpAiAlt").addEventListener("click", () => impNeedAi("改請 AI 從 PDF 頁面圖片轉錄表格。"));
  }
  // ---- AI 轉錄（掃描 PDF、照片）：只轉錄看得到的數字，不計算、不補值；結果必須由人逐格核對 ----
  function impNeedAi(msg) {
    $("regImpBody").innerHTML = ""; $("regImpAct").hidden = true;
    $("regImpCtl").innerHTML = `<div class="run-row" style="margin:0"><button class="btn primary small" type="button" id="regImpAi">請 AI 轉錄表格</button><span class="hint">AI 只把看得到的數字照抄成表格，不計算、不補值；看不清楚的格子會標「?」。轉錄完要由你逐格核對。</span></div>`;
    impMsg(msg);
    $("regImpAi").addEventListener("click", impAi);
    if (!sample) impMsg(msg + " 目前無法使用 AI（需要在 claude.ai 開啟本頁並登入，或在 GitHub 版設定 API key）。", true);
  }
  async function impAi() {
    if (!sample) return;
    if (!imgLimits) { impMsg("這個檢視無法把圖片送給 AI。", true); return; }
    $("regImpAi").disabled = true; impMsg("準備頁面圖片…");
    try {
      if (IMP.kind === "pdf" && IMP.pdf && !IMP.imgs.length) for (let i = 1; i <= Math.min(IMP.pdf.numPages, 4, imgLimits.maxCount); i++) { const b = await renderPage(await IMP.pdf.getPage(i)); if (b) IMP.imgs.push({ b, name: `${IMP.file.name} 第 ${i} 頁` }); }
      const imgs = IMP.imgs.slice(0, imgLimits.maxCount);
      if (!imgs.length) throw new Error("沒有可送出的圖片。");
      impMsg(`AI 轉錄中（${imgs.length} 張圖片）…`);
      const q = ["你是資料轉錄員。請把附上圖片中的數據表格，照原樣轉成 Tab 分隔的純文字表格。",
        "規則：1. 只抄寫圖片中看得到的內容，不要計算、推估、補齊或修正任何數字。2. 看不清楚或被遮住的格子填 ?。3. 第一列是欄名（照原表格；沒有欄名就寫 欄1、欄2…）。4. 每一列對應原表格的一列，順序不變；合計、平均等統計列不要抄。5. 有多個表格時，只抄最主要的數據表，並在說明中提到。6. 數字保留原本的小數位數，不要加千分位逗號。",
        "輸出格式：先用最多 3 行說明表格在哪一頁、有幾列幾欄、哪些地方看不清楚；然後輸出一個 ```regdata 區塊，裡面是 Tab 分隔的表格。",
        `圖片依序為：${imgs.map((x, i) => `${i + 1}. ${x.name}`).join("；")}。`].join("\n");
      const res = await sample([{ role: "user", content: q }], { cache: false, modelTier: "default", images: imgs.map(x => x.b) });
      const m = String(res.text || "").match(/```regdata\s*([\s\S]*?)```/);
      if (!m) throw new Error("AI 沒有回傳表格。可以再試一次，或回到原始檔案複製貼上。");
      const note = String(res.text).replace(/```regdata[\s\S]*?```/, "").trim();
      IMP.ai = true;
      impShowTable(m[1].split(/\r?\n/).filter(l => l.trim()).map(l => l.split("\t").map(x => x.trim())), `AI 從「${IMP.file.name}」轉錄`, note);
    } catch (e) { impMsg((e && (e.message || e.text)) || "AI 轉錄失敗。", true); if ($("regImpAi")) $("regImpAi").disabled = false; }
  }
  function impShowTable(rows, from, aiNote) {
    rows = rows.map(r => r.map(x => String(x == null ? "" : x).trim()));
    const k = Math.max(...rows.map(r => r.length)); rows = rows.map(r => { const a = r.slice(); while (a.length < k) a.push(""); return a; });
    IMP.table = rows; IMP.from = from;
    $("regImpSrc").textContent = IMP.ai ? "來源：AI 轉錄・必須逐格核對" : "來源：" + (IMP.kind === "pdf" ? "PDF 文字層（程式擷取）・請核對" : "程式讀取（未經 AI）");
    $("regImpSrc").classList.toggle("reg-ai", IMP.ai);
    const q = rows.reduce((a, r) => a + r.filter(x => x === "?").length, 0);
    const show = rows.slice(0, 200);
    const imgs = IMP.ai && IMP.imgs.length ? `<div class="reg-imp-imgs">${IMP.imgs.map(x => `<figure><img alt="${esc(x.name)}" data-src="1"><figcaption>${esc(x.name)}</figcaption></figure>`).join("")}</div>` : "";
    $("regImpBody").innerHTML = (aiNote ? `<div class="note info">${mdLite(aiNote)}</div>` : "") + `<div class="reg-imp-grid${imgs ? " two" : ""}">${imgs}<div class="scroll-x reg-imp-tbl"><table class="mini"><tbody>${show.map((r, i) => `<tr${i === 0 ? ' class="reg-imp-head"' : ""}><td class="hint">${i === 0 ? "欄名" : i}</td>${r.map(x => `<td class="${x === "?" ? "pk-miss" : ""}">${esc(x)}</td>`).join("")}</tr>`).join("")}</tbody></table>${rows.length > 200 ? `<p class="hint">只顯示前 200 列（共 ${rows.length} 列，填入時全部帶入）。</p>` : ""}</div></div>`;
    if (imgs) [...$("regImpBody").querySelectorAll("img[data-src]")].forEach((im, i) => { im.src = URL.createObjectURL(IMP.imgs[i].b); });
    if (IMP.ai) { $("regImpCtl").innerHTML = `<button class="btn small" type="button" id="regImpAiRe">重新請 AI 轉錄</button>`; $("regImpAiRe").addEventListener("click", () => { IMP.ai = false; impNeedAi("重新請 AI 轉錄。"); }); }
    $("regImpAct").hidden = false; $("regImpChkW").hidden = !IMP.ai; $("regImpChk").checked = false; $("regImpGo").disabled = IMP.ai;
    impMsg(`${rows.length - 1} 列資料、${k} 欄。${q ? `有 ${q} 格 AI 看不清楚（紅色「?」），填入後會是空白，請對照原檔補上。` : ""}${IMP.ai ? " AI 轉錄可能抄錯（例如 1 和 7、小數點），請逐格和左邊的原始圖片核對，勾選後才能填入。" : ""}`);
  }
  function regImpApply() {
    if (!IMP.table) return;
    if (IMP.ai && !$("regImpChk").checked) return;
    const put = () => {
      $("regData").value = IMP.table.map(r => r.map(x => (x === "?" ? "" : x.replace(/\t/g, " "))).join("\t")).join("\n");
      REG.src = `資料來源：${IMP.from}${IMP.ai ? "（使用者已核對）" : ""}。`;
      regImpClose(); REG.res = null; regDetect(); $("regHint").textContent = "已填入資料。請選好 X、Y 後按「執行分析」。";
    };
    if ($("regData").value.trim()) {
      $("regImpAct").insertAdjacentHTML("afterend", `<div class="pk-ask" id="regImpRep"><p>資料框已經有內容，要用匯入的資料取代嗎？</p><div class="run-row" style="margin:0"><button class="btn small primary" type="button" id="regImpRepY">取代</button><button class="btn small ghost" type="button" id="regImpRepN">取消</button></div></div>`);
      $("regImpRepY").addEventListener("click", put); $("regImpRepN").addEventListener("click", () => $("regImpRep").remove());
    } else put();
  }
  // ---- 案件：還原後重新解析、重新套用選項 ----
  function regRestore(F, ran) {
    if (!($("regData").value || "").trim()) return;
    REG.src = F && F.__regSrc ? F.__regSrc : "";
    regDetect({ y: F && F.regY, x: F && F.regX, g: F && F.regGroup });
    if (ran) regRun();
  }
  regDetect();
