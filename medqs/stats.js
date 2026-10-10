/* Two-sample hypothesis-testing engine.
 * Pure JavaScript, no dependencies. Runs in the browser and in Node (validation).
 * Every routine here is cross-checked against SciPy and NIST StRD (see validation report).
 */
(function (root) {
  "use strict";

  // ---------- special functions ----------
  const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];

  function lgamma(x) {
    if (x < 0.5) return Math.log(Math.PI / Math.abs(Math.sin(Math.PI * x))) - lgamma(1 - x);
    x -= 1;
    let a = LANCZOS[0];
    const t = x + 7.5;
    for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
    return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
  }

  // regularized lower / upper incomplete gamma
  function gammp(a, x) {
    if (x <= 0) return 0;
    if (x < a + 1) return gser(a, x);
    return 1 - gcf(a, x);
  }
  function gammq(a, x) {
    if (x <= 0) return 1;
    if (x < a + 1) return 1 - gser(a, x);
    return gcf(a, x);
  }
  function gser(a, x) {
    let ap = a, sum = 1 / a, del = sum;
    for (let n = 0; n < 1000; n++) {
      ap += 1; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-17) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
  }
  function gcf(a, x) {
    const FPMIN = 1e-300;
    let b = x + 1 - a, c = 1 / FPMIN, d = 1 / b, h = d;
    for (let i = 1; i < 1000; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = b + an / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-16) break;
    }
    return Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
  }

  function erfc(x) {
    return x >= 0 ? gammq(0.5, x * x) : 2 - gammq(0.5, x * x);
  }
  function normCdf(z) { return 0.5 * erfc(-z / Math.SQRT2); }
  function normSf(z) { return 0.5 * erfc(z / Math.SQRT2); }

  // Wichura AS241 (PPND16)
  function normInv(p) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    const q = p - 0.5;
    let r, val;
    if (Math.abs(q) <= 0.425) {
      r = 0.180625 - q * q;
      val = q * (((((((r * 2509.0809287301226727 + 33430.575583588128105) * r + 67265.770927008700853) * r +
        45921.953931549871457) * r + 13731.693765509461125) * r + 1971.5909503065514427) * r +
        133.14166789178437745) * r + 3.387132872796366608) /
        (((((((r * 5226.495278852545925 + 28729.085735721942674) * r + 39307.89580009271061) * r +
          21213.794301586595867) * r + 5394.1960214247511077) * r + 687.1870074920579083) * r +
          42.313330701600911252) * r + 1);
      return val;
    }
    r = q < 0 ? p : 1 - p;
    r = Math.sqrt(-Math.log(r));
    if (r <= 5) {
      r -= 1.6;
      val = (((((((r * 7.7454501427834140764e-4 + 0.0227238449892691845833) * r + 0.24178072517745061177) * r +
        1.27045825245236838258) * r + 3.64784832476320460504) * r + 5.7694972214606914055) * r +
        4.6303378461565452959) * r + 1.42343711074968357734) /
        (((((((r * 1.05075007164441684324e-9 + 5.475938084995344946e-4) * r + 0.0151986665636164571966) * r +
          0.14810397642748007459) * r + 0.68976733498510000455) * r + 1.6763848301838038494) * r +
          2.05319162663775882187) * r + 1);
    } else {
      r -= 5;
      val = (((((((r * 2.01033439929228813265e-7 + 2.71155556874348757815e-5) * r + 0.0012426609473880784386) * r +
        0.026532189526576123093) * r + 0.29656057182850489123) * r + 1.7848265399172913358) * r +
        5.4637849111641143699) * r + 6.6579046435011037772) /
        (((((((r * 2.04426310338993978564e-15 + 1.4215117583164458887e-7) * r + 1.8463183175100546818e-5) * r +
          7.868691311456132591e-4) * r + 0.0148753612908506148525) * r + 0.13692988092273580531) * r +
          0.59983220655588793769) * r + 1);
    }
    return q < 0 ? -val : val;
  }

  function betacf(a, b, x) {
    const FPMIN = 1e-300;
    const qab = a + b, qap = a + 1, qam = a - 1;
    let c = 1, d = 1 - qab * x / qap;
    if (Math.abs(d) < FPMIN) d = FPMIN;
    d = 1 / d;
    let h = d;
    for (let m = 1; m <= 3000; m++) {
      const m2 = 2 * m;
      let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
      c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c; h *= del;
      if (Math.abs(del - 1) < 1e-16) break;
    }
    return h;
  }
  // regularized incomplete beta I_x(a,b)
  function ibeta(x, a, b) {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    const lbt = lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log1p(-x);
    if (x < (a + 1) / (a + b + 2)) return Math.exp(lbt) * betacf(a, b, x) / a;
    return 1 - Math.exp(lbt) * betacf(b, a, 1 - x) / b;
  }

  // Student t: upper tail P(T > t)
  function tSf(t, df) {
    if (!isFinite(t)) return t > 0 ? 0 : 1;
    const tail = 0.5 * ibeta(df / (df + t * t), df / 2, 0.5);
    return t > 0 ? tail : 1 - tail;
  }
  function tCdf(t, df) {
    if (!isFinite(t)) return t > 0 ? 1 : 0;
    const tail = 0.5 * ibeta(df / (df + t * t), df / 2, 0.5);
    return t > 0 ? 1 - tail : tail;
  }
  function tInv(p, df) {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;
    let lo = -1, hi = 1;
    while (tCdf(lo, df) > p) lo *= 2;
    while (tCdf(hi, df) < p) hi *= 2;
    for (let i = 0; i < 300; i++) {
      const mid = (lo + hi) / 2;
      if (tCdf(mid, df) < p) lo = mid; else hi = mid;
      if (hi - lo < 1e-15 * Math.max(1, Math.abs(mid))) break;
    }
    return (lo + hi) / 2;
  }
  // F: upper tail P(F > f)
  function fSf(f, d1, d2) {
    if (!(f > 0)) return 1;
    if (!isFinite(f)) return 0;
    return ibeta(d2 / (d2 + d1 * f), d2 / 2, d1 / 2);
  }

  // ---------- basic helpers ----------
  function sorted(a) { return a.slice().sort((x, y) => x - y); }
  function mean(a) {
    // shifted mean for precision
    const ref = a[0];
    let s = 0;
    for (const v of a) s += v - ref;
    return ref + s / a.length;
  }
  function sumSq(a, m) {
    let s = 0;
    for (const v of a) { const d = v - m; s += d * d; }
    return s;
  }
  function variance(a) { return a.length < 2 ? NaN : sumSq(a, mean(a)) / (a.length - 1); }
  // numpy default "linear" (Hyndman & Fan type 7)
  function quantile(sortedArr, p) {
    const n = sortedArr.length;
    if (n === 1) return sortedArr[0];
    const h = (n - 1) * p;
    const lo = Math.floor(h);
    if (lo >= n - 1) return sortedArr[n - 1];
    return sortedArr[lo] + (h - lo) * (sortedArr[lo + 1] - sortedArr[lo]);
  }
  function median(a) { return quantile(sorted(a), 0.5); }

  // average ranks; returns {ranks, tieGroups:[counts]}
  function rankAvg(values) {
    const idx = values.map((v, i) => i).sort((i, j) => values[i] - values[j]);
    const ranks = new Array(values.length);
    const ties = [];
    let i = 0;
    while (i < idx.length) {
      let j = i;
      while (j + 1 < idx.length && values[idx[j + 1]] === values[idx[i]]) j++;
      const r = (i + j + 2) / 2;
      for (let k = i; k <= j; k++) ranks[idx[k]] = r;
      ties.push(j - i + 1);
      i = j + 1;
    }
    return { ranks, ties };
  }

  function describe(a, conf) {
    const s = sorted(a);
    const n = a.length;
    const m = mean(a);
    const sd = n > 1 ? Math.sqrt(sumSq(a, m) / (n - 1)) : NaN;
    const se = sd / Math.sqrt(n);
    const tcrit = n > 1 ? tInv(1 - (1 - conf) / 2, n - 1) : NaN;
    const q1 = quantile(s, 0.25), q3 = quantile(s, 0.75);
    const iqr = q3 - q1;
    const loF = q1 - 1.5 * iqr, hiF = q3 + 1.5 * iqr;
    const inside = s.filter(v => v >= loF && v <= hiF);
    return {
      n, mean: m, sd, se, median: quantile(s, 0.5), q1, q3, iqr,
      min: s[0], max: s[n - 1],
      ciLow: m - tcrit * se, ciHigh: m + tcrit * se,
      whiskerLow: inside.length ? inside[0] : s[0],
      whiskerHigh: inside.length ? inside[inside.length - 1] : s[n - 1],
      outliers: s.filter(v => v < loF || v > hiF)
    };
  }

  // ---------- tests ----------
  function pFromT(t, df, alt) {
    if (alt === "greater") return tSf(t, df);
    if (alt === "less") return tCdf(t, df);
    return Math.min(1, 2 * tSf(Math.abs(t), df));
  }
  function ciFromT(est, se, df, alt, conf) {
    if (alt === "greater") return [est - tInv(conf, df) * se, Infinity];
    if (alt === "less") return [-Infinity, est + tInv(conf, df) * se];
    const q = tInv(1 - (1 - conf) / 2, df);
    return [est - q * se, est + q * se];
  }

  // Student pooled-variance t (equal variances)
  function tTestPooled(x, y, alt, delta0, conf) {
    const n1 = x.length, n2 = y.length;
    const m1 = mean(x), m2 = mean(y);
    const ss = sumSq(x, m1) + sumSq(y, m2);
    const df = n1 + n2 - 2;
    const sp2 = ss / df;
    const se = Math.sqrt(sp2 * (1 / n1 + 1 / n2));
    const diff = m1 - m2;
    const t = (diff - delta0) / se;
    return { name: "Student t 檢定（合併變異數）", key: "pooled", statName: "t", stat: t, df, p: pFromT(t, df, alt),
      diff, se, ci: ciFromT(diff, se, df, alt, conf) };
  }
  // Welch t
  function tTestWelch(x, y, alt, delta0, conf) {
    const n1 = x.length, n2 = y.length;
    const v1 = variance(x) / n1, v2 = variance(y) / n2;
    const se = Math.sqrt(v1 + v2);
    const df = (v1 + v2) * (v1 + v2) / (v1 * v1 / (n1 - 1) + v2 * v2 / (n2 - 1));
    const diff = mean(x) - mean(y);
    const t = (diff - delta0) / se;
    return { name: "Welch t 檢定（變異數不相等）", key: "welch", statName: "t", stat: t, df, p: pFromT(t, df, alt),
      diff, se, ci: ciFromT(diff, se, df, alt, conf) };
  }
  // paired t
  function tTestPaired(x, y, alt, delta0, conf) {
    const d = x.map((v, i) => v - y[i]);
    const n = d.length;
    const md = mean(d);
    const se = Math.sqrt(variance(d) / n);
    const df = n - 1;
    const t = (md - delta0) / se;
    return { name: "成對 t 檢定", key: "paired", statName: "t", stat: t, df, p: pFromT(t, df, alt),
      diff: md, se, ci: ciFromT(md, se, df, alt, conf) };
  }

  // Mann-Whitney U (SciPy rules: exact if no ties and min(n1,n2) <= 8, else normal approx with continuity + tie correction)
  function mwuExactSf(u, n1, n2) {
    // P(U >= u) under H0; U = sum of ranks of sample 1 - n1(n1+1)/2
    const m = Math.min(n1, n2), N = n1 + n2;
    const maxU = n1 * n2;
    // dp[j][s]: ways to choose j items from processed ranks with U-sum s (U contribution = rank - j-th position)
    // Use the standard recursion on (i items considered): choose subset of size m from N; U = sum(ranks) - m(m+1)/2
    const maxSum = maxU;
    let dp = [];
    for (let j = 0; j <= m; j++) dp.push(new Float64Array(maxSum + 1));
    dp[0][0] = 1;
    for (let r = 1; r <= N; r++) {
      for (let j = Math.min(m, r); j >= 1; j--) {
        const shift = r - j; // contribution to U when r is the j-th chosen rank
        if (shift > maxSum) continue;
        const prev = dp[j - 1], cur = dp[j];
        for (let s = maxSum; s >= shift; s--) cur[s] += prev[s - shift];
      }
    }
    const dist = dp[m];
    let total = 0, tail = 0;
    for (let s = 0; s <= maxSum; s++) { total += dist[s]; if (s >= u) tail += dist[s]; }
    return tail / total;
  }
  function mannWhitney(x, y, alt, delta0) {
    const xs = x.map(v => v - delta0);
    const n1 = xs.length, n2 = y.length;
    const all = xs.concat(y);
    const { ranks, ties } = rankAvg(all);
    let r1 = 0;
    for (let i = 0; i < n1; i++) r1 += ranks[i];
    const U1 = r1 - n1 * (n1 + 1) / 2;
    const U2 = n1 * n2 - U1;
    const hasTies = ties.some(t => t > 1);
    const exact = !(n1 > 8 && n2 > 8) && !hasTies;
    let U;
    if (alt === "greater") U = U1; else if (alt === "less") U = U2; else U = Math.max(U1, U2);
    let p, z = NaN;
    if (exact) {
      p = mwuExactSf(U, n1, n2);
    } else {
      const N = n1 + n2;
      const mu = n1 * n2 / 2;
      let tieTerm = 0;
      for (const t of ties) tieTerm += t * t * t - t;
      const s = Math.sqrt(n1 * n2 / 12 * ((N + 1) - tieTerm / (N * (N - 1))));
      z = (U - mu - 0.5) / s;
      p = normSf(z);
    }
    if (alt === "two-sided") p = Math.min(1, 2 * p);
    return { name: "Mann-Whitney U 檢定", key: "mwu", statName: "U", stat: U1, p,
      method: exact ? "精確分布" : "常態近似（含連續性與同分校正）", z };
  }

  // Wilcoxon signed-rank (SciPy rules: zeros dropped; exact if no ties/zeros and n<=50;
  // ties or zeros with n<=13: full permutation; otherwise normal approx, tie-corrected, no continuity correction)
  function wilcoxon(x, y, alt, delta0) {
    const dAll = x.map((v, i) => v - y[i] - delta0);
    const nTotal = dAll.length;
    const nZero = dAll.filter(v => v === 0).length;
    const d = dAll.filter(v => v !== 0);
    const count = d.length;
    if (count === 0) return { name: "Wilcoxon 符號等級檢定", key: "wsr", statName: "W", stat: NaN, p: NaN, method: "差值全為 0，無法檢定" };
    const { ranks, ties } = rankAvg(d.map(Math.abs));
    let rPlus = 0, rMinus = 0;
    for (let i = 0; i < count; i++) { if (d[i] > 0) rPlus += ranks[i]; else rMinus += ranks[i]; }
    const hasTies = ties.some(t => t > 1);
    let method, p;
    if (nTotal > 50) method = "asymptotic";
    else if (!(hasTies || nZero > 0)) method = "exact";
    else if (nTotal <= 13) method = "permutation";
    else method = "asymptotic";

    if (method === "exact") {
      const maxS = count * (count + 1) / 2;
      const dp = new Float64Array(maxS + 1); dp[0] = 1;
      for (let r = 1; r <= count; r++) for (let s = maxS; s >= r; s--) dp[s] += dp[s - r];
      const total = Math.pow(2, count);
      const cdf = s => { let a = 0; for (let k = 0; k <= Math.min(s, maxS); k++) a += dp[k]; return a / total; };
      const sf = s => { let a = 0; for (let k = Math.max(0, s); k <= maxS; k++) a += dp[k]; return a / total; };
      if (alt === "less") p = cdf(Math.ceil(rPlus));
      else if (alt === "greater") p = sf(Math.floor(rPlus));
      else p = Math.min(1, 2 * Math.min(sf(Math.floor(rPlus)), cdf(Math.ceil(rPlus))));
    } else if (method === "permutation") {
      // enumerate all sign flips of the nonzero differences (zeros contribute nothing)
      const total = 1 << count;
      let ge = 0, le = 0;
      const eps = 1e-9 * Math.max(1, rPlus);
      for (let mask = 0; mask < total; mask++) {
        let s = 0;
        for (let i = 0; i < count; i++) if (mask & (1 << i)) s += ranks[i];
        if (s >= rPlus - eps) ge++;
        if (s <= rPlus + eps) le++;
      }
      const pg = ge / total, pl = le / total;
      if (alt === "greater") p = pg; else if (alt === "less") p = pl; else p = Math.min(1, 2 * Math.min(pg, pl));
    } else {
      const mn = count * (count + 1) / 4;
      let tieTerm = 0;
      for (const t of ties) tieTerm += t * t * t - t;
      const se = Math.sqrt((count * (count + 1) * (2 * count + 1) - tieTerm / 2) / 24);
      const z = (rPlus - mn) / se;
      if (alt === "greater") p = normSf(z);
      else if (alt === "less") p = normCdf(z);
      else p = Math.min(1, 2 * normSf(Math.abs(z)));
    }
    const stat = alt === "two-sided" ? Math.min(rPlus, rMinus) : rPlus;
    const label = { exact: "精確分布", permutation: "完整排列（含同分或零差值）", asymptotic: "常態近似（含同分校正）" }[method];
    return { name: "Wilcoxon 符號等級檢定", key: "wsr", statName: "W", stat, p, method: label, nZero };
  }

  // Shapiro-Wilk, Royston (1995) AS R94, as used by SciPy (swilk)
  function poly(cc, x) { let r = cc[cc.length - 1]; for (let i = cc.length - 2; i >= 0; i--) r = r * x + cc[i]; return r; }
  function shapiroWilk(data) {
    const n = data.length;
    if (n < 3) return { W: NaN, p: NaN, note: "樣本數少於 3，無法做常態性檢定" };
    const x = sorted(data);
    const m0 = mean(x);
    const ss = sumSq(x, m0);
    if (ss === 0 || x[n - 1] - x[0] === 0) return { W: NaN, p: NaN, note: "資料全部相同，無法做常態性檢定" };
    const nn2 = Math.floor(n / 2);
    const a = new Array(nn2 + 1).fill(0); // 1-based
    if (n === 3) {
      a[1] = Math.SQRT1_2;
    } else {
      const an25 = n + 0.25;
      let summ2 = 0;
      const m = new Array(nn2 + 1);
      for (let i = 1; i <= nn2; i++) { m[i] = normInv((i - 0.375) / an25); summ2 += m[i] * m[i]; }
      summ2 *= 2;
      const ssumm2 = Math.sqrt(summ2);
      const rsn = 1 / Math.sqrt(n);
      const c1 = [0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056];
      const c2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633];
      const a1 = poly(c1, rsn) - m[1] / ssumm2;
      let i1, fac;
      if (n > 5) {
        i1 = 3;
        const a2 = -m[2] / ssumm2 + poly(c2, rsn);
        fac = Math.sqrt((summ2 - 2 * m[1] * m[1] - 2 * m[2] * m[2]) / (1 - 2 * a1 * a1 - 2 * a2 * a2));
        a[2] = a2;
      } else {
        i1 = 2;
        fac = Math.sqrt((summ2 - 2 * m[1] * m[1]) / (1 - 2 * a1 * a1));
      }
      a[1] = a1;
      for (let i = i1; i <= nn2; i++) a[i] = -m[i] / fac;
    }
    let num = 0;
    for (let i = 1; i <= nn2; i++) num += a[i] * (x[n - i] - x[i - 1]);
    let W = num * num / ss;
    if (W > 1) W = 1;
    let p;
    if (n === 3) {
      const pi6 = 1.90985931710274, stqr = 1.04719755119660;
      p = Math.max(0, pi6 * (Math.asin(Math.sqrt(W)) - stqr));
    } else {
      const w1 = 1 - W;
      let y = Math.log(w1);
      const xx = Math.log(n);
      let mu, s;
      if (n <= 11) {
        const gamma = poly([-2.273, 0.459], n);
        if (y >= gamma) return { W, p: 1e-99 };
        y = -Math.log(gamma - y);
        mu = poly([0.544, -0.39978, 0.025054, -6.714e-4], n);
        s = Math.exp(poly([1.3822, -0.77857, 0.062767, -0.0020322], n));
      } else {
        mu = poly([-1.5861, -0.31082, -0.083751, 0.0038915], xx);
        s = Math.exp(poly([-0.4803, -0.082676, 0.0030302], xx));
      }
      p = normSf((y - mu) / s);
    }
    const out = { W, p };
    if (n > 5000) out.note = "樣本數超過 5000，p 值可能不準確";
    return out;
  }

  // one-way ANOVA for k groups (shifted two-pass for numerical stability)
  function oneWayAnova(groups) {
    const ref = groups[0][0];
    const g = groups.map(a => a.map(v => v - ref));
    const N = g.reduce((s, a) => s + a.length, 0);
    const k = g.length;
    const means = g.map(mean);
    let gsum = 0;
    g.forEach((a, i) => { gsum += means[i] * a.length; });
    const gm = gsum / N;
    let ssb = 0, ssw = 0;
    g.forEach((a, i) => { const d = means[i] - gm; ssb += a.length * d * d; ssw += sumSq(a, means[i]); });
    const dfb = k - 1, dfw = N - k;
    const msb = ssb / dfb, msw = ssw / dfw;
    const F = msb / msw;
    return {
      rows: [
        { source: "組間", df: dfb, ss: ssb, ms: msb, F, p: fSf(F, dfb, dfw) },
        { source: "組內（誤差）", df: dfw, ss: ssw, ms: msw },
        { source: "總和", df: N - 1, ss: ssb + ssw }
      ],
      F, p: fSf(F, dfb, dfw), r2: ssb / (ssb + ssw), residSD: Math.sqrt(msw)
    };
  }

  // paired design: randomized complete block ANOVA (group + pair blocks), F_group = t_paired^2
  function blockAnova(x, y) {
    const n = x.length;
    const ref = x[0];
    const X = x.map(v => v - ref), Y = y.map(v => v - ref);
    const mx = mean(X), my = mean(Y);
    const gm = (mx + my) / 2;
    const b = X.map((v, i) => (v + Y[i]) / 2);
    let sst = 0, ssb = 0, sse = 0;
    for (let i = 0; i < n; i++) {
      sst += (X[i] - gm) ** 2 + (Y[i] - gm) ** 2;
      ssb += 2 * (b[i] - gm) ** 2;
      const ex = X[i] - b[i] - mx + gm, ey = Y[i] - b[i] - my + gm;
      sse += ex * ex + ey * ey;
    }
    const sstr = n * ((mx - gm) ** 2 + (my - gm) ** 2);
    const dft = 1, dfb = n - 1, dfe = n - 1;
    const mst = sstr / dft, msb = ssb / dfb, mse = sse / dfe;
    const Ft = mst / mse, Fb = msb / mse;
    return {
      rows: [
        { source: "組別", df: dft, ss: sstr, ms: mst, F: Ft, p: fSf(Ft, dft, dfe) },
        { source: "配對（區組）", df: dfb, ss: ssb, ms: msb, F: Fb, p: fSf(Fb, dfb, dfe) },
        { source: "誤差", df: dfe, ss: sse, ms: mse },
        { source: "總和", df: 2 * n - 1, ss: sst }
      ],
      F: Ft, p: fSf(Ft, dft, dfe), r2: (sstr + ssb) / sst, residSD: Math.sqrt(mse)
    };
  }

  // Levene, centered at the median (Brown-Forsythe) = SciPy levene(center='median')
  function levene(groups) {
    const z = groups.map(a => { const md = median(a); return a.map(v => Math.abs(v - md)); });
    const r = oneWayAnova(z);
    return { W: r.F, df1: r.rows[0].df, df2: r.rows[1].df, p: r.p };
  }

  function specStats(d, a, usl, lsl) {
    const hasU = isFinite(usl), hasL = isFinite(lsl);
    if (!hasU && !hasL) return null;
    let out = 0;
    for (const v of a) if ((hasU && v > usl) || (hasL && v < lsl)) out++;
    const pu = hasU ? (usl - d.mean) / (3 * d.sd) : Infinity;
    const pl = hasL ? (d.mean - lsl) / (3 * d.sd) : Infinity;
    return { outCount: out, outPct: 100 * out / a.length, ppu: hasU ? pu : null, ppl: hasL ? pl : null, ppk: Math.min(pu, pl) };
  }

  // ---------- decision workflow ----------
  const CHECK_ALPHA = 0.05;

  function analyze(A, B, opt) {
    const o = Object.assign({ paired: false, alpha: 0.05, alternative: "two-sided", delta0: 0, target: NaN, usl: NaN, lsl: NaN, nameA: "A", nameB: "B" }, opt || {});
    const conf = 1 - o.alpha;
    const errors = [];
    if (o.paired && A.length !== B.length) errors.push("成對樣本的兩組數量必須相同。");
    if (A.length < 3 || B.length < 3) errors.push("每組至少需要 3 筆數值。");
    if (errors.length) return { errors };

    const dA = describe(A, conf), dB = describe(B, conf);
    if (!(dA.sd > 0) && !(dB.sd > 0)) return { errors: ["兩組資料都沒有變異（每組數值完全相同），無法檢定。"] };

    const res = { mode: "two", options: o, conf, descA: dA, descB: dB, tests: [], reasons: [], warnings: [] };
    res.specA = specStats(dA, A, o.usl, o.lsl);
    res.specB = specStats(dB, B, o.usl, o.lsl);
    res.groups = [{ name: o.nameA, d: dA, spec: res.specA, vsTarget: targetInfo(dA, o.target) }, { name: o.nameB, d: dB, spec: res.specB, vsTarget: targetInfo(dB, o.target) }];

    if (!o.paired) {
      const swA = shapiroWilk(A), swB = shapiroWilk(B);
      const lev = levene([A, B]);
      res.normality = [{ label: o.nameA, ...swA }, { label: o.nameB, ...swB }];
      res.levene = lev;
      const pooled = tTestPooled(A, B, o.alternative, o.delta0, conf);
      const welch = tTestWelch(A, B, o.alternative, o.delta0, conf);
      const mwu = mannWhitney(A, B, o.alternative, o.delta0);
      res.tests = [pooled, welch, mwu];
      res.anova = oneWayAnova([A, B]);
      res.anovaType = "單因子 ANOVA";
      const normA = !(swA.p < CHECK_ALPHA), normB = !(swB.p < CHECK_ALPHA);
      const fmtp = p => isFinite(p) ? p.toPrecision(3) : "無法計算";
      if (normA && normB) {
        res.reasons.push(`常態性：兩組 Shapiro-Wilk p 值（${o.nameA} = ${fmtp(swA.p)}，${o.nameB} = ${fmtp(swB.p)}）皆 ≥ ${CHECK_ALPHA}，沒有證據顯示偏離常態，可使用 t 檢定。`);
        if (!(lev.p < CHECK_ALPHA)) {
          res.reasons.push(`變異數同質性：Levene 檢定 p = ${fmtp(lev.p)} ≥ ${CHECK_ALPHA}，沒有證據顯示兩組變異數不同，採用合併變異數的 Student t 檢定（與 ANOVA 結果一致，F = t²）。`);
          res.chosen = "pooled";
        } else {
          res.reasons.push(`變異數同質性：Levene 檢定 p = ${fmtp(lev.p)} < ${CHECK_ALPHA}，兩組變異數不同，改用 Welch t 檢定（不假設變異數相等）。ANOVA 表假設變異數相等，僅供參考。`);
          res.chosen = "welch";
        }
      } else {
        const bad = [!normA ? `${o.nameA}（p = ${fmtp(swA.p)}）` : null, !normB ? `${o.nameB}（p = ${fmtp(swB.p)}）` : null].filter(Boolean).join("、");
        res.reasons.push(`常態性：${bad} 的 Shapiro-Wilk p 值 < ${CHECK_ALPHA}，資料偏離常態，改用不需常態假設的 Mann-Whitney U 檢定（比較的是分布位置，非平均值）。t 檢定與 ANOVA 表僅供參考。`);
        if (A.length >= 30 && B.length >= 30) res.warnings.push("兩組樣本數皆 ≥ 30，t 檢定對輕度非常態通常仍穩健；可對照下方 t 檢定結果判斷結論是否一致。");
        res.chosen = "mwu";
      }
      if (swA.note) res.warnings.push(`${o.nameA}：${swA.note}`);
      if (swB.note) res.warnings.push(`${o.nameB}：${swB.note}`);
    } else {
      const d = A.map((v, i) => v - B[i]);
      if (!(variance(d) > 0)) return { errors: ["每一對的差值都相同（差值沒有變異），無法做成對檢定。"] };
      const sw = shapiroWilk(d);
      res.normality = [{ label: "差值（" + o.nameA + " − " + o.nameB + "）", ...sw }];
      res.descDiff = describe(d, conf);
      const pt = tTestPaired(A, B, o.alternative, o.delta0, conf);
      const wsr = wilcoxon(A, B, o.alternative, o.delta0);
      res.tests = [pt, wsr];
      res.anova = blockAnova(A, B);
      res.anovaType = "區組 ANOVA（組別 + 配對）";
      const fmtp = p => isFinite(p) ? p.toPrecision(3) : "無法計算";
      if (!(sw.p < CHECK_ALPHA)) {
        res.reasons.push(`常態性：成對差值的 Shapiro-Wilk p = ${fmtp(sw.p)} ≥ ${CHECK_ALPHA}，沒有證據顯示偏離常態，採用成對 t 檢定（與區組 ANOVA 的組別 F 檢定一致，F = t²）。`);
        res.chosen = "paired";
      } else {
        res.reasons.push(`常態性：成對差值的 Shapiro-Wilk p = ${fmtp(sw.p)} < ${CHECK_ALPHA}，差值偏離常態，改用 Wilcoxon 符號等級檢定。成對 t 檢定與 ANOVA 表僅供參考。`);
        if (d.length >= 30) res.warnings.push("配對數 ≥ 30，成對 t 檢定對輕度非常態通常仍穩健；可對照兩者結論是否一致。");
        res.chosen = "wsr";
      }
      if (sw.note) res.warnings.push(sw.note);
    }
    if (o.alternative !== "two-sided" || o.delta0 !== 0) res.warnings.push("ANOVA 表固定檢定「兩組平均相等」（雙尾、差值 = 0），單尾設定與假設差值只套用在 t 檢定與無母數檢定。");
    const chosenTest = res.tests.find(t => t.key === res.chosen);
    res.chosenTest = chosenTest;
    res.significant = chosenTest.p < o.alpha;

    // effect size
    if (!o.paired) {
      const sp = Math.sqrt((sumSq(A, dA.mean) + sumSq(B, dB.mean)) / (A.length + B.length - 2));
      res.effect = { name: "Cohen's d", value: (dA.mean - dB.mean) / sp };
    } else {
      res.effect = { name: "Cohen's dz", value: res.descDiff.mean / res.descDiff.sd };
    }
    return res;
  }

  // ---------- one-sample & k-group extensions ----------
  function chi2Sf(x, df) { return x <= 0 ? 1 : gammq(df / 2, x / 2); }

  function tTestOne(x, mu0, alt, conf) {
    const n = x.length, m = mean(x);
    const se = Math.sqrt(variance(x) / n), df = n - 1;
    const t = (m - mu0) / se;
    return { name: "單樣本 t 檢定", key: "t1", statName: "t", stat: t, df, p: pFromT(t, df, alt),
      diff: m - mu0, se, ci: ciFromT(m - mu0, se, df, alt, conf) };
  }
  function wilcoxonOne(x, mu0, alt) {
    const r = wilcoxon(x, x.map(() => 0), alt, mu0);
    return Object.assign(r, { name: "Wilcoxon 符號等級檢定（對目標值）", key: "w1" });
  }

  // Welch's ANOVA (unequal variances)
  function welchAnova(groups) {
    const k = groups.length;
    const n = groups.map(g => g.length), m = groups.map(mean), v = groups.map(variance);
    const w = n.map((ni, i) => ni / v[i]);
    const W = w.reduce((a, b) => a + b, 0);
    const mw = w.reduce((s, wi, i) => s + wi * m[i], 0) / W;
    let a = 0, lam = 0;
    for (let i = 0; i < k; i++) { a += w[i] * (m[i] - mw) ** 2; lam += (1 - w[i] / W) ** 2 / (n[i] - 1); }
    const F = (a / (k - 1)) / (1 + 2 * (k - 2) / (k * k - 1) * lam);
    const df1 = k - 1, df2 = (k * k - 1) / (3 * lam);
    return { name: "Welch ANOVA（變異數不相等）", key: "welchAnova", statName: "F", stat: F, df: df2, df1, p: fSf(F, df1, df2) };
  }
  // Kruskal-Wallis H (tie-corrected), chi-square approximation
  function kruskal(groups) {
    const all = [].concat(...groups);
    const N = all.length;
    const { ranks, ties } = rankAvg(all);
    let h = 0, off = 0;
    for (const g of groups) { let r = 0; for (let i = 0; i < g.length; i++) r += ranks[off + i]; h += r * r / g.length; off += g.length; }
    h = 12 / (N * (N + 1)) * h - 3 * (N + 1);
    let tt = 0; for (const t of ties) tt += t * t * t - t;
    const c = 1 - tt / (N * N * N - N);
    const H = c > 0 ? h / c : NaN;
    const df = groups.length - 1;
    return { name: "Kruskal-Wallis 檢定", key: "kw", statName: "H", stat: H, df, p: chi2Sf(H, df), method: "卡方近似（含同分校正）" };
  }

  // repeated measures: rows = units (subjects), columns = conditions
  function blockAnovaK(M) {
    const n = M.length, k = M[0].length;
    const ref = M[0][0];
    const X = M.map(r => r.map(v => v - ref));
    const colM = Array.from({ length: k }, (_, j) => mean(X.map(r => r[j])));
    const rowM = X.map(r => mean(r));
    const gm = mean(colM);
    let sst = 0, ssr = 0, sse = 0, ssc = 0;
    for (let i = 0; i < n; i++) {
      ssr += k * (rowM[i] - gm) ** 2;
      for (let j = 0; j < k; j++) {
        sst += (X[i][j] - gm) ** 2;
        const e = X[i][j] - rowM[i] - colM[j] + gm;
        sse += e * e;
      }
    }
    for (let j = 0; j < k; j++) ssc += n * (colM[j] - gm) ** 2;
    const dfc = k - 1, dfr = n - 1, dfe = (n - 1) * (k - 1);
    const msc = ssc / dfc, msr = ssr / dfr, mse = sse / dfe;
    const Fc = msc / mse, Fr = msr / mse;
    const resid = [];
    for (let i = 0; i < n; i++) for (let j = 0; j < k; j++) resid.push(X[i][j] - rowM[i] - colM[j] + gm);
    return {
      rows: [
        { source: "組別（條件）", df: dfc, ss: ssc, ms: msc, F: Fc, p: fSf(Fc, dfc, dfe) },
        { source: "受測單元（區組）", df: dfr, ss: ssr, ms: msr, F: Fr, p: fSf(Fr, dfr, dfe) },
        { source: "誤差", df: dfe, ss: sse, ms: mse },
        { source: "總和", df: n * k - 1, ss: sst }
      ],
      F: Fc, p: fSf(Fc, dfc, dfe), r2: (ssc + ssr) / sst, residSD: Math.sqrt(mse), resid,
      partialEta2: ssc / (ssc + sse), dfc, dfe
    };
  }
  // Friedman chi-square (tie-corrected) = SciPy friedmanchisquare
  function friedman(M) {
    const n = M.length, k = M[0].length;
    const R = new Array(k).fill(0);
    let tieSum = 0;
    for (const row of M) {
      const { ranks, ties } = rankAvg(row);
      ranks.forEach((r, j) => { R[j] += r; });
      for (const t of ties) tieSum += t * t * t - t;
    }
    let s = 0; for (const r of R) s += r * r;
    let chi = 12 / (n * k * (k + 1)) * s - 3 * n * (k + 1);
    const c = 1 - tieSum / (n * k * (k * k - 1));
    chi = chi / c;
    return { name: "Friedman 檢定", key: "friedman", statName: "χ²", stat: chi, df: k - 1, p: chi2Sf(chi, k - 1), method: "卡方近似（含同分校正）" };
  }
  // small dense linear algebra helpers
  function detLU(A) {
    const n = A.length, a = A.map(r => r.slice());
    let det = 1;
    for (let c = 0; c < n; c++) {
      let p = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(a[r][c]) > Math.abs(a[p][c])) p = r;
      if (a[p][c] === 0) return 0;
      if (p !== c) { const t = a[p]; a[p] = a[c]; a[c] = t; det = -det; }
      det *= a[c][c];
      for (let r = c + 1; r < n; r++) { const f = a[r][c] / a[c][c]; for (let j = c; j < n; j++) a[r][j] -= f * a[c][j]; }
    }
    return det;
  }
  // Mauchly's sphericity test + Greenhouse-Geisser epsilon (orthonormal Helmert contrasts)
  function sphericity(M) {
    const n = M.length, k = M[0].length, d = k - 1;
    const cm = Array.from({ length: k }, (_, j) => mean(M.map(r => r[j])));
    const S = Array.from({ length: k }, () => new Array(k).fill(0));
    for (const r of M) for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) S[i][j] += (r[i] - cm[i]) * (r[j] - cm[j]);
    for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) S[i][j] /= (n - 1);
    // Helmert contrasts, columns normalized: c_j has j ones then -j, zeros after
    const C = [];
    for (let j = 1; j <= d; j++) {
      const col = new Array(k).fill(0);
      for (let i = 0; i < j; i++) col[i] = 1;
      col[j] = -j;
      const nrm = Math.sqrt(j + j * j);
      C.push(col.map(v => v / nrm));
    }
    const V = Array.from({ length: d }, (_, a) => Array.from({ length: d }, (_, b) => {
      let s = 0; for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) s += C[a][i] * S[i][j] * C[b][j]; return s;
    }));
    let tr = 0, tr2 = 0;
    for (let a = 0; a < d; a++) { tr += V[a][a]; for (let b = 0; b < d; b++) tr2 += V[a][b] * V[b][a]; }
    const eps = Math.min(1, tr * tr / (d * tr2));
    const out = { epsGG: eps, W: NaN, chi2: NaN, df: d * (d + 1) / 2 - 1, p: NaN };
    if (d >= 2 && n - 1 >= d) {
      // Mauchly chi-square with Box's second-order correction (same as R mauchly.test)
      const W = detLU(V) / Math.pow(tr / d, d);
      const dfr = n - 1;
      const f = 1 - (2 * d * d + d + 2) / (6 * d * dfr);
      const w2 = (d + 2) * (d - 1) * (d - 2) * (2 * d ** 3 + 6 * d * d + 3 * k + 2) / (288 * (dfr * d * f) ** 2);
      const chi = -dfr * f * Math.log(W);
      const p1 = chi2Sf(chi, out.df), p2 = chi2Sf(chi, out.df + 4);
      out.W = W; out.chi2 = chi; out.p = Math.min(1, Math.max(0, p1 + w2 * (p2 - p1)));
    }
    return out;
  }
  // listwise alignment of k raw series for repeated measures
  function alignRows(raws) {
    const n = Math.max(...raws.map(r => r.length));
    const M = [], dropped = [];
    for (let i = 0; i < n; i++) {
      const row = raws.map(r => r[i]);
      if (row.every(v => v != null && isFinite(v))) M.push(row);
      else if (row.some(v => v != null)) dropped.push(i + 1);
    }
    return { M, dropped };
  }

  function targetInfo(d, target) { return isFinite(target) ? { diff: d.mean - target } : null; }

  function analyzeOne(A, opt) {
    const o = Object.assign({ alpha: 0.05, alternative: "two-sided", target: NaN, usl: NaN, lsl: NaN, nameA: "A" }, opt || {});
    if (!isFinite(o.target)) return { errors: ["單組資料需要填寫目標值，才能檢定平均是否等於目標值。"] };
    if (A.length < 3) return { errors: ["至少需要 3 筆數值。"] };
    const conf = 1 - o.alpha;
    const d = describe(A, conf);
    if (!(d.sd > 0)) return { errors: ["資料沒有變異（數值完全相同），無法檢定。"] };
    const sw = shapiroWilk(A);
    const t1 = tTestOne(A, o.target, o.alternative, conf);
    const w1 = wilcoxonOne(A, o.target, o.alternative);
    const fmtp = p => isFinite(p) ? p.toPrecision(3) : "無法計算";
    const res = { mode: "one", options: o, conf, groups: [{ name: o.nameA, d, spec: specStats(d, A, o.usl, o.lsl), vsTarget: targetInfo(d, o.target) }],
      normality: [{ label: o.nameA, ...sw }], tests: [t1, w1], reasons: [], warnings: [], anova: null };
    if (!(sw.p < CHECK_ALPHA)) {
      res.reasons.push(`常態性：Shapiro-Wilk p = ${fmtp(sw.p)} ≥ ${CHECK_ALPHA}，沒有證據顯示偏離常態，採用單樣本 t 檢定（比較平均值與目標值）。`);
      res.chosen = "t1";
    } else {
      res.reasons.push(`常態性：Shapiro-Wilk p = ${fmtp(sw.p)} < ${CHECK_ALPHA}，資料偏離常態，改用 Wilcoxon 符號等級檢定（比較中心位置與目標值）。單樣本 t 檢定僅供參考。`);
      if (A.length >= 30) res.warnings.push("樣本數 ≥ 30，單樣本 t 檢定對輕度非常態通常仍穩健；可對照兩者結論是否一致。");
      res.chosen = "w1";
    }
    if (sw.note) res.warnings.push(sw.note);
    res.chosenTest = res.tests.find(t => t.key === res.chosen);
    res.significant = res.chosenTest.p < o.alpha;
    res.effect = { name: "Cohen's d（對目標值）", value: (d.mean - o.target) / d.sd };
    return res;
  }

  function analyzeMulti(groups, opt) {
    const o = Object.assign({ paired: false, alpha: 0.05, target: NaN, usl: NaN, lsl: NaN, names: [] }, opt || {});
    const k = groups.length, conf = 1 - o.alpha;
    const names = groups.map((_, i) => o.names[i] || `第 ${i + 1} 組`);
    if (groups.some(g => g.length < 3)) return { errors: ["每組至少需要 3 筆數值。"] };
    if (o.paired && groups.some(g => g.length !== groups[0].length)) return { errors: ["重複量測時各組數量必須相同。"] };
    const ds = groups.map(g => describe(g, conf));
    if (ds.every(d => !(d.sd > 0))) return { errors: ["各組資料都沒有變異，無法檢定。"] };
    const fmtp = p => isFinite(p) ? p.toPrecision(3) : "無法計算";
    const res = { mode: "multi", options: Object.assign(o, { names }), conf, reasons: [], warnings: [],
      groups: groups.map((g, i) => ({ name: names[i], d: ds[i], spec: specStats(ds[i], g, o.usl, o.lsl), vsTarget: targetInfo(ds[i], o.target) })) };
    if (!o.paired) {
      const sws = groups.map(shapiroWilk);
      res.normality = sws.map((s, i) => ({ label: names[i], ...s }));
      res.levene = levene(groups);
      const an = oneWayAnova(groups);
      const anovaTest = { name: "單因子 ANOVA（變異數相等）", key: "anova", statName: "F", stat: an.F, df: an.rows[1].df, df1: an.rows[0].df, p: an.p };
      res.tests = [anovaTest, welchAnova(groups), kruskal(groups)];
      res.anova = an; res.anovaType = "單因子 ANOVA";
      const bad = sws.map((s, i) => (s.p < CHECK_ALPHA ? `${names[i]}（p = ${fmtp(s.p)}）` : null)).filter(Boolean);
      if (!bad.length) {
        res.reasons.push(`常態性：${k} 組的 Shapiro-Wilk p 值皆 ≥ ${CHECK_ALPHA}，沒有證據顯示偏離常態。`);
        if (!(res.levene.p < CHECK_ALPHA)) { res.reasons.push(`變異數同質性：Levene p = ${fmtp(res.levene.p)} ≥ ${CHECK_ALPHA}，採用單因子 ANOVA。`); res.chosen = "anova"; }
        else { res.reasons.push(`變異數同質性：Levene p = ${fmtp(res.levene.p)} < ${CHECK_ALPHA}，各組變異數不同，改用 Welch ANOVA。一般 ANOVA 表僅供參考。`); res.chosen = "welchAnova"; }
      } else {
        res.reasons.push(`常態性：${bad.join("、")} 的 Shapiro-Wilk p 值 < ${CHECK_ALPHA}，改用不需常態假設的 Kruskal-Wallis 檢定。ANOVA 表僅供參考。`);
        if (groups.every(g => g.length >= 30)) res.warnings.push("各組樣本數皆 ≥ 30，ANOVA 對輕度非常態通常仍穩健；可對照兩者結論是否一致。");
        res.chosen = "kw";
      }
      sws.forEach((s, i) => { if (s.note) res.warnings.push(`${names[i]}：${s.note}`); });
      res.effect = { name: "η²", value: an.r2 };
    } else {
      const M = groups[0].map((_, i) => groups.map(g => g[i]));
      const b = blockAnovaK(M);
      const sw = shapiroWilk(b.resid);
      res.normality = [{ label: "模型殘差", ...sw }];
      const sph = sphericity(M);
      res.sphericity = sph;
      const pGG = fSf(b.F, sph.epsGG * b.dfc, sph.epsGG * b.dfe);
      const rmTest = { name: "重複量測 ANOVA", key: "rm", statName: "F", stat: b.F, df: b.dfe, df1: b.dfc, p: b.p };
      const ggTest = { name: "重複量測 ANOVA（Greenhouse-Geisser 校正）", key: "rmGG", statName: "F", stat: b.F, df: sph.epsGG * b.dfe, df1: sph.epsGG * b.dfc, p: pGG, method: `ε = ${sph.epsGG.toFixed(4)}` };
      res.tests = [rmTest, ggTest, friedman(M)];
      res.anova = b; res.anovaType = "重複量測 ANOVA（組別 + 受測單元）";
      if (!(sw.p < CHECK_ALPHA)) {
        res.reasons.push(`常態性：模型殘差的 Shapiro-Wilk p = ${fmtp(sw.p)} ≥ ${CHECK_ALPHA}，採用重複量測 ANOVA。`);
        if (isFinite(sph.p) && sph.p < CHECK_ALPHA) { res.reasons.push(`球形性：Mauchly 檢定 p = ${fmtp(sph.p)} < ${CHECK_ALPHA}，違反球形假設，採用 Greenhouse-Geisser 校正後的 p 值（ε = ${sph.epsGG.toFixed(3)}）。`); res.chosen = "rmGG"; }
        else if (!isFinite(sph.p)) { res.reasons.push(`球形性：受測單元數太少，無法做 Mauchly 檢定，保守起見採用 Greenhouse-Geisser 校正後的 p 值（ε = ${sph.epsGG.toFixed(3)}）。`); res.chosen = "rmGG"; }
        else { res.reasons.push(`球形性：Mauchly 檢定 p = ${fmtp(sph.p)} ≥ ${CHECK_ALPHA}，沒有證據顯示違反球形假設，採用未校正的 p 值。`); res.chosen = "rm"; }
      } else {
        res.reasons.push(`常態性：模型殘差的 Shapiro-Wilk p = ${fmtp(sw.p)} < ${CHECK_ALPHA}，改用 Friedman 檢定。重複量測 ANOVA 表僅供參考。`);
        res.chosen = "friedman";
      }
      res.effect = { name: "偏 η²", value: b.partialEta2 };
    }
    res.chosenTest = res.tests.find(t => t.key === res.chosen);
    res.significant = res.chosenTest.p < o.alpha;
    res.nPairs = k * (k - 1) / 2;
    return res;
  }

  // ---------- noncentral t, power, sample size, tolerance intervals ----------
  // Noncentral t CDF, AS 243 (Lenth 1989) with series in the incomplete beta function
  // Noncentral t CDF. Poisson-mixture series (same terms as AS 243, Lenth 1989), but summed outward from the
  // Poisson mode with recurrences in both directions (Benton & Krishnamoorthy 2003), so large noncentrality
  // (delta > ~38, where AS 243's starting weight exp(-delta^2/2) underflows) is handled.
  function nctCdf(t, df, delta) {
    if (!isFinite(t)) return t > 0 ? 1 : 0;
    if (delta === 0) return tCdf(t, df);
    if (t < 0) return Math.min(1, Math.max(0, 1 - nctCdf(-t, df, -delta)));
    const x = t * t / (t * t + df), base = normCdf(-delta);
    if (x <= 0) return base;
    const L = delta * delta / 2, b = df / 2, k = Math.floor(L);
    const lw = j => (j === 0 ? -L : -L + j * Math.log(L));
    const c0 = 0.5, c1 = 0.5 * delta / Math.SQRT2;
    // weights at the mode
    const pk = c0 * Math.exp(lw(k) - lgamma(k + 1)), qk = c1 * Math.exp(lw(k) - lgamma(k + 1.5));
    const a1 = k + 0.5, a2 = k + 1;
    const lx = Math.log(x), l1x = Math.log1p(-x);
    const I1 = ibeta(x, a1, b), I2 = ibeta(x, a2, b);
    const g = a => Math.exp(lgamma(a + b) - lgamma(a + 1) - lgamma(b) + a * lx + b * l1x);   // I_x(a,b) - I_x(a+1,b)
    let sum = pk * I1 + qk * I2;
    // forward
    let p = pk, q = qk, i1 = I1, i2 = I2, g1 = g(a1), g2 = g(a2), pw = 2 * pk;
    for (let j = k + 1; j <= k + 100000; j++) {
      i1 -= g1; i2 -= g2;
      g1 *= x * (a1 + (j - k - 1) + b) / (a1 + (j - k)); g2 *= x * (a2 + (j - k - 1) + b) / (a2 + (j - k));
      p *= L / j; q *= L / (j + 0.5);
      const term = p * i1 + q * i2;
      sum += term; pw += 2 * p;
      if (j > k + 5 && Math.abs(term) < 1e-16 * Math.max(1e-300, Math.abs(sum)) && p < 1e-16) break;
      if (j > k + 5 && 1 - pw < 1e-15 && Math.abs(term) < 1e-17) break;
    }
    // backward
    p = pk; q = qk; i1 = I1; i2 = I2;
    let gb1 = g(a1 - 1), gb2 = g(a2 - 1);
    for (let j = k - 1; j >= 0; j--) {
      const aa1 = a1 - (k - j), aa2 = a2 - (k - j);         // a for term j
      i1 += gb1; i2 += gb2;
      gb1 *= aa1 / (x * (aa1 - 1 + b)); gb2 *= aa2 / (x * (aa2 - 1 + b));
      p *= (j + 1) / L; q *= (j + 1.5) / L;
      const term = p * i1 + q * i2;
      sum += term;
      if (k - j > 5 && Math.abs(term) < 1e-17 * Math.max(1e-300, Math.abs(sum)) && p < 1e-17) break;
    }
    return Math.min(1, Math.max(0, base + sum));
  }
  function nctSf(t, df, delta) { return 1 - nctCdf(t, df, delta); }
  function nctPpf(p, df, delta) {
    let lo = delta - 10, hi = delta + 10;
    while (nctCdf(lo, df, delta) > p) lo -= 10 + Math.abs(lo);
    while (nctCdf(hi, df, delta) < p) hi += 10 + Math.abs(hi);
    for (let i = 0; i < 300; i++) {
      const mid = (lo + hi) / 2;
      if (nctCdf(mid, df, delta) < p) lo = mid; else hi = mid;
      if (hi - lo < 1e-13 * Math.max(1, Math.abs(mid))) break;
    }
    return (lo + hi) / 2;
  }

  // power of t tests. design: "one" (one-sample or paired; n = pairs) or "two" (two independent groups, n per group)
  function tPower(design, n, delta, sd, alpha, alt) {
    const df = design === "two" ? 2 * n - 2 : n - 1;
    if (df < 1) return NaN;
    const ncp = design === "two" ? delta / (sd * Math.sqrt(2 / n)) : delta / sd * Math.sqrt(n);
    if (alt === "two-sided") {
      const c = tInv(1 - alpha / 2, df);
      return Math.min(1, nctSf(c, df, ncp) + nctCdf(-c, df, ncp));
    }
    const c = tInv(1 - alpha, df);
    return alt === "less" ? nctCdf(-c, df, ncp) : nctSf(c, df, ncp);
  }
  function tSampleSize(design, delta, sd, alpha, alt, power) {
    const minN = 2;
    for (let n = minN; n <= 100000; n = n < 200 ? n + 1 : Math.ceil(n * 1.02)) {
      if (tPower(design, n, delta, sd, alpha, alt) >= power) {
        // refine downward if we jumped
        let m = n;
        while (m > minN && tPower(design, m - 1, delta, sd, alpha, alt) >= power) m--;
        return m;
      }
    }
    return NaN;
  }
  function tDetectable(design, n, sd, alpha, alt, power) {
    const sign = alt === "less" ? -1 : 1;
    let lo = 0, hi = sd;
    while (tPower(design, n, sign * hi, sd, alpha, alt) < power) { hi *= 2; if (hi > 1e6 * sd) return NaN; }
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (tPower(design, n, sign * mid, sd, alpha, alt) < power) lo = mid; else hi = mid;
      if (hi - lo < 1e-12 * sd) break;
    }
    return sign * (lo + hi) / 2;
  }

  // normal tolerance intervals
  function tolK1(n, p, conf) { // one-sided, exact
    return nctPpf(conf, n - 1, normInv(p) * Math.sqrt(n)) / Math.sqrt(n);
  }
  function chi2Ppf(q, df) { // quantile of central chi-square
    let lo = 0, hi = Math.max(1, df + 10 * Math.sqrt(2 * df));
    while (gammp(df / 2, hi / 2) < q) hi *= 2;
    for (let i = 0; i < 300; i++) {
      const mid = (lo + hi) / 2;
      if (gammp(df / 2, mid / 2) < q) lo = mid; else hi = mid;
      if (hi - lo < 1e-14 * Math.max(1, mid)) break;
    }
    return (lo + hi) / 2;
  }
  // r such that P(|Z + mu| <= r) = p  (i.e. sqrt of the p-quantile of noncentral chi-square, df 1, ncp mu^2)
  function rOf(mu, p) {
    // Newton on f(r) = Phi(r - mu) - Phi(-r - mu) - p, f'(r) = phi(r - mu) + phi(r + mu)
    const phi = z => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);
    let r = Math.abs(mu) + normInv((1 + p) / 2);
    for (let i = 0; i < 60; i++) {
      const f = normCdf(r - mu) - normCdf(-r - mu) - p;
      const d = phi(r - mu) + phi(r + mu);
      const step = f / d;
      r -= step;
      if (r < 0) r = 1e-12;
      if (Math.abs(step) < 1e-15 * Math.max(1, r)) break;
    }
    return r;
  }
  // Gauss-Legendre nodes on [-1,1] (n=64), computed once
  const GL = (function () {
    const N = 64, xs = [], ws = [];
    for (let i = 1; i <= N; i++) {
      let z = Math.cos(Math.PI * (i - 0.25) / (N + 0.5)), pp;
      for (let it = 0; it < 100; it++) {
        let p1 = 1, p2 = 0;
        for (let j = 1; j <= N; j++) { const p3 = p2; p2 = p1; p1 = ((2 * j - 1) * z * p2 - (j - 1) * p3) / j; }
        pp = N * (z * p1 - p2) / (z * z - 1);
        const z1 = z; z = z1 - p1 / pp;
        if (Math.abs(z - z1) < 1e-15) break;
      }
      xs.push(z); ws.push(2 / ((1 - z * z) * pp * pp));
    }
    return { xs, ws };
  })();
  function tolConf2(n, p, k) { // achieved confidence of two-sided factor k (exact, Odeh / Wald-Wolfowitz integral)
    const nu = n - 1;
    const upper = 9 / Math.sqrt(n);
    const segs = 4;
    let total = 0;
    for (let s = 0; s < segs; s++) {
      const a = upper * s / segs, b = upper * (s + 1) / segs;
      for (let i = 0; i < GL.xs.length; i++) {
        const x = (b - a) / 2 * GL.xs[i] + (a + b) / 2;
        const r = rOf(x, p);
        const chi = nu * r * r / (k * k);
        const surv = gammq(nu / 2, chi / 2);
        total += (b - a) / 2 * GL.ws[i] * surv * Math.exp(-n * x * x / 2);
      }
    }
    return Math.sqrt(2 * n / Math.PI) * total;
  }
  function tolK2(n, p, conf) {
    // precompute nodes and r(x); then solve for k with a bracketed secant (Illinois) method
    const nu = n - 1, upper = 9 / Math.sqrt(n), segs = 4, pts = [];
    for (let s = 0; s < segs; s++) {
      const a = upper * s / segs, b = upper * (s + 1) / segs;
      for (let i = 0; i < GL.xs.length; i++) {
        const x = (b - a) / 2 * GL.xs[i] + (a + b) / 2;
        const r = rOf(x, p);
        pts.push([(b - a) / 2 * GL.ws[i] * Math.exp(-n * x * x / 2), nu * r * r]);
      }
    }
    const c0 = Math.sqrt(2 * n / Math.PI);
    const g = k => { let t = 0; for (const [w, q] of pts) t += w * gammq(nu / 2, q / (k * k) / 2); return c0 * t - conf; };
    // Howe approximation as the starting point
    const zp = normInv((1 + p) / 2), howe = zp * Math.sqrt(nu * (1 + 1 / n) / chi2Ppf(1 - conf, nu));
    let a = howe * 0.8, b = howe * 1.25, fa = g(a), fb = g(b);
    while (fa > 0) { a *= 0.7; fa = g(a); }
    while (fb < 0) { b *= 1.5; fb = g(b); if (b > 1e4) return NaN; }
    let side = 0;
    for (let i = 0; i < 100; i++) {
      const c = (fa * b - fb * a) / (fa - fb), fc = g(c);
      if (Math.abs(fc) < 1e-14 || Math.abs(b - a) < 1e-13 * c) return c;
      if (fc * fb > 0) { b = c; fb = fc; if (side === -1) fa /= 2; side = -1; }
      else { a = c; fa = fc; if (side === 1) fb /= 2; side = 1; }
    }
    return (a + b) / 2;
  }
  function toleranceInterval(x, p, conf, side, lsl, usl) {
    const n = x.length;
    if (n < 3) return { errors: ["至少需要 3 筆數值。"] };
    const d = describe(x, conf);
    if (!(d.sd > 0)) return { errors: ["資料沒有變異（數值完全相同），無法計算允差區間。"] };
    const k = side === "two" ? tolK2(n, p, conf) : tolK1(n, p, conf);
    const lo = side === "upper" ? -Infinity : d.mean - k * d.sd;
    const hi = side === "lower" ? Infinity : d.mean + k * d.sd;
    const sw = shapiroWilk(x);
    let pass = null;
    if (isFinite(lsl) || isFinite(usl)) {
      pass = (!isFinite(lsl) || lo >= lsl) && (!isFinite(usl) || hi <= usl);
      if (side === "upper" && isFinite(lsl) && !isFinite(usl)) pass = null;
      if (side === "lower" && isFinite(usl) && !isFinite(lsl)) pass = null;
    }
    return { n, mean: d.mean, sd: d.sd, k, lo, hi, p, conf, side, normality: sw, pass, desc: d };
  }

  // ---------- attribute (pass/fail) sampling: binomial, confidence/reliability ----------
  // P(X <= k), X ~ Bin(n, p)  =  I_{1-p}(n-k, k+1)
  function binomCdf(k, n, p) {
    if (k < 0) return 0;
    if (k >= n) return 1;
    if (p <= 0) return 1;
    if (p >= 1) return 0;
    return ibeta(1 - p, n - k, k + 1);
  }
  function betaPpf(q, a, b) {
    if (q <= 0) return 0;
    if (q >= 1) return 1;
    let lo = 0, hi = 1;
    for (let i = 0; i < 200; i++) {
      const mid = (lo + hi) / 2;
      if (ibeta(mid, a, b) < q) lo = mid; else hi = mid;
      if (hi - lo < 1e-16) break;
    }
    return (lo + hi) / 2;
  }
  // smallest n such that testing n units with at most c failures demonstrates reliability R at confidence C
  function crSampleSize(C, R, c) {
    let n = c + 1;
    while (binomCdf(c, n, 1 - R) > 1 - C) { n++; if (n > 1e6) return NaN; }
    return n;
  }
  // upper confidence bound of defect rate (Clopper-Pearson, one-sided) after x failures in n
  function defectUpper(n, x, C) { return x >= n ? 1 : betaPpf(C, x + 1, n - x); }
  function demoReliability(n, x, C) { return 1 - defectUpper(n, x, C); }
  // OC-curve points of a single sampling plan (n, Ac)
  function planPoints(n, ac) {
    return {
      p95: defectUpper(n, ac, 0.05),   // defect rate accepted 95% of the time (producer's point)
      p50: defectUpper(n, ac, 0.50),   // indifference quality
      p10: defectUpper(n, ac, 0.90)    // LTPD / LQ at 10% acceptance
    };
  }

  // ---------- paste parser (Excel / CSV / plain text) ----------
  function toHalfWidth(s) {
    return s.replace(/[０-９．－＋，ｅＥ]/g, ch => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
      .replace(/　/g, " ").replace(/[−–]/g, "-");
  }
  function parseNumber(cell, allowThousands) {
    let s = toHalfWidth(cell).trim();
    if (s === "") return { kind: "empty" };
    if (allowThousands && /^[+-]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, "");
    if (/^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?$/.test(s)) return { kind: "num", value: Number(s) };
    return { kind: "text", text: cell.trim() };
  }
  function parseTable(text, force) {
    const notes = [];
    const lines = String(text || "").replace(/\r\n?/g, "\n").split("\n");
    while (lines.length && lines[lines.length - 1].trim() === "") lines.pop();
    while (lines.length && lines[0].trim() === "") lines.shift();
    if (!lines.length) return { error: "沒有偵測到資料。" };
    let delim;
    if (lines.some(l => l.includes("\t"))) delim = "\t";
    else if (lines.some(l => l.includes(";"))) delim = ";";
    else if (lines.some(l => l.includes(","))) delim = ",";
    else delim = /\s/;
    const delimName = delim === "\t" ? "Tab（Excel）" : delim === ";" ? "分號" : delim === "," ? "逗號" : "空白";
    let grid = lines.map(l => (delim instanceof RegExp ? l.trim().split(/\s+/) : l.split(delim)));
    const C = Math.max(...grid.map(r => r.length));
    grid = grid.map(r => { const a = r.slice(); while (a.length < C) a.push(""); return a; });
    let cells = grid.map(r => r.map(c => parseNumber(c, delim === "\t")));
    // drop empty rows / columns
    cells = cells.filter(r => r.some(c => c.kind !== "empty"));
    const keepCols = [];
    for (let j = 0; j < C; j++) if (cells.some(r => r[j].kind !== "empty")) keepCols.push(j);
    cells = cells.map(r => keepCols.map(j => r[j]));
    const R = cells.length, Cc = keepCols.length;
    if (R === 0 || Cc === 0) return { error: "沒有偵測到資料。" };

    const rowAllText = i => cells[i].every(c => c.kind !== "num") && cells[i].some(c => c.kind === "text");
    const colAllText = j => cells.every(r => r[j].kind !== "num") && cells.some(r => r[j].kind === "text");

    let orientation, ambiguous = false, reason;
    if (force === "vertical" || force === "horizontal") {
      orientation = force; reason = "使用者指定";
    } else if (Cc === 1 && R === 1) {
      return { error: "只偵測到一個數值。" };
    } else {
      const headerRow = R > 1 && rowAllText(0);
      const headerCol = Cc > 1 && colAllText(0);
      const dataR = R - (headerRow ? 1 : 0), dataC = Cc - (headerCol ? 1 : 0);
      if (headerRow && !headerCol) { orientation = "vertical"; reason = "第一列是文字（視為組別名稱），資料往下排"; }
      else if (headerCol && !headerRow) { orientation = "horizontal"; reason = "第一欄是文字（視為組別名稱），資料往右排"; }
      else if (dataC === 1) { orientation = "vertical"; reason = "只有一欄"; }
      else if (dataR === 1) { orientation = "horizontal"; reason = "只有一列"; }
      else if (dataR > dataC) { orientation = "vertical"; reason = `${dataR} 列 × ${dataC} 欄，列數較多，判定為直式（每欄一組）`; }
      else if (dataC > dataR) { orientation = "horizontal"; reason = `${dataR} 列 × ${dataC} 欄，欄數較多，判定為橫式（每列一組）`; }
      else { orientation = "vertical"; ambiguous = true; reason = `${dataR} 列 × ${dataC} 欄，列欄數相同，無法自動判斷，先以直式處理`; }
    }
    // build series
    const vert = orientation === "vertical";
    const nSeries = vert ? Cc : R;
    const len = vert ? R : Cc;
    const at = (s, k) => (vert ? cells[k][s] : cells[s][k]);
    let start = 0;
    const hasHeader = Array.from({ length: nSeries }, (_, s) => at(s, 0).kind === "text").some(Boolean)
      && Array.from({ length: nSeries }, (_, s) => at(s, 0).kind !== "num").every(Boolean);
    if (hasHeader) start = 1;
    const series = [];
    for (let s = 0; s < nSeries; s++) {
      const name = hasHeader && at(s, 0).kind === "text" ? at(s, 0).text : `第 ${s + 1} ${vert ? "欄" : "列"}`;
      const raw = [], invalid = [];
      for (let k = start; k < len; k++) {
        const c = at(s, k);
        if (c.kind === "num") raw.push(c.value);
        else { raw.push(null); if (c.kind === "text") invalid.push({ pos: k + 1, text: c.text }); }
      }
      // trim trailing empties (unequal group lengths)
      while (raw.length && raw[raw.length - 1] === null && !invalid.some(v => v.pos === start + raw.length)) raw.pop();
      const values = raw.filter(v => v !== null);
      series.push({ name, raw, values, invalid, missing: raw.filter(v => v === null).length - invalid.length });
    }
    const usable = series.filter(s => s.values.length > 0);
    if (usable.length < 1) return { error: "沒有偵測到數值。", orientation, reason, rows: R, cols: Cc, delimName };
    return { orientation, ambiguous, reason, delimName, rows: R, cols: Cc, hasHeader, series, notes };
  }
  // pair two raw series by position; drop incomplete pairs
  function pairUp(rawA, rawB) {
    const n = Math.max(rawA.length, rawB.length);
    const a = [], b = [], dropped = [];
    for (let i = 0; i < n; i++) {
      const x = rawA[i], y = rawB[i];
      if (x == null || y == null || !isFinite(x) || !isFinite(y)) { if (x != null || y != null) dropped.push(i + 1); continue; }
      a.push(x); b.push(y);
    }
    return { a, b, dropped };
  }

  const api = { binomCdf, betaPpf, crSampleSize, defectUpper, demoReliability, planPoints, nctCdf, nctSf, nctPpf, tPower, tSampleSize, tDetectable, tolK1, tolK2, tolConf2, chi2Ppf, toleranceInterval, parseTable, pairUp, alignRows, chi2Sf, tTestOne, wilcoxonOne, welchAnova, kruskal, blockAnovaK, friedman, sphericity, detLU, analyzeOne, analyzeMulti, lgamma, erfc, normCdf, normSf, normInv, ibeta, tSf, tCdf, tInv, fSf,
    mean, variance, quantile, median, rankAvg, describe,
    tTestPooled, tTestWelch, tTestPaired, mannWhitney, wilcoxon, shapiroWilk,
    oneWayAnova, blockAnova, levene, specStats, analyze, CHECK_ALPHA };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.HT = api;
})(typeof window !== "undefined" ? window : globalThis);
