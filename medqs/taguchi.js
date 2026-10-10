/* 田口方法計算引擎（window.TG / module.exports）
   直交表、靜態與動態 S/N、回應表、ANOVA（含併入）、預測與確認實驗信賴區間 */
(function (root) {
  "use strict";
  const HT = (typeof module !== "undefined" && module.exports) ? require("./stats.js") : root.HT;
  const fSf = HT.fSf;
  const sum = a => a.reduce((s, v) => s + v, 0), mean = a => sum(a) / a.length;
  const LT = "ABCDEFGHJKLMNOPQ";

  // ---------- orthogonal arrays (levels 1-based) ----------
  function twoLevel(n) {               // Taguchi standard L(2^n): columns A, B, AB, C, AC, BC, ABC, ...
    const masks = [];
    for (let e = 0; e < n; e++) { const bit = 1 << (n - 1 - e), prev = masks.slice(); masks.push(bit); prev.forEach(m => masks.push(m ^ bit)); }
    const runs = 1 << n, M = [];
    for (let i = 0; i < runs; i++) M.push(masks.map(m => { let b = i & m, c = 0; while (b) { c += b & 1; b >>= 1; } return 1 + (c & 1); }));
    return { matrix: M, masks };
  }
  const L9 = []; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) L9.push([a, b, (a + b) % 3, (2 * a + b) % 3].map(v => v + 1));
  const L18 = ["11111111", "11222222", "11333333", "12112233", "12223311", "12331122", "13121323", "13232131", "13313212",
    "21133221", "21211332", "21322113", "22123132", "22231213", "22312321", "23132312", "23213123", "23321231"].map(r => [...r].map(Number));
  const PB = (() => { const g = [1, 1, -1, 1, 1, 1, -1, -1, -1, 1, -1], M = []; for (let i = 0; i < 11; i++) M.push(g.map((_, j) => g[(j - i + 11) % 11])); M.push(new Array(11).fill(-1)); return M.map(r => r.map(v => v > 0 ? 2 : 1)); })();
  const ARR = {
    L4: Object.assign({ name: "L4", levels: [2, 2, 2] }, twoLevel(2)),
    L8: Object.assign({ name: "L8", levels: new Array(7).fill(2) }, twoLevel(3)),
    L9: { name: "L9", levels: [3, 3, 3, 3], matrix: L9 },
    L12: { name: "L12", levels: new Array(11).fill(2), matrix: PB, note: "Plackett-Burman 型 L12（與標準 L12 同為 12 次、11 欄 2 水準的直交表，列順序不同）；交互作用會分散到各欄，不能配置交互作用。" },
    L16: Object.assign({ name: "L16", levels: new Array(15).fill(2) }, twoLevel(4)),
    L18: { name: "L18", levels: [2, 3, 3, 3, 3, 3, 3, 3], matrix: L18, note: "L18：第 1 欄 2 水準、第 2～8 欄 3 水準；交互作用會分散到各欄，不能配置交互作用（第 1、2 欄的交互作用除外，本工具不使用）。" }
  };
  Object.values(ARR).forEach(a => { a.runs = a.matrix.length; });
  // suggest smallest array that fits; levels = [2|3,...]
  function suggest(levels) {
    const n2 = levels.filter(l => l === 2).length, n3 = levels.filter(l => l === 3).length;
    if (levels.some(l => l !== 2 && l !== 3)) return null;
    if (n3 === 0) return n2 <= 3 ? "L4" : n2 <= 7 ? "L8" : n2 <= 11 ? "L12" : n2 <= 15 ? "L16" : null;
    if (n2 === 0 && n3 <= 4) return "L9";
    if (n2 <= 1 && n3 <= 7) return "L18";
    return null;
  }
  // assign factors to columns; inter = [[i,j],...] (only 2-level standard arrays)
  function assign(name, levels, inter) {
    const A = ARR[name]; inter = inter || [];
    if (!A) return { error: "未知的直交表。" };
    if (inter.length && !A.masks) return { error: `${name} 不能配置交互作用，請改用 L4、L8 或 L16。` };
    if (A.masks) {
      if (levels.some(l => l !== 2)) return { error: `${name} 只有 2 水準欄。` };
      const used = new Map(), cols = new Array(levels.length).fill(-1), interCols = [];
      // greedy: factors in interactions first, using basic columns where possible
      const order = levels.map((_, i) => i).sort((a, b) => inter.filter(p => p.includes(b)).length - inter.filter(p => p.includes(a)).length);
      const rec = k => {
        if (k === order.length) return true;
        const f = order[k];
        for (let c = 0; c < A.masks.length; c++) {
          if (used.has(c)) continue;
          const adds = [];
          let ok = true;
          for (const [i, j] of inter) {
            const other = i === f ? j : j === f ? i : -1;
            if (other < 0 || cols[other] < 0) continue;
            const m = A.masks[c] ^ A.masks[cols[other]], ic = A.masks.indexOf(m);
            if (used.has(ic) || ic === c || adds.some(x => x.col === ic)) { ok = false; break; }
            adds.push({ a: Math.min(f, other), b: Math.max(f, other), col: ic });
          }
          if (!ok) continue;
          cols[f] = c; used.set(c, "f" + f); adds.forEach(x => used.set(x.col, "i"));
          if (rec(k + 1)) { interCols.push(...adds); return true; }
          cols[f] = -1; used.delete(c); adds.forEach(x => used.delete(x.col));
        }
        return false;
      };
      if (!rec(0)) return { error: `${name} 的欄位不夠放這些因子與交互作用，請改用較大的直交表或減少交互作用。` };
      return { array: name, cols, inter: interCols.sort((x, y) => x.a - y.a || x.b - y.b) };
    }
    // non-2-level arrays: fill columns by level type
    const cols = [], free = A.levels.map((l, i) => i);
    for (const l of levels) { const k = free.findIndex(c => A.levels[c] === l); if (k < 0) return { error: `${name} 沒有足夠的 ${l} 水準欄。` }; cols.push(free[k]); free.splice(k, 1); }
    return { array: name, cols, inter: [] };
  }

  // ---------- S/N ----------
  const log10 = Math.log10;
  function variance(a) { const m = mean(a); return sum(a.map(v => (v - m) ** 2)) / (a.length - 1); }
  function snStatic(y, type) {
    const n = y.length;
    if (type === "smaller") return -10 * log10(sum(y.map(v => v * v)) / n);
    if (type === "larger") { if (y.some(v => v === 0)) return NaN; return -10 * log10(sum(y.map(v => 1 / (v * v))) / n); }
    if (n < 2) return NaN;
    const s2 = variance(y);
    if (type === "nominal") return s2 > 0 ? 10 * log10(mean(y) ** 2 / s2) : Infinity;
    if (type === "nominalVar") return s2 > 0 ? -10 * log10(s2) : Infinity;
    return NaN;
  }
  // dynamic, zero-point proportional y = beta*M ; Y[s][k] signal s, noise/rep k
  function snDynamic(M, Y, formula) {
    let sxy = 0, sxx = 0, n = 0, syy = 0;
    M.forEach((m, s) => Y[s].forEach(y => { sxy += m * y; sxx += m * m; syy += y * y; n++; }));
    const beta = sxy / sxx, Sb = sxy * sxy / sxx, Se = Math.max(0, syy - Sb), Ve = Se / (n - 1);
    const sn = Ve > 0 ? (formula === "simple" ? 10 * log10(beta * beta / Ve) : 10 * log10(((Sb - Ve) / sxx) / Ve)) : Infinity;
    return { beta, Sb, Se, Ve, r: sxx, n, sn };
  }

  // ---------- response table & ANOVA ----------
  // design: {array, cols, inter}, levels per factor; resp: per-run values
  function analyze(design, levels, resp, opt) {
    opt = opt || {};
    const A = ARR[design.array], M = A.matrix, N = M.length, T = mean(resp);
    const SST = sum(resp.map(v => (v - T) ** 2));
    const terms = levels.map((L, f) => {
      const c = design.cols[f], means = [];
      for (let l = 1; l <= L; l++) { const v = resp.filter((_, i) => M[i][c] === l); means.push(mean(v)); }
      const ss = sum(means.map(m => (N / L) * (m - T) ** 2));
      return { kind: "factor", f, name: LT[f], df: L - 1, ss, means, delta: Math.max(...means) - Math.min(...means) };
    });
    design.inter.forEach(it => {
      const c = it.col, means = [1, 2].map(l => mean(resp.filter((_, i) => M[i][c] === l)));
      const cell = [[0, 0], [0, 0]].map((r, la) => r.map((_, lb) => mean(resp.filter((_, i) => M[i][design.cols[it.a]] === la + 1 && M[i][design.cols[it.b]] === lb + 1))));
      terms.push({ kind: "inter", a: it.a, b: it.b, name: LT[it.a] + "×" + LT[it.b], df: 1, ss: sum(means.map(m => (N / 2) * (m - T) ** 2)), cell });
    });
    const rank = terms.filter(t => t.kind === "factor").slice().sort((x, y) => y.delta - x.delta);
    rank.forEach((t, i) => { t.rank = i + 1; });
    const dfT = N - 1, dfTerms = sum(terms.map(t => t.df));
    const resid = { df: dfT - dfTerms, ss: Math.max(0, SST - sum(terms.map(t => t.ss))) };
    // pooling
    let pooled;
    if (Array.isArray(opt.pool)) pooled = new Set(opt.pool);
    else if (opt.pool === "none") pooled = new Set();
    else {
      pooled = new Set();
      if (resid.df < 1) {   // auto: pool the smallest terms until pooled df >= half of term df (Taguchi rule of thumb)
        const srt = terms.map((t, i) => [t.ss / t.df, i]).sort((x, y) => x[0] - y[0]);
        let d = 0; for (const [, i] of srt) { if (d >= dfTerms / 2) break; pooled.add(i); d += terms[i].df; }
      }
    }
    let eSS = resid.ss, eDf = resid.df;
    terms.forEach((t, i) => { t.pooled = pooled.has(i); if (t.pooled) { eSS += t.ss; eDf += t.df; } });
    const Ve = eDf > 0 ? eSS / eDf : NaN;
    terms.forEach(t => {
      t.ms = t.ss / t.df;
      if (!t.pooled && eDf > 0) { t.F = Ve > 0 ? t.ms / Ve : (t.ms > 0 ? Infinity : NaN); t.p = Ve > 0 ? fSf(t.F, t.df, eDf) : (t.ms > 0 ? 0 : NaN); t.rho = SST > 0 ? 100 * (t.ss - t.df * Ve) / SST : NaN; }
      else { t.F = NaN; t.p = NaN; t.rho = NaN; }
    });
    const rhoErr = SST > 0 && eDf > 0 ? 100 * (eSS + Ve * sum(terms.filter(t => !t.pooled).map(t => t.df))) / SST : NaN;
    return { N, T, SST, dfT, terms, resid, error: { ss: eSS, df: eDf, ms: Ve, rho: rhoErr }, pooled: [...pooled] };
  }
  // model used for prediction: unpooled terms with p < alpha, kept hierarchical (an interaction keeps its two main effects);
  // terms dropped from the model are pooled into the error used for confidence intervals
  function model(an, alpha) {
    const keep = an.terms.map(t => !t.pooled && t.p < alpha);
    an.terms.forEach((t, i) => { if (keep[i] && t.kind === "inter") an.terms.forEach((u, j) => { if (u.kind === "factor" && (u.f === t.a || u.f === t.b)) keep[j] = true; }); });
    let ss = an.error.ss, df = an.error.df;
    an.terms.forEach((t, i) => { if (!t.pooled && !keep[i]) { ss += t.ss; df += t.df; } });
    return Object.assign({}, an, { terms: an.terms.map((t, i) => Object.assign({}, t, { pooled: !keep[i] })), error: { ss, df, ms: df > 0 ? ss / df : NaN }, modelAlpha: alpha });
  }
  // prediction for a level combination (lv: 1-based per factor) using unpooled terms
  function predict(an, lv, useTerms) {
    let p = an.T, dfUsed = 0;
    an.terms.forEach((t, i) => {
      const use = useTerms ? useTerms.includes(i) : !t.pooled;
      if (!use) return;
      dfUsed += t.df;
      if (t.kind === "factor") p += t.means[lv[t.f] - 1] - an.T;
      else { const ta = an.terms.find(x => x.kind === "factor" && x.f === t.a), tb = an.terms.find(x => x.kind === "factor" && x.f === t.b); p += t.cell[lv[t.a] - 1][lv[t.b] - 1] - ta.means[lv[t.a] - 1] - tb.means[lv[t.b] - 1] + an.T; }
    });
    return { pred: p, dfUsed, neff: an.N / (1 + dfUsed) };
  }
  function fInv(q, d1, d2) { // upper-tail critical value: fSf(x) = q
    let lo = 0, hi = 1; while (fSf(hi, d1, d2) > q) hi *= 2;
    for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (fSf(m, d1, d2) > q) lo = m; else hi = m; }
    return (lo + hi) / 2;
  }
  // confidence half-widths: mean of population (CI1) and confirmation average of r runs (CI2)
  function predCI(an, neff, r, alpha) {
    alpha = alpha || 0.05; const e = an.error;
    if (!(e.df > 0) || !isFinite(e.ms)) return null;
    const F = fInv(alpha, 1, e.df);
    return { F, ci1: Math.sqrt(F * e.ms / neff), ci2: r > 0 ? Math.sqrt(F * e.ms * (1 / neff + 1 / r)) : NaN };
  }
  // best level combination (exhaustive) maximizing / minimizing / targeting the prediction
  function optimize(an, levels, goal, target, fixed) {
    const free = levels.map((_, f) => f).filter(f => !(fixed && fixed[f]));
    let best = null; const lv = levels.map((_, f) => (fixed && fixed[f]) || 1);
    const rec = k => {
      if (k === free.length) {
        const p = predict(an, lv).pred, s = goal === "max" ? p : goal === "min" ? -p : -Math.abs(p - target);
        if (!best || s > best.s + 1e-12) best = { lv: lv.slice(), pred: p, s };
        return;
      }
      for (let l = 1; l <= levels[free[k]]; l++) { lv[free[k]] = l; rec(k + 1); }
    };
    rec(0); return best;
  }

  const api = { ARR, suggest, assign, snStatic, snDynamic, analyze, model, predict, predCI, optimize, fInv, LETTERS: LT };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.TG = api;
})(typeof window !== "undefined" ? window : globalThis);
