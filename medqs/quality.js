/* Quality tools engine: SPC, MSA, DOE (factorial / fractional / Plackett-Burman / mixture).
   Pure functions; depends on the hypothesis-test engine (HT) for distributions. */
(function (root) {
  "use strict";
  const HT = (typeof module !== "undefined" && module.exports) ? require("./stats.js") : root.HT;
  const { normCdf, normInv, tSf, tInv, fSf, lgamma } = HT;
  const sum = a => { let s = 0; for (const v of a) s += v; return s; };
  const mean = a => sum(a) / a.length;
  const sd = a => { if (a.length < 2) return NaN; const m = mean(a); let s = 0; for (const v of a) s += (v - m) * (v - m); return Math.sqrt(s / (a.length - 1)); };
  const median = a => { const s = a.slice().sort((x, y) => x - y), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
  const tCrit = (p, df) => tInv(p, df);

  // ================= SPC constants =================
  function grid(h) { const lo = -8, n = Math.round(16 / h) + 1, F = new Float64Array(n); for (let i = 0; i < n; i++) F[i] = normCdf(lo + i * h); return { h, n, F }; }
  const G1 = grid(0.01), G2 = grid(0.02);
  const constCache = {};
  function simpsonW(i, n) { return i === 0 || i === n - 1 ? 1 : (i % 2 ? 4 : 2); }
  function d2On(g, n) { let s = 0; for (let i = 0; i < g.n; i++) s += simpsonW(i, g.n) * (1 - Math.pow(g.F[i], n) - Math.pow(1 - g.F[i], n)); return s * g.h / 3; }
  // E[R^2] = 2 ∫∫_{x<y} [1 - F(y)^n - (1-F(x))^n + (F(y)-F(x))^n] dx dy  (trapezoid on the triangle; Richardson-extrapolated below)
  function er2On(g, n) {
    const { h, n: N, F } = g, Fy = new Float64Array(N), Gx = new Float64Array(N);
    for (let i = 0; i < N; i++) { Fy[i] = Math.pow(F[i], n); Gx[i] = Math.pow(1 - F[i], n); }
    let tot = 0;
    for (let j = 0; j < N; j++) {
      let inner = 0;
      for (let i = 0; i <= j; i++) inner += ((i === 0 || i === j) ? 0.5 : 1) * (1 - Fy[j] - Gx[i] + Math.pow(F[j] - F[i], n));
      tot += ((j === 0 || j === N - 1) ? 0.5 : 1) * inner;
    }
    return 2 * tot * h * h;
  }
  function spcConst(n) {
    if (constCache[n]) return constCache[n];
    const d2 = d2On(G1, n);
    const e1 = er2On(G1, n), e2 = er2On(G2, n), er2 = e1 + (e1 - e2) / 3;
    const d3 = Math.sqrt(Math.max(0, er2 - d2 * d2));
    const c4 = Math.sqrt(2 / (n - 1)) * Math.exp(lgamma(n / 2) - lgamma((n - 1) / 2));
    const r = { n, d2, d3, c4, A2: 3 / (d2 * Math.sqrt(n)), D3: Math.max(0, 1 - 3 * d3 / d2), D4: 1 + 3 * d3 / d2,
      A3: 3 / (c4 * Math.sqrt(n)), B3: Math.max(0, 1 - 3 * Math.sqrt(1 - c4 * c4) / c4), B4: 1 + 3 * Math.sqrt(1 - c4 * c4) / c4 };
    return (constCache[n] = r);
  }

  // ================= SPC charts =================
  function chartPanel(name, values, cl, ucl, lcl, labels) {
    const ul = Array.isArray(ucl) ? ucl : values.map(() => ucl), ll = Array.isArray(lcl) ? lcl : values.map(() => lcl);
    return { name, values, cl, ucl: ul, lcl: ll, labels: labels || values.map((_, i) => String(i + 1)), out: values.map((v, i) => v > ul[i] + 1e-12 || v < ll[i] - 1e-12) };
  }
  function xbarR(groups) {
    const n = groups[0].length, k = spcConst(n);
    const xb = groups.map(mean), R = groups.map(g => Math.max(...g) - Math.min(...g));
    const X = mean(xb), Rb = mean(R);
    return { type: "xbarr", n, sigma: Rb / k.d2, center: X, panels: [
      chartPanel("X̄", xb, X, X + k.A2 * Rb, X - k.A2 * Rb), chartPanel("R", R, Rb, k.D4 * Rb, k.D3 * Rb)], consts: k };
  }
  function xbarS(groups) {
    const n = groups[0].length, k = spcConst(n);
    const xb = groups.map(mean), S = groups.map(sd);
    const X = mean(xb), Sb = mean(S);
    return { type: "xbars", n, sigma: Sb / k.c4, center: X, panels: [
      chartPanel("X̄", xb, X, X + k.A3 * Sb, X - k.A3 * Sb), chartPanel("S", S, Sb, k.B4 * Sb, k.B3 * Sb)], consts: k };
  }
  function iMR(x) {
    const k = spcConst(2), MR = x.slice(1).map((v, i) => Math.abs(v - x[i])), MRb = mean(MR), X = mean(x), s = MRb / k.d2;
    return { type: "imr", n: 1, sigma: s, center: X, panels: [
      chartPanel("個別值 I", x, X, X + 3 * s, X - 3 * s), chartPanel("移動全距 MR", MR, MRb, k.D4 * MRb, 0, MR.map((_, i) => String(i + 2)))], consts: k };
  }
  function pChart(d, n) {
    const pb = sum(d) / sum(n), p = d.map((v, i) => v / n[i]);
    const sg = n.map(m => Math.sqrt(pb * (1 - pb) / m));
    const u = sg.map(x => Math.min(1, pb + 3 * x)), l = sg.map(x => Math.max(0, pb - 3 * x));
    const pn = chartPanel("不良率 p", p, pb, u, l); pn.sig = sg;
    return { type: "p", center: pb, panels: [pn] };
  }
  function npChart(d, n) {
    const pb = sum(d) / (n * d.length), c = n * pb, s = Math.sqrt(c * (1 - pb));
    return { type: "np", center: c, panels: [chartPanel("不良數 np", d, c, c + 3 * s, Math.max(0, c - 3 * s))] };
  }
  function cChart(c) {
    const cb = mean(c), s = Math.sqrt(cb);
    return { type: "c", center: cb, panels: [chartPanel("缺點數 c", c, cb, cb + 3 * s, Math.max(0, cb - 3 * s))] };
  }
  function uChart(c, n) {
    const ub = sum(c) / sum(n), u = c.map((v, i) => v / n[i]);
    return { type: "u", center: ub, panels: [chartPanel("單位缺點數 u", u, ub, n.map(m => ub + 3 * Math.sqrt(ub / m)), n.map(m => Math.max(0, ub - 3 * Math.sqrt(ub / m))))] };
  }
  const CHART_NAME = { xbarr: "X̄-R 管制圖", xbars: "X̄-S 管制圖", imr: "I-MR 管制圖", p: "p 管制圖（不良率）", np: "np 管制圖（不良數）", c: "c 管制圖（缺點數）", u: "u 管制圖（單位缺點數）" };
  // rows: array of number arrays (one row per subgroup / sample)
  function spcAuto(rows, kind) {
    const why = [];
    if (kind === "var") {
      const sizes = [...new Set(rows.map(r => r.length))];
      if (sizes.length > 1) return { error: "每列的數值個數不一致（子組大小要相同）。請檢查是否有缺值，或改成每列一筆的個別值。" };
      const n = sizes[0];
      if (n === 1) { why.push("每列只有 1 個數值（個別值），使用 I-MR 管制圖。"); return { type: "imr", why }; }
      if (n <= 10) { why.push(`子組大小 n = ${n}（2～10），使用 X̄-R 管制圖。`); return { type: "xbarr", why }; }
      if (n > 25) return { error: "子組大小超過 25，請重新分組。" };
      why.push(`子組大小 n = ${n}（≥ 11），用標準差估計較準確，使用 X̄-S 管制圖。`); return { type: "xbars", why };
    }
    if (kind === "defective") {
      if (rows.some(r => r.length < 2)) return { error: "不良品資料每列要有兩個數值：不良數, 抽樣數。" };
      if (rows.some(r => r[0] > r[1] || r[1] <= 0 || r[0] < 0)) return { error: "不良數必須介於 0 與抽樣數之間。" };
      const same = rows.every(r => r[1] === rows[0][1]);
      why.push(same ? `每批抽樣數相同（${rows[0][1]}），使用 np 管制圖（直接看不良數）。` : "每批抽樣數不同，使用 p 管制圖（看不良率，界限隨抽樣數變化）。");
      return { type: same ? "np" : "p", why };
    }
    if (kind === "defect") {
      if (rows.some(r => r[0] < 0)) return { error: "缺點數不能是負數。" };
      if (rows.some(r => r.length > 1 && !(r[1] > 0))) return { error: "檢驗單位數必須大於 0。" };
      const units = rows.map(r => r.length > 1 ? r[1] : 1);
      const same = units.every(u => u === units[0]);
      why.push(same ? "每次檢驗的單位數相同，使用 c 管制圖（直接看缺點數）。" : "每次檢驗的單位數不同，使用 u 管制圖（看每單位缺點數）。");
      return { type: same ? "c" : "u", why };
    }
    return { error: "未知的資料型態。" };
  }
  function spcRun(rows, type) {
    if (type === "imr") return iMR(rows.map(r => r[0]));
    if (type === "xbarr") return xbarR(rows);
    if (type === "xbars") return xbarS(rows);
    if (type === "p") return pChart(rows.map(r => r[0]), rows.map(r => r[1]));
    if (type === "np") return npChart(rows.map(r => r[0]), rows[0][1]);
    if (type === "c") return cChart(rows.map(r => r[0]));
    if (type === "u") return uChart(rows.map(r => r[0]), rows.map(r => r.length > 1 ? r[1] : 1));
    throw new Error("type");
  }
  const NELSON = [
    "1 點超出 3σ 管制界限",
    "連續 9 點在中心線同一側",
    "連續 6 點持續上升或下降",
    "連續 14 點上下交替",
    "連續 3 點中有 2 點在 2σ 之外（同一側）",
    "連續 5 點中有 4 點在 1σ 之外（同一側）",
    "連續 15 點都在 1σ 以內（變異異常地小）",
    "連續 8 點都在 1σ 之外（兩側皆可）"];
  function nelson(panel, rulesOn) {
    const v = panel.values, cl = panel.cl, N = v.length;
    // sigma per point: explicit (p chart, where UCL may be capped at 1) or from the (symmetric) upper limit
    const z = v.map((x, i) => { const s = panel.sig ? panel.sig[i] : (panel.ucl[i] - cl) / 3; return s > 0 ? (x - cl) / s : 0; });
    const hits = [];
    const on = r => !rulesOn || rulesOn.includes(r);
    const add = (rule, i, from) => hits.push({ rule, idx: i, from });
    for (let i = 0; i < N; i++) {
      if (on(1) && Math.abs(z[i]) > 3) add(1, i, i);
      if (on(2) && i >= 8) { const w = z.slice(i - 8, i + 1); if (w.every(t => t > 0) || w.every(t => t < 0)) add(2, i, i - 8); }
      if (on(3) && i >= 5) { const w = v.slice(i - 5, i + 1); let up = true, dn = true; for (let j = 1; j < 6; j++) { if (!(w[j] > w[j - 1])) up = false; if (!(w[j] < w[j - 1])) dn = false; } if (up || dn) add(3, i, i - 5); }
      if (on(4) && i >= 13) { const w = v.slice(i - 13, i + 1); let ok = true; for (let j = 2; j < 14; j++) { const a = w[j - 1] - w[j - 2], b = w[j] - w[j - 1]; if (!(a * b < 0)) { ok = false; break; } } if (ok && (w[1] - w[0]) !== 0) add(4, i, i - 13); }
      if (on(5) && i >= 1) { const w = z.slice(Math.max(0, i - 2), i + 1); if ((w.filter(t => t > 2).length >= 2 && z[i] > 2) || (w.filter(t => t < -2).length >= 2 && z[i] < -2)) add(5, i, Math.max(0, i - 2)); }
      if (on(6) && i >= 3) { const w = z.slice(Math.max(0, i - 4), i + 1); if ((w.filter(t => t > 1).length >= 4 && z[i] > 1) || (w.filter(t => t < -1).length >= 4 && z[i] < -1)) add(6, i, Math.max(0, i - 4)); }
      if (on(7) && i >= 14) { const w = z.slice(i - 14, i + 1); if (w.every(t => Math.abs(t) < 1)) add(7, i, i - 14); }
      if (on(8) && i >= 7) { const w = z.slice(i - 7, i + 1); if (w.every(t => Math.abs(t) > 1)) add(8, i, i - 7); }
    }
    return hits;
  }
  function capability(values, sigmaWithin, lsl, usl, target) {
    const n = values.length, m = mean(values), so = sd(values);
    const has = x => typeof x === "number" && isFinite(x);
    const r = { n, mean: m, sdOverall: so, sdWithin: sigmaWithin, lsl, usl, target };
    if (!has(lsl) && !has(usl)) return r;
    const cap = s => {
      const o = {};
      if (has(usl)) o.u = (usl - m) / (3 * s);
      if (has(lsl)) o.l = (m - lsl) / (3 * s);
      if (has(usl) && has(lsl)) o.p = (usl - lsl) / (6 * s);
      o.k = Math.min(has(o.u) ? o.u : Infinity, has(o.l) ? o.l : Infinity);
      o.ppm = 1e6 * ((has(usl) ? 1 - normCdf((usl - m) / s) : 0) + (has(lsl) ? normCdf((lsl - m) / s) : 0));
      return o;
    };
    if (has(sigmaWithin) && sigmaWithin > 0) { const c = cap(sigmaWithin); Object.assign(r, { Cp: c.p, Cpu: c.u, Cpl: c.l, Cpk: c.k, ppmWithin: c.ppm }); }
    const c2 = cap(so); Object.assign(r, { Pp: c2.p, Ppu: c2.u, Ppl: c2.l, Ppk: c2.k, ppmOverall: c2.ppm });
    r.ppmObserved = 1e6 * values.filter(v => (has(usl) && v > usl) || (has(lsl) && v < lsl)).length / n;
    // Cpm (Minitab convention): tau^2 = sum((x - T)^2) / (n - 1); target off-center → min(T - LSL, USL - T) / (3 tau)
    if (has(target) && has(usl) && has(lsl) && n > 1) { const tau = Math.sqrt(values.reduce((a, x) => a + (x - target) ** 2, 0) / (n - 1)); r.Cpm = Math.abs(target - (usl + lsl) / 2) < 1e-12 * Math.max(1, Math.abs(usl - lsl)) ? (usl - lsl) / (6 * tau) : Math.min(target - lsl, usl - target) / (3 * tau); }
    return r;
  }

  // ================= MSA =================
  // data[o][p] = array of r repeats ; o = operators, p = parts
  function grrAnova(data, opt) {
    opt = opt || {};
    const kSv = opt.k || 6, alphaRm = opt.alphaRemove == null ? 0.05 : opt.alphaRemove, tol = opt.tol;
    const k = data.length, n = data[0].length, r = data[0][0].length, N = k * n * r;
    const all = []; data.forEach(o => o.forEach(p => p.forEach(v => all.push(v))));
    const G = mean(all);
    const om = data.map(o => mean([].concat(...o)));
    const pm = []; for (let j = 0; j < n; j++) pm.push(mean([].concat(...data.map(o => o[j]))));
    const cm = data.map(o => o.map(mean));
    let SSo = 0, SSp = 0, SSi = 0, SSe = 0, SSt = 0;
    om.forEach(v => SSo += (v - G) ** 2); SSo *= n * r;
    pm.forEach(v => SSp += (v - G) ** 2); SSp *= k * r;
    for (let i = 0; i < k; i++) for (let j = 0; j < n; j++) { SSi += (cm[i][j] - om[i] - pm[j] + G) ** 2; for (const v of data[i][j]) SSe += (v - cm[i][j]) ** 2; }
    SSi *= r; all.forEach(v => SSt += (v - G) ** 2);
    const dfo = k - 1, dfp = n - 1, dfi = (k - 1) * (n - 1), dfe = k * n * (r - 1);
    const MSo = SSo / dfo, MSp = SSp / dfp, MSi = SSi / dfi, MSe = SSe / dfe;
    const Fi = MSi / MSe, Pi = fSf(Fi, dfi, dfe);
    const full = { rows: [
      { src: "零件", df: dfp, ss: SSp, ms: MSp, F: MSp / MSi, p: fSf(MSp / MSi, dfp, dfi) },
      { src: "操作員", df: dfo, ss: SSo, ms: MSo, F: MSo / MSi, p: fSf(MSo / MSi, dfo, dfi) },
      { src: "零件 × 操作員", df: dfi, ss: SSi, ms: MSi, F: Fi, p: Pi },
      { src: "重複性（誤差）", df: dfe, ss: SSe, ms: MSe },
      { src: "總計", df: N - 1, ss: SSt }] };
    const removed = Pi > alphaRm;
    let vc, table;
    if (!removed) {
      vc = { rep: MSe, op: Math.max(0, (MSo - MSi) / (n * r)), opPart: Math.max(0, (MSi - MSe) / r), part: Math.max(0, (MSp - MSi) / (k * r)) };
      table = full;
    } else {
      const SSpool = SSi + SSe, dfpool = dfi + dfe, MSpool = SSpool / dfpool;
      table = { rows: [
        { src: "零件", df: dfp, ss: SSp, ms: MSp, F: MSp / MSpool, p: fSf(MSp / MSpool, dfp, dfpool) },
        { src: "操作員", df: dfo, ss: SSo, ms: MSo, F: MSo / MSpool, p: fSf(MSo / MSpool, dfo, dfpool) },
        { src: "重複性（誤差，含交互作用）", df: dfpool, ss: SSpool, ms: MSpool },
        { src: "總計", df: N - 1, ss: SSt }] };
      vc = { rep: MSpool, op: Math.max(0, (MSo - MSpool) / (n * r)), opPart: 0, part: Math.max(0, (MSp - MSpool) / (k * r)) };
    }
    return grrSummary(vc, { k, n, r, kSv, tol, method: "anova", interactionP: Pi, interactionRemoved: removed, alphaRemove: alphaRm, full, table, means: { op: om, part: pm, cell: cm, grand: G } });
  }
  function grrSummary(vc, ctx) {
    const reprod = vc.op + vc.opPart, grr = vc.rep + reprod, total = grr + vc.part;
    const comp = [["總量測變異（GRR）", grr], ["　重複性", vc.rep], ["　再現性", reprod], ["　　操作員", vc.op], ["　　操作員 × 零件", vc.opPart], ["零件間變異", vc.part], ["總變異", total]];
    const rows = comp.map(([name, v]) => { const s = Math.sqrt(v); return { name, var: v, pctContrib: 100 * v / total, sd: s, sv: ctx.kSv * s, pctSV: 100 * s / Math.sqrt(total), pctTol: ctx.tol > 0 ? 100 * ctx.kSv * s / ctx.tol : null }; });
    const ndc = grr > 0 ? Math.max(0, Math.floor(Math.SQRT2 * Math.sqrt(vc.part) / Math.sqrt(grr) + 1e-9)) : Infinity;
    const pctGRR = rows[0].pctSV, pctTolGRR = rows[0].pctTol;
    const judgeOn = pctTolGRR != null && ctx.judgeBy === "tol" ? pctTolGRR : pctGRR;
    const verdict = judgeOn < 10 ? "good" : judgeOn <= 30 ? "marginal" : "bad";
    return Object.assign({ vc: Object.assign({ reprod, grr, total }, vc), rows, ndc, pctGRR, pctTolGRR, verdict }, ctx);
  }
  const K1 = { 2: 0.8862, 3: 0.5908 }, K2 = { 2: 0.7071, 3: 0.5231 }, K3 = { 2: 0.7071, 3: 0.5231, 4: 0.4467, 5: 0.4030, 6: 0.3742, 7: 0.3534, 8: 0.3375, 9: 0.3249, 10: 0.3146 };
  function grrXbarR(data, opt) {
    opt = opt || {};
    const k = data.length, n = data[0].length, r = data[0][0].length;
    if (!K1[r] || !K2[k] || !K3[n]) return { error: "平均全距法的 AIAG 常數只支援 2～3 次重複、2～3 位操作員、2～10 件零件；其他組合請用 ANOVA 法。" };
    const Rbar = mean(data.map(o => mean(o.map(p => Math.max(...p) - Math.min(...p)))));
    const om = data.map(o => mean([].concat(...o)));
    const pm = []; for (let j = 0; j < n; j++) pm.push(mean([].concat(...data.map(o => o[j]))));
    const EV = Rbar * K1[r], Xdiff = Math.max(...om) - Math.min(...om);
    const AV = Math.sqrt(Math.max(0, (Xdiff * K2[k]) ** 2 - EV * EV / (n * r)));
    const Rp = Math.max(...pm) - Math.min(...pm), PV = Rp * K3[n];
    const vc = { rep: EV * EV, op: AV * AV, opPart: 0, part: PV * PV };
    return grrSummary(vc, { k, n, r, kSv: opt.k || 6, tol: opt.tol, method: "xbarr", Rbar, Xdiff, Rp, consts: { K1: K1[r], K2: K2[k], K3: K3[n] }, means: { op: om, part: pm } });
  }
  function msaBias(values, ref, tol) {
    const t = HT.tTestOne(values, ref, "two-sided", 0.95);
    const m = mean(values), s = sd(values), n = values.length, b = m - ref;
    return { n, mean: m, sd: s, ref, bias: b, t: t.stat, df: n - 1, p: t.p, ciBias: t.ci.slice(), ci: [t.ci[0] + ref, t.ci[1] + ref], pctBias: tol > 0 ? 100 * Math.abs(b) / tol : null, repeatSV: 6 * s };
  }
  function ols(X, y) {      // X: rows of predictors (include 1 for intercept when wanted)
    const n = X.length, p = X[0].length;
    const XtX = Array.from({ length: p }, () => new Array(p).fill(0)), Xty = new Array(p).fill(0);
    for (let i = 0; i < n; i++) for (let a = 0; a < p; a++) { Xty[a] += X[i][a] * y[i]; for (let b = 0; b < p; b++) XtX[a][b] += X[i][a] * X[i][b]; }
    const inv = matInv(XtX); if (!inv) return null;
    const beta = inv.map(row => sum(row.map((v, j) => v * Xty[j])));
    const fit = X.map(row => sum(row.map((v, j) => v * beta[j]))), res = y.map((v, i) => v - fit[i]);
    const sse = sum(res.map(e => e * e)), df = n - p, mse = df > 0 ? sse / df : NaN;
    const se = inv.map((row, j) => Math.sqrt(mse * row[j]));
    const t = beta.map((b, j) => b / se[j]), pv = t.map(v => df > 0 ? 2 * tSf(Math.abs(v), df) : NaN);
    return { beta, se, t, p: pv, fit, res, sse, df, mse, inv };
  }
  function matInv(A) {
    const n = A.length, M = A.map((row, i) => row.concat(Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))));
    for (let c = 0; c < n; c++) {
      let piv = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      if (Math.abs(M[piv][c]) < 1e-12) return null;
      [M[c], M[piv]] = [M[piv], M[c]];
      const d = M[c][c]; for (let j = 0; j < 2 * n; j++) M[c][j] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; if (f) for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; }
    }
    return M.map(row => row.slice(n));
  }
  // rows: [{ref, values:[...]}]
  function msaLinearity(rows, tol) {
    const X = [], y = [];
    rows.forEach(r => r.values.forEach(v => { X.push([1, r.ref]); y.push(v - r.ref); }));
    const f = ols(X, y); if (!f) return { error: "基準值至少要有 2 個不同的數值。" };
    const yb = mean(y), sst = sum(y.map(v => (v - yb) ** 2)), r2 = sst > 0 ? 1 - f.sse / sst : NaN;
    const per = rows.map(r => { const b = r.values.map(v => v - r.ref); const tt = b.length > 1 ? HT.tTestOne(b, 0, "two-sided", 0.95) : null; return { ref: r.ref, n: b.length, bias: mean(b), p: tt ? tt.p : NaN }; });
    const allB = y, tb = HT.tTestOne(allB, 0, "two-sided", 0.95);
    return { intercept: f.beta[0], slope: f.beta[1], seIntercept: f.se[0], seSlope: f.se[1], pIntercept: f.p[0], pSlope: f.p[1], s: Math.sqrt(f.mse), r2, df: f.df,
      pctLinearity: 100 * Math.abs(f.beta[1]), linearity: tol > 0 ? Math.abs(f.beta[1]) * tol : null, avgBias: mean(allB), pAvgBias: tb.p, pctAvgBias: tol > 0 ? 100 * Math.abs(mean(allB)) / tol : null, per, points: rows.map(r => r.values.map(v => [r.ref, v - r.ref])).flat() };
  }
  // ratings[s][a][t] (sample, appraiser, trial) as strings ; standard[s] optional
  function cohenKappa(a, b) {
    const cats = [...new Set(a.concat(b))], n = a.length;
    let po = 0; const ca = {}, cb = {};
    for (let i = 0; i < n; i++) { if (a[i] === b[i]) po++; ca[a[i]] = (ca[a[i]] || 0) + 1; cb[b[i]] = (cb[b[i]] || 0) + 1; }
    po /= n; let pe = 0; cats.forEach(c => pe += ((ca[c] || 0) / n) * ((cb[c] || 0) / n));
    return pe === 1 ? (po === 1 ? 1 : NaN) : (po - pe) / (1 - pe);
  }
  function fleissKappa(table) {      // table[s] = array of ratings (strings) from m raters
    const N = table.length, m = table[0].length, cats = [...new Set([].concat(...table))];
    let P = 0; const pj = {}; cats.forEach(c => pj[c] = 0);
    table.forEach(row => { const cnt = {}; row.forEach(v => cnt[v] = (cnt[v] || 0) + 1); let s = 0; Object.values(cnt).forEach(c => s += c * (c - 1)); P += s / (m * (m - 1)); Object.keys(cnt).forEach(c => pj[c] += cnt[c]); });
    P /= N; let Pe = 0; cats.forEach(c => { const p = pj[c] / (N * m); Pe += p * p; });
    return Pe === 1 ? (P === 1 ? 1 : NaN) : (P - Pe) / (1 - Pe);
  }
  function attrAgreement(ratings, standard) {
    const S = ratings.length, A = ratings[0].length, T = ratings[0][0].length;
    const within = [], vsStd = [];
    for (let a = 0; a < A; a++) {
      const agree = ratings.filter(s => s[a].every(v => v === s[a][0])).length;
      within.push({ appraiser: a + 1, matched: agree, n: S, pct: 100 * agree / S, kappa: T > 1 ? fleissKappa(ratings.map(s => s[a])) : NaN });
      if (standard) {
        const ok = ratings.filter((s, i) => s[a].every(v => v === standard[i])).length;
        const xa = [], xs = []; ratings.forEach((s, i) => s[a].forEach(v => { xa.push(v); xs.push(standard[i]); }));
        vsStd.push({ appraiser: a + 1, matched: ok, n: S, pct: 100 * ok / S, kappa: cohenKappa(xa, xs) });
      }
    }
    const allRatings = ratings.map(s => [].concat(...s));
    const between = { matched: allRatings.filter(r => r.every(v => v === r[0])).length, n: S };
    between.pct = 100 * between.matched / S; between.kappa = fleissKappa(allRatings);
    let allStd = null;
    if (standard) {
      const ok = allRatings.filter((r, i) => r.every(v => v === standard[i])).length;
      const xa = [], xs = []; allRatings.forEach((r, i) => r.forEach(v => { xa.push(v); xs.push(standard[i]); }));
      allStd = { matched: ok, n: S, pct: 100 * ok / S, kappa: cohenKappa(xa, xs) };
    }
    return { S, A, T, within, vsStd, between, allStd, cats: [...new Set([].concat(...allRatings))] };
  }

  // ================= DOE: designs =================
  const L = "ABCDEFGHJKLMNOP";
  function fullFactorial(k) { const runs = 1 << k, M = []; for (let i = 0; i < runs; i++) { const row = []; for (let j = 0; j < k; j++) row.push((i >> j) & 1 ? 1 : -1); M.push(row); } return M; }
  const FRACTIONS = {
    "4-1": { k: 4, p: 1, gens: ["ABC"], res: "IV" }, "5-1": { k: 5, p: 1, gens: ["ABCD"], res: "V" }, "5-2": { k: 5, p: 2, gens: ["AB", "AC"], res: "III" },
    "6-2": { k: 6, p: 2, gens: ["ABC", "BCD"], res: "IV" }, "6-3": { k: 6, p: 3, gens: ["AB", "AC", "BC"], res: "III" },
    "7-3": { k: 7, p: 3, gens: ["ABC", "BCD", "ACD"], res: "IV" }, "7-4": { k: 7, p: 4, gens: ["AB", "AC", "BC", "ABC"], res: "III" } };
  function fractional(key) {
    const f = FRACTIONS[key], base = f.k - f.p, M = fullFactorial(base);
    const gens = f.gens.map(g => [...g].map(ch => L.indexOf(ch)));
    return { matrix: M.map(row => row.concat(gens.map(g => g.reduce((s, j) => s * row[j], 1)))), res: f.res, defining: f.gens.map((g, i) => L[base + i] + " = " + g) };
  }
  function plackettBurman(k) {
    const g = [1, 1, -1, 1, 1, 1, -1, -1, -1, 1, -1], M = [];
    for (let i = 0; i < 11; i++) M.push(g.map((_, j) => g[(j - i + 11) % 11]));
    M.push(new Array(11).fill(-1));
    return M.map(r => r.slice(0, k));
  }
  function makeDesign(kind, opt) {
    if (kind === "full") return { kind, k: opt.k, matrix: fullFactorial(opt.k), res: "全因子", defining: [] };
    if (kind === "frac") { const f = fractional(opt.key); return { kind, k: FRACTIONS[opt.key].k, key: opt.key, matrix: f.matrix, res: f.res, defining: f.defining }; }
    if (kind === "pb") return { kind, k: opt.k, matrix: plackettBurman(opt.k), res: "PB12（只估主效應）", defining: [] };
    throw new Error("kind");
  }
  function termsFor(k, maxOrder) {
    const out = [];
    const rec = (start, cur) => { if (cur.length) out.push(cur.slice()); if (cur.length === maxOrder) return; for (let j = start; j < k; j++) { cur.push(j); rec(j + 1, cur); cur.pop(); } };
    rec(0, []);
    return out.sort((a, b) => a.length - b.length || a.join() .localeCompare(b.join()));
  }
  const termName = t => t.map(j => L[j]).join("");
  // y: runs × replicates (array of arrays, NaN allowed? no)
  function doeAnalyze(design, y, opt) {
    opt = opt || {};
    const M = design.matrix, runs = M.length, k = design.k, r = y[0].length, N = runs * r;
    const maxOrder = design.kind === "full" ? k : design.kind === "pb" ? 1 : 2;
    const cand = termsFor(k, maxOrder);
    // group aliased terms by identical (or negated) columns
    const groups = [];
    cand.forEach(t => {
      const col = M.map(row => t.reduce((s, j) => s * row[j], 1));
      const g = groups.find(g => g.col.every((v, i) => v === col[i]) || g.col.every((v, i) => v === -col[i]));
      if (g) g.aliases.push(termName(t)); else groups.push({ term: t, name: termName(t), col, aliases: [] });
    });
    const usable = groups.filter(g => g.col.some(v => v !== g.col[0])).slice(0, runs - 1);
    const ys = [].concat(...y), G = mean(ys), runMean = y.map(mean);
    const eff = usable.map(g => {
      let s = 0; for (let i = 0; i < runs; i++) s += g.col[i] * sum(y[i]);
      const coef = s / N; return { name: g.name, aliases: g.aliases, order: g.term.length, coef, effect: 2 * coef, ss: N * coef * coef, df: 1, col: g.col };
    });
    let SSpe = 0; y.forEach((row, i) => row.forEach(v => SSpe += (v - runMean[i]) ** 2));
    const dfpe = runs * (r - 1), SSt = sum(ys.map(v => (v - G) ** 2));
    const res = { runs, r, N, k, grand: G, effects: eff, SSt, dfTotal: N - 1 };
    const alpha = opt.alpha || 0.05;
    const dfResid = N - 1 - eff.length;
    if (dfpe > 0 || dfResid > 0) {
      // error = residual of the model with all estimable terms (lack of fit + pure error), as in common DOE software
      const SSmodel = sum(eff.map(e => e.ss)), dfE = N - 1 - eff.length, SSE = Math.max(0, SSt - SSmodel), MSE = SSE / dfE;
      const SSlof = dfpe > 0 ? Math.max(0, SSE - SSpe) : 0, dflof = dfpe > 0 ? dfE - dfpe : 0;
      eff.forEach(e => { e.F = e.ss / MSE; e.p = fSf(e.F, 1, dfE); e.se = Math.sqrt(MSE / N); e.t = e.coef / e.se; });
      res.method = "anova"; res.MSE = MSE; res.SSE = SSE; res.dfE = dfE; res.MSpe = dfpe > 0 ? SSpe / dfpe : NaN; res.noPureError = dfpe === 0; res.SSpe = SSpe; res.dfpe = dfpe; res.SSlof = SSlof; res.dflof = dflof;
      if (dflof > 0) { res.MSlof = SSlof / dflof; res.Flof = res.MSlof / res.MSpe; res.plof = fSf(res.Flof, dflof, dfpe); }
      res.refT = tCrit(1 - alpha / 2, dfE);
    } else {
      // Lenth's pseudo standard error (unreplicated)
      const c = eff.map(e => Math.abs(e.effect)), s0 = 1.5 * median(c);
      const trimmed = c.filter(v => v < 2.5 * s0), PSE = 1.5 * median(trimmed.length ? trimmed : c), dfL = eff.length / 3;
      if (PSE > 0) eff.forEach(e => { e.t = e.effect / PSE; e.p = Math.min(1, 2 * tSf(Math.abs(e.t), dfL)); });
      else { eff.forEach(e => { e.t = NaN; e.p = NaN; }); res.lenthDegenerate = true; }
      res.method = "lenth"; res.PSE = PSE; res.dfLenth = dfL; res.ME = tCrit(1 - alpha / 2, dfL) * PSE; res.refT = tCrit(1 - alpha / 2, dfL);
    }
    eff.forEach(e => { e.sig = isFinite(e.p) && e.p < alpha; });
    // model for residuals: replicated → all estimable terms; unreplicated → significant terms (hierarchy not enforced)
    const inModel = res.method === "anova" ? eff : eff.filter(e => e.sig);
    const fitted = M.map((row, i) => G + sum(inModel.map(e => e.coef * e.col[i])));
    const resid = [], fitAll = [];
    y.forEach((row, i) => row.forEach(v => { resid.push(v - fitted[i]); fitAll.push(fitted[i]); }));
    const SSE = sum(resid.map(e => e * e)), dfE = N - 1 - inModel.length;
    res.model = { terms: inModel.map(e => e.name), coefs: inModel.map(e => ({ name: e.name, coef: e.coef })), fitted: fitAll, resid, R2: SSt > 0 ? 1 - SSE / SSt : NaN, R2adj: SSt > 0 && dfE > 0 ? 1 - (SSE / dfE) / (SSt / (N - 1)) : NaN, S: dfE > 0 ? Math.sqrt(SSE / dfE) : NaN };
    // main effect & interaction plot data
    res.main = []; for (let j = 0; j < k; j++) { const lo = [], hi = []; M.forEach((row, i) => (row[j] > 0 ? hi : lo).push(...y[i])); res.main.push({ factor: L[j], lo: mean(lo), hi: mean(hi) }); }
    res.inter = [];
    if (design.kind !== "pb") for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) {
      const cell = { "--": [], "+-": [], "-+": [], "++": [] };
      M.forEach((row, i) => cell[(row[a] > 0 ? "+" : "-") + (row[b] > 0 ? "+" : "-")].push(...y[i]));
      res.inter.push({ a: L[a], b: L[b], mm: mean(cell["--"]), pm: mean(cell["+-"]), mp: mean(cell["-+"]), pp: mean(cell["++"]) });
    }
    // half-normal quantiles
    const sorted = eff.slice().sort((x, z) => Math.abs(x.effect) - Math.abs(z.effect));
    res.halfNormal = sorted.map((e, i) => ({ name: e.name, abs: Math.abs(e.effect), q: normInv(0.5 + 0.5 * (i + 1 - 0.5) / sorted.length), sig: e.sig }));
    // best corner by the model
    if (opt.goal && inModel.length) {
      let best = null;
      for (const row of fullFactorial(k)) {
        const pred = G + sum(inModel.map(e => e.coef * termOf(e.name).reduce((s, j) => s * row[j], 1)));
        const score = opt.goal === "max" ? pred : opt.goal === "min" ? -pred : -Math.abs(pred - opt.target);
        if (!best || score > best.score) best = { row, pred, score };
      }
      res.best = best;
    }
    return res;
  }
  const termOf = name => [...name].map(ch => L.indexOf(ch));

  // ================= DOE: mixture =================
  function simplexLattice(q, m) {
    const out = [], rec = (left, cur) => { if (cur.length === q - 1) { out.push(cur.concat([left]).map(v => v / m)); return; } for (let a = left; a >= 0; a--) rec(left - a, cur.concat([a])); };
    rec(m, []); return out;
  }
  function simplexCentroid(q) {
    const out = [];
    for (let mask = 1; mask < (1 << q); mask++) { const idx = []; for (let j = 0; j < q; j++) if (mask >> j & 1) idx.push(j); out.push(Array.from({ length: q }, (_, j) => idx.includes(j) ? 1 / idx.length : 0)); }
    return out.sort((a, b) => a.filter(v => v > 0).length - b.filter(v => v > 0).length);
  }
  function mixTerms(q, model) {
    const t = []; for (let i = 0; i < q; i++) t.push([i]);
    if (model !== "linear") for (let i = 0; i < q; i++) for (let j = i + 1; j < q; j++) t.push([i, j]);
    if (model === "cubic") for (let i = 0; i < q; i++) for (let j = i + 1; j < q; j++) for (let l = j + 1; l < q; l++) t.push([i, j, l]);
    return t;
  }
  function mixtureFit(points, y, model, names) {
    const q = points[0].length, terms = mixTerms(q, model);
    const X = points.map(p => terms.map(t => t.reduce((s, j) => s * p[j], 1)));
    if (X.length <= terms.length) return { error: `資料 ${X.length} 筆，模型有 ${terms.length} 個係數，需要更多實驗點才能估計（至少要比係數多 1 筆）。` };
    const f = ols(X, y); if (!f) return { error: "設計點不足以估計這個模型（矩陣不可逆）。" };
    const yb = mean(y), SST = sum(y.map(v => (v - yb) ** 2)), SSR = SST - f.sse, dfR = terms.length - 1;
    const nm = t => t.map(j => names ? names[j] : L[j]).join(" × ");
    return { model, terms: terms.map((t, i) => ({ name: nm(t), idx: t, coef: f.beta[i], se: f.se[i], t: i < q ? NaN : f.t[i], p: i < q ? NaN : f.p[i] })),
      SST, SSR, SSE: f.sse, dfR, dfE: f.df, MSE: f.mse, F: (SSR / dfR) / f.mse, p: fSf((SSR / dfR) / f.mse, dfR, f.df), R2: SSR / SST, R2adj: 1 - (f.sse / f.df) / (SST / (y.length - 1)), S: Math.sqrt(f.mse), fitted: f.fit, resid: f.res,
      predict: x => sum(terms.map((t, i) => f.beta[i] * t.reduce((s, j) => s * x[j], 1))) };
  }
  function mixtureOptimum(fit, q, goal, target, step) {
    step = step || (q === 3 ? 0.01 : 0.05);
    const m = Math.round(1 / step); let best = null;
    simplexLattice(q, m).forEach(x => { const v = fit.predict(x), s = goal === "max" ? v : goal === "min" ? -v : -Math.abs(v - target); if (!best || s > best.s) best = { x, v, s }; });
    return best;
  }

  const api = { spcConst, spcAuto, spcRun, xbarR, xbarS, iMR, pChart, npChart, cChart, uChart, nelson, NELSON, capability, CHART_NAME,
    grrAnova, grrXbarR, msaBias, msaLinearity, cohenKappa, fleissKappa, attrAgreement, ols, matInv,
    fullFactorial, fractional, plackettBurman, makeDesign, FRACTIONS, doeAnalyze, termsFor, simplexLattice, simplexCentroid, mixtureFit, mixtureOptimum, mixTerms, LETTERS: L };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.QT = api;
})(typeof window !== "undefined" ? window : globalThis);
