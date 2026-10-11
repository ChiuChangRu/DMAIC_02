  // =====================================================================
  // 樣本數規劃：結果下方的「算式與計算過程」（LaTeX，KaTeX 排版）
  // 所有代入值都由程式用同一組計算函式產生；AI 不參與。
  // KaTeX 只在第一次展開時從 cdnjs 載入；載入失敗就顯示 LaTeX 原始碼。
  // =====================================================================
  const KATEX = "https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/";
  let katexP = null;
  function katexLib() {
    if (window.katex) return Promise.resolve(window.katex);
    if (katexP) return katexP;
    katexP = new Promise((ok, no) => {
      // 只載入 JS、輸出 MathML（瀏覽器原生排版）：claude.ai 頁面不允許載入外部樣式表，KaTeX 的 HTML 輸出少了 CSS 會撐爆版面
      const s = document.createElement("script"); s.src = KATEX + "katex.min.js"; s.onload = () => window.katex ? ok(window.katex) : no(); s.onerror = () => { katexP = null; no(); };
      document.head.appendChild(s);
    });
    return katexP;
  }
  async function fxTypeset(box) {
    const els = box.querySelectorAll("[data-tex]:not([data-done])");
    if (!els.length) return;
    try {
      const K = await katexLib();
      els.forEach(el => { K.render(el.dataset.tex, el, { displayMode: el.tagName === "DIV", throwOnError: false, strict: "ignore", output: "mathml" }); el.dataset.done = "1"; });
    } catch (_) {
      els.forEach(el => { el.innerHTML = `<code>${esc(el.dataset.tex)}</code>`; });
      const w = box.querySelector(".fx-warn"); if (w) w.hidden = false;
    }
  }
  // 數字格式：有效位數 g，去掉多餘的 0
  const fxN = (x, g) => { if (!isFinite(x)) return "\\infty"; const v = +(+x).toPrecision(g || 5); return Math.abs(v) >= 1e6 || (v !== 0 && Math.abs(v) < 1e-4) ? v.toExponential(3).replace(/e([+-]\d+)/, (m, e) => "\\times10^{" + (+e) + "}") : String(v); };
  const fxP = (x, d) => (x * 100).toFixed(d == null ? 2 : d).replace(/\.?0+$/, "") + "\\%";
  // steps: [說明文字（HTML）, LaTeX（顯示公式）]；LaTeX 為空則只顯示文字
  function fxHtml(title, steps, foot) {
    return `<details class="fx" data-fx><summary>算式與計算過程</summary><div class="fx-body">
      <p class="hint fx-warn" hidden>無法載入公式排版程式（需要連到 cdnjs.cloudflare.com），以下顯示 LaTeX 原始碼。</p>
      <p class="fx-title">${esc(title)}</p>
      <ol class="fx-steps">${steps.map(s => `<li>${s[0] ? `<div class="fx-lab">${s[0]}</div>` : ""}${s[1] ? `<div class="fx-math" data-tex="${esc(s[1].includes("\\\\") ? "\\begin{gathered}" + s[1] + "\\end{gathered}" : s[1])}"></div>` : ""}</li>`).join("")}</ol>
      ${foot ? `<p class="hint">${foot}</p>` : ""}</div></details>`;
  }
  function fxAttach(outId, html) {
    const out = $(outId); if (!out) return;
    const old = out.querySelector("[data-fx]"); if (old) old.remove();
    out.insertAdjacentHTML("beforeend", html);
    const d = out.querySelector("[data-fx]");
    if (fxOpen) { d.open = true; fxTypeset(d); }
    d.addEventListener("toggle", () => { fxOpen = d.open; if (d.open) fxTypeset(d); });
  }
  let fxOpen = false;   // 使用者展開過就保持展開

  // ---------- 計量型（t 檢定）----------
  function fxPower() {
    const r = pw.result; if (!r) return;
    const two = r.design === "two", a2 = r.alt === "two-sided", za = HT.normInv(1 - (a2 ? r.alpha / 2 : r.alpha));
    const zaL = a2 ? "z_{1-\\alpha/2}" : "z_{1-\\alpha}", taL = a2 ? "t_{1-\\alpha/2,\\,\\nu}" : "t_{1-\\alpha,\\,\\nu}";
    const H = two ? (a2 ? "H_0:\\ \\mu_1=\\mu_2 \\qquad H_1:\\ \\mu_1\\neq\\mu_2" : "H_0:\\ \\mu_1=\\mu_2 \\qquad H_1:\\ \\mu_1>\\mu_2")
      : (a2 ? "H_0:\\ \\mu=\\mu_0 \\qquad H_1:\\ \\mu\\neq\\mu_0" : "H_0:\\ \\mu=\\mu_0 \\qquad H_1:\\ \\mu>\\mu_0");
    const steps = [["假設（成對資料時 μ 為差值的平均，σ 為差值的標準差）", H]];
    const nuT = two ? "\\nu=2n-2" : "\\nu=n-1", dT = two ? "\\delta=\\dfrac{\\Delta}{\\sigma\\sqrt{2/n}}" : "\\delta=\\dfrac{\\Delta\\sqrt{n}}{\\sigma}";
    const powT = a2 ? `1-\\beta = P\\!\\left(T'_{\\nu,\\delta} > ${taL}\\right) \\\\ \\quad + P\\!\\left(T'_{\\nu,\\delta} < -${taL}\\right)` : `1-\\beta = P\\!\\left(T'_{\\nu,\\delta} > ${taL}\\right)`;
    const at = n => { const nu = two ? 2 * n - 2 : n - 1, d = two ? r.delta / (r.sd * Math.sqrt(2 / n)) : r.delta / r.sd * Math.sqrt(n), t = HT.tInv(1 - (a2 ? r.alpha / 2 : r.alpha), nu), p = HT.tPower(r.design, n, r.delta, r.sd, r.alpha, r.alt); return { nu, d, t, p }; };
    const row = (n, mark) => { const v = at(n); return `n=${n}:\\quad \\nu=${v.nu},\\ \\delta=${fxN(v.d, 5)},\\ ${taL.replace("\\nu", v.nu)}=${fxN(v.t, 5)} \\\\ \\Rightarrow\\ 1-\\beta=${fxN(v.p, 5)}${mark ? "\\ " + mark : ""}`; };
    if (r.solve === "n") {
      const zb = HT.normInv(r.target), k = two ? 2 : 1, approx = k * Math.pow(za + zb, 2) * Math.pow(r.sd / r.delta, 2);
      steps.push([`常態近似（手算參考）：β = 1 − 目標檢定力，z 為標準常態分位數`,
        `n \\approx \\frac{${two ? "2\\," : ""}(${zaL}+z_{1-\\beta})^2\\,\\sigma^2}{\\Delta^2} \\\\ = \\frac{${two ? "2\\times" : ""}(${fxN(za, 5)}+${fxN(zb, 5)})^2\\times ${fxN(r.sd, 6)}^2}{${fxN(r.delta, 6)}^2} = ${fxN(approx, 4)} \\;\\Rightarrow\\; ${Math.ceil(approx - 1e-9)}`]);
      steps.push([`精確計算（程式實際採用）：非中心 t 分布，T′ 的自由度 ν、非中心參數 δ`, `${nuT},\\qquad ${dT} \\\\ ${powT}`]);
      steps.push([`從小到大逐一試算 n，取第一個達到目標檢定力 ${r.target} 的 n`, (r.n > 2 ? row(r.n - 1, `< ${r.target}`) + "\\\\" : "") + row(r.n, `\\ge ${r.target}`) + `\\;\\Rightarrow\\; n=${r.n}`]);
      if (Math.ceil(approx - 1e-9) < r.n) steps.push([`近似式沒有考慮 t 分布在小樣本時尾巴較厚，所以比精確值少；以精確值 n = ${r.n} 為準。`, ""]);
    } else if (r.solve === "power") {
      steps.push([`非中心 t 分布，T′ 的自由度 ν、非中心參數 δ`, `${nuT},\\qquad ${dT} \\\\ ${powT}`]);
      steps.push(["代入", row(r.n)]);
    } else {
      steps.push([`非中心 t 分布，T′ 的自由度 ν、非中心參數 δ`, `${nuT},\\qquad ${dT} \\\\ ${powT}`]);
      steps.push([`固定 n = ${r.n}，以二分法找出讓檢定力剛好等於 ${r.target} 的 Δ`, `\\Delta = ${fxN(r.delta, 5)}:\\quad ` + row(r.n).replace(/^n=\d+:\\quad /, "")]);
    }
    fxAttach("pwOut", fxHtml(two ? "兩組獨立 t 檢定的樣本數" : "單組或成對 t 檢定的樣本數", steps, "非中心 t 分布的機率要用數值方法計算，無法用計算機手算；程式的計算已與 SciPy、statsmodels 比對確效。"));
  }

  // ---------- 通過／不通過 ----------
  function fxAttr() {
    const r = at.result; if (!r) return;
    if (r.mode === "plan") {
      const { C, R, c, n } = r, cdf = m => HT.binomCdf(c, m, 1 - R);
      const steps = [["條件：測 n 個、失效不超過 c 個時，以信心 C 宣稱可靠度至少 R。等於要求「真實可靠度只有 R 時，這麼少失效的機率」不超過 1 − C",
        `P(X\\le c \\mid n,\\ p=1-R)=\\sum_{i=0}^{c}\\binom{n}{i}(1-R)^{i}R^{\\,n-i}\\ \\le\\ 1-C`]];
      if (c === 0) {
        const v = Math.log(1 - C) / Math.log(R);
        steps.push(["允許 0 個失效時可以直接解出 n（成功試驗法）",
          `R^{\\,n}\\le 1-C \\;\\Rightarrow\\; n \\ge \\frac{\\ln(1-C)}{\\ln R}=\\frac{\\ln(${fxN(1 - C, 4)})}{\\ln(${fxN(R, 4)})}=${fxN(v, 6)} \\;\\Rightarrow\\; n=${n}`]);
      } else steps.push([`允許 ${c} 個失效時沒有封閉解，從小到大逐一試算 n`, ""]);
      steps.push(["驗算", (n > c + 1 ? `n=${n - 1}:\\ P(X\\le ${c})=${fxN(cdf(n - 1), 5)} > ${fxN(1 - C, 4)}\\\\` : "") + `n=${n}:\\ P(X\\le ${c})=${fxN(cdf(n), 5)} \\le ${fxN(1 - C, 4)}\\;\\Rightarrow\\; n=${n}`]);
      fxAttach("atOut", fxHtml("二項分布（成功試驗法）", steps, "假設樣品是從製程隨機抽出、彼此獨立。"));
    } else {
      const { C, n, ac, rel, aql } = r, pu = 1 - rel;
      const steps = [["失效數 x 不超過 Ac 時，不良率的單邊信賴上界（Clopper-Pearson），B⁻¹ 為 Beta 分布的分位數",
        `p_U = B^{-1}\\!\\left(C;\\ x+1,\\ n-x\\right),\\qquad R_L = 1-p_U`]];
      if (ac === 0) steps.push(["x = 0 時可以直接算", `p_U = 1-(1-C)^{1/n} = 1-(${fxN(1 - C, 4)})^{1/${n}} = ${fxN(pu, 5)} \\;\\Rightarrow\\; R_L=${fxP(rel, 3)}`]);
      else steps.push(["代入", `p_U = B^{-1}(${fxN(C, 4)};\\ ${ac + 1},\\ ${n - ac}) = ${fxN(pu, 5)} \\;\\Rightarrow\\; R_L=${fxP(rel, 3)}`]);
      if (aql) steps.push(["不良率等於 AQL 時的允收機率", `P_a = P(X\\le ${ac}\\mid n=${n},\\ p=${fxN(aql, 4)}) = \\sum_{i=0}^{${ac}}\\binom{${n}}{i}p^{i}(1-p)^{${n}-i} = ${fxN(r.paAql, 4)}`]);
      fxAttach("atOut", fxHtml("二項分布與 Clopper-Pearson 信賴上界", steps, "批量遠大於樣本數時適用。"));
    }
  }

  // ---------- 不良率比較 ----------
  function fxProp() {
    const r = TQ.prop; if (!r) return;
    const { d, alt, a, tgt, p0, p1, n } = r, steps = [];
    if (d === "one") {
      const c = r.crit;
      steps.push(["假設", alt === "less" ? "H_0:\\ p\\ge p_0 \\qquad H_1:\\ p<p_0" : alt === "greater" ? "H_0:\\ p\\le p_0 \\qquad H_1:\\ p>p_0" : "H_0:\\ p=p_0 \\qquad H_1:\\ p\\neq p_0"]);
      if (alt === "less") {
        steps.push(["判定界限：不良數 X ≤ c 時拒絕 H₀；c 取讓誤判機率不超過 α 的最大值", `c=\\max\\{c:\\ P(X\\le c\\mid n,p_0)\\le\\alpha\\} \\;\\Rightarrow\\; c=${c.lo},\\quad P(X\\le ${c.lo}\\mid ${n},${fxN(p0, 4)})=${fxN(c.size, 4)}`]);
        steps.push(["檢定力：真實不良率為 p₁ 時判定成功的機率", `1-\\beta = P(X\\le ${c.lo}\\mid n=${n},\\ p_1=${fxN(p1, 4)}) = \\sum_{i=0}^{${c.lo}}\\binom{${n}}{i}p_1^{\\,i}(1-p_1)^{${n}-i} = ${fxN(r.power, 4)}`]);
      } else if (alt === "greater") {
        steps.push(["判定界限：不良數 X ≥ c 時拒絕 H₀", `c=\\min\\{c:\\ P(X\\ge c\\mid n,p_0)\\le\\alpha\\} \\;\\Rightarrow\\; c=${c.hi},\\quad P(X\\ge ${c.hi}\\mid ${n},${fxN(p0, 4)})=${fxN(c.size, 4)}`]);
        steps.push(["檢定力", `1-\\beta = P(X\\ge ${c.hi}\\mid n=${n},\\ p_1=${fxN(p1, 4)}) = ${fxN(r.power, 4)}`]);
      } else {
        steps.push(["判定界限：兩側各分配 α/2", `c_L=\\max\\{c: P(X\\le c)\\le\\alpha/2\\}=${c.lo},\\qquad c_U=\\min\\{c: P(X\\ge c)\\le\\alpha/2\\}=${c.hi}`]);
        steps.push(["檢定力", `1-\\beta = P(X\\le ${c.lo}\\mid p_1)+P(X\\ge ${c.hi}\\mid p_1) = ${fxN(r.power, 4)}`]);
      }
      if (r.s === "n") {
        steps.push([`從小到大逐一試算 n，取第一個檢定力達到 ${tgt} 的 n${r.info && r.info.stable > n ? `（檢定力會鋸齒狀起伏，n = ${r.info.stable} 起都不低於目標）` : ""}`, ""]);
        const za = HT.normInv(1 - (alt === "two-sided" ? a / 2 : a)), zb = HT.normInv(tgt), ap = SSE.prop1NApprox(p0, p1, a, alt, tgt);
        steps.push(["常態近似（手算參考，不良率很低時不準）", `n\\approx\\left[\\frac{z_{1-\\alpha}\\sqrt{p_0(1-p_0)}+z_{1-\\beta}\\sqrt{p_1(1-p_1)}}{p_0-p_1}\\right]^2 \\\\ =\\left[\\frac{${fxN(za, 5)}\\sqrt{${fxN(p0, 4)}(1-${fxN(p0, 4)})}+${fxN(zb, 5)}\\sqrt{${fxN(p1, 4)}(1-${fxN(p1, 4)})}}{${fxN(p0 - p1, 4)}}\\right]^2\\approx ${ap}`]);
      }
      fxAttach("prOut", fxHtml("單組不良率：精確二項檢定", steps, alt === "two-sided" ? "雙尾時常態近似式的 z₁₋α 要改成 z₁₋α/₂。" : ""));
    } else {
      const k = r.ratio, pb = (p0 + p1 * k) / (1 + k), s0 = Math.sqrt(pb * (1 - pb) * (1 + 1 / k)), s1 = Math.sqrt(p0 * (1 - p0) + p1 * (1 - p1) / k);
      const a2 = alt === "two-sided", z = HT.normInv(1 - (a2 ? a / 2 : a)), dd = p0 - p1;
      steps.push(["假設", a2 ? "H_0:\\ p_1=p_2 \\qquad H_1:\\ p_1\\neq p_2" : alt === "larger" ? "H_0:\\ p_1\\le p_2 \\qquad H_1:\\ p_1>p_2" : "H_0:\\ p_1\\ge p_2 \\qquad H_1:\\ p_1<p_2"]);
      steps.push([`變異：H₀ 下用合併比例，H₁ 下用各組比例；r = n₂／n₁ = ${fxN(k, 4)}`, `\\bar p=\\frac{p_1+r\\,p_2}{1+r}=${fxN(pb, 5)} \\\\ \\sigma_0=\\sqrt{\\bar p(1-\\bar p)\\left(1+\\tfrac1r\\right)}=${fxN(s0, 5)} \\\\ \\sigma_1=\\sqrt{p_1(1-p_1)+\\tfrac{p_2(1-p_2)}{r}}=${fxN(s1, 5)}`]);
      const powF = alt === "larger" ? `1-\\beta = 1-\\Phi\\!\\left(\\frac{z_{1-\\alpha}\\sigma_0-(p_1-p_2)\\sqrt{n_1}}{\\sigma_1}\\right)` : alt === "smaller" ? `1-\\beta = \\Phi\\!\\left(\\frac{-z_{1-\\alpha}\\sigma_0-(p_1-p_2)\\sqrt{n_1}}{\\sigma_1}\\right)` : `1-\\beta = 1-\\Phi\\!\\left(\\frac{z_{1-\\alpha/2}\\sigma_0-(p_1-p_2)\\sqrt{n_1}}{\\sigma_1}\\right) \\\\ \\quad +\\Phi\\!\\left(\\frac{-z_{1-\\alpha/2}\\sigma_0-(p_1-p_2)\\sqrt{n_1}}{\\sigma_1}\\right)`;
      steps.push(["檢定力（常態近似）", powF]);
      const row = m => `n_1=${m}:\\ 1-\\beta=${fxN(SSE.prop2Power(p0, p1, m, a, alt, k), 5)}`;
      steps.push([`代入 z = ${fxN(z, 5)}、p₁ − p₂ = ${fxN(dd, 4)}${r.s === "n" ? `，逐一試算 n₁，取第一個達到 ${tgt} 的值` : ""}`, r.s === "n" ? (n > 2 ? row(n - 1) + ` < ${tgt}\\\\` : "") + row(n) + ` \\ge ${tgt}\\;\\Rightarrow\\; n_1=${n},\\ n_2=\\lceil r\\,n_1\\rceil=${Math.ceil(n * k)}` : row(n)]);
      fxAttach("prOut", fxHtml("兩組不良率：常態近似", steps, "Φ 為標準常態累積分布函數。"));
    }
  }

  // ---------- 允差區間樣本數 ----------
  function fxTolp() {
    const r = TQ.tolp; if (!r || !isFinite(r.n)) return;
    const two = r.side === "two", steps = [];
    if (r.m === "np") {
      const sd = two ? "two" : "one", c = m => SSE.npConf(m, r.p, sd);
      if (!two) {
        const v = Math.log(1 - r.g) / Math.log(r.p);
        steps.push(["以樣本的極端值當界限（Wilks 法），信心水準為", `\\gamma(n)=1-P^{\\,n}`]);
        steps.push(["解出 n", `1-P^{\\,n}\\ge\\gamma \\;\\Rightarrow\\; n\\ge\\frac{\\ln(1-\\gamma)}{\\ln P}=\\frac{\\ln(${fxN(1 - r.g, 4)})}{\\ln(${fxN(r.p, 4)})}=${fxN(v, 6)}\\;\\Rightarrow\\; n=${r.n}`]);
      } else {
        steps.push(["以樣本的最小值與最大值當界限（Wilks 法），信心水準為", `\\gamma(n)=1-nP^{\\,n-1}+(n-1)P^{\\,n}`]);
        steps.push(["逐一試算 n", (r.n > 2 ? `n=${r.n - 1}:\\ \\gamma=${fxN(c(r.n - 1), 5)} < ${r.g}\\\\` : "") + `n=${r.n}:\\ \\gamma=${fxN(c(r.n), 5)} \\ge ${r.g}\\;\\Rightarrow\\; n=${r.n}`]);
      }
      fxAttach("tpOut", fxHtml("無母數允差區間（Wilks 法）", steps, "P 為涵蓋比例、γ 為信心水準。"));
      return;
    }
    const sd = two ? "two" : "one", kL = r.side !== "upper" ? (r.mu - r.lsl) / r.sd : Infinity, kU = r.side !== "lower" ? (r.usl - r.mu) / r.sd : Infinity;
    steps.push(["允許的允差因子：預期平均離規格有幾個標準差", (r.side === "upper" ? `k_{\\max}=\\frac{USL-\\mu}{\\sigma}=\\frac{${fxN(r.usl, 6)}-${fxN(r.mu, 6)}}{${fxN(r.sd, 6)}}` : r.side === "lower" ? `k_{\\max}=\\frac{\\mu-LSL}{\\sigma}=\\frac{${fxN(r.mu, 6)}-${fxN(r.lsl, 6)}}{${fxN(r.sd, 6)}}` : `k_{\\max}=\\min\\!\\left(\\frac{\\mu-LSL}{\\sigma},\\frac{USL-\\mu}{\\sigma}\\right)=\\min(${fxN(kL, 5)},\\ ${fxN(kU, 5)})`) + `=${fxN(r.kMax, 5)}`]);
    if (!two) steps.push(["單邊允差因子（非中心 t 分布的分位數，z_P 為涵蓋比例 P 的常態分位數）", `k(n)=\\frac{t'_{\\gamma}\\!\\left(n-1,\\ z_P\\sqrt{n}\\right)}{\\sqrt{n}},\\qquad z_P=${fxN(HT.normInv(r.p), 5)}`]);
    else steps.push(["雙邊允差因子：以精確積分（Odeh 法）數值求解，滿足", `P_{\\bar x,s}\\!\\left[\\Phi\\!\\left(\\tfrac{\\bar x+ks-\\mu}{\\sigma}\\right)-\\Phi\\!\\left(\\tfrac{\\bar x-ks-\\mu}{\\sigma}\\right)\\ge P\\right]=\\gamma`]);
    const kn = m => SSE.tolK(m, r.p, r.g, sd);
    steps.push([`取 k(n) ≤ k<sub>max</sub> 的最小 n`, (r.n > 2 ? `k(${r.n - 1})=${fxN(kn(r.n - 1), 5)} > ${fxN(r.kMax, 5)}\\\\` : "") + `k(${r.n})=${fxN(kn(r.n), 5)} \\le ${fxN(r.kMax, 5)}\\;\\Rightarrow\\; n=${r.n}`]);
    fxAttach("tpOut", fxHtml("常態允差區間的樣本數", steps, "假設實際平均與標準差和預期相同；P 為涵蓋比例、γ 為信心水準。"));
  }

  // ---------- DOE 重複次數 ----------
  function fxDoer() {
    const r = TQ.doer; if (!r || !isFinite(r.r)) return;
    const steps = [["2 水準設計：效應 Δ（高水準平均 − 低水準平均）的 t 檢定。N<sub>f</sub> = 每次重複的實驗次數 × 重複次數、N = N<sub>f</sub> + 中心點、p = 模型項數",
      `\\nu=N-1-p,\\qquad \\delta=\\frac{\\Delta\\sqrt{N_f}}{2\\sigma} \\\\ 1-\\beta=P\\!\\left(T'_{\\nu,\\delta}>t_{1-\\alpha/2,\\nu}\\right) \\\\ \\quad +P\\!\\left(T'_{\\nu,\\delta}<-t_{1-\\alpha/2,\\nu}\\right)`]];
    const row = k => { const p = SSE.doePower(r.runs, k, r.terms, r.delta, r.sd, r.a, r.cp); return isFinite(p.power) ? `r=${k}:\\ N=${p.N},\\ \\nu=${p.df},\\ \\delta=${fxN(p.ncp, 5)},\\ 1-\\beta=${fxN(p.power, 5)}` : `r=${k}:\\ N=${p.N},\\ \\nu=${p.df}\\ (\\text{no error df})`; };
    steps.push([`逐一試算重複次數 r，取第一個達到 ${r.tgt} 的 r`, (r.r > 1 ? row(r.r - 1) + ` < ${r.tgt}\\\\` : "") + row(r.r) + ` \\ge ${r.tgt}\\;\\Rightarrow\\; r=${r.r}`]);
    fxAttach("drOut", fxHtml("DOE 效應的檢定力", steps, "非中心 t 分布的機率以數值方法計算。"));
  }

  // ---------- 同等性（TOST）與不劣性 ----------
  function fxEq(kind) {
    const r = TQ[kind]; if (!r) return;
    const two = r.design === "two", D = r.tr || 0, a = r.alpha, n = r.n, k = two ? 2 : 1;
    const kL = two ? "\\sqrt{2/n}" : "\\sqrt{1/n}", nuT = two ? "\\nu=2n-2" : "\\nu=n-1";
    const za = HT.normInv(1 - a), steps = [];
    if (kind === "tost") {
      steps.push(["假設：要證明的是「差異在 ±δ 內」，所以把「差太多」放在 H₀（μ 為新 − 舊的平均差；成對時為差值的平均）", `H_0:\\ |\\mu|\\ge\\delta \\qquad H_1:\\ |\\mu|<\\delta`]);
      steps.push([`判定：兩個單尾檢定都顯著，等同 ${fmt((1 - 2 * a) * 100, 0)}% 信賴區間整條落在 ±δ 內（SE 為平均差的標準誤）`, `\\bar d - t_{1-\\alpha,\\nu}\\,SE > -\\delta \\quad\\text{and}\\quad \\bar d + t_{1-\\alpha,\\nu}\\,SE < \\delta,\\qquad ${nuT}`]);
      steps.push(["精確檢定力（程式採用）：對樣本標準差 s 的分布積分，c 為平均差的標準差", `c=\\sigma${kL},\\quad L(s)=\\delta-t_{1-\\alpha,\\nu}\\,s${kL} \\\\ 1-\\beta=\\int_0^{\\infty}\\left[\\Phi\\!\\left(\\tfrac{L(s)-\\Delta}{c}\\right)-\\Phi\\!\\left(\\tfrac{-L(s)-\\Delta}{c}\\right)\\right]^{+} f(s)\\,ds`]);
      const zb = HT.normInv(D === 0 ? 1 - (1 - r.target) / 2 : r.target), den = D === 0 ? r.delta : r.delta - Math.abs(D), ap = k * Math.pow(za + zb, 2) * Math.pow(r.sd / den, 2);
      steps.push([`常態近似（手算參考）${D === 0 ? "：真實差異為 0 時用 z₁₋β/₂" : "：真實差異不為 0 時用 z₁₋β，分母為 δ − |Δ|"}`, `n\\approx\\frac{${two ? "2\\," : ""}(z_{1-\\alpha}+z_{${D === 0 ? "1-\\beta/2" : "1-\\beta"}})^2\\sigma^2}{${D === 0 ? "\\delta^2" : "(\\delta-|\\Delta|)^2"}} \\\\ =\\frac{${two ? "2\\times" : ""}(${fxN(za, 5)}+${fxN(zb, 5)})^2\\times ${fxN(r.sd, 6)}^2}{${fxN(den, 6)}^2}=${fxN(ap, 4)}\\;\\Rightarrow\\;${Math.ceil(ap - 1e-9)}`]);
    } else {
      const hi = r.dir !== "lower";
      steps.push([`假設：特性${hi ? "越大越好" : "越小越好"}，要證明新的沒有比現行差超過 δ（μ 為新 − 舊的平均差）`, hi ? `H_0:\\ \\mu\\le-\\delta \\qquad H_1:\\ \\mu>-\\delta` : `H_0:\\ \\mu\\ge\\delta \\qquad H_1:\\ \\mu<\\delta`]);
      steps.push([`判定：單邊 t 檢定，等同 ${fmt((1 - a) * 100, 1).replace(/\.0$/, "")}% 單邊信賴界限沒有越過 ${hi ? "−δ" : "+δ"}`, hi ? `\\frac{\\bar d+\\delta}{SE}>t_{1-\\alpha,\\nu},\\qquad ${nuT}` : `\\frac{\\bar d-\\delta}{SE}<-t_{1-\\alpha,\\nu},\\qquad ${nuT}`]);
      steps.push(["精確檢定力（程式採用）：非中心 t 分布", hi ? `\\lambda=\\frac{\\Delta+\\delta}{\\sigma${kL}},\\qquad 1-\\beta=P\\!\\left(T'_{\\nu,\\lambda}>t_{1-\\alpha,\\nu}\\right)` : `\\lambda=\\frac{\\Delta-\\delta}{\\sigma${kL}},\\qquad 1-\\beta=P\\!\\left(T'_{\\nu,\\lambda}<-t_{1-\\alpha,\\nu}\\right)`]);
      const zb = HT.normInv(r.target), den = hi ? r.delta + D : r.delta - D, ap = k * Math.pow(za + zb, 2) * Math.pow(r.sd / den, 2);
      steps.push(["常態近似（手算參考）", `n\\approx\\frac{${two ? "2\\," : ""}(z_{1-\\alpha}+z_{1-\\beta})^2\\sigma^2}{(\\delta${hi ? "+" : "-"}\\Delta)^2} \\\\ =\\frac{${two ? "2\\times" : ""}(${fxN(za, 5)}+${fxN(zb, 5)})^2\\times ${fxN(r.sd, 6)}^2}{${fxN(den, 6)}^2}=${fxN(ap, 4)}\\;\\Rightarrow\\;${Math.ceil(ap - 1e-9)}`]);
    }
    const row = m => `n=${m}:\\ 1-\\beta=${fxN(kind === "tost" ? SSE.tostPower(r.design, m, r.delta, r.sd, a, D) : SSE.niPower(r.design, m, r.delta, r.sd, a, D, r.dir), 5)}`;
    steps.push([`代入 δ = ${fxN(r.delta, 6)}、σ = ${fxN(r.sd, 6)}、Δ = ${fxN(D, 6)}、α = ${a}，從小到大逐一試算，取第一個達到 ${r.target} 的 n`, (n > 2 ? row(n - 1) + ` < ${r.target}\\\\` : "") + row(n) + ` \\ge ${r.target}\\;\\Rightarrow\\; n=${n}`]);
    fxAttach(kind === "tost" ? "eqOut" : "niOut", fxHtml(kind === "tost" ? "同等性（TOST）的樣本數" : "不劣性的樣本數", steps, kind === "tost" ? "f(s) 為樣本標準差的抽樣分布；積分以數值方法計算，已與 SciPy 獨立計算及 40 萬次模擬比對。近似式在小樣本時會偏少，以精確值為準。" : "非中心 t 分布的機率以數值方法計算；近似式在小樣本時會偏少，以精確值為準。"));
  }

  [["eqRun", () => fxEq("tost")], ["niRun", () => fxEq("ni")], ["tpEx", fxTolp], ["pwRun", fxPower], ["atRun", fxAttr], ["prRun", fxProp], ["tpRun", fxTolp], ["drRun", fxDoer]].forEach(([b, f]) => $(b).addEventListener("click", () => { try { f(); } catch (e) { console.warn("formula", e); } }));
