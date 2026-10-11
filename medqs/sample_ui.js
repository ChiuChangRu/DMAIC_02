
  // =====================================================================
  // 樣本數規劃（計量型與通過／不通過沿用原本假設檢定的程式；其餘計算在 sample.js：window.SS）
  // =====================================================================
  const SSE = window.SS;
  var sampleSub = "power";
  const SS_HINT = { power: "連續數值（強度、尺寸）的 t 檢定：所需樣本數、檢定力或可偵測差值", attr: "通過／不通過的試驗：信心度／可靠度樣本數，或評估抽樣方案", prop: "不良率：證明低於目標值，或比較兩組的不良率", tolp: "允差區間（例如 95% 信心、99% 符合規格）要測幾個", doer: "2 水準因子設計要重複幾次", guide: "MSA、SPC 等工具的建議數量", tost: "變更後一樣嗎：同等性（TOST）要測幾個", ni: "換了之後不會變差：不劣性要測幾個" };
  function setSampleSub(name) {
    const b = $("ssTabs").querySelector(`[data-tsub="${name}"]`); if (b) b.click();
  }
  bindSubtabs("ssTabs", s => { sampleSub = s; $("ssSubHint").textContent = SS_HINT[s]; if (s === "power") $("pwFromData").hidden = !state.result; });
  $("ssSubHint").textContent = "先選你要回答的問題，程式會用對應的方法計算要測幾個";
  // 統一的工具跳轉（含子分頁）
  function gotoTool(name, sub) {
    route(name);
    if (!sub) { if (name === "sample") $("pwFromData").hidden = !state.result; return; }
    if (name === "hypothesis") setSub(sub);
    else if (name === "sample") setSampleSub(sub);
    else { const tabs = { msa: "msaTabs", doe: "doeTabs" }[name]; if (tabs) { const b = $(tabs).querySelector(`[data-tsub="${sub}"]`); if (b) b.click(); } }
  }
  function sampleHas() { return sampleSub === "power" ? !!pw.result : sampleSub === "attr" ? !!at.result : sampleSub === "prop" ? !!TQ.prop : sampleSub === "tolp" ? !!TQ.tolp : sampleSub === "doer" ? !!TQ.doer : sampleSub === "tost" ? !!TQ.tost : sampleSub === "ni" ? !!TQ.ni : false; }
  function sampleBody() { return sampleSub === "power" ? powerContext() : sampleSub === "attr" ? attrContext() : (TQ[sampleSub] && TQ[sampleSub].ctx) || ""; }
  const SS_NAME = { power: "計量型（t 檢定）", attr: "通過／不通過", prop: "不良率比較", tolp: "允差區間樣本數", doer: "DOE 重複次數", guide: "其他工具建議數量", tost: "同等性（TOST）", ni: "不劣性" };
  function sampleExplainQ() {
    return sampleSub === "power" ? "請說明這個樣本數計算：結果代表什麼、各輸入值對結果的影響、實務上要注意什麼（例如 σ 的來源、檢定力不足的風險），以及寫進驗證計畫書的樣本數理由要怎麼寫。"
      : sampleSub === "attr" ? "請說明這個計數型抽樣結果：樣本數或可靠度代表什麼、和 AQL 的差別、寫進設計驗證計畫書時要注意什麼。"
      : sampleSub === "prop" ? "請說明這個不良率樣本數計算：結果代表什麼、判定規則怎麼用、和信心度／可靠度方法的差別，以及寫進計畫書時要注意什麼。"
      : sampleSub === "tolp" ? "請說明這個允差區間樣本數：結果代表什麼、平均與標準差估計不準時的風險、常態與無母數方法怎麼選。"
      : sampleSub === "tost" ? "請說明這個同等性（TOST）樣本數：結果代表什麼、δ 與 σ 對數量的影響、量完後怎麼判定，以及驗證計畫書中 δ 的依據與樣本數理由要怎麼寫。"
      : sampleSub === "ni" ? "請說明這個不劣性樣本數：和同等性的差別、δ 與方向怎麼決定、量完後怎麼判定，以及寫進驗證計畫書要注意什麼。"
      : "請說明這個 DOE 重複次數計算：結果代表什麼、σ 與 Δ 怎麼估、重複和增加中心點的差別。";
  }
  // ---------- 不良率比較 ----------
  const prDesign = chipGroup("prDesign", prUI), prSolve = chipGroup("prSolve", prUI);
  function prAltSet(d) {
    $("prAlt").innerHTML = d === "one"
      ? `<button class="chip" type="button" data-v="less" aria-pressed="true">證明不良率低於 p₀</button><button class="chip" type="button" data-v="greater" aria-pressed="false">偵測不良率高於 p₀</button><button class="chip" type="button" data-v="two-sided" aria-pressed="false">雙尾</button>`
      : `<button class="chip" type="button" data-v="two-sided" aria-pressed="true">雙尾（兩組不同）</button><button class="chip" type="button" data-v="smaller" aria-pressed="false">第 1 組較低</button><button class="chip" type="button" data-v="larger" aria-pressed="false">第 1 組較高</button>`;
  }
  $("prAlt").addEventListener("click", e => { const b = e.target.closest("button[data-v]"); if (!b) return; $("prAlt").querySelectorAll("button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); });
  const prAlt = () => ($("prAlt").querySelector('[aria-pressed="true"]') || {}).dataset.v;
  let prLastDesign = "";
  function prUI() {
    const d = prDesign(), s = prSolve();
    if (d !== prLastDesign) { prAltSet(d); prLastDesign = d; }
    $("prP0Lab").textContent = d === "one" ? "目標不良率 p₀（%）" : "第 1 組不良率 p₁（%）";
    $("prP1Lab").textContent = d === "one" ? "預期實際不良率 p₁（%）" : "第 2 組不良率 p₂（%）";
    $("prRatioF").hidden = d === "one"; $("prNF").hidden = s !== "power"; $("prTF").hidden = s === "power";
    $("prNLab").textContent = d === "one" ? "樣本數 n" : "第 1 組樣本數 n₁";
  }
  prUI();
  function prRun() {
    const d = prDesign(), s = prSolve(), alt = prAlt(), a = +$("prAlpha").value, tgt = +$("prTarget").value;
    const P0 = inNum("prP0"), P1 = inNum("prP1"), ratio = d === "two" ? inNum("prRatio") : 1;
    const fail = m => { $("prHint").innerHTML = `<span class="status ng">${m}</span>`; };
    if ([P0, P1].some(v => v == null || isNaN(v) || v <= 0 || v >= 100)) return fail("不良率要介於 0% 與 100% 之間（不含 0 與 100）。");
    if (d === "two" && !(ratio > 0)) return fail("樣本數比要大於 0。");
    const p0 = P0 / 100, p1 = P1 / 100;
    if (p0 === p1) return fail("兩個不良率相同，沒有差異可以偵測。");
    if (d === "one" && ((alt === "less" && p1 >= p0) || (alt === "greater" && p1 <= p0))) return fail(alt === "less" ? "要證明低於 p₀ 時，預期實際不良率 p₁ 必須小於 p₀。" : "要偵測高於 p₀ 時，p₁ 必須大於 p₀。");
    if (d === "two" && ((alt === "smaller" && p0 >= p1) || (alt === "larger" && p0 <= p1))) return fail("對立假設的方向與兩組不良率的大小不一致。");
    let n, power, info = {};
    if (s === "n") {
      if (d === "one") { const r = SSE.prop1N(p0, p1, a, alt, tgt); if (!isFinite(r.n)) { const na = SSE.prop1NApprox(p0, p1, a, alt, tgt); info = { approx: true }; n = na; if (!(na > 0) || na > 1e7) return fail("所需樣本數過大，請放寬條件。"); } else { n = r.n; info = r; } }
      else { n = SSE.prop2N(p0, p1, a, alt, tgt, ratio); if (!isFinite(n)) return fail("樣本數超過計算上限。"); }
    } else {
      n = parseInt($("prN").value, 10); if (!(n >= 2)) return fail("請填樣本數（至少 2）。");
    }
    let crit = null;
    if (d === "one") { const r = SSE.prop1Power(p0, p1, n, a, alt); power = r.power; crit = r; } else power = SSE.prop2Power(p0, p1, n, a, alt, ratio);
    $("prHint").textContent = "";
    TQ.prop = { d, s, alt, a, tgt, p0, p1, ratio, n, power, crit, info };
    const n2 = d === "two" ? Math.ceil(n * ratio) : 0;
    $("prTitle").textContent = d === "one" ? "單組不良率（精確二項）" : "兩組不良率比較";
    let rule = "";
    if (d === "one" && crit && info.approx) rule = `精確二項搜尋超過 20000 個仍未達目標，改用常態近似估算約需 ${n} 個*；這麼大的樣本建議改以其他方式（例如製程管制或累積數據）證明。`;
    else if (d === "one" && crit) {
      if (alt === "less") rule = crit.lo >= 0 ? `判定規則：測 ${n} 個，不良數 ≤ ${crit.lo} 個時，可宣稱不良率低於 ${fmt(100 * p0, 2)}%（實際 α = ${fmt(crit.size, 4)}）。` : `測 ${n} 個時，即使 0 個不良也無法宣稱低於 ${fmt(100 * p0, 2)}%。`;
      else if (alt === "greater") rule = crit.hi <= n ? `判定規則：測 ${n} 個，不良數 ≥ ${crit.hi} 個時，判定不良率高於 ${fmt(100 * p0, 2)}%（實際 α = ${fmt(crit.size, 4)}）。` : `測 ${n} 個時無法判定高於 p₀。`;
      else { const parts = [crit.lo >= 0 ? `≤ ${crit.lo}` : "", crit.hi <= n ? `≥ ${crit.hi}` : ""].filter(Boolean); rule = parts.length ? `判定規則：不良數 ${parts.join(" 或 ")} 時判定與 ${fmt(100 * p0, 2)}% 不同（實際 α = ${fmt(crit.size, 4)}）。` : `測 ${n} 個時無法判定與 ${fmt(100 * p0, 2)}% 不同。`; }
    }
    $("prOut").innerHTML = `<div class="verdict">${pill("sig", s === "n" ? "所需樣本數" : "檢定力")}
      <p class="bignum">${s === "n" ? (d === "one" ? n : `${n}<small>＋ ${n2}</small>`) : fmt(power, 3)}<small>${s === "n" ? (d === "one" ? "個" : "（第 1 組＋第 2 組）") : ""}</small></p>
      ${rule ? `<p>${esc(rule)}</p>` : ""}
      ${d === "one" && s === "n" && info.stable > info.n ? `<p class="hint">精確二項的檢定力會隨 n 鋸齒狀起伏：n = ${info.n} 已達目標，但部分較大的 n 會略低於目標；從 n = ${info.stable} 起（檢查到 ${info.checkedTo}）都不低於目標。保守做法可取 ${info.stable}*。</p>` : ""}</div>
      ${kv([[d === "one" ? "p₀" : "p₁", fmt(100 * p0, 3) + "%"], [d === "one" ? "p₁" : "p₂", fmt(100 * p1, 3) + "%"], ["α", a], ["檢定力", fmt(power, 4)], d === "two" ? ["樣本數比", ratio] : null])}
      <p class="hint">${d === "one" ? "單組用精確二項檢定（不用常態近似），不良率很低時也適用。" : "兩組用常態近似（H₀ 下用合併比例的變異，H₁ 下用各組變異）；預期不良數很少（例如每組 < 5 個）時近似不準，建議改用更大的樣本或精確方法*。"}</p>`;
    const ns = [...new Set([0.25, 0.5, 0.75, 1, 1.25, 1.5, 2].map(f => Math.max(2, Math.round(n * f))))];
    $("prTable").innerHTML = table([d === "one" ? "樣本數 n" : "第 1 組 n₁", "檢定力"].concat(d === "one" ? ["判定（允收不良數）", "實際 α"] : []), ns.map(m => { if (d === "one") { const r = SSE.prop1Power(p0, p1, m, a, alt); return [m === n ? `<b>${m}</b>` : m, fmt(r.power, 4), alt === "less" ? (r.lo >= 0 ? "≤ " + r.lo : "無法宣稱") : alt === "greater" ? (r.hi <= m ? "≥ " + r.hi : "無法判定") : ([r.lo >= 0 ? "≤ " + r.lo : "", r.hi <= m ? "≥ " + r.hi : ""].filter(Boolean).join(" 或 ") || "無法判定"), fmt(r.size, 4)]; } return [m === n ? `<b>${m}</b>` : m, fmt(SSE.prop2Power(p0, p1, m, a, alt, ratio), 4)]; }));
    $("prTableNote").textContent = "樣本數只是統計估算的下限，實際數量還需依風險、法規與公司程序決定。" + (d === "two" && ratio !== 1 ? "第 2 組樣本數以進位後的整數顯示，檢定力以 比例 × n₁ 計算（略偏保守）。" : "");
    $("prSheets").hidden = false;
    TQ.prop.ctx = [`不良率樣本數：${d === "one" ? "單組對目標值（精確二項檢定）" : "兩組比較（常態近似）"}；對立假設 ${alt}；α ${a}`,
      d === "one" ? `目標不良率 p0 ${fmt(100 * p0, 3)}%，預期實際 p1 ${fmt(100 * p1, 3)}%` : `第 1 組 ${fmt(100 * p0, 3)}%，第 2 組 ${fmt(100 * p1, 3)}%，樣本數比 ${ratio}`,
      `${s === "n" ? "所需樣本數" : "指定樣本數"} n ${d === "two" ? `${n}＋${n2}` : n}，檢定力 ${fmt(power, 4)}${s === "n" ? `（目標 ${tgt}）` : ""}`, rule, d === "one" && info.stable > info.n ? `鋸齒狀：n=${info.stable} 起都不低於目標` : ""].filter(Boolean).join("\n");
    toolChanged("sample");
  }
  $("prRun").addEventListener("click", prRun);
  // ---------- 允差區間樣本數 ----------
  const tpMethod = chipGroup("tpMethod", tpUI), tpSide = chipGroup("tpSide", tpUI);
  function tpUI() { const m = tpMethod(), sd = tpSide(); document.querySelectorAll(".tp-norm").forEach(e => { e.hidden = m !== "norm"; }); $("viewSample").querySelector(".tp-lsl").hidden = sd === "upper"; $("viewSample").querySelector(".tp-usl").hidden = sd === "lower"; }
  tpUI();
  $("tpEx").addEventListener("click", () => { setChip("tpMethod", "norm"); setChip("tpSide", "lower"); tpUI(); $("tpP").value = "0.99"; $("tpG").value = "0.95"; $("tpMu").value = "52"; $("tpSd").value = "1.8"; $("tpLsl").value = "45"; tpRun(); $("tpHint").textContent = "範例：黏合強度前期平均 52 N、標準差 1.8 N，規格下限 45 N（虛構數值）。"; });
  function tpRun() {
    const m = tpMethod(), side = tpSide(), p = +$("tpP").value, g = +$("tpG").value;
    const fail = x => { $("tpHint").innerHTML = `<span class="status ng">${x}</span>`; };
    const sideTxt = side === "two" ? "雙邊" : side === "lower" ? "單邊下限" : "單邊上限";
    if (m === "np") {
      const n = SSE.npTolN(p, g, side === "two" ? "two" : "one");
      $("tpHint").textContent = "";
      TQ.tolp = { m, side, p, g, n };
      $("tpTitle").textContent = "無母數允差區間";
      $("tpOut").innerHTML = `<div class="verdict">${pill("sig", "所需樣本數")}<p class="bignum">${n}<small>個</small></p>
        <p>測 ${n} 個，${side === "two" ? "最小值與最大值都在規格內" : side === "lower" ? "最小值不低於規格下限" : "最大值不超過規格上限"}時，可宣稱 ${fmt(100 * g, 0)}% 信心下至少 ${fmt(100 * p, 1)}% 的產品符合規格（不需要常態假設）。</p></div>
        ${kv([["方向", sideTxt], ["涵蓋比例", fmt(100 * p, 1) + "%"], ["信心水準", fmt(100 * g, 0) + "%"], ["實際達到的信心", fmt(100 * SSE.npConf(n, p, side === "two" ? "two" : "one"), 2) + "%"]])}
        <p class="hint">方法：以樣本的${side === "two" ? "最小值與最大值" : "極端值"}作為允差界限（Wilks 法）。所需數量通常比常態法多很多，但不用驗證常態性。</p>`;
      $("tpTableTitle").textContent = "不同涵蓋比例與信心水準所需樣本數";
      const P = [0.9, 0.95, 0.99, 0.999], Gs = [0.9, 0.95, 0.99];
      $("tpTable").innerHTML = table(["涵蓋比例 ＼ 信心"].concat(Gs.map(x => fmt(100 * x, 0) + "%")), P.map(pp => [fmt(100 * pp, 1) + "%"].concat(Gs.map(gg => { const v = SSE.npTolN(pp, gg, side === "two" ? "two" : "one"); return pp === p && gg === g ? `<b>${v}</b>` : v; }))));
      $("tpTableNote").textContent = sideTxt + "。";
      $("tpSheets").hidden = false;
      TQ.tolp.ctx = `允差區間樣本數（無母數 Wilks 法）：${sideTxt}，涵蓋 ${p}，信心 ${g}，所需 n=${n}`;
      toolChanged("sample"); return;
    }
    const mu = inNum("tpMu"), sd = inNum("tpSd"), lsl = inNum("tpLsl"), usl = inNum("tpUsl");
    if (mu == null || isNaN(mu) || !(sd > 0)) return fail("請填預期平均與標準差（標準差要大於 0）。");
    if (side !== "upper" && (lsl == null || isNaN(lsl))) return fail("請填規格下限。");
    if (side !== "lower" && (usl == null || isNaN(usl))) return fail("請填規格上限。");
    const kL = side !== "upper" ? (mu - lsl) / sd : Infinity, kU = side !== "lower" ? (usl - mu) / sd : Infinity, kMax = Math.min(kL, kU);
    if (!(kMax > 0)) return fail("預期平均已經超出規格，無法宣稱符合。");
    const r = SSE.tolN(p, g, side === "two" ? "two" : "one", kMax);
    $("tpHint").textContent = side === "two" && Math.abs(kL - kU) > 0.2 * Math.min(kL, kU) ? "提醒：平均不在規格中心，雙邊允差區間以較近的一側計算，結果偏保守*。" : "";
    TQ.tolp = { m, side, p, g, mu, sd, lsl, usl, kMax, n: r.n };
    $("tpTitle").textContent = "常態允差區間樣本數";
    if (!isFinite(r.n) && r.overMax) {
      $("tpOut").innerHTML = `<div class="verdict">${pill("bad", "超過 ${r.overMax} 個")}<p class="big">預期平均距離規格 ${fmt(kMax, 2)} 個標準差，只比理論下限 ${fmt(r.zLimit, 3)} 多一點，需要超過 ${r.overMax} 個樣本。</p><p>實務上建議先改善製程（拉開平均與規格的距離或降低變異），或改用其他證明方式*。</p></div>`;
      $("tpSheets").hidden = true; TQ.tolp.ctx = `允差區間樣本數（常態）：${sideTxt}，涵蓋 ${p}，信心 ${g}；μ ${mu}、σ ${sd}；k 上限 ${fmt(kMax, 3)}，需要超過 ${r.overMax} 個`; toolChanged("sample"); return;
    }
    if (!isFinite(r.n)) {
      $("tpOut").innerHTML = `<div class="verdict">${pill("bad", "無法達成")}<p class="big">預期平均距離規格只有 ${fmt(kMax, 2)} 個標準差，小於 ${fmt(r.zLimit, 3)}（涵蓋 ${fmt(100 * p, 1)}% 的最低要求），樣本再多也無法宣稱。</p><p>需要先改善製程（提高平均與規格的距離或降低變異），或重新評估規格與宣稱的比例*。</p></div>`;
      $("tpSheets").hidden = true; TQ.tolp.ctx = `允差區間樣本數（常態）：${sideTxt}，涵蓋 ${p}，信心 ${g}；μ ${mu}、σ ${sd}、規格 ${lsl ?? "—"}～${usl ?? "—"}；k 上限 ${fmt(kMax, 3)} 小於 z ${fmt(r.zLimit, 3)}，無法達成`; toolChanged("sample"); return;
    }
    const k = SSE.tolK(r.n, p, g, side === "two" ? "two" : "one");
    $("tpOut").innerHTML = `<div class="verdict">${pill("sig", "所需樣本數")}<p class="bignum">${r.n}<small>個</small></p>
      <p>若實際平均與標準差和預期相同，測 ${r.n} 個時允差因子 k = ${fmt(k, 3)} ≤ 允許的 ${fmt(kMax, 3)}，可宣稱 ${fmt(100 * g, 0)}% 信心下至少 ${fmt(100 * p, 1)}% 符合規格。</p>
      <p class="hint">實際樣本的平均與標準差會有抽樣誤差：標準差比預期大或平均較差時，仍可能不通過。建議保留餘裕（例如用偏大的 σ 估計）*。</p></div>
      ${kv([["方向", sideTxt], ["允許的 k（距規格幾個 σ）", fmt(kMax, 3)], ["n 個時的 k", fmt(k, 3)], ["涵蓋比例", fmt(100 * p, 1) + "%"], ["信心水準", fmt(100 * g, 0) + "%"]])}`;
    $("tpTableTitle").textContent = "不同樣本數的允差因子 k";
    const ns = [...new Set([5, 10, 15, 20, 30, 40, 50, 60, 80, 100, r.n].filter(x => x >= 3))].sort((x, y) => x - y);
    $("tpTable").innerHTML = table(["樣本數 n", "允差因子 k", `可宣稱的界限（μ ${side === "upper" ? "+" : "−"} k·σ）`, "是否符合"], ns.map(n => { const kk = SSE.tolK(n, p, g, side === "two" ? "two" : "one"), ok = kk <= kMax; return [n === r.n ? `<b>${n}</b>` : n, fmt(kk, 3), side === "two" ? `${nf(mu - kk * sd, 5)} ～ ${nf(mu + kk * sd, 5)}` : nf(side === "upper" ? mu + kk * sd : mu - kk * sd, 5), ok ? `<span class="status ok">符合</span>` : `<span class="status ng">不符合</span>`]; }));
    $("tpTableNote").textContent = `以預期 μ = ${mu}、σ = ${sd} 計算。允差因子：單邊用非中心 t 精確解，雙邊用精確積分（與假設檢定的允差區間相同）。`;
    $("tpSheets").hidden = false;
    TQ.tolp.ctx = `允差區間樣本數（常態）：${sideTxt}，涵蓋 ${p}，信心 ${g}；預期 μ ${mu}、σ ${sd}、規格 ${lsl ?? "—"}～${usl ?? "—"}；允許 k ${fmt(kMax, 3)}；所需 n=${r.n}（k=${fmt(k, 3)}）；假設實際 μ、σ 與預期相同`;
    toolChanged("sample");
  }
  $("tpRun").addEventListener("click", tpRun);
  // ---------- DOE 重複次數 ----------
  const DR = { f2: [4, 3, "全因子 2²：模型含全部 3 項（2 主效應＋1 交互作用）"], f3: [8, 7, "全因子 2³：模型含全部 7 項（與 DOE 分頁有重複時的分析相同）"], f4: [16, 15, "全因子 2⁴：模型含全部 15 項"], f5: [32, 31, "全因子 2⁵：模型含全部 31 項"], r8: [8, 7, "8 次部分因子：所有可估計的 7 個效應（含別名）"], r16: [16, 15, "16 次部分因子：所有可估計的 15 個效應"], pb: [12, 7, "PB 12 次：只估主效應，項數＝因子數（這裡預設 7）"], custom: [8, 7, "自訂：填入每次重複的實驗次數與模型項數"] };
  function drDesignUI() { const d = DR[$("drDesign").value]; $("drRuns").value = d[0]; $("drTerms").value = d[1]; $("drTermsHelp").textContent = d[2]; $("drRuns").disabled = $("drDesign").value !== "custom"; }
  $("drDesign").addEventListener("change", drDesignUI); drDesignUI();
  function drRun() {
    const runs = parseInt($("drRuns").value, 10), terms = parseInt($("drTerms").value, 10), cp = parseInt($("drCp").value, 10) || 0;
    const sd = inNum("drSd"), delta = inNum("drDelta"), tgt = +$("drTarget").value, a = +$("drAlpha").value;
    const fail = m => { $("drHint").innerHTML = `<span class="status ng">${m}</span>`; };
    if (!(runs >= 4) || !(terms >= 1)) return fail("實驗次數至少 4、模型項數至少 1。");
    if (!(cp >= 0)) return fail("中心點數不能是負數。");
    if (terms > runs - 1) return fail(`模型項數不能超過 ${runs - 1}（每次重複的實驗次數 − 1）。`);
    if (!(sd > 0) || !(delta > 0)) return fail("請填標準差與要偵測的效應（都要大於 0）。");
    const r = SSE.doeReps(runs, terms, delta, sd, a, tgt, cp, 50);
    $("drHint").textContent = "";
    TQ.doer = { runs, terms, cp, sd, delta, tgt, a, r };
    $("drTitle").textContent = "DOE 重複次數";
    const rows = []; for (let k = 1; k <= Math.max(6, (r || 0) + 1); k++) { const p = SSE.doePower(runs, k, terms, delta, sd, a, cp); rows.push([k === r ? `<b>${k}</b>` : k, p.N, p.df, isFinite(p.power) ? fmt(p.power, 4) : "無誤差自由度"]); }
    $("drOut").innerHTML = `<div class="verdict">${pill(isFinite(r) ? "sig" : "bad", isFinite(r) ? "建議重複次數" : "50 次內達不到")}
      <p class="bignum">${isFinite(r) ? r : "—"}<small>${isFinite(r) ? `次（共 ${runs * r + cp} 次實驗）` : ""}</small></p>
      <p>偵測效應 Δ = ${nf(delta, 4)}（Δ/σ = ${fmt(delta / sd, 2)}），目標檢定力 ${tgt}。</p></div>
      ${kv([["每次重複", runs + " 次"], ["模型項數", terms], ["中心點", cp], ["σ", nf(sd, 4)], ["Δ", nf(delta, 4)], ["α", a]])}
      <p class="hint">方法：效應的 t 檢定（非中心 t），誤差自由度 = 總次數 − 1 − 模型項數。不重複且模型用滿所有項時沒有誤差自由度，只能用 Lenth 法等替代判斷*。${cp > 0 ? "有中心點時，部分軟體會在模型加一個曲率項（多用 1 個自由度）*；保守起見可把模型項數加 1。" : ""}</p>`;
    $("drTable").innerHTML = table(["重複次數", "總實驗次數", "誤差自由度", "檢定力"], rows);
    $("drSheets").hidden = false;
    TQ.doer.ctx = `DOE 重複次數：每次重複 ${runs} 次實驗、模型 ${terms} 項、中心點 ${cp}；σ ${sd}、Δ ${delta}（Δ/σ ${fmt(delta / sd, 3)}）、α ${a}、目標檢定力 ${tgt}；建議重複 ${isFinite(r) ? r : "50 次內達不到"}\n` + rows.map(x => `r=${String(x[0]).replace(/<\/?b>/g, "")}：N=${x[1]}，df=${x[2]}，檢定力 ${x[3]}`).join("；");
    toolChanged("sample");
  }
  $("drRun").addEventListener("click", drRun);
  // ---------- 其他工具建議數量 ----------
  $("ssGuide").innerHTML = table(["工具", "建議數量", "說明", "依據"], [
    ["MSA · Gage R&R", "10 件零件 × 2～3 位操作員 × 2～3 次", "零件要涵蓋製程變異範圍，否則 %GRR 與 ndc 會失真", "AIAG MSA 第 4 版常用安排"],
    ["MSA · 計數型一致性", "約 50 件 × 3 位評估員 × 3 次", "樣品要包含接近判定邊界的件", "AIAG MSA 第 4 版範例*"],
    ["MSA · 偏差", "同一標準件 ≥ 10 次", "", "AIAG MSA 第 4 版"],
    ["MSA · 線性", "≥ 5 個參考件，每件 ≥ 10 次", "參考值涵蓋量測範圍", "AIAG MSA 第 4 版*"],
    ["MSA · 穩定性", "每個時間點 3～5 次，20～25 個時間點", "", "常見做法*"],
    ["SPC · 建立管制界限", "20～25 個子組（約 100 個以上的值）", "製程穩定後再計算界限", "AIAG SPC 手冊"],
    ["SPC · 製程能力", "≥ 100 個值", "樣本少時 Cpk 的信賴區間很寬", "常見做法*"],
    ["DOE", "用本頁「DOE 重複次數」計算", "", "—"],
    ["田口方法 · 確認實驗", "≥ 1 組；建議 3 組以上", "用來確認預測值是否落在區間內", "常見做法*"]
  ].map(r => r.map(esc)));
