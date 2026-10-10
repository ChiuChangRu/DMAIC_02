/* 相關與迴歸統計引擎（Pearson、Spearman、簡單線性迴歸）
   在瀏覽器為 window.RG；在 Node 為 module.exports。需要 HT（stats.js）的分布函數。 */
(function (root) {
  "use strict";
  const HT = root.HT || (typeof require !== "undefined" ? require("./stats.js") : null);
  const sum = a => { let s = 0, c = 0; for (const v of a) { const y = v - c, t = s + y; c = (t - s) - y; s = t; } return s; }; // Kahan
  const mean = a => sum(a) / a.length;
  // 兩欄成對、刪去任一邊缺值的列
  function pairs(x, y) {
    const X = [], Y = [], idx = [];
    for (let i = 0; i < Math.min(x.length, y.length); i++) if (isFinite(x[i]) && isFinite(y[i]) && x[i] !== null && y[i] !== null) { X.push(+x[i]); Y.push(+y[i]); idx.push(i); }
    return { x: X, y: Y, idx };
  }
  function moments(x, y) {
    const n = x.length, xb = mean(x), yb = mean(y);
    const sxx = sum(x.map(v => (v - xb) ** 2)), syy = sum(y.map(v => (v - yb) ** 2)), sxy = sum(x.map((v, i) => (v - xb) * (y[i] - yb)));
    return { n, xb, yb, sxx, syy, sxy };
  }
  const tP2 = (t, df) => isFinite(t) ? Math.min(1, 2 * HT.tSf(Math.abs(t), df)) : (isNaN(t) ? NaN : 0);
  function pearson(x, y, conf) {
    conf = conf || 0.95;
    const n = x.length; if (n < 3) return { error: "至少需要 3 組成對資料。" };
    const m = moments(x, y);
    if (m.sxx === 0 || m.syy === 0) return { error: "有一欄所有數值都相同，無法計算相關係數。" };
    let r = m.sxy / Math.sqrt(m.sxx * m.syy); r = Math.max(-1, Math.min(1, r));
    const df = n - 2, t = Math.abs(r) === 1 ? Infinity * Math.sign(r) : r * Math.sqrt(df / (1 - r * r));
    const p = Math.abs(r) === 1 ? 0 : tP2(t, df);
    let ci = [NaN, NaN];
    if (n > 3) { const z = Math.atanh(r), zc = HT.normInv(1 - (1 - conf) / 2), se = 1 / Math.sqrt(n - 3); ci = Math.abs(r) === 1 ? [r, r] : [Math.tanh(z - zc * se), Math.tanh(z + zc * se)]; }
    return { r, t, df, p, ci, n, conf };
  }
  function spearman(x, y) {
    const n = x.length; if (n < 3) return { error: "至少需要 3 組成對資料。" };
    const rx = HT.rankAvg(x).ranks, ry = HT.rankAvg(y).ranks, m = moments(rx, ry);
    if (m.sxx === 0 || m.syy === 0) return { error: "有一欄所有數值都相同，無法計算等級相關。" };
    let rho = m.sxy / Math.sqrt(m.sxx * m.syy); rho = Math.max(-1, Math.min(1, rho));
    const df = n - 2, t = Math.abs(rho) === 1 ? Infinity * Math.sign(rho) : rho * Math.sqrt(df / (1 - rho * rho));
    const ties = new Set(x).size < n || new Set(y).size < n;
    return { rho, t, df, p: Math.abs(rho) === 1 ? 0 : tP2(t, df), n, ties };
  }
  // 相關係數矩陣（成對刪除）：cols = [{name, v:[...]}]
  function corrMatrix(cols, conf) {
    const k = cols.length, M = [];
    for (let i = 0; i < k; i++) { M.push([]); for (let j = 0; j < k; j++) {
      if (i === j) { M[i].push({ self: true, n: cols[i].v.filter(isFinite).length }); continue; }
      if (j < i) { M[i].push(M[j][i]); continue; }
      const p = pairs(cols[i].v, cols[j].v), pe = pearson(p.x, p.y, conf), sp = spearman(p.x, p.y);
      M[i].push({ n: p.x.length, pearson: pe, spearman: sp });
    } }
    return M;
  }
  // 小型最小平方（中心化後解正規方程式），回傳係數、標準誤、t、p
  function solve(A, b) {
    const n = A.length, M = A.map((r, i) => r.concat([b[i]]));
    for (let c = 0; c < n; c++) {
      let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      if (Math.abs(M[piv][c]) < 1e-300) return null;
      [M[c], M[piv]] = [M[piv], M[c]];
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / M[c][c]; for (let j = c; j <= n; j++) M[r][j] -= f * M[c][j]; }
    }
    return M.map((r, i) => r[n] / r[i]);
  }
  function inv(A) { const n = A.length; return A.map((_, j) => solve(A, A.map((__, i) => (i === j ? 1 : 0)))).reduce((acc, col, j) => { col.forEach((v, i) => { (acc[i] = acc[i] || [])[j] = v; }); return acc; }, []); }
  // 二次項檢查：y = b0 + b1·xc + b2·xc²（xc 為中心化 x），回傳 b2 的 p 值
  function quadCheck(x, y) {
    const n = x.length; if (n < 5 || new Set(x).size < 3) return null;
    const xb = mean(x), sd = Math.sqrt(sum(x.map(v => (v - xb) ** 2)) / n) || 1;
    const Z = x.map(v => { const z = (v - xb) / sd; return [1, z, z * z]; });
    const XtX = [0, 1, 2].map(a => [0, 1, 2].map(b => sum(Z.map(r => r[a] * r[b])))), Xty = [0, 1, 2].map(a => sum(Z.map((r, i) => r[a] * y[i])));
    const beta = solve(XtX, Xty), Iv = inv(XtX); if (!beta || !Iv || Iv.some(r => !r || r.some(v => !isFinite(v)))) return null;
    const res = y.map((v, i) => v - (beta[0] + beta[1] * Z[i][1] + beta[2] * Z[i][2])), sse = sum(res.map(e => e * e)), df = n - 3;
    if (df < 1) return null;
    const se2 = Math.sqrt(sse / df * Iv[2][2]), t = beta[2] / se2;
    return { t, df, p: se2 > 0 ? tP2(t, df) : (beta[2] === 0 ? 1 : 0) };
  }
  // 簡單線性迴歸 y = b0 + b1 x
  function linreg(x, y, o) {
    o = Object.assign({ conf: 0.95 }, o || {});
    const n = x.length;
    if (n < 3) return { error: "至少需要 3 組成對資料。" };
    const m = moments(x, y);
    if (m.sxx === 0) return { error: "X 所有數值都相同，無法做迴歸。" };
    const b1 = m.sxy / m.sxx, b0 = m.yb - b1 * m.xb, df = n - 2;
    const fit = x.map(v => m.yb + b1 * (v - m.xb)), res = y.map((v, i) => (v - m.yb) - b1 * (x[i] - m.xb)); // 中心化計算殘差，大數值時較精確
    const sse = sum(res.map(e => e * e)), ssr = sum(fit.map(f => (f - m.yb) ** 2)), sst = m.syy;
    const mse = sse / df, s = Math.sqrt(mse);
    const seB1 = s / Math.sqrt(m.sxx), seB0 = s * Math.sqrt(1 / n + m.xb * m.xb / m.sxx);
    const tc = HT.tInv(1 - (1 - o.conf) / 2, df);
    const tB1 = seB1 > 0 ? b1 / seB1 : (b1 === 0 ? 0 : Infinity * Math.sign(b1)), tB0 = seB0 > 0 ? b0 / seB0 : (b0 === 0 ? 0 : Infinity * Math.sign(b0));
    const r2 = sst > 0 ? 1 - sse / sst : NaN, r2adj = sst > 0 ? 1 - (sse / df) / (sst / (n - 1)) : NaN;
    const F = mse > 0 ? ssr / mse : Infinity, pF = mse > 0 ? HT.fSf(F, 1, df) : 0;
    const lev = x.map(v => 1 / n + (v - m.xb) ** 2 / m.sxx);
    const sres = res.map((e, i) => s > 0 && lev[i] < 1 ? e / (s * Math.sqrt(1 - lev[i])) : NaN);
    const tres = sres.map(r => df > 1 && isFinite(r) && (df - r * r) > 0 ? r * Math.sqrt((df - 1) / (df - r * r)) : NaN);
    let dw = NaN; if (sse > 0) { let a = 0; for (let i = 1; i < n; i++) a += (res[i] - res[i - 1]) ** 2; dw = a / sse; }
    const band = (x0, pi, cf) => { const t2 = cf === o.conf ? tc : HT.tInv(1 - (1 - cf) / 2, df); return t2 * s * Math.sqrt((pi ? 1 : 0) + 1 / n + (x0 - m.xb) ** 2 / m.sxx); };
    const predict = (x0, cf) => { const f = m.yb + b1 * (x0 - m.xb), cm = band(x0, false, cf || o.conf), pm = band(x0, true, cf || o.conf); return { x: x0, fit: f, ci: [f - cm, f + cm], pi: [f - pm, f + pm] }; };
    return {
      n, df, b0, b1, seB0, seB1, tB0, tB1, pB0: tP2(tB0, df), pB1: tP2(tB1, df),
      ciB0: [b0 - tc * seB0, b0 + tc * seB0], ciB1: [b1 - tc * seB1, b1 + tc * seB1],
      sse, ssr, sst, mse, s, r2, r2adj, F, pF, r: Math.sign(b1) * Math.sqrt(Math.max(0, r2)),
      fit, res, lev, sres, tres, dw, xb: m.xb, yb: m.yb, sxx: m.sxx, xmin: Math.min(...x), xmax: Math.max(...x), conf: o.conf, predict, band
    };
  }
  // 規格反推：在資料的 X 範圍內，找「單邊預測界限仍在規格內」的 X 區間（不外推）
  // lsl/usl 可為 null；回傳 {lo, hi, edgeLo, edgeHi, none, pointLsl, pointUsl}
  function specWindow(fitR, lsl, usl, conf) {
    conf = conf || 0.95;
    const has = v => v !== null && v !== undefined && isFinite(v);
    if (!has(lsl) && !has(usl)) return null;
    const t1 = HT.tInv(conf, fitR.df);
    const ok = x0 => { const f = fitR.b0 + fitR.b1 * x0, h = t1 * fitR.s * Math.sqrt(1 + 1 / fitR.n + (x0 - fitR.xb) ** 2 / fitR.sxx); return (!has(lsl) || f - h >= lsl) && (!has(usl) || f + h <= usl); };
    const a = fitR.xmin, b = fitR.xmax, N = 600, flags = [];
    for (let i = 0; i <= N; i++) flags.push(ok(a + (b - a) * i / N));
    // 最長的連續可行區段
    let best = null, st = -1;
    for (let i = 0; i <= N + 1; i++) { if (i <= N && flags[i]) { if (st < 0) st = i; } else if (st >= 0) { if (!best || i - 1 - st > best[1] - best[0]) best = [st, i - 1]; st = -1; } }
    const pointLsl = has(lsl) && fitR.b1 !== 0 ? (lsl - fitR.b0) / fitR.b1 : null, pointUsl = has(usl) && fitR.b1 !== 0 ? (usl - fitR.b0) / fitR.b1 : null;
    if (!best) return { none: true, pointLsl, pointUsl, conf };
    const at = i => a + (b - a) * i / N;
    const refine = (i, dir) => { // 在 at(i) 與 at(i+dir) 之間二分找邊界
      let inside = at(i), out = at(i + dir); if (i + dir < 0 || i + dir > N) return inside;
      for (let k = 0; k < 60; k++) { const mid = (inside + out) / 2; if (ok(mid)) inside = mid; else out = mid; }
      return inside;
    };
    const lo = best[0] === 0 ? a : refine(best[0], -1), hi = best[1] === N ? b : refine(best[1], 1);
    return { lo, hi, edgeLo: best[0] === 0, edgeHi: best[1] === N, pointLsl, pointUsl, conf };
  }
  const api = { pairs, pearson, spearman, corrMatrix, linreg, quadCheck, specWindow };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.RG = api;
})(typeof window !== "undefined" ? window : globalThis);
