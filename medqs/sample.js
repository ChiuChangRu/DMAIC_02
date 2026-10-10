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

  const api = { prop1Crit, prop1Power, prop1N, prop1NApprox, prop2Power, prop2N, doePower, doeReps, tolK, tolN, npConf, npTolN };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.SS = api;
})(typeof window !== "undefined" ? window : globalThis);
