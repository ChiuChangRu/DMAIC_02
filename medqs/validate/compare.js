// Compare the JS engine against SciPy references and NIST StRD certified values.
const HT = require("../stats.js");
const raw = require("fs").readFileSync(__dirname + "/ref.json", "utf8").replace(/-?Infinity/g, m => `"${m}"`);
const ref = JSON.parse(raw, (k, v) => (v === "Infinity" ? Infinity : v === "-Infinity" ? -Infinity : v));

const rows = [];
function relErr(a, b) {
  if (a === b) return 0;
  if (!isFinite(a) || !isFinite(b)) return (a === b) ? 0 : Infinity;
  const den = Math.max(Math.abs(b), 1e-300);
  return Math.abs(a - b) / den;
}
function check(group, label, qty, js, sci, tol) {
  // p-values: use absolute error for tiny values, relative otherwise
  const e = relErr(js, sci);
  const abs = Math.abs(js - sci);
  const pass = e <= tol || abs <= 1e-15;
  rows.push({ group, label, qty, js, ref: sci, relErr: e, tol, pass });
}

// special functions
for (const [t, df, p] of ref.special.t_sf) check("特殊函數", `t=${t}, df=${df}`, "t 右尾機率", HT.tSf(t, df), p, 1e-10);
for (const [f, d1, d2, p] of ref.special.f_sf) check("特殊函數", `F=${f}, df=(${d1},${d2})`, "F 右尾機率", HT.fSf(f, d1, d2), p, 1e-10);
for (const [p, z] of ref.special.norm_ppf) check("特殊函數", `p=${p}`, "常態分位數", HT.normInv(p), z, 1e-12);
for (const [p, df, t] of ref.special.t_ppf) check("特殊函數", `p=${p}, df=${df}`, "t 分位數", HT.tInv(p, df), t, 1e-10);

// Shapiro-Wilk
ref.shapiro.forEach((c, i) => {
  const r = HT.shapiroWilk(c.x);
  check("Shapiro-Wilk", `#${i + 1} n=${c.x.length}`, "W", r.W, c.W, 1e-6);
  check("Shapiro-Wilk", `#${i + 1} n=${c.x.length}`, "p", r.p, c.p, 1e-4);
});

// independent
for (const c of ref.independent) {
  const pt = HT.tTestPooled(c.x, c.y, c.alt, c.delta0, 0.95);
  const wt = HT.tTestWelch(c.x, c.y, c.alt, c.delta0, 0.95);
  const mw = HT.mannWhitney(c.x, c.y, c.alt, c.delta0);
  const lv = HT.levene([c.x, c.y]);
  const an = HT.oneWayAnova([c.x, c.y]);
  const g = "獨立樣本";
  check(g, c.label, "Student t", pt.stat, c.pooled.t, 1e-10);
  check(g, c.label, "Student p", pt.p, c.pooled.p, 1e-9);
  check(g, c.label, "Student CI 下限", pt.ci[0], c.pooled.ci[0], 1e-9);
  check(g, c.label, "Student CI 上限", pt.ci[1], c.pooled.ci[1], 1e-9);
  check(g, c.label, "Welch t", wt.stat, c.welch.t, 1e-10);
  check(g, c.label, "Welch df", wt.df, c.welch.df, 1e-10);
  check(g, c.label, "Welch p", wt.p, c.welch.p, 1e-9);
  check(g, c.label, "Welch CI 下限", wt.ci[0], c.welch.ci[0], 1e-9);
  check(g, c.label, "Welch CI 上限", wt.ci[1], c.welch.ci[1], 1e-9);
  check(g, c.label, "Mann-Whitney U", mw.stat, c.mwu.U, 1e-12);
  check(g, c.label, "Mann-Whitney p", mw.p, c.mwu.p, 1e-9);
  check(g, c.label, "Levene W", lv.W, c.levene.W, 1e-10);
  check(g, c.label, "Levene p", lv.p, c.levene.p, 1e-9);
  check(g, c.label, "ANOVA F", an.F, c.anova.F, 1e-10);
  check(g, c.label, "ANOVA p", an.p, c.anova.p, 1e-9);
}

// paired
for (const c of ref.paired) {
  const pt = HT.tTestPaired(c.x, c.y, c.alt, c.delta0, 0.95);
  const w = HT.wilcoxon(c.x, c.y, c.alt, c.delta0);
  const b = HT.blockAnova(c.x, c.y);
  const g = "成對樣本";
  check(g, c.label, "成對 t", pt.stat, c.paired.t, 1e-10);
  check(g, c.label, "成對 p", pt.p, c.paired.p, 1e-9);
  check(g, c.label, "成對 CI 下限", pt.ci[0], c.paired.ci[0], 1e-9);
  check(g, c.label, "成對 CI 上限", pt.ci[1], c.paired.ci[1], 1e-9);
  check(g, c.label, "Wilcoxon W", w.stat, c.wsr.W, 1e-12);
  check(g, c.label, "Wilcoxon p", w.p, c.wsr.p, 1e-9);
  if (c.sw_diff) {
    const s = HT.shapiroWilk(c.x.map((v, i) => v - c.y[i]));
    check(g, c.label, "差值 Shapiro-Wilk W", s.W, c.sw_diff.W, 1e-6);
  }
  check(g, c.label, "區組 ANOVA F", b.F, c.block.F, 1e-9);
  check(g, c.label, "區組 ANOVA p", b.p, c.block.p, 1e-9);
  check(g, c.label, "區組 F = 成對 t²", b.F, c.block.t2_check, 1e-9);
  check(g, c.label, "區組 SS 組別", b.rows[0].ss, c.block.ss_treat, 1e-8);
  check(g, c.label, "區組 SS 配對", b.rows[1].ss, c.block.ss_block, 1e-8);
  check(g, c.label, "區組 SS 誤差", b.rows[2].ss, c.block.ss_err, 1e-8);
}

// descriptives
ref.quantiles.forEach((c, i) => {
  const d = HT.describe(c.x, 0.95);
  const g = "描述統計";
  const l = `#${i + 1} n=${c.x.length}`;
  check(g, l, "Q1", d.q1, c.q1, 1e-12);
  check(g, l, "中位數", d.median, c.med, 1e-12);
  check(g, l, "Q3", d.q3, c.q3, 1e-12);
  check(g, l, "平均", d.mean, c.mean, 1e-12);
  check(g, l, "標準差", d.sd, c.sd, 1e-12);
  check(g, l, "平均 CI 下限", d.ciLow, c.ci[0], 1e-10);
  check(g, l, "平均 CI 上限", d.ciHigh, c.ci[1], 1e-10);
});

// NIST: report Log Relative Error (LRE); pass if LRE >= 9 (difficulty-dependent target)
const nistRows = [];
for (const c of ref.nist) {
  const groups = c.groups.map(g => g.map(Number));
  const r = HT.oneWayAnova(groups);
  const x = c.exact_double;
  const vals = {
    "組間 SS": [r.rows[0].ss, c.cert.ssb, x.ssb], "組內 SS": [r.rows[1].ss, c.cert.ssw, x.ssw],
    "組間 MS": [r.rows[0].ms, c.cert.msb, x.msb], "組內 MS": [r.rows[1].ms, c.cert.msw, x.msw],
    "F": [r.F, c.cert.F, x.F], "R²": [r.r2, c.cert.r2, x.r2], "殘差標準差": [r.residSD, c.cert.resid_sd, x.resid_sd]
  };
  const lreOf = (a, b) => { const re = relErr(a, b); return re === 0 ? 15 : Math.min(15, -Math.log10(re)); };
  for (const [k, [js, cert, best]] of Object.entries(vals)) {
    const lre = lreOf(js, cert);
    const lreLimit = lreOf(best, cert);
    const vsBest = relErr(js, best);
    // pass: engine reproduces the best value attainable from double-precision inputs (rel. err <= 1e-8)
    nistRows.push({ dataset: c.name, qty: k, js, cert, best, lre, lreLimit, vsBest, pass: vsBest <= 1e-8 });
  }
}

const failed = rows.filter(r => !r.pass);
const nistFailed = nistRows.filter(r => !r.pass);
console.log(`SciPy comparisons: ${rows.length}, failed: ${failed.length}`);
for (const f of failed) console.log("FAIL", f.group, f.label, f.qty, f.js, f.ref, f.relErr.toExponential(2));
console.log(`NIST comparisons: ${nistRows.length}, failed: ${nistFailed.length}`);
const minLre = {};
for (const r of nistRows) minLre[r.dataset] = Math.min(minLre[r.dataset] ?? 99, r.lre);
console.log("min LRE per dataset", minLre);
const maxErr = {};
for (const r of rows) maxErr[r.group + "|" + r.qty] = Math.max(maxErr[r.group + "|" + r.qty] ?? 0, r.relErr);
require("fs").writeFileSync(__dirname + "/results.json", JSON.stringify({ rows, nistRows, maxErr, minLre }, null, 1));
