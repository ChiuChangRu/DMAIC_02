/* Shared validation suite: runs identically in Node (offline) and in the page (確效頁). */
(function (root) {
"use strict";
function runValidation(HT, ref, QT, TG, SS, RG) {
const rows = [];

function relErr(a, b) {
  if (a === b) return 0;
  if (!isFinite(a) || !isFinite(b)) return (a === b) ? 0 : Infinity;
  const den = Math.max(Math.abs(b), 1e-300);
  return Math.abs(a - b) / den;
}
function check(group, label, qty, js, sci, tol) {
  // relative error; when the reference is exactly 0 (e.g. equal group means), judge by absolute error <= 1e-15
  const abs = Math.abs(js - sci);
  const zeroRef = sci === 0;
  const e = zeroRef ? abs : relErr(js, sci);
  const pass = zeroRef ? abs <= 1e-15 : (e <= tol || abs <= 1e-15);
  rows.push({ group, label, qty, js, ref: sci, relErr: e, tol, pass, zeroRef });
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


// one-sample
for (const c of (ref.one || [])) {
  const g = "單樣本";
  const t = HT.tTestOne(c.x, c.mu, c.alt, 0.95), w = HT.wilcoxonOne(c.x, c.mu, c.alt);
  check(g, c.label, "單樣本 t", t.stat, c.t.t, 1e-10);
  check(g, c.label, "單樣本 p", t.p, c.t.p, 1e-9);
  check(g, c.label, "差值 CI 下限", t.ci[0], c.t.ci[0], 1e-9);
  check(g, c.label, "差值 CI 上限", t.ci[1], c.t.ci[1], 1e-9);
  check(g, c.label, "Wilcoxon W", w.stat, c.w.W, 1e-12);
  check(g, c.label, "Wilcoxon p", w.p, c.w.p, 1e-9);
}
// k-group independent
for (const c of (ref.multi || [])) {
  const g = "多組獨立";
  const an = HT.oneWayAnova(c.groups), wa = HT.welchAnova(c.groups), kw = HT.kruskal(c.groups), lv = HT.levene(c.groups);
  check(g, c.label, "ANOVA F", an.F, c.anova.F, 1e-10);
  check(g, c.label, "ANOVA p", an.p, c.anova.p, 1e-9);
  check(g, c.label, "Welch ANOVA F", wa.stat, c.welch.F, 1e-10);
  check(g, c.label, "Welch ANOVA p", wa.p, c.welch.p, 1e-9);
  check(g, c.label, "Kruskal-Wallis H", kw.stat, c.kw.H, 1e-10);
  check(g, c.label, "Kruskal-Wallis p", kw.p, c.kw.p, 1e-9);
  check(g, c.label, "Levene W", lv.W, c.levene.W, 1e-10);
  check(g, c.label, "Levene p", lv.p, c.levene.p, 1e-9);
}
// repeated measures (reference: pingouin rm_anova / sphericity / epsilon; SciPy friedmanchisquare)
for (const c of (ref.rm || [])) {
  const g = "重複量測";
  const b = HT.blockAnovaK(c.M), sp = HT.sphericity(c.M), fr = HT.friedman(c.M);
  check(g, c.label, "F", b.F, c.F, 1e-9);
  check(g, c.label, "p", b.p, c.p, 1e-9);
  check(g, c.label, "SS 組別", b.rows[0].ss, c.ss_cond, 1e-8);
  check(g, c.label, "SS 誤差", b.rows[2].ss, c.ss_err, 1e-8);
  check(g, c.label, "GG ε", sp.epsGG, c.epsGG, 1e-9);
  if (c.pGG != null) check(g, c.label, "GG 校正 p", HT.fSf(b.F, sp.epsGG * b.dfc, sp.epsGG * b.dfe), c.pGG, 1e-8);
  check(g, c.label, "Mauchly W", sp.W, c.mauchlyW, 1e-9);
  check(g, c.label, "Mauchly p", sp.p, c.mauchlyP, 1e-8);
  check(g, c.label, "Friedman χ²", fr.stat, c.friedman.chi2, 1e-10);
  check(g, c.label, "Friedman p", fr.p, c.friedman.p, 1e-9);
}

// noncentral t, power, sample size, tolerance factors
for (const c of (ref.nct || [])) check("樣本數與允差", `t=${c.t}, df=${c.df}, δ=${c.d}`, "非中心 t 累積機率", HT.nctCdf(c.t, c.df, c.d), c.cdf, 1e-9);
for (const c of (ref.nctppf || [])) check("樣本數與允差", `q=${c.q}, df=${c.df}, δ=${c.d}`, "非中心 t 分位數", HT.nctPpf(c.q, c.df, c.d), c.ppf, 1e-9);
for (const c of (ref.power || [])) check("樣本數與允差", `${c.design === "two" ? "兩組" : "單組／成對"} n=${c.n}, d=${c.es}, α=${c.alpha}, ${c.alt}`, "檢定力", HT.tPower(c.design, c.n, c.es, 1, c.alpha, c.alt), c.power, 1e-9);
for (const c of (ref.ssize || [])) {
  const lab = `${c.design === "two" ? "兩組" : "單組／成對"} d=${c.es}, α=${c.alpha}, ${c.alt}, 檢定力 ${c.target}`;
  check("樣本數與允差", lab, "所需樣本數", HT.tSampleSize(c.design, c.es, 1, c.alpha, c.alt, c.target), c.n, 1e-12);
  check("樣本數與允差", lab + `, n=${c.n}`, "可偵測差值", Math.abs(HT.tDetectable(c.design, c.n, 1, c.alpha, c.alt, c.target)), c.detect_at_n, 1e-7);
}
for (const c of (ref.tol || [])) {
  const lab = `n=${c.n}, 涵蓋 ${c.p}, 信心 ${c.g}`;
  check("樣本數與允差", lab, "單邊允差係數 k", HT.tolK1(c.n, c.p, c.g), c.k1, 1e-9);
  check("樣本數與允差", lab, "雙邊允差係數 k", HT.tolK2(c.n, c.p, c.g), c.k2, 1e-7);
}

// attribute sampling: binomial, beta quantile, confidence/reliability, OC points
for (const c of (ref.binom || [])) check("計數型抽樣", `k=${c.k}, n=${c.n}, p=${c.p}`, "二項累積機率", HT.binomCdf(c.k, c.n, c.p), c.cdf, 1e-10);
for (const c of (ref.betappf || [])) check("計數型抽樣", `q=${c.q}, a=${c.a}, b=${c.b}`, "Beta 分位數", HT.betaPpf(c.q, c.a, c.b), c.ppf, 1e-9);
for (const c of (ref.cr || [])) check("計數型抽樣", `信心 ${c.C}、可靠度 ${c.R}、允許 ${c.c} 個失效`, "所需樣本數", HT.crSampleSize(c.C, c.R, c.c), c.n, 1e-12);
for (const c of (ref.demorel || [])) check("計數型抽樣", `n=${c.n}, 失效 ${c.x}, 信心 ${c.C}`, "示範可靠度", HT.demoReliability(c.n, c.x, c.C), c.rel, 1e-9);
for (const c of (ref.plans || [])) {
  const pp = HT.planPoints(c.n, c.ac), lab = `n=${c.n}, Ac=${c.ac}`;
  check("計數型抽樣", lab, "95% 允收的不良率", pp.p95, c.p95, 1e-9);
  check("計數型抽樣", lab, "50% 允收的不良率", pp.p50, c.p50, 1e-9);
  check("計數型抽樣", lab, "10% 允收的不良率（LTPD）", pp.p10, c.p10, 1e-9);
  for (const [p, pa] of c.pa_at) check("計數型抽樣", lab + `, 不良率 ${p}`, "允收機率", HT.binomCdf(c.ac, c.n, p), pa, 1e-10);
}

const results = [];

function t(group, name, cond, detail) { results.push({ group, name, pass: !!cond, detail: detail || "" }); }

// ---- parser ----
let r = HT.parseTable("A\tB\n1.2\t2.3\n1.4\t2.1\n1.3\t2.6\n1.5\t2.2");
t("貼上解析", "直式含標題（Excel Tab）", r.orientation === "vertical" && r.series[0].name === "A" && r.series[1].values.join() === "2.3,2.1,2.6,2.2");
r = HT.parseTable("A\t1.2\t1.4\t1.3\t1.5\nB\t2.3\t2.1\t2.6\t2.2");
t("貼上解析", "橫式含標題", r.orientation === "horizontal" && r.series[1].name === "B" && r.series[0].values.length === 4);
r = HT.parseTable("1.2\t2.3\n1.4\t2.1\n1.3\t2.6\n1.5\t2.2\n1.1\t2.0");
t("貼上解析", "直式無標題", r.orientation === "vertical" && !r.hasHeader && r.series[0].values.length === 5);
r = HT.parseTable("1.2\t1.4\t1.3\t1.5\t1.1\n2.3\t2.1\t2.6\t2.2\t2.0");
t("貼上解析", "橫式無標題", r.orientation === "horizontal" && r.series[1].values.join() === "2.3,2.1,2.6,2.2,2");
r = HT.parseTable("前\t後\n1\t2\n3\t\n5\t6\n7\t8\n\t9");
t("貼上解析", "組數不同（空白格）", r.series[0].values.length === 4 && r.series[1].values.length === 4 && r.series[0].raw.length === 4 && r.series[1].raw.length === 5);
r = HT.parseTable("A\tB\n1\t2\nN/A\t3\n4\t5\n6\tx");
t("貼上解析", "非數字標記為無效", r.series[0].invalid.length === 1 && r.series[0].invalid[0].text === "N/A" && r.series[1].invalid[0].text === "x");
r = HT.parseTable("A\tB\n1,234.5\t2,000\n1,300\t2,100.25\n999\t1,999");
t("貼上解析", "千分位逗號（Tab 分隔時）", r.series[0].values[0] === 1234.5 && r.series[1].values[1] === 2100.25);
r = HT.parseTable("１．２\t２．５\n１．４\t２．１\n１．３\t２．８");
t("貼上解析", "全形數字", r.series[0].values[0] === 1.2 && r.series[1].values[2] === 2.8);
r = HT.parseTable("1,2\n3,4\n5,6\n7,8");
t("貼上解析", "逗號分隔 CSV", r.orientation === "vertical" && r.series[1].values.join() === "2,4,6,8");
r = HT.parseTable("1.1 2.2\n3.3 4.4\n5.5 6.6");
t("貼上解析", "空白分隔", r.series[0].values.join() === "1.1,3.3,5.5");
r = HT.parseTable("1\t2\t3\n4\t5\t6\n7\t8\t9");
t("貼上解析", "3×3 判定為不確定，提示人工確認", r.ambiguous === true);
r = HT.parseTable("A\tB\tC\n1\t2\t3\n4\t5\t6\n7\t8\t9\n1\t1\t1");
t("貼上解析", "三組以上全部偵測", r.series.length === 3 && r.series[2].name === "C");
r = HT.parseTable("1\n2\n3\n4");
t("貼上解析", "單欄資料判定為一組", !r.error && r.series.length === 1 && r.series[0].values.length === 4);
r = HT.parseTable("1.2\t1.4\t1.3\t1.5\t1.1\n2.3\t2.1\t2.6\t2.2\t2.0", "vertical");
t("貼上解析", "強制轉置", r.orientation === "vertical" && r.series.length === 5 ? true : r.orientation === "vertical");
r = HT.parseTable("1e-3\t2E-3\n-1.5\t+2\n.5\t3.");
t("貼上解析", "科學記號、正負號、省略整數位", r.series[0].values.join() === "0.001,-1.5,0.5" && r.series[1].values.join() === "0.002,2,3");
const pu = HT.pairUp([1, null, 3, 4], [2, 3, null, 5]);
t("貼上解析", "成對資料剔除不完整配對", pu.a.join() === "1,4" && pu.b.join() === "2,5" && pu.dropped.join() === "2,3");

// ---- decision logic ----
const normalA = [9.8, 10.1, 10.4, 9.9, 10.0, 10.2, 9.7, 10.3, 10.05, 9.95, 10.15, 9.85];
const normalB = normalA.map(v => v + 0.4);
let a = HT.analyze(normalA, normalB, {});
t("檢定選擇", "兩組常態、變異數相等 → Student t", a.chosen === "pooled");
t("檢定選擇", "Student t 與 ANOVA 一致（F = t²）", Math.abs(a.anova.F - a.tests[0].stat ** 2) / a.anova.F < 1e-10 && Math.abs(a.anova.p - a.tests[0].p) < 1e-12);
const wideB = normalA.map((v, i) => 10 + (v - 10) * 8 + 0.4 + (i % 2 ? 0.01 : -0.01));
a = HT.analyze(normalA, wideB, {});
t("檢定選擇", "兩組常態、變異數不等 → Welch t", a.levene.p < 0.05 && a.chosen === "welch", `Levene p=${a.levene.p}`);
const skew = [1, 1.1, 1.2, 1.1, 1.3, 1.2, 1.1, 1.0, 5.5, 9.8, 1.2, 1.15];
a = HT.analyze(skew, normalB, {});
t("檢定選擇", "任一組非常態 → Mann-Whitney", a.chosen === "mwu", `SW p=${a.normality[0].p}`);
const pairedB = normalA.map((v, i) => v + 0.4 + [0.03, -0.05, 0.02, 0.06, -0.01, 0.0, -0.04, 0.05, -0.02, 0.01, -0.03, 0.04][i]);
a = HT.analyze(normalA, pairedB, { paired: true });
t("檢定選擇", "成對、差值常態 → 成對 t", a.chosen === "paired");
t("檢定選擇", "成對 t 與區組 ANOVA 一致（F = t²）", Math.abs(a.anova.F - a.tests[0].stat ** 2) / a.anova.F < 1e-9);
const pb = normalA.map((v, i) => v + [0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 0.1, 3, 0.1, 4][i]);
a = HT.analyze(normalA, pb, { paired: true });
t("檢定選擇", "成對、差值非常態 → Wilcoxon", a.chosen === "wsr");
a = HT.analyze([1, 2], [3, 4, 5], {});
t("輸入檢查", "每組少於 3 筆時拒絕", !!a.errors);
a = HT.analyze([1, 2, 3, 4], [1, 2, 3], { paired: true });
t("輸入檢查", "成對時數量不同拒絕", !!a.errors);
a = HT.analyze([5, 5, 5], [5, 5, 5], {});
t("輸入檢查", "兩組皆無變異時拒絕", !!a.errors);
a = HT.analyze(normalA, normalB, { paired: true });
t("輸入檢查", "成對差值完全相同時拒絕", !!a.errors);
r = HT.parseTable("A\n1\n2\n3");
t("貼上解析", "單欄含標題判定為一組", !r.error && r.series.length === 1 && r.series[0].name === "A");
r = HT.parseTable("A\nB\nC");
t("貼上解析", "沒有數值時回報錯誤", !!r.error);
const al = HT.alignRows([[1, 2, null, 4], [5, 6, 7, 8], [9, null, 11, 12]]);
t("貼上解析", "重複量測剔除不完整的列", al.M.length === 2 && al.dropped.join() === "2,3");
// one-sample & multi decisions
const nrm = [49.8, 50.1, 50.4, 49.9, 50.0, 50.2, 49.7, 50.3, 50.05, 49.95, 50.15, 49.85];
let a1 = HT.analyzeOne(nrm, { target: 50 });
t("檢定選擇", "單組常態 → 單樣本 t", a1.chosen === "t1");
a1 = HT.analyzeOne([1, 1.1, 1.2, 1.1, 1.3, 1.2, 1.1, 1.0, 5.5, 9.8, 1.2, 1.15], { target: 1 });
t("檢定選擇", "單組非常態 → Wilcoxon（對目標值）", a1.chosen === "w1");
a1 = HT.analyzeOne(nrm, {});
t("輸入檢查", "單組未填目標值時拒絕", !!a1.errors);
const g3 = [nrm, nrm.map(v => v + 0.2 + (v - 50) * 0.1), nrm.map(v => v + 0.4 - (v - 50) * 0.2)];
let am = HT.analyzeMulti(g3, {});
t("檢定選擇", "多組常態、變異數相等 → ANOVA", am.chosen === "anova", `Levene p=${am.levene && am.levene.p}`);
am = HT.analyzeMulti([nrm, nrm.map(v => 50 + (v - 50) * 12 + 0.3), nrm.map(v => 50 + (v - 50) * 25 - 0.2)], {});
t("檢定選擇", "多組變異數不等 → Welch ANOVA", am.chosen === "welchAnova", `Levene p=${am.levene && am.levene.p}`);
am = HT.analyzeMulti([nrm, [1, 1.1, 1.2, 1.1, 1.3, 1.2, 1.1, 1.0, 5.5, 9.8, 1.2, 1.15], nrm.map(v => v + 1)], {});
t("檢定選擇", "多組任一非常態 → Kruskal-Wallis", am.chosen === "kw");
t("檢定選擇", "多組 ANOVA F 與一般 ANOVA 一致", Math.abs(HT.analyzeMulti(g3, {}).tests[0].stat - HT.oneWayAnova(g3).F) < 1e-12);
am = HT.analyzeMulti(g3, { paired: true });
t("檢定選擇", "重複量測時輸出球形檢定與 GG 校正", am.mode === "multi" && am.sphericity && am.tests.some(x => x.key === "rmGG"));
am = HT.analyzeMulti([[1, 2, 3], [1, 2]], { paired: true });
t("輸入檢查", "重複量測各組數量不同時拒絕", !!am.errors);
am = HT.analyzeMulti([[1, 2, 3], [4, 5, 6], [7, 8]], {});
t("輸入檢查", "多組任一組少於 3 筆時拒絕", !!am.errors);
am = HT.analyzeMulti(g3, { target: 50 });
t("樣本數與允差", "允差區間：雙邊 = 平均 ± k·s", (() => { const r = HT.toleranceInterval(nrm, 0.95, 0.95, "two"); return Math.abs(r.lo - (r.mean - r.k * r.sd)) < 1e-12 && Math.abs(r.hi - (r.mean + r.k * r.sd)) < 1e-12; })());
t("樣本數與允差", "允差區間：單邊下限不設上限", (() => { const r = HT.toleranceInterval(nrm, 0.95, 0.95, "lower", 49); return r.hi === Infinity && r.pass === (r.lo >= 49); })());
t("樣本數與允差", "允差區間：未填規格時不判定", HT.toleranceInterval(nrm, 0.9, 0.95, "two").pass === null);
t("樣本數與允差", "樣本數：所得 n 的檢定力 ≥ 目標，n−1 則不足", (() => { const n = HT.tSampleSize("two", 0.5, 1, 0.05, "two-sided", 0.8); return HT.tPower("two", n, 0.5, 1, 0.05, "two-sided") >= 0.8 && HT.tPower("two", n - 1, 0.5, 1, 0.05, "two-sided") < 0.8; })());
t("計數型抽樣", "成功試驗經典值：95%／90% 為 29、95%／95% 為 59、95%／99% 為 299", HT.crSampleSize(0.95, 0.9, 0) === 29 && HT.crSampleSize(0.95, 0.95, 0) === 59 && HT.crSampleSize(0.95, 0.99, 0) === 299);
t("計數型抽樣", "樣本數 n 足夠、n−1 不足", (() => { const n = HT.crSampleSize(0.95, 0.9, 2); return HT.binomCdf(2, n, 0.1) <= 0.05 && HT.binomCdf(2, n - 1, 0.1) > 0.05; })());
t("計數型抽樣", "0 失效時示範可靠度 = (1−C)^(1/n)", Math.abs(HT.demoReliability(40, 0, 0.95) - Math.pow(0.05, 1 / 40)) < 1e-12);
t("規格", "目標值差異 = 平均 − 目標值", Math.abs(am.groups[1].vsTarget.diff - (HT.mean(g3[1]) - 50)) < 1e-12);
a = HT.analyze(normalA, normalB, { usl: 10.3, lsl: 9.8 });
const outA = normalA.filter(v => v > 10.3 || v < 9.8).length;
t("規格", "超規數量正確", a.specA.outCount === outA, `${a.specA.outCount} vs ${outA}`);
const dA = a.descA;
t("規格", "Ppk 公式正確", Math.abs(a.specA.ppk - Math.min((10.3 - dA.mean) / (3 * dA.sd), (dA.mean - 9.8) / (3 * dA.sd))) < 1e-12);
a = HT.analyze(normalA, normalB, { usl: 10.3 });
t("規格", "只有上限時用 Ppu", Math.abs(a.specA.ppk - (10.3 - dA.mean) / (3 * dA.sd)) < 1e-12 && a.specA.ppl === null);
a = HT.analyze(normalA, normalB, {});
t("規格", "未提供規格時不計算", a.specA === null);
a = HT.analyze(normalA, normalB, { alternative: "less" });
t("單尾", "單尾 p 為雙尾的一半（t > 0 方向相反時）", Math.abs(a.tests[0].p - HT.tTestPooled(normalA, normalB, "two-sided", 0, 0.95).p / 2) < 1e-12);


// ================= quality tools (SPC / MSA / DOE) =================
if (QT && ref.q) {
  const Q = ref.q;
  Q.consts.forEach(c => { const k = QT.spcConst(c.n);
    check("SPC 常數", `n=${c.n}`, "d2", k.d2, c.d2, 1e-7); check("SPC 常數", `n=${c.n}`, "d3", k.d3, c.d3, 1e-7); check("SPC 常數", `n=${c.n}`, "c4", k.c4, c.c4, 1e-12); });
  Q.spc.forEach((c, i) => {
    const r = QT.spcRun(c.rows, c.type), lab = `${QT.CHART_NAME[c.type]} 資料 ${i + 1}`, tolV = /^(xbarr|xbars|imr)$/.test(c.type) ? 1e-6 : 1e-12;
    check("SPC 管制界限", lab, "中心線", r.panels[0].cl, c.x_cl, 1e-12);
    if (c.ucl_list) { c.ucl_list.forEach((u, j) => check("SPC 管制界限", lab + ` 第 ${j + 1} 點`, "UCL", r.panels[0].ucl[j], u, 1e-12)); c.lcl_list.forEach((u, j) => check("SPC 管制界限", lab + ` 第 ${j + 1} 點`, "LCL", r.panels[0].lcl[j], u, 1e-12)); }
    else { check("SPC 管制界限", lab, "UCL", r.panels[0].ucl[0], c.x_ucl, tolV); check("SPC 管制界限", lab, "LCL", r.panels[0].lcl[0], c.x_lcl, tolV); }
    if (c.r_cl != null) { check("SPC 管制界限", lab, "R／S／MR 中心線", r.panels[1].cl, c.r_cl, 1e-12); check("SPC 管制界限", lab, "R／S／MR UCL", r.panels[1].ucl[0], c.r_ucl, tolV); check("SPC 管制界限", lab, "R／S／MR LCL", r.panels[1].lcl[0], c.r_lcl, tolV); check("SPC 管制界限", lab, "組內標準差", r.sigma, c.sigma, tolV); }
  });
  Q.cap.forEach((c, i) => { const r = QT.capability(c.values, c.sw, c.lsl == null ? NaN : c.lsl, c.usl == null ? NaN : c.usl, c.target == null ? NaN : c.target), lab = `資料 ${i + 1}`;
    ["Cpk", "Ppk", "ppmWithin", "ppmOverall", "Cp", "Pp", "Cpm"].forEach(key => { if (c[key] != null) check("製程能力", lab, key, r[key], c[key], 1e-10); });
    check("製程能力", lab, "整體標準差", r.sdOverall, c.sdOverall, 1e-12); });
  Q.grr.forEach((c, i) => { const r = QT.grrAnova(c.data, { tol: c.tol }), lab = `資料 ${i + 1}`, rows = r.full.rows;
    check("Gage R&R", lab, "SS 操作員", rows[1].ss, c.SSo, 1e-10); check("Gage R&R", lab, "SS 零件", rows[0].ss, c.SSp, 1e-10); check("Gage R&R", lab, "SS 交互作用", rows[2].ss, c.SSi, 1e-9); check("Gage R&R", lab, "SS 重複性", rows[3].ss, c.SSe, 1e-10);
    check("Gage R&R", lab, "交互作用 p", r.interactionP, c.Pi, 1e-8);
    const t = r.table.rows; check("Gage R&R", lab, "操作員 F", t[1].F, c.Fo, 1e-9); check("Gage R&R", lab, "操作員 p", t[1].p, c.Po, 1e-8); check("Gage R&R", lab, "零件 F", t[0].F, c.Fp, 1e-9); check("Gage R&R", lab, "零件 p", t[0].p, c.Pp, 1e-7);
    check("Gage R&R", lab, "GRR 變異數", r.vc.grr, c.var_grr, 1e-9); check("Gage R&R", lab, "零件變異數", r.vc.part, c.var_part, 1e-9);
    check("Gage R&R", lab, "%貢獻 GRR", r.rows[0].pctContrib, c.pctContribGRR, 1e-9); check("Gage R&R", lab, "%研究變異 GRR", r.pctGRR, c.pctSVGRR, 1e-9);
    check("Gage R&R", lab, "ndc", r.ndc, c.ndc, 0); if (c.pctTolGRR != null) check("Gage R&R", lab, "%公差 GRR", r.pctTolGRR, c.pctTolGRR, 1e-9); });
  Q.bias.forEach(c => { const r = QT.msaBias(c.x, c.ref); check("偏差與線性", "偏差", "偏差", r.bias, c.bias, 1e-10); check("偏差與線性", "偏差", "t", r.t, c.t, 1e-10); check("偏差與線性", "偏差", "p", r.p, c.p, 1e-9); });
  Q.lin.forEach(c => { const r = QT.msaLinearity(c.rows);
    [["截距", "intercept"], ["斜率", "slope"], ["截距 p", "pIntercept"], ["斜率 p", "pSlope"], ["R²", "r2"], ["S", "s"]].forEach(([nm, key]) => check("偏差與線性", "線性", nm, r[key], c[key], 1e-9)); });
  { const c = Q.attr, r = QT.attrAgreement(c.ratings, c.standard);
    r.vsStd.forEach((v, i) => check("計數型一致性", `評估員 ${i + 1} 對標準`, "Cohen κ", v.kappa, c.vsStd[i], 1e-12));
    r.within.forEach((v, i) => check("計數型一致性", `評估員 ${i + 1} 自身`, "Fleiss κ", v.kappa, c.within[i], 1e-12));
    check("計數型一致性", "評估員之間", "Fleiss κ", r.between.kappa, c.between, 1e-12); check("計數型一致性", "全部對標準", "Cohen κ", r.allStd.kappa, c.allStd, 1e-12); }
  Q.doe.forEach((c, i) => {
    const d = c.kind === "frac" ? QT.makeDesign("frac", { key: c.key }) : QT.makeDesign(c.kind, { k: c.k });
    const r = QT.doeAnalyze(d, c.y), lab = `${c.kind === "full" ? "全因子" : c.kind === "frac" ? "部分因子 2^(" + c.key + ")" : "PB12"} 資料 ${i + 1}`;
    check("DOE", lab, "效應數", r.effects.length, c.names.length, 0);
    r.effects.forEach((e, j) => { check("DOE", lab + " " + e.name, "效應", e.effect, c.effect[j], 1e-10); check("DOE", lab + " " + e.name, "p 值", e.p, c.p[j], 1e-8); if (c.ss) check("DOE", lab + " " + e.name, "SS", e.ss, c.ss[j], 1e-10); });
    if (c.pse != null) check("DOE", lab, "Lenth PSE", r.PSE, c.pse, 1e-12);
    if (c.mse != null) check("DOE", lab, "誤差 MS", r.MSE, c.mse, 1e-9);
  });
  Q.mix.forEach((c, i) => { const r = QT.mixtureFit(c.points, c.y, c.model), lab = `混合設計 ${c.points[0].length} 成分 ${c.model} 資料 ${i + 1}`;
    r.terms.forEach((t, j) => { check("混合設計", lab + " " + t.name, "係數", t.coef, c.coef[j], 1e-9); check("混合設計", lab + " " + t.name, "標準誤", t.se, c.se[j], 1e-8); if (j >= c.points[0].length) check("混合設計", lab + " " + t.name, "p 值", t.p, c.p[j], 1e-7); });
    check("混合設計", lab, "SSE", r.SSE, c.sse, 1e-9); check("混合設計", lab, "R²", r.R2, c.R2, 1e-10); check("混合設計", lab, "調整 R²", r.R2adj, c.R2adj, 1e-10); check("混合設計", lab, "F", r.F, c.F, 1e-9); check("混合設計", lab, "F 的 p", r.p, c.Fp, 1e-7); });
}

// ---------- quality tools: logic ----------
if (QT) {
  const pan = v => ({ values: v, cl: 0, ucl: v.map(() => 3), lcl: v.map(() => -3) });
  const has = (v, rule) => QT.nelson(pan(v)).some(h => h.rule === rule);
  t("SPC", "Nelson 1：超出 3σ 會被標出", has([0, 0.5, 3.2, 0], 1) && !has([0, 2.9, -2.9], 1));
  t("SPC", "Nelson 2：連續 9 點同側", has([0.1, .2, .3, .1, .2, .3, .1, .2, .3], 2) && !has([0.1, .2, .3, .1, .2, .3, .1, .2, -.3], 2));
  t("SPC", "Nelson 3：連續 6 點遞增", has([-1, -.5, 0, .5, 1, 1.5], 3) && !has([-1, -.5, 0, .5, 1, 1], 3));
  t("SPC", "Nelson 4：連續 14 點上下交替", has([0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1].map((v, i) => v + i * 0.001), 4) && !has([0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 1.5, 2], 4));
  t("SPC", "Nelson 5：3 點中 2 點超出 2σ（同側）", has([2.1, 0, 2.2], 5) && !has([2.1, 0, -2.2], 5));
  t("SPC", "Nelson 6：5 點中 4 點超出 1σ（同側）", has([1.2, 1.3, 0, 1.1, 1.4], 6) && !has([1.2, -1.3, 0, 1.1, 1.4], 6));
  t("SPC", "Nelson 7：連續 15 點在 1σ 以內", has(new Array(15).fill(0).map((_, i) => (i % 2 ? 0.3 : -0.3)), 7) && !has(new Array(15).fill(0).map((_, i) => (i === 7 ? 1.5 : 0.2)), 7));
  t("SPC", "Nelson 8：連續 8 點在 1σ 之外（兩側）", has([1.5, -1.5, 1.2, -1.3, 1.6, -1.1, 1.4, -2], 8) && !has([1.5, -1.5, 1.2, -1.3, 0.5, -1.1, 1.4, -2], 8));
  t("SPC", "自動選圖：單值 → I-MR、n=5 → X̄-R、n=12 → X̄-S", QT.spcAuto([[1], [2]], "var").type === "imr" && QT.spcAuto([[1, 2, 3, 4, 5]], "var").type === "xbarr" && QT.spcAuto([new Array(12).fill(1)], "var").type === "xbars");
  t("SPC", "自動選圖：抽樣數相同 → np、不同 → p；單位相同 → c、不同 → u", QT.spcAuto([[1, 50], [2, 50]], "defective").type === "np" && QT.spcAuto([[1, 50], [2, 60]], "defective").type === "p" && QT.spcAuto([[3], [4]], "defect").type === "c" && QT.spcAuto([[3, 2], [4, 3]], "defect").type === "u");
  t("SPC", "子組大小不一致時拒絕", !!QT.spcAuto([[1, 2], [1, 2, 3]], "var").error);
  t("SPC", "SPC 常數與公認表值一致（d2(5)=2.326、D4(2)=3.267、A2(5)=0.577）", Math.abs(QT.spcConst(5).d2 - 2.326) < 5e-4 && Math.abs(QT.spcConst(2).D4 - 3.267) < 5e-4 && Math.abs(QT.spcConst(5).A2 - 0.577) < 5e-4);
  t("MSA", "交互作用 p > 0.05 時併入誤差", (() => { const g = QT.grrAnova(ref.q.grr[0].data); return g.interactionRemoved && g.table.rows.length === 4; })());
  t("MSA", "平均全距法 AIAG 常數 K1 = 1/d2", Math.abs(0.8862 - 1 / QT.spcConst(2).d2) < 1e-3 && Math.abs(0.5908 - 1 / QT.spcConst(3).d2) < 1e-3);
  t("MSA", "%GRR < 10% 判為可接受、> 30% 不可接受", QT.grrAnova(ref.q.grr[0].data).verdict !== "bad" && (() => { const d = ref.q.grr[0].data.map((o, i) => o.map(p => p.map((v, k) => v + (k ? 1.5 : -1.5) * (i + 1) * 0.3))); return QT.grrAnova(d).verdict === "bad"; })());
  t("DOE", "部分因子 2^(5-2) 為解析度 III：A 與 BD、CE 混淆", (() => { const d = QT.makeDesign("frac", { key: "5-2" }); const r = QT.doeAnalyze(d, d.matrix.map(() => [1, 2].map(() => Math.random()))); const a = r.effects.find(e => e.name === "A"); return a && a.aliases.includes("BD") && a.aliases.includes("CE"); })());
  t("DOE", "部分因子 2^(4-1) 為解析度 IV：主效應不與二因子交互作用混淆", (() => { const d = QT.makeDesign("frac", { key: "4-1" }); const r = QT.doeAnalyze(d, d.matrix.map(() => [Math.random(), Math.random()])); return r.effects.filter(e => e.order === 1).every(e => e.aliases.every(a => a.length !== 2)); })());
  t("DOE", "PB12 各欄正交且平衡", (() => { const M = QT.plackettBurman(11); for (let a = 0; a < 11; a++) { if (M.reduce((s, r) => s + r[a], 0) !== 0) return false; for (let b = a + 1; b < 11; b++) if (M.reduce((s, r) => s + r[a] * r[b], 0) !== 0) return false; } return M.length === 12; })());
  t("DOE", "全因子 2^3 有 8 次、7 個效應", (() => { const d = QT.makeDesign("full", { k: 3 }); return d.matrix.length === 8 && QT.doeAnalyze(d, d.matrix.map(() => [Math.random()])).effects.length === 7; })());
  t("DOE", "無重複時改用 Lenth 法", QT.doeAnalyze(QT.makeDesign("full", { k: 3 }), new Array(8).fill(0).map(() => [Math.random()])).method === "lenth");
  t("SPC", "p 圖 UCL 被截在 1 時，判異仍用實際 σ（不誤判）", (() => { const r = QT.pChart([4, 5, 4, 5, 4, 5, 4], [5, 5, 5, 5, 5, 5, 6]); return QT.nelson(r.panels[0]).filter(h => h.rule === 1 || h.rule === 5).length === 0; })());
  t("SPC", "Nelson 5／6：序列開頭的型態也會標出", has([2.5, 2.5, 0], 5) && has([1.5, 1.5, 1.5, 1.5, 0], 6));
  t("SPC", "u 圖：檢驗單位數 ≤ 0 會被拒絕", !!QT.spcAuto([[3, 0], [4, 2]], "defect").error);
  t("製程能力", "Cpm：目標不在規格中心時用 min(T−LSL, USL−T)/(3τ)", (() => { const v = [9, 10, 11, 10, 10.5, 9.5], r = QT.capability(v, 0.8, 7, 13, 11), tau = Math.sqrt(v.reduce((a, x) => a + (x - 11) ** 2, 0) / 5); return Math.abs(r.Cpm - 2 / (3 * tau)) < 1e-12; })());
  t("DOE", "Lenth：PSE = 0 時不判顯著、p 不超過 1", (() => { const d = QT.makeDesign("full", { k: 3 }), r = QT.doeAnalyze(d, [10, 12, 10, 12, 10, 12, 10, 12].map(v => [v]), { goal: "max" }); return r.lenthDegenerate === true && r.effects.every(e => !e.sig && !(e.p > 1)); })());
  t("DOE", "沒有顯著效應時不給建議設定", (() => { const d = QT.makeDesign("full", { k: 3 }), r = QT.doeAnalyze(d, [1, 1.3, 0.8, 1.1, 1.2, 0.9, 1.05, 1.15].map(v => [v]), { goal: "max" }); return r.method !== "lenth" || r.effects.some(e => e.sig) || !r.best; })());
  t("DOE", "PB 未用滿 11 欄且不重複時，用剩餘欄位當誤差（ANOVA）", (() => { const d = QT.makeDesign("pb", { k: 5 }), r = QT.doeAnalyze(d, d.matrix.map((row, i) => [10 + 3 * row[0] + Math.sin(i)])); return r.method === "anova" && r.dfE === 6 && r.noPureError === true; })());
  t("混合設計", "單形格子 {3,2} 有 6 點、{3,3} 有 10 點、單形質心 3 成分有 7 點", QT.simplexLattice(3, 2).length === 6 && QT.simplexLattice(3, 3).length === 10 && QT.simplexCentroid(3).length === 7);
  t("混合設計", "每個設計點成分合計為 1", QT.simplexLattice(4, 3).every(p => Math.abs(p.reduce((a, b) => a + b, 0) - 1) < 1e-12));
  t("混合設計", "資料不足時拒絕估計", !!QT.mixtureFit(QT.simplexLattice(3, 2), [1, 2, 3, 4, 5, 6], "quadratic").error);
}

// ---------- Taguchi: reference values ----------
if (TG && ref.tg) {
  ref.tg.static.forEach((c, i) => check("田口 S/N", `靜態 ${c.type} n=${c.y.length}（${i + 1}）`, "S/N", TG.snStatic(c.y, c.type), c.sn, 1e-12));
  ref.tg.dynamic.forEach((c, i) => { const r = TG.snDynamic(c.M, c.Y, c.formula), lab = `動態 ${c.formula === "simple" ? "β²/Ve" : "標準式"} ${c.M.length} 個訊號（${i + 1}）`;
    check("田口 S/N", lab, "β", r.beta, c.beta, 1e-12); check("田口 S/N", lab, "Ve", r.Ve, c.Ve, 1e-10); check("田口 S/N", lab, "S/N", r.sn, c.sn, 1e-11); });
  ref.tg.anova.forEach((c, i) => {
    const an = TG.analyze({ array: c.array, cols: c.cols, inter: c.inter }, c.levels, c.resp, { pool: c.poolIn }), lab = `${c.array} ${c.levels.length} 因子${c.inter.length ? " + " + c.inter.length + " 交互作用" : ""}（${i + 1}）`;
    check("田口 ANOVA", lab, "總平均", an.T, c.T, 1e-13); check("田口 ANOVA", lab, "總平方和", an.SST, c.SST, 1e-12);
    check("田口 ANOVA", lab, "誤差變異 Ve", an.error.ms, c.Ve, 1e-10); check("田口 ANOVA", lab, "誤差自由度", an.error.df, c.eDf, 0);
    t("田口", `${lab}：併入的項目與參考一致`, JSON.stringify(an.pooled.slice().sort((a, b) => a - b)) === JSON.stringify(c.pool));
    an.terms.forEach((tm, j) => { const rr = c.terms[j], nm = lab + " " + tm.name;
      check("田口 ANOVA", nm, "SS", tm.ss, rr.ss, 1e-10);
      if (rr.means) rr.means.forEach((m, l) => check("田口 回應表", nm, `水準 ${l + 1} 平均`, tm.means[l], m, 1e-12));
      if (rr.F != null) { check("田口 ANOVA", nm, "F", tm.F, rr.F, 1e-9); check("田口 ANOVA", nm, "p", tm.p, rr.p, 1e-8); check("田口 ANOVA", nm, "貢獻率 ρ%", tm.rho, rr.rho, 1e-9); } });
    const best = TG.optimize(an, c.levels, "max"), pr = TG.predict(an, best.lv), ci = TG.predCI(an, pr.neff, 1);
    check("田口 預測", lab, "最佳條件預測值", best.pred, c.bestPred, 1e-11); check("田口 預測", lab, "有效樣本數 n_eff", pr.neff, c.neff, 1e-13);
    check("田口 預測", lab, "F 臨界值", ci.F, c.Fcrit, 1e-8); check("田口 預測", lab, "信賴區間 CI1", ci.ci1, c.ci1, 1e-8); check("田口 預測", lab, "確認實驗 CI2", ci.ci2, c.ci2, 1e-8);
  });
}
if (TG) {
  const ortho = a => { const M = a.matrix, c = a.levels.length; for (let i = 0; i < c; i++) for (let j = i + 1; j < c; j++) { const cnt = {}; M.forEach(r => { const k = r[i] + "," + r[j]; cnt[k] = (cnt[k] || 0) + 1; }); const v = Object.values(cnt); if (v.length !== a.levels[i] * a.levels[j] || new Set(v).size > 1) return false; } return true; };
  Object.values(TG.ARR).forEach(a => t("田口", `${a.name}：${a.runs} 次、${a.levels.length} 欄，任兩欄的水準組合次數相同（直交）`, ortho(a) && a.matrix.length === a.runs && a.matrix.every(r => r.every((v, j) => v >= 1 && v <= a.levels[j]))));
  t("田口", "L8 與標準表相同（第 2 列 1112222、第 8 列 2212112）", TG.ARR.L8.matrix[1].join("") === "1112222" && TG.ARR.L8.matrix[7].join("") === "2212112");
  t("田口", "L9 與標準表相同（第 4 列 2123、第 9 列 3321）", TG.ARR.L9.matrix[3].join("") === "2123" && TG.ARR.L9.matrix[8].join("") === "3321");
  t("田口", "L8 交互作用欄：第 1、2 欄的交互作用在第 3 欄，第 1、4 欄在第 5 欄", (() => { const a = TG.assign("L8", [2, 2, 2], [[0, 1], [0, 2]]); return a.cols.join() === "0,1,3" && a.inter.map(x => x.col).join() === "2,4"; })());
  t("田口", "L16 交互作用表與標準表一致（1×2→3、1×4→5、2×4→6、1×8→9、2×8→10、4×8→12、7×8→15）", (() => { const m = TG.ARR.L16.masks, ix = (a, b) => m.indexOf(m[a - 1] ^ m[b - 1]) + 1; return ix(1, 2) === 3 && ix(1, 4) === 5 && ix(2, 4) === 6 && ix(1, 8) === 9 && ix(2, 8) === 10 && ix(4, 8) === 12 && ix(7, 8) === 15; })());
  t("田口", "L18 第 10 列與第 18 列與標準表相同（21133221、23321231）", TG.ARR.L18.matrix[9].join("") === "21133221" && TG.ARR.L18.matrix[17].join("") === "23321231");
  t("田口", "欄位不夠時拒絕配置（L8 放 5 因子 + 3 交互作用）", !!TG.assign("L8", [2, 2, 2, 2, 2], [[0, 1], [0, 2], [1, 2]]).error);
  t("田口", "L9／L12／L18 不允許配置交互作用", !!TG.assign("L9", [3, 3], [[0, 1]]).error && !!TG.assign("L18", [2, 3], [[0, 1]]).error && !!TG.assign("L12", [2, 2], [[0, 1]]).error);
  t("田口", "自動建議直交表：3 個 2 水準→L4、7→L8、4 個 3 水準→L9、1×2＋7×3→L18、混合過多→無", TG.suggest([2, 2, 2]) === "L4" && TG.suggest(new Array(7).fill(2)) === "L8" && TG.suggest([3, 3, 3, 3]) === "L9" && TG.suggest([2].concat(new Array(7).fill(3))) === "L18" && TG.suggest([2, 2, 3]) === null);
  t("田口", "望大特性有 0 時 S/N 無法計算（不回傳錯誤數字）", isNaN(TG.snStatic([0, 3], "larger")));
  t("田口", "望目只有 1 個值時 S/N 無法計算", isNaN(TG.snStatic([5], "nominal")));
  t("田口", "誤差自由度為 0 時自動併入最小的項，直到併入自由度 ≥ 一半", (() => { const an = TG.analyze({ array: "L9", cols: [0, 1, 2, 3], inter: [] }, [3, 3, 3, 3], [1, 2, 3, 2, 3, 4, 3, 4, 6]); return an.error.df >= 4 && an.terms.filter(x => x.pooled).length >= 2; })());
  t("田口", "誤差為 0 時，SS 為 0 的項 p 不是 0（不誤判為顯著）", (() => { const M = TG.ARR.L8.matrix, y = M.map(r => 10 + 2 * (r[0] - 1)); const an = TG.analyze({ array: "L8", cols: [0, 1, 3], inter: [] }, [2, 2, 2], y, { pool: "none" }); return an.terms[0].p === 0 && isNaN(an.terms[1].p) && isNaN(an.terms[2].p); })());
  t("田口", "模型保持階層：交互作用顯著時保留其主效應，並選對最佳組合", (() => { const M = TG.ARR.L8.matrix, nz = [0.03, -0.02, 0.01, -0.03, 0.02, 0.0, -0.01, 0.02]; const y = M.map((r, i) => 0.6 * (r[0] - 1) + 5 * (r[2] === 1 ? 1 : 0) + nz[i]); const an = TG.analyze({ array: "L8", cols: [0, 1, 3], inter: [{ a: 0, b: 1, col: 2 }] }, [2, 2, 2], y, { pool: "none" }); const m = TG.model(an, 0.10), best = TG.optimize(m, [2, 2, 2], "max"); return !m.terms[0].pooled && best.lv[0] === 2 && best.lv[1] === 2; })());
  t("田口", "模型以外的項併入預測用的誤差", (() => { const an = TG.analyze({ array: "L9", cols: [0, 1, 2], inter: [] }, [3, 3, 3], [1, 2, 3, 2.1, 3.2, 3.9, 3.1, 4.2, 5.3], { pool: "none" }); const m = TG.model(an, 0.10), dropped = an.terms.filter((t, i) => !m.terms[i].pooled === false); return Math.abs(m.error.ss - (an.error.ss + dropped.reduce((s, t) => s + t.ss, 0))) < 1e-12 && m.error.df === an.error.df + dropped.reduce((s, t) => s + t.df, 0); })());
  t("田口", "預測值 = 總平均 + 各未併入因子最佳水準效果", (() => { const an = TG.analyze({ array: "L4", cols: [0, 1], inter: [] }, [2, 2], [1, 3, 2, 6], { pool: "none" }); return Math.abs(TG.predict(an, [2, 2]).pred - (3 + (4.5 - 3) + (4 - 3))) < 1e-12; })());
}

// ---------- equivalence (TOST) & non-inferiority sample size ----------
if (SS && SS.tostPower && ref.eq) {
  const R = ref.eq, G = "同等性與不劣性", dn = d => d === "two" ? "兩組獨立" : "單組／成對";
  R.tp.forEach(c => check(G, `TOST ${dn(c.design)} n=${c.n} δ=${c.delta} σ=${c.sd} α=${c.alpha} 真實差=${+c.D.toFixed(4)}`, "檢定力", SS.tostPower(c.design, c.n, c.delta, c.sd, c.alpha, c.D), c.power, 1e-7));
  R.tn.forEach(c => check(G, `TOST ${dn(c.design)} δ=${c.delta} σ=${c.sd} α=${c.alpha} 真實差=${c.D} 目標 ${c.target}`, "最小樣本數", SS.tostN(c.design, c.delta, c.sd, c.alpha, c.target, c.D), c.n, 0));
  R.nip.forEach(c => check(G, `不劣性 ${dn(c.design)} ${c.dir === "higher" ? "越大越好" : "越小越好"} n=${c.n} δ=${c.delta} 真實差=${c.D}`, "檢定力", SS.niPower(c.design, c.n, c.delta, c.sd, c.alpha, c.D, c.dir), c.power, 1e-9));
  R.nin.forEach(c => check(G, `不劣性 ${dn(c.design)} ${c.dir === "higher" ? "越大越好" : "越小越好"} δ=${c.delta} σ=${c.sd} α=${c.alpha} 目標 ${c.target}`, "最小樣本數", SS.niN(c.design, c.delta, c.sd, c.alpha, c.target, c.D, c.dir), c.n, 0));
  R.sim.forEach(c => check(G, `TOST 模擬 40 萬次 ${dn(c.design)} n=${c.n} δ=${c.delta} σ=${c.sd} 真實差=${c.D}（容許 4 個模擬標準誤）`, "檢定力", SS.tostPower(c.design, c.n, c.delta, c.sd, 0.05, c.D), c.power, 4 * c.se));
  (R.tests || []).forEach((c, i) => {
    const lab = `判定 #${i + 1} ${c.paired ? "成對" : "兩組獨立"} n=${c.x.length}/${c.y.length} δ=${c.delta} α=${c.alpha}（statsmodels ttost）`, r = SS.tostTest(c.x, c.y, c.delta, c.alpha, c.paired);
    check(G, lab, "平均差", r.d, c.d, 1e-12); check(G, lab, "標準誤", r.se, c.se, 1e-12); check(G, lab, "下界檢定 p", r.pLow, c.pLow, 1e-9); check(G, lab, "上界檢定 p", r.pUp, c.pUp, 1e-9); check(G, lab, "TOST p", r.p, c.p, 1e-9);
    check(G, lab, "信賴區間下限", r.lo, c.lo, 1e-10); check(G, lab, "信賴區間上限", r.hi, c.hi, 1e-10);
    check(G, lab, "不劣性 p（越大越好）", SS.niTest(c.x, c.y, c.delta, c.alpha, c.paired, "higher").p, c.niHigher, 1e-9); check(G, lab, "不劣性 p（越小越好）", SS.niTest(c.x, c.y, c.delta, c.alpha, c.paired, "lower").p, c.niLower, 1e-9);
  });
  t(G, "判定：信賴區間在 ±δ 內 ⇔ 兩個單尾 p 都 < α", (R.tests || []).every(c => { const r = SS.tostTest(c.x, c.y, c.delta, c.alpha, c.paired); return r.ok === (r.pLow < c.alpha && r.pUp < c.alpha); }));
  t(G, "TOST：真實差異 ≥ δ 時無法規劃（回傳無解）", isNaN(SS.tostN("two", 1, 1, 0.05, 0.9, 1)));
  t(G, "TOST：在可用的範圍（檢定力 ≥ 5%）樣本數增加檢定力不下降（極小樣本時 TOST 檢定力本來就非單調）", [20, 30, 40, 60, 100, 200].map(n => SS.tostPower("two", n, 0.5, 1, 0.05, 0.1)).every((v, i, a) => i === 0 || v >= a[i - 1] - 1e-12));
  t(G, "TOST：δ 很大時檢定力趨近 1、δ 很小時趨近 0", SS.tostPower("two", 30, 10, 1, 0.05, 0) > 0.9999 && SS.tostPower("two", 30, 0.01, 1, 0.05, 0) < 1e-6);
  t(G, "TOST：真實差異 ±D 對稱", Math.abs(SS.tostPower("two", 10, 1, 1, 0.05, 0.3) - SS.tostPower("two", 10, 1, 1, 0.05, -0.3)) < 1e-12);
  t(G, "不劣性：越大越好與越小越好鏡像對稱", Math.abs(SS.niPower("two", 10, 0.5, 1, 0.05, 0.1, "higher") - SS.niPower("two", 10, 0.5, 1, 0.05, -0.1, "lower")) < 1e-12);
  t(G, "不劣性所需樣本數不超過同條件的 TOST（只檢一側）", SS.niN("two", 0.5, 1, 0.05, 0.9, 0, "higher") <= SS.tostN("two", 0.5, 1, 0.05, 0.9, 0));
  t(G, "反推 δ：以反推的 δ 計算剛好達到目標檢定力", (() => { const d = SS.tostDelta("two", 6, 0.012, 0.05, 0.9, 0); return Math.abs(SS.tostPower("two", 6, d, 0.012, 0.05, 0) - 0.9) < 1e-6; })());
}

// ---------- sample-size planning ----------
if (SS && ref.ss) {
  const R = ref.ss, G = "樣本數規劃";
  R.p1.forEach((c, i) => { const r = SS.prop1Power(c.p0, c.p1, c.n, 0.05, c.alt), lab = `單一比例 精確二項 p0=${c.p0} p1=${c.p1} n=${c.n} ${c.alt}`;
    check(G, lab, "檢定力", r.power, c.power, 1e-9); check(G, lab, "實際顯著水準", r.size, c.size, 1e-9); check(G, lab, "下側臨界值", r.lo, c.lo, 0); check(G, lab, "上側臨界值", r.hi, c.hi, 0); });
  R.p1n.forEach(c => check(G, `單一比例 p0=${c.p0} p1=${c.p1} ${c.alt} 檢定力 ${c.target}`, "最小樣本數", SS.prop1N(c.p0, c.p1, 0.05, c.alt, c.target).n, c.n, 0));
  R.p2.forEach(c => check(G, `兩比例 p1=${c.p1} p2=${c.p2} n1=${c.n} 比例 ${c.ratio} ${c.alt}`, "檢定力", SS.prop2Power(c.p1, c.p2, c.n, 0.05, c.alt, c.ratio), c.power, 1e-10));
  R.p2n.forEach(c => check(G, `兩比例 p1=${c.p1} p2=${c.p2} ${c.alt} 檢定力 ${c.target}`, "每組樣本數", SS.prop2N(c.p1, c.p2, 0.05, c.alt, c.target), c.n, 0));
  R.doe.forEach(c => { const r = SS.doePower(c.runs, c.r, c.terms, c.delta, c.sigma, 0.05, c.cp), lab = `2 水準因子設計 ${c.runs} 次 × ${c.r} 重複 ${c.terms} 項${c.cp ? " + " + c.cp + " 中心點" : ""}`;
    check(G, lab, "誤差自由度", r.df, c.df, 0); check(G, lab, "檢定力", r.power, c.power, 1e-8); });
  R.tol1.forEach(c => { const r = SS.tolN(c.p, c.g, "lower", c.kmax), lab = `單邊允差區間 ${c.p}/${c.g} k ≤ ${c.kmax}`; check(G, lab, "樣本數", r.n, c.n, 0); check(G, lab, "k 因子", SS.tolK(c.n, c.p, c.g, "lower"), c.k, 1e-7); });
  (R.nct || []).forEach(c => check(G, `非中心 t 分布 t=${c.t} df=${c.df} δ=${c.d}`, "CDF", HT.nctCdf(c.t, c.df, c.d), c.cdf, 1e-9));
  R.np.forEach(c => { const lab = `無母數允差區間 ${c.p}/${c.g} ${c.side === "two" ? "雙邊" : "單邊"}`; check(G, lab, "樣本數", SS.npTolN(c.p, c.g, c.side), c.n, 0); check(G, lab, "達到的信心", SS.npConf(c.n, c.p, c.side), c.conf, 1e-12); });
}
if (SS) {
  t("樣本數規劃", "單一比例：檢定力在最小樣本數達到目標、前一個樣本數未達", (() => { const r = SS.prop1N(0.1, 0.02, 0.05, "less", 0.8); return SS.prop1Power(0.1, 0.02, r.n, 0.05, "less").power >= 0.8 && SS.prop1Power(0.1, 0.02, r.n - 1, 0.05, "less").power < 0.8 && r.stable >= r.n; })());
  t("樣本數規劃", "單一比例：實際顯著水準不超過設定的 α（精確檢定）", [20, 50, 137, 400].every(n => SS.prop1Power(0.2, 0.1, n, 0.05, "two-sided").size <= 0.05 + 1e-12));
  t("樣本數規劃", "兩比例：等樣本時與已知結果一致（5% vs 2%，雙尾、80% → 每組 588）", SS.prop2N(0.05, 0.02, 0.05, "two-sided", 0.8) === 588);
  t("樣本數規劃", "DOE：重複次數增加檢定力不下降", [1, 2, 3, 4, 5].map(r => SS.doePower(8, r, 7, 2, 1.5, 0.05).power).filter(isFinite).every((v, i, a) => i === 0 || v >= a[i - 1]));
  t("樣本數規劃", "DOE：沒有誤差自由度時不給檢定力", isNaN(SS.doePower(8, 1, 7, 2, 1.5, 0.05).power));
  t("樣本數規劃", "雙邊允差區間：n 的 k 值不超過上限、n−1 超過", (() => { const r = SS.tolN(0.99, 0.95, "two", 3.5); return SS.tolK(r.n, 0.99, 0.95, "two") <= 3.5 && SS.tolK(r.n - 1, 0.99, 0.95, "two") > 3.5; })());
  t("樣本數規劃", "允差區間：允許的 k 小於常態分位數時回報無解", isNaN(SS.tolN(0.99, 0.95, "lower", 2.2).n));
  t("樣本數規劃", "單一比例：雙尾判定規則中無法拒絕的一側不列出（下側臨界值為 −1）", SS.prop1Power(0.01, 0.05, 50, 0.05, "two-sided").lo === -1);
  t("樣本數規劃", "允差區間：需要的樣本數超過上限時回報 overMax，而非「無法達成」", (() => { const r = SS.tolN(0.99, 0.95, "one", 2.3264 + 0.01, 3000); return isNaN(r.n) && r.overMax === 3000; })());
  t("樣本數規劃", "無母數允差區間：經典值 95%/95% 雙邊 93 個、99%/95% 單邊 299 個", SS.npTolN(0.95, 0.95, "two") === 93 && SS.npTolN(0.99, 0.95, "lower") === 299);
}

// ---------- 相關與迴歸 ----------
if (RG && ref.reg) {
  ref.reg.cases.forEach(c => {
    const G = "相關與迴歸", lab = c.label, pe = RG.pearson(c.x, c.y), sp = RG.spearman(c.x, c.y), L = RG.linreg(c.x, c.y), R = c.lin;
    check(G, lab, "Pearson r", pe.r, c.pearson.r, 1e-10); check(G, lab, "Pearson p", pe.p, c.pearson.p, 1e-8);
    check(G, lab, "Pearson r 95% CI 下限", pe.ci[0], c.pearson.ci[0], 1e-9); check(G, lab, "Pearson r 95% CI 上限", pe.ci[1], c.pearson.ci[1], 1e-9);
    check(G, lab, "Spearman ρ", sp.rho, c.spearman.rho, 1e-10); check(G, lab, "Spearman p", sp.p, c.spearman.p, 1e-8);
    check(G, lab, "截距 b0", L.b0, R.b0, 1e-9); check(G, lab, "斜率 b1", L.b1, R.b1, 1e-10);
    check(G, lab, "截距標準誤", L.seB0, R.seB0, 1e-9); check(G, lab, "斜率標準誤", L.seB1, R.seB1, 1e-9);
    check(G, lab, "斜率 p", L.pB1, R.p, 1e-8); check(G, lab, "截距 p", L.pB0, R.pB0, 1e-8);
    check(G, lab, "斜率 95% CI 下限", L.ciB1[0], R.ciB1[0], 1e-9); check(G, lab, "斜率 95% CI 上限", L.ciB1[1], R.ciB1[1], 1e-9);
    check(G, lab, "截距 95% CI 下限", L.ciB0[0], R.ciB0[0], 1e-9); check(G, lab, "截距 95% CI 上限", L.ciB0[1], R.ciB0[1], 1e-9);
    check(G, lab, "R²", L.r2, R.r2, 1e-10); check(G, lab, "調整 R²", L.r2adj, R.r2adj, 1e-9);
    check(G, lab, "F", L.F, R.F, 1e-9); check(G, lab, "F 的 p", L.pF, R.pF, 1e-8); check(G, lab, "殘差標準差 s", L.s, R.s, 1e-10);
    check(G, lab, "Durbin-Watson", L.dw, R.dw, 1e-10);
    const tolR = /大數值/.test(lab) ? 1e-8 : 1e-9; // 病態資料：與 NIST 判定同樣用 1e-8
    [0, Math.floor(c.x.length / 2), c.x.length - 1].forEach(i => {
      check(G, lab, `槓桿值 h（第 ${i + 1} 筆）`, L.lev[i], R.lev[i], 1e-10);
      check(G, lab, `標準化殘差（第 ${i + 1} 筆）`, L.sres[i], R.sres[i], tolR);
      check(G, lab, `學生化刪除殘差（第 ${i + 1} 筆）`, L.tres[i], R.tres[i], tolR);
    });
    c.pred.forEach(q => { const P = L.predict(q.x);
      check(G, lab, `x=${q.x} 預測值`, P.fit, q.fit, 1e-10);
      check(G, lab, `x=${q.x} 平均值 95% CI 下限`, P.ci[0], q.ci[0], 1e-9); check(G, lab, `x=${q.x} 平均值 95% CI 上限`, P.ci[1], q.ci[1], 1e-9);
      check(G, lab, `x=${q.x} 95% 預測區間下限`, P.pi[0], q.pi[0], 1e-9); check(G, lab, `x=${q.x} 95% 預測區間上限`, P.pi[1], q.pi[1], 1e-9); });
    if (c.quad) { const Q = RG.quadCheck(c.x, c.y); check(G, lab, "二次項 t", Q.t, c.quad.t, 1e-7); check(G, lab, "二次項 p", Q.p, c.quad.p, 1e-7); }
  });
  ref.reg.nist.forEach(c => {
    const L = RG.linreg(c.x.map(Number), c.y.map(Number)), lreOf = (a, b) => { const re = relErr(a, b); return re === 0 ? 15 : Math.min(15, -Math.log10(re)); };
    const vals = { "截距 B0": [L.b0, "b0"], "斜率 B1": [L.b1, "b1"], "B0 標準誤": [L.seB0, "seB0"], "B1 標準誤": [L.seB1, "seB1"], "殘差標準差": [L.s, "s"], "R²": [L.r2, "r2"], "迴歸 SS": [L.ssr, "ssr"], "殘差 SS": [L.sse, "sse"], "殘差 MS": [L.mse, "mse"], "F": [L.F, "F"] };
    for (const [k, [js, key]] of Object.entries(vals)) {
      const cert = c.cert[key], best = c.best[key];
      nistRows.push({ dataset: c.name + "（線性迴歸）", qty: k, js, cert, best, lre: lreOf(js, cert), lreLimit: lreOf(best, cert), vsBest: relErr(js, best), pass: relErr(js, best) <= 1e-8 });
    }
  });
}
if (RG) {
  const G = "相關與迴歸";
  t(G, "完全線性 y = 2x + 1：r = 1、斜率 2、截距 1、殘差 0", (() => { const x = [1, 2, 3, 4, 5], L = RG.linreg(x, x.map(v => 2 * v + 1)), P = RG.pearson(x, x.map(v => 2 * v + 1)); return Math.abs(L.b1 - 2) < 1e-12 && Math.abs(L.b0 - 1) < 1e-12 && P.r === 1 && P.p === 0 && L.sse < 1e-20; })());
  t(G, "X 全部相同時回報錯誤，不給數字", !!RG.linreg([3, 3, 3, 3], [1, 2, 3, 4]).error && !!RG.pearson([3, 3, 3, 3], [1, 2, 3, 4]).error);
  t(G, "成對資料少於 3 組時回報錯誤", !!RG.linreg([1, 2], [3, 4]).error && !!RG.spearman([1, 2], [3, 4]).error);
  t(G, "缺值成對刪除：只用兩欄都有值的列", (() => { const p = RG.pairs([1, 2, NaN, 4, 5], [2, NaN, 6, 8, 10]); return p.x.join() === "1,4,5" && p.y.join() === "2,8,10" && p.idx.join() === "0,3,4"; })());
  t(G, "單調但非線性（y = x³）：Spearman ρ = 1、Pearson r < 1", (() => { const x = [1, 2, 3, 4, 5, 6], y = x.map(v => v ** 3); return RG.spearman(x, y).rho === 1 && RG.pearson(x, y).r < 1; })());
  t(G, "相關矩陣對稱、對角為自身", (() => { const M = RG.corrMatrix([{ name: "a", v: [1, 2, 3, 4, 6] }, { name: "b", v: [2, 1, 4, 3, 5] }, { name: "c", v: [5, 3, 4, 1, 2] }]); return M[0][0].self && M[0][1] === M[1][0] && Math.abs(M[1][2].pearson.r - M[2][1].pearson.r) === 0; })());
  t(G, "規格反推：邊界上的單邊 95% 預測下限等於規格下限，且不超出資料範圍", (() => {
    const x = [], y = []; for (let i = 0; i < 30; i++) { const v = 170 + i * 0.7; x.push(v); y.push(0.3 * v - 38 + 0.6 * Math.sin(i * 1.7)); }
    const L = RG.linreg(x, y), w = RG.specWindow(L, 15.5, null, 0.95); if (!w || w.none) return false;
    const t1 = HT.tInv(0.95, L.df), lowAt = x0 => L.b0 + L.b1 * x0 - t1 * L.s * Math.sqrt(1 + 1 / L.n + (x0 - L.xb) ** 2 / L.sxx);
    return w.lo >= L.xmin && w.hi <= L.xmax && Math.abs(lowAt(w.lo) - 15.5) < 1e-6 && w.edgeHi; })());
  t(G, "規格反推：整個資料範圍都達不到規格時回報「無可行範圍」", (() => { const x = [1, 2, 3, 4, 5, 6], L = RG.linreg(x, [1, 2.1, 2.9, 4.2, 5, 6.1]); const w = RG.specWindow(L, 100, null, 0.95); return w && w.none; })());
  t(G, "二次項檢查：明顯曲線時 p < 0.05，直線時 p 不顯著", (() => { const x = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], nz = [0.1, -0.2, 0.15, -0.1, 0.05, 0.2, -0.15, 0.1, -0.05, 0]; const qc = RG.quadCheck(x, x.map((v, i) => 10 - (v - 4.5) ** 2 + nz[i])), ql = RG.quadCheck(x, x.map((v, i) => 2 * v + nz[i])); return qc.p < 0.05 && ql.p > 0.05; })());
}

return { rows, nistRows, logic: results };
}
if (typeof module !== "undefined" && module.exports) module.exports = { runValidation };
else root.runValidation = runValidation;
})(typeof window !== "undefined" ? window : globalThis);
