/* 樣本數規劃計算引擎（window.SS / module.exports）
   單一比例（精確二項）、兩比例（常態近似，與 statsmodels 相同定義）、2 水準因子設計的重複次數、允差區間樣本數 */
(function (root) {
  "use strict";
  const HT = (typeof module !== "undefined" && module.exports) ? require("./stats.js") : root.HT;
  const { binomCdf, normCdf, normInv, tInv, nctCdf, nctSf, tolK1, tolK2 } = HT;

  // ---------- one proportion, exact binomial test ----------
  // alt: "less" (H1: p < p0), "greater" (H1: p > p0), "two-sided" (equal tails alpha/2)
  const sfB = (c, n, p) => c <= 0 ? 1 : c > n ? 0 : binomCdf(n - c, n, 1 - p);   // P(X >= c), computed from the other tail for precision
  function prop1Crit(n, p0, alpha, alt) {
    const lowerC = a => { let lo = -1, hi = n; while (lo < hi) { const m = Math.ceil((lo + hi + 1) / 2) - 0; const mm = Math.min(m, hi); if (binomCdf(mm, n, p0) <= a) lo = mm; else hi = mm - 1; } return lo; };  // largest c: P(X<=c) <= a
    const upperC = a => { let lo = 0, hi = n + 1; while (lo < hi) { const m = (lo + hi) >> 1; if (sfB(m, n, p0) <= a) hi = m; else lo = m + 1; } return lo; };        // smallest c: P(X>=c) <= a
    if (alt === "less") return { lo: lowerC(alpha), hi: n + 1 };
    if (alt === "greater") return { lo: -1, hi: upperC(alpha) };
    return { lo: lowerC(alpha / 2), hi: upperC(alpha / 2) };
  }
  function prop1Power(p0, p1, n, alpha, alt) {
    const c = prop1Crit(n, p0, alpha, alt);
    const rej = p => (c.lo >= 0 ? binomCdf(c.lo, n, p) : 0) + (c.hi <= n ? sfB(c.hi, n, p) : 0);
    return { power: rej(p1), size: rej(p0), lo: c.lo, hi: c.hi };
  }
  // exact power is saw-toothed in n: return the first n reaching the target, and the n from which it stays at or above target
  // (checked up to max(3n + 100) or maxN)
  function prop1N(p0, p1, alpha, alt, target, maxN) {
    maxN = maxN || 20000;
    let first = NaN;
    for (let n = 1; n <= maxN; n++) { if (prop1Power(p0, p1, n, alpha, alt).power >= target) { first = n; break; } }
    if (!isFinite(first)) return { n: NaN, stable: NaN, checkedTo: maxN };
    const L = Math.min(maxN, 3 * first + 100); let lastBad = first - 1;
    for (let n = first + 1; n <= L; n++) if (prop1Power(p0, p1, n, alpha, alt).power < target) lastBad = n;
    return { n: first, stable: lastBad + 1, checkedTo: L };
  }

  // normal-approximation sample size for one proportion (used only beyond the exact search limit)
  function prop1NApprox(p0, p1, alpha, alt, target) {
    const za = normInv(1 - (alt === "two-sided" ? alpha / 2 : alpha)), zb = normInv(target);
    return Math.ceil(((za * Math.sqrt(p0 * (1 - p0)) + zb * Math.sqrt(p1 * (1 - p1))) / (p0 - p1)) ** 2);
  }
  // ---------- two proportions, normal approximation (pooled variance under H0, unpooled under H1) ----------
  // alt: "two-sided" | "larger" (p1 > p2) | "smaller" (p1 < p2); n1 = group 1 size, n2 = ratio * n1
  function prop2Power(p1, p2, n1, alpha, alt, ratio) {
    ratio = ratio || 1;
    const d = p1 - p2, pp = (p1 + p2 * ratio) / (1 + ratio);
    const sNull = Math.sqrt(pp * (1 - pp) + pp * (1 - pp) / ratio), sAlt = Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2) / ratio);
    const a = alt === "two-sided" ? alpha / 2 : alpha, r = sNull / sAlt, s = d * Math.sqrt(n1) / sAlt;
    let pw = 0;
    if (alt !== "smaller") pw += 1 - normCdf(normInv(1 - a) * r - s);
    if (alt !== "larger") pw += normCdf(normInv(a) * r - s);
    return pw;
  }
  function prop2N(p1, p2, alpha, alt, target, ratio) {
    for (let n = 2; n <= 1e6; n = n < 1000 ? n + 1 : Math.ceil(n * 1.01)) {
      if (prop2Power(p1, p2, n, alpha, alt, ratio) >= target) { let m = n; while (m > 2 && prop2Power(p1, p2, m - 1, alpha, alt, ratio) >= target) m--; return m; }
    }
    return NaN;
  }

  // ---------- 2-level factorial: power to detect an effect delta (high − low mean) ----------
  // runs: factorial runs per replicate; reps; terms: model terms (excluding intercept); cp: center points (add df only)
  function doePower(runs, reps, terms, delta, sigma, alpha, cp) {
    cp = cp || 0;
    const Nf = runs * reps, N = Nf + cp, df = N - 1 - terms;
    if (df < 1) return { power: NaN, df, N };
    const ncp = delta * Math.sqrt(Nf) / (2 * sigma), c = tInv(1 - alpha / 2, df);
    return { power: nctSf(c, df, ncp) + nctCdf(-c, df, ncp), df, N, ncp };
  }
  function doeReps(runs, terms, delta, sigma, alpha, target, cp, maxR) {
    for (let r = 1; r <= (maxR || 50); r++) { const p = doePower(runs, r, terms, delta, sigma, alpha, cp); if (p.power >= target) return r; }
    return NaN;
  }

  // ---------- tolerance-interval sample size ----------
  // parametric (normal): smallest n with k(n) <= kMax, where kMax = allowed distance from mean to spec in σ units
  function tolK(n, p, conf, side) { return side === "two" ? tolK2(n, p, conf) : tolK1(n, p, conf); }
  function tolN(p, conf, side, kMax, maxN) {
    maxN = maxN || 20000;
    const z = normInv(side === "two" ? (1 + p) / 2 : p);
    if (!(kMax > z)) return { n: NaN, zLimit: z };
    let lo = 2, hi = 2;
    while (tolK(hi, p, conf, side) > kMax) { if (hi >= maxN) return { n: NaN, zLimit: z, overMax: maxN }; lo = hi; hi = Math.min(maxN, hi * 2); }
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tolK(m, p, conf, side) > kMax) lo = m; else hi = m; }
    return { n: tolK(lo, p, conf, side) <= kMax ? lo : hi, zLimit: z };
  }
  // distribution-free (Wilks): one-sided uses the extreme value, two-sided uses min and max
  function npConf(n, p, side) { return side === "two" ? 1 - n * Math.pow(p, n - 1) + (n - 1) * Math.pow(p, n) : 1 - Math.pow(p, n); }
  function npTolN(p, conf, side) { let n = side === "two" ? 2 : 1; while (npConf(n, p, side) < conf) { n++; if (n > 1e6) return NaN; } return n; }


  // ---------- equivalence (TOST) and non-inferiority for means ----------
  // design: "two" = two independent groups, n per group (SE = s·√(2/n), df = 2n−2)
  //         "one" = one sample vs reference value, or paired differences (SE = s/√n, df = n−1)
  // TOST concludes equivalence when (d̄ − t·SE, d̄ + t·SE) ⊂ (−δ, +δ), t = t_{1−α, df} (the 1−2α CI rule).
  // Exact power (σ known only to the planner): integrate over the sampling distribution of s.
  //   v = √(df·s²/σ²) ~ chi(df);  lim(v) = δ − t·σ·√k·v/√df;  P = Φ((lim−Δ)/c) − Φ((−lim−Δ)/c), c = σ√k
  const GL = (() => {   // 20-point Gauss–Legendre nodes/weights on [−1, 1]
    const m = 20, x = [], w = [];
    for (let i = 1; i <= m; i++) {
      let z = Math.cos(Math.PI * (i - 0.25) / (m + 0.5)), pp = 0;
      for (let it = 0; it < 100; it++) { let p1 = 1, p2 = 0; for (let j = 1; j <= m; j++) { const p3 = p2; p2 = p1; p1 = ((2 * j - 1) * z * p2 - (j - 1) * p3) / j; } pp = m * (z * p1 - p2) / (z * z - 1); const z1 = z; z = z1 - p1 / pp; if (Math.abs(z - z1) < 1e-15) break; }
      x.push(z); w.push(2 / ((1 - z * z) * pp * pp));
    }
    return { x, w };
  })();
  const eqDesign = (design, n) => design === "two" ? { k: 2 / n, df: 2 * n - 2 } : { k: 1 / n, df: n - 1 };
  function tostPower(design, n, delta, sd, alpha, trueDiff) {
    const { k, df } = eqDesign(design, n);
    if (!(df >= 1) || !(delta > 0) || !(sd > 0)) return NaN;
    const D = trueDiff || 0, c = sd * Math.sqrt(k), t = tInv(1 - alpha, df);
    const vmax = delta * Math.sqrt(df) / (t * c);
    const logC = Math.log(2) - (df / 2) * Math.log(2) - HT.lgamma(df / 2);
    const dens = v => v <= 0 ? (df === 1 ? Math.exp(logC) : 0) : Math.exp(logC + (df - 1) * Math.log(v) - v * v / 2);   // chi(df) pdf
    const f = v => { const lim = delta - t * c * v / Math.sqrt(df); if (lim <= 0) return 0; return (normCdf((lim - D) / c) - normCdf((-lim - D) / c)) * dens(v); };
    const mid = Math.sqrt(Math.max(df - 0.5, 0)), a = Math.max(0, mid - 10), b = Math.min(vmax, mid + 10);
    if (b <= a) return 0;
    const P = 40, h = (b - a) / P; let s = 0;
    for (let p = 0; p < P; p++) { const lo = a + p * h; for (let i = 0; i < GL.x.length; i++) s += GL.w[i] * f(lo + (GL.x[i] + 1) * h / 2); }
    return Math.min(1, Math.max(0, s * h / 2));
  }
  // non-inferiority: dir "higher" (higher is better; H0: μ_new − μ_ref ≤ −δ) or "lower" (lower is better; H0: μ_new − μ_ref ≥ +δ)
  function niPower(design, n, delta, sd, alpha, trueDiff, dir) {
    const { k, df } = eqDesign(design, n);
    if (!(df >= 1) || !(delta > 0) || !(sd > 0)) return NaN;
    const D = trueDiff || 0, c = sd * Math.sqrt(k), t = tInv(1 - alpha, df);
    return dir === "lower" ? nctCdf(-t, df, (D - delta) / c) : nctSf(t, df, (D + delta) / c);
  }
  function eqN(fn, target, maxN) {   // smallest n (≥ 2) with power ≥ target; power is increasing in n
    maxN = maxN || 100000;
    if (!(fn(maxN) >= target)) return NaN;
    let n = 2;
    for (; n < 200; n++) if (fn(n) >= target) return n;
    let lo = 199, hi = 200;
    while (!(fn(hi) >= target)) { lo = hi; hi = Math.min(maxN, hi * 2); }
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (fn(m) >= target) hi = m; else lo = m; }
    return hi;
  }
  const tostN = (design, delta, sd, alpha, target, trueDiff, maxN) => Math.abs(trueDiff || 0) >= delta ? NaN : eqN(n => tostPower(design, n, delta, sd, alpha, trueDiff), target, maxN);
  const niN = (design, delta, sd, alpha, target, trueDiff, dir, maxN) => eqN(n => niPower(design, n, delta, sd, alpha, trueDiff, dir), target, maxN);
  // smallest δ that reaches the target power with a fixed n (for "如果只能量 M 件")
  function eqDelta(fn, target, sd) {
    let lo = 0, hi = sd;
    while (!(fn(hi) >= target)) { lo = hi; hi *= 2; if (hi > 1e6 * sd) return NaN; }
    for (let i = 0; i < 80; i++) { const m = (lo + hi) / 2; if (fn(m) >= target) hi = m; else lo = m; }
    return hi;
  }
  const tostDelta = (design, n, sd, alpha, target, trueDiff) => eqDelta(d => d > Math.abs(trueDiff || 0) ? tostPower(design, n, d, sd, alpha, trueDiff) : 0, target, sd);
  const niDelta = (design, n, sd, alpha, target, trueDiff, dir) => eqDelta(d => niPower(design, n, d, sd, alpha, trueDiff, dir), target, sd);

  // ---------- 量完後的判定：同等性（TOST）與不劣性（平均差 d = y − x：第 2 組 − 第 1 組） ----------
  function eqStats(x, y, paired) {
    const m = a => a.reduce((s, v) => s + v, 0) / a.length, v = a => { const mu = m(a); return a.reduce((s, t) => s + (t - mu) ** 2, 0) / (a.length - 1); };
    if (paired) { const dd = y.map((t, i) => t - x[i]), n = dd.length; return { d: m(dd), se: Math.sqrt(v(dd) / n), df: n - 1, s: Math.sqrt(v(dd)), n1: n, n2: n }; }
    const n1 = x.length, n2 = y.length, sp = Math.sqrt(((n1 - 1) * v(x) + (n2 - 1) * v(y)) / (n1 + n2 - 2));
    return { d: m(y) - m(x), se: sp * Math.sqrt(1 / n1 + 1 / n2), df: n1 + n2 - 2, s: sp, n1, n2 };
  }
  function tostTest(x, y, delta, alpha, paired) {
    const r = eqStats(x, y, paired), t = tInv(1 - alpha, r.df);
    const pLow = HT.tSf((r.d + delta) / r.se, r.df), pUp = HT.tCdf((r.d - delta) / r.se, r.df);   // H0: d ≤ −δ ； H0: d ≥ +δ
    const lo = r.d - t * r.se, hi = r.d + t * r.se;
    return Object.assign(r, { delta, alpha, tcrit: t, lo, hi, pLow, pUp, p: Math.max(pLow, pUp), ok: lo > -delta && hi < delta });
  }
  function niTest(x, y, delta, alpha, paired, dir) {
    const r = eqStats(x, y, paired), t = tInv(1 - alpha, r.df);
    if (dir === "lower") { const p = HT.tCdf((r.d - delta) / r.se, r.df), bound = r.d + t * r.se; return Object.assign(r, { delta, alpha, dir, tcrit: t, bound, p, ok: bound < delta }); }
    const p = HT.tSf((r.d + delta) / r.se, r.df), bound = r.d - t * r.se; return Object.assign(r, { delta, alpha, dir: "higher", tcrit: t, bound, p, ok: bound > -delta });
  }

  const api = { tostTest, niTest, eqStats, tostPower, niPower, tostN, niN, tostDelta, niDelta, prop1Crit, prop1Power, prop1N, prop1NApprox, prop2Power, prop2N, doePower, doeReps, tolK, tolN, npConf, npTolN };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.SS = api;
})(typeof window !== "undefined" ? window : globalThis);
