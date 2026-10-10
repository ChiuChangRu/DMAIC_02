
  // =====================================================================
  // 田口方法 介面（計算在 taguchi.js：window.TG）
  // =====================================================================
  const TGE = window.TG;
  const TG_HELP = {
    larger: "望大：越大越好（例如拉脫力、破裂壓力、接合強度）。S/N = −10·log(Σ(1/y²)／n)。",
    smaller: "望小：越小越好、理想值為 0（例如摩擦力、殘留量、洩漏量、毛邊）。S/N = −10·log(Σy²／n)。",
    nominal: "望目：有目標值（例如尺寸、塗層厚度、藥液劑量）。先用 S/N 降低變異，再用調整因子把平均拉到目標。",
    dynamic: "動態特性：輸出要隨輸入訊號成比例變化（例如流量設定→實際流量、推桿位移→輸出壓力）。看靈敏度 β 與 S/N（線性與穩定性）。"
  };
  const tgF = []; for (let i = 0; i < 15; i++) tgF.push({ name: "因子 " + TGE.LETTERS[i], L: 2, lab: ["水準 1", "水準 2", "水準 3"] });
  const tgNoise = ["N1 不利條件", "N2 有利條件", "N3", "N4"];
  let tg = null;
  const tgType = chipGroup("tgType", v => tgTypeUI(v));
  function tgTypeUI(v) {
    v = v || tgType();
    $("tgTypeHelp").textContent = TG_HELP[v];
    $("tgNomF").hidden = v !== "nominal"; $("tgDynF").hidden = v !== "dynamic";
    $("tgTargetF").hidden = !(v === "nominal" || v === "dynamic");
    $("tgTargetLab").textContent = v === "dynamic" ? "目標 β（靈敏度，選填）" : "目標值（選填，用來選調整因子的水準）";
  }
  $("tgK").innerHTML = Array.from({ length: 14 }, (_, i) => i + 2).map(k => `<option value="${k}"${k === 4 ? " selected" : ""}>${k}</option>`).join("");
  function tgLevels() { return tgF.slice(0, +$("tgK").value).map(f => f.L); }
  function tgArrOptions() {
    const lv = tgLevels(), sug = TGE.suggest(lv), cur = $("tgArr").value;
    $("tgArr").innerHTML = `<option value="auto">自動（${sug ? sug : "沒有適合的直交表"}）</option>` + Object.values(TGE.ARR).map(a => `<option value="${a.name}">${a.name}（${a.runs} 次；${a.levels.every(l => l === 2) ? a.levels.length + " 欄 2 水準" : a.name === "L9" ? "4 欄 3 水準" : "1 欄 2 水準 + 7 欄 3 水準"}）</option>`).join("");
    $("tgArr").value = [...$("tgArr").options].some(o => o.value === cur) ? cur : "auto";
  }
  function tgFactorsUI() {
    const k = +$("tgK").value;
    $("tgFactors").innerHTML = `<div class="tg-frow tg-fhead"><span>代號</span><span>控制因子（含單位）</span><span>水準數</span><span>水準 1</span><span>水準 2</span><span>水準 3</span></div>` + tgF.slice(0, k).map((f, i) => `<div class="tg-frow"><b>${TGE.LETTERS[i]}</b><input type="text" data-tf="${i}" data-k="name" value="${esc(f.name)}" aria-label="因子 ${TGE.LETTERS[i]} 名稱"><select data-tf="${i}" data-k="L" aria-label="因子 ${TGE.LETTERS[i]} 水準數"><option value="2"${f.L === 2 ? " selected" : ""}>2</option><option value="3"${f.L === 3 ? " selected" : ""}>3</option></select>${[0, 1, 2].map(l => `<input type="text" data-tf="${i}" data-k="lab" data-l="${l}" value="${esc(f.lab[l])}" aria-label="因子 ${TGE.LETTERS[i]} 水準 ${l + 1}"${l === 2 && f.L === 2 ? " disabled" : ""}>`).join("")}</div>`).join("");
    tgInterUI(); tgArrOptions(); tgGenHint();
  }
  function tgInterUI() {
    const k = +$("tgK").value, lv = tgLevels(), all2 = lv.every(l => l === 2);
    const prev = new Set([...$("tgInter").querySelectorAll("input:checked")].map(x => x.value));
    $("tgInterBox").hidden = !all2;
    if (!all2) { $("tgInter").innerHTML = ""; return; }
    const pairs = []; for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) pairs.push([i, j]);
    $("tgInter").innerHTML = pairs.map(([i, j]) => `<label class="chk"><input type="checkbox" value="${i},${j}"${prev.has(i + "," + j) ? " checked" : ""}> ${TGE.LETTERS[i]}×${TGE.LETTERS[j]}（${esc(tgF[i].name)} × ${esc(tgF[j].name)}）</label>`).join("");
  }
  function tgInterSel() { return [...$("tgInter").querySelectorAll("input:checked")].map(x => x.value.split(",").map(Number)); }
  $("tgFactors").addEventListener("input", e => {
    const t = e.target.closest("[data-tf]"); if (!t) return; const f = tgF[+t.dataset.tf];
    if (t.dataset.k === "name") f.name = t.value; else if (t.dataset.k === "lab") f.lab[+t.dataset.l] = t.value;
    if (tg) tgMatrixLabels();
  });
  $("tgFactors").addEventListener("change", e => { const t = e.target.closest('[data-k="L"]'); if (!t) return; tgF[+t.dataset.tf].L = +t.value; tgFactorsUI(); });
  $("tgK").addEventListener("change", tgFactorsUI);
  $("tgArr").addEventListener("change", tgGenHint);
  $("tgInter").addEventListener("change", tgGenHint);
  function tgNoiseUI() { const n = +$("tgNoiseN").value; $("tgNoiseNames").innerHTML = tgNoise.slice(0, n).map((x, i) => `<input type="text" data-tn="${i}" value="${esc(x)}" aria-label="雜音條件 ${i + 1} 名稱">`).join(""); }
  $("tgNoiseNames").addEventListener("input", e => { const t = e.target.closest("[data-tn]"); if (t) { tgNoise[+t.dataset.tn] = t.value; if (tg) tgMatrix(); } });
  $("tgNoiseN").addEventListener("change", tgNoiseUI);
  function tgPlan() {
    const lv = tgLevels(), inter = tgInterSel(), sel = $("tgArr").value;
    let arr = sel === "auto" ? TGE.suggest(lv) : sel;
    if (!arr) return { error: "沒有適合的直交表：2 水準最多 15 個因子；3 水準最多 7 個（L18，可再加 1 個 2 水準因子）；L9 只能放 3 水準因子。" };
    if (sel === "auto" && inter.length) { // need room for interactions: try bigger 2-level arrays
      for (const a of ["L4", "L8", "L16"]) { if (TGE.ARR[a].levels.length < lv.length + inter.length) continue; const t = TGE.assign(a, lv, inter); if (!t.error) { arr = a; break; } }
    }
    const as = TGE.assign(arr, lv, inter);
    return as;
  }
  function tgGenHint() {
    const p = tgPlan();
    $("tgGenHint").innerHTML = p.error ? `<span class="status ng">${esc(p.error)}</span>` : `${p.array}：${TGE.ARR[p.array].runs} 組實驗 × ${$("tgNoiseN").value} 個雜音條件${tgType() === "dynamic" ? " × " + tgSignals().length + " 個訊號水準" : ""}。` + (TGE.ARR[p.array].note ? " " + TGE.ARR[p.array].note : "");
  }
  function tgSignals() { return String($("tgSignals").value).split(/[,，\s]+/).filter(Boolean).map(num); }
  tgTypeUI("larger"); tgFactorsUI(); tgNoiseUI(); tgGenHint();
  function tgGenerate(keepY) {
    const p = tgPlan(); if (p.error) { $("tgGenHint").innerHTML = `<span class="status ng">${esc(p.error)}</span>`; return false; }
    const type = tgType();
    let signals = null;
    if (type === "dynamic") { signals = tgSignals(); if (signals.length < 2 || signals.length > 5 || signals.some(v => isNaN(v))) { $("tgGenHint").innerHTML = `<span class="status ng">訊號水準要 2～5 個數字。</span>`; return false; } if (signals.every(v => v === signals[0])) { $("tgGenHint").innerHTML = `<span class="status ng">訊號水準不能全部相同。</span>`; return false; } }
    tg = { design: { array: p.array, cols: p.cols, inter: p.inter }, k: +$("tgK").value, type, signals, noiseN: +$("tgNoiseN").value, y: keepY || {}, poolSN: null, poolM: null };
    TQ.tg = null; $("tgSheets").hidden = true; $("tgTitle").textContent = "尚未分析"; $("tgOut").innerHTML = `<p class="help">填入結果後按「分析」。</p>`;
    tgMatrix(); tgGenHint();
    if (p.inter.length) $("tgGenHint").textContent += " 交互作用欄：" + p.inter.map(x => `${TGE.LETTERS[x.a]}×${TGE.LETTERS[x.b]} 在第 ${x.col + 1} 欄`).join("、") + "。";
    return true;
  }
  function tgCols() { // data columns per run
    const out = [];
    if (tg.type === "dynamic") tg.signals.forEach((m, s) => { for (let k = 0; k < tg.noiseN; k++) out.push({ s, k, label: `M${s + 1}=${nf(m, 4)}·${tgNoise[k].split(/\s/)[0]}` }); });
    else for (let k = 0; k < tg.noiseN; k++) out.push({ k, label: tgNoise[k] });
    return out;
  }
  function tgMatrix() {
    const A = TGE.ARR[tg.design.array], cols = tgCols();
    const head = ["組"].concat(tgF.slice(0, tg.k).map((f, i) => `<span data-th="${i}">${esc(TGE.LETTERS[i] + " " + f.name)}</span>`), cols.map(c => esc(c.label)));
    $("tgMatrix").innerHTML = table(head, A.matrix.map((row, r) => [r + 1].concat(tg.design.cols.map((c, f) => `<span data-tc="${f}" data-l="${row[c]}">${esc(tgF[f].lab[row[c] - 1])}</span>`), cols.map((c, j) => `<input type="number" step="any" inputmode="decimal" data-tr="${r}" data-tj="${j}" value="${tg.y[r + "_" + j] ?? ""}" aria-label="第 ${r + 1} 組 ${esc(c.label)}">`))));
    $("tgDataHelp").textContent = tg.type === "dynamic" ? `每組實驗依表中水準設定，在每個訊號水準 M 與雜音條件下各量一次（共 ${cols.length} 個值）。` : `每組實驗依表中水準設定，在各雜音條件下量測並填入（共 ${cols.length} 個值）。實驗順序建議隨機。`;
  }
  function tgMatrixLabels() { $("tgMatrix").querySelectorAll("[data-tc]").forEach(s => { s.textContent = tgF[+s.dataset.tc].lab[+s.dataset.l - 1]; }); $("tgMatrix").querySelectorAll("[data-th]").forEach(s => { const i = +s.dataset.th; s.textContent = TGE.LETTERS[i] + " " + tgF[i].name; }); }
  $("tgMatrix").addEventListener("input", e => { const t = e.target.closest("[data-tr]"); if (t && tg) tg.y[t.dataset.tr + "_" + t.dataset.tj] = t.value; });
  $("tgGen").addEventListener("click", () => tgGenerate());
  $("tgPasteBtn").addEventListener("click", () => {
    if (!tg) { $("tgHint").textContent = "請先產生直交表。"; return; }
    const p = parseNumRows($("tgPaste").value); if (p.error) { $("tgHint").innerHTML = `<span class="status ng">${p.error}</span>`; return; }
    const runs = TGE.ARR[tg.design.array].runs, nc = tgCols().length;
    if (p.rows.length !== runs || p.rows.some(r => r.length !== nc)) { $("tgHint").innerHTML = `<span class="status ng">要貼 ${runs} 列、每列 ${nc} 個數值。目前是 ${p.rows.length} 列。</span>`; return; }
    p.rows.forEach((r, i) => r.forEach((v, j) => { tg.y[i + "_" + j] = String(v); })); tgMatrix(); $("tgHint").textContent = "已帶入。";
  });
  // ---- 從魚骨圖帶入 ----
  $("tgFromFb").addEventListener("click", () => {
    const box = $("tgFbPick"), list = (typeof fb !== "undefined" ? fb.factors : []).filter(f => f.st === "use");
    if (!box.hidden) { box.hidden = true; return; }
    box.hidden = false;
    if (!list.length) { box.innerHTML = `<p class="hint">魚骨圖還沒有「採用」的原因。先到魚骨圖決定採用哪些原因，再回來帶入。</p>`; return; }
    box.innerHTML = `<p class="help">選擇每個原因在實驗中的角色：控制因子（可以設定水準）或雜音因子（難以控制，用雜音條件模擬）。</p>` + list.map((f, i) => `<div class="tg-fbrow"><span>${esc(f.text)}</span><select data-fbi="${i}"><option value="ctl">控制因子</option><option value="noise">雜音因子</option><option value="no">不用</option></select></div>`).join("") + `<div class="run-row"><button class="btn small" type="button" id="tgFbApply">帶入</button></div>`;
    $("tgFbApply").addEventListener("click", () => {
      const roles = [...box.querySelectorAll("[data-fbi]")].map(s => ({ f: list[+s.dataset.fbi], r: s.value }));
      const ctl = roles.filter(x => x.r === "ctl").map(x => x.f.text), noise = roles.filter(x => x.r === "noise").map(x => x.f.text);
      if (ctl.length) { ctl.slice(0, 15).forEach((t, i) => { tgF[i].name = t; }); $("tgK").value = String(Math.max(2, Math.min(15, ctl.length))); tgFactorsUI(); }
      if (noise.length) $("tgNoiseDesc").value = "雜音因子：" + noise.join("、") + "。N1＝各雜音因子的不利組合；N2＝有利組合。";
      box.hidden = true;
      $("tgGenHint").textContent = `已帶入 ${ctl.length} 個控制因子${noise.length ? "、" + noise.length + " 個雜音因子" : ""}。請填入各因子的水準後產生直交表。`;
    });
  });
  // ---- 範例 ----
  document.querySelectorAll("[data-tgex]").forEach(b => b.addEventListener("click", () => tgExample(b.dataset.tgex)));
  function tgExample(kind) {
    const jit = [0.4, -0.3, 0.2, -0.5, 0.3, 0.1, -0.2, 0.5, -0.4, 0.2, -0.1, 0.3, -0.3, 0.4, -0.2, 0.1, 0.2, -0.4];
    if (kind === "static") {
      setChip("tgType", "larger"); tgTypeUI("larger"); $("tgY").value = "拉脫力 (N)";
      [["UV 照度 (mW/cm²)", 3, ["50", "100", "150"]], ["照射時間 (s)", 3, ["10", "20", "30"]], ["膠量 (mg)", 3, ["2", "3", "4"]], ["表面處理", 3, ["無", "IPA 擦拭", "電漿"]]].forEach((x, i) => { tgF[i].name = x[0]; tgF[i].L = x[1]; tgF[i].lab = x[2].slice(); });
      $("tgK").value = "4"; tgFactorsUI(); $("tgArr").value = "auto"; $("tgNoiseN").value = "2"; tgNoise[0] = "N1 舊批零件＋照度衰減"; tgNoise[1] = "N2 新批零件＋新燈管"; tgNoiseUI();
      $("tgNoiseDesc").value = "N1＝舊批零件（表面能較低）＋燈管照度衰減 20%；N2＝新批零件＋新燈管。";
      if (!tgGenerate()) return;
      TGE.ARR.L9.matrix.forEach((row, r) => { const [a, b, c, d] = row.map(v => v - 1); const mu = 38 + 3 * a + 0.8 * b + 0.3 * c + [0, 1, 1.5][d], sp = 16 - 6 * d - c; tg.y[r + "_0"] = (mu - sp / 2 + 0.3 * jit[r]).toFixed(1); tg.y[r + "_1"] = (mu + sp / 2 - 0.3 * jit[r + 1]).toFixed(1); });
      tgMatrix(); tgRun(); $("tgHint").textContent = "範例：UV 膠接合拉脫力，L9 × 2 個雜音條件（虛構數值）。";
    } else {
      setChip("tgType", "dynamic"); tgTypeUI("dynamic"); $("tgY").value = "實際流量 (mL/s)"; $("tgSigName").value = "流量設定 (mL/s)"; $("tgSignals").value = "1, 3, 5"; $("tgTarget").value = "1"; $("tgDynFormula").value = "std";
      [["管路內徑 (mm)", ["2.5", "3.0"]], ["滾輪壓力", ["低", "高"]], ["馬達加減速參數", ["標準", "平滑"]], ["管材硬度 (Shore A)", ["60", "70"]]].forEach((x, i) => { tgF[i].name = x[0]; tgF[i].L = 2; tgF[i].lab = x[1].concat(["水準 3"]); });
      $("tgK").value = "4"; tgFactorsUI(); $("tgArr").value = "auto"; $("tgNoiseN").value = "2"; tgNoise[0] = "N1 低溫 15°C 高黏度"; tgNoise[1] = "N2 高溫 30°C 低黏度"; tgNoiseUI();
      $("tgNoiseDesc").value = "N1＝低溫 15°C＋高黏度藥液＋管路使用 72 小時；N2＝高溫 30°C＋低黏度藥液＋新管路。";
      if (!tgGenerate()) return;
      const M = [1, 3, 5];
      TGE.ARR.L8.matrix.forEach((row, r) => { const lv = tg.design.cols.map(c => row[c] - 1); const beta = 0.88 + 0.10 * lv[0] + 0.03 * lv[1], d = 0.10 - 0.06 * lv[1] - 0.025 * lv[3];
        M.forEach((m, s) => { tg.y[r + "_" + (2 * s)] = (beta * m * (1 - d) + jit[(r + s) % 18] * 0.05).toFixed(3); tg.y[r + "_" + (2 * s + 1)] = (beta * m * (1 + d) + jit[(r + s + 5) % 18] * 0.05).toFixed(3); }); });
      tgMatrix(); tgRun(); $("tgHint").textContent = "範例：輸液幫浦流量，L8 × 3 個流量設定 × 2 個雜音條件（虛構數值）。";
    }
  }
  // ---- 分析 ----
  function tgRespForRun(vals) { // vals: array per data column for one run
    if (tg.type === "dynamic") { const Y = tg.signals.map((_, s) => vals.filter((_, j) => tgCols()[j].s === s)); const d = TGE.snDynamic(tg.signals, Y, $("tgDynFormula").value); return { sn: d.sn, m: d.beta, extra: d }; }
    const t = tg.type === "nominal" ? $("tgNom").value : tg.type;
    return { sn: TGE.snStatic(vals, t), m: vals.reduce((a, b) => a + b, 0) / vals.length };
  }
  function tgRun() {
    if (!tg) { $("tgHint").textContent = "請先產生直交表。"; return; }
    const runs = TGE.ARR[tg.design.array].runs, nc = tgCols().length, Y = [], miss = [];
    for (let r = 0; r < runs; r++) { const row = []; for (let j = 0; j < nc; j++) { const v = num(tg.y[r + "_" + j] ?? ""); if (isNaN(v)) miss.push(r + 1); row.push(v); } Y.push(row); }
    const fail = m => { $("tgHint").innerHTML = `<span class="status ng">${m}</span>`; };
    if (miss.length) return fail(`還有 ${miss.length} 個結果沒填（第 ${[...new Set(miss)].slice(0, 8).join("、")} 組${miss.length > 8 ? "…" : ""}）。`);
    const type = tg.type, nomT = $("tgNom").value;
    if (type === "nominal" && tg.noiseN < 2) return fail("望目需要每組至少 2 個值才能估計變異，請把雜音條件數設為 2 以上。");
    if (type === "larger" && Y.some(r => r.some(v => v <= 0))) return fail("望大特性的數值要大於 0。");
    if (type === "smaller" && Y.some(r => r.some(v => v < 0))) return fail("望小特性的數值不能是負數（理想值為 0）。");
    const R = Y.map(tgRespForRun);
    const bad = R.findIndex(x => !isFinite(x.sn));
    if (bad >= 0) {
      const v = Y[bad], x = R[bad];
      const why = type === "dynamic" ? (x.extra && !(x.extra.Ve > 0) ? "輸出與訊號完全成比例、沒有任何誤差（Ve = 0），可能是數據過於理想或量測解析度不足" : "靈敏度 β 太小、雜訊大於訊號（Sβ − Ve ≤ 0），標準式無法取對數；請檢查數據，或改用 β²／Ve 公式")
        : type === "nominal" && nomT === "nominal" ? (Math.abs(v.reduce((a, b) => a + b, 0)) < 1e-12 ? "平均為 0，10·log(ȳ²/s²) 無法計算；可改用 −10·log(s²)" : "各雜音條件下數值完全相同（變異為 0），可能是量測解析度不足")
        : type === "nominal" ? "各雜音條件下數值完全相同（變異為 0），可能是量測解析度不足"
        : type === "smaller" ? "所有數值都是 0（已達理想值），S/N 為無限大" : "數值不適用";
      return fail(`第 ${bad + 1} 組的 S/N 無法計算：${why}。`);
    }
    $("tgHint").textContent = "";
    const levels = tgF.slice(0, tg.k).map(f => f.L);
    const anSN = TGE.analyze(tg.design, levels, R.map(x => x.sn), { pool: tg.poolSN || "auto" });
    const anM = TGE.analyze(tg.design, levels, R.map(x => x.m), { pool: tg.poolM || "auto" });
    // 模型項：未併入且 p < 0.10（田口常用 90% 信心水準*）；誤差仍用 ANOVA 的誤差項
    const SIG = 0.10, mSN = TGE.model(anSN, SIG), mM = TGE.model(anM, SIG);
    // step 1: S/N
    const snBest = TGE.optimize(mSN, levels, "max");
    const lv = snBest.lv.slice();
    const inSN = f => mSN.terms.some(t => !t.pooled && (t.kind === "factor" ? t.f === f : t.a === f || t.b === f));
    const inM = f => mM.terms.some(t => !t.pooled && (t.kind === "factor" ? t.f === f : t.a === f || t.b === f));
    levels.forEach((L, f) => { if (!inSN(f)) { const m = anSN.terms[f].means; lv[f] = 1 + m.indexOf(Math.max(...m)); } });
    const role = levels.map((_, f) => inSN(f) ? "sn" : inM(f) && (type === "nominal" || type === "dynamic") ? "adjust" : inM(f) ? "mean" : "free");
    // step 2: adjust
    const target = inNum("tgTarget");
    let adjNote = "";
    if ((type === "nominal" || type === "dynamic") && target != null && !isNaN(target)) {
      const fixed = levels.map((_, f) => role[f] === "adjust" ? 0 : lv[f]);
      if (fixed.some(v => v === 0)) { const o = TGE.optimize(mM, levels, "target", target, fixed); o.lv.forEach((v, f) => { if (role[f] === "adjust") lv[f] = v; }); adjNote = `調整因子已選擇讓${type === "dynamic" ? " β" : "平均"}最接近目標 ${target} 的水準。`; }
      else adjNote = "沒有找到調整因子（只影響平均、不影響 S/N 的因子），無法在不犧牲 S/N 的情況下把平均拉到目標。";
    } else if (type === "larger" || type === "smaller") {
      levels.forEach((L, f) => { if (role[f] === "mean") { const m = anM.terms[f].means; lv[f] = 1 + m.indexOf(type === "larger" ? Math.max(...m) : Math.min(...m)); } });
    }
    TQ.tg = { anSN, anM, mSN, mM, SIG, R, Y, lv, role, levels, type, nomT, target, adjNote, names: tgF.slice(0, tg.k).map(f => ({ name: f.name, lab: f.lab.slice(0, f.L) })), noise: tgNoise.slice(0, tg.noiseN), signals: tg.signals, design: tg.design, yName: $("tgY").value || "反應", cur: (TQ.tg && TQ.tg.cur && TQ.tg.cur.length === levels.length) ? TQ.tg.cur : levels.map(() => 1), confirm: (TQ.tg && TQ.tg.confirm) || {} };
    tgRender(); toolChanged("taguchi");
  }
  $("tgRun").addEventListener("click", () => { if (tg) { tg.poolSN = null; tg.poolM = null; } tgRun(); });
  const TG_TYPE = { larger: "望大", smaller: "望小", nominal: "望目", dynamic: "動態特性" };
  const ROLE = { sn: "穩健因子（影響 S/N）", adjust: "調整因子（只影響平均）", mean: "影響平均", free: "影響小（建議取 S/N 較高的水準；也可改選成本低或方便的水準）" };
  function tgRender() {
    const Q = TQ.tg, { anSN, anM, mSN, mM, lv, role, levels, type, names } = Q, A = TGE.ARR[Q.design.array];
    const mLab = type === "dynamic" ? "β（靈敏度）" : "平均";
    const snP = TGE.predict(mSN, lv), mP = TGE.predict(mM, lv);
    const ciS = TGE.predCI(mSN, snP.neff, 1), ciM = TGE.predCI(mM, mP.neff, 1);
    const curS = TGE.predict(mSN, Q.cur), gain = snP.pred - curS.pred;
    const lvTxt = lv.map((l, f) => `${TGE.LETTERS[f]} ${names[f].name} = ${names[f].lab[l - 1]}`);
    const snF = levels.map((_, f) => f).filter(f => role[f] === "sn"), adjF = levels.map((_, f) => f).filter(f => role[f] === "adjust");
    $("tgTitle").textContent = `田口 ${A.name}（${TG_TYPE[type]}${type === "nominal" ? "，" + (Q.nomT === "nominal" ? "10·log(ȳ²/s²)" : "−10·log(s²)") : ""}）`;
    const n0 = [];
    if (anSN.error.df >= 1 && !(anSN.error.ss > 0)) n0.push(["warn", "S/N 的誤差平方和為 0（數據過於理想或量測解析度不足），F 與 p 不可靠。"]);
    if (anSN.error.df < 1) n0.push(["warn", "S/N 的 ANOVA 沒有誤差自由度，無法判斷哪些因子重要；請在 ANOVA 表手動勾選要併入誤差的因子。"]);
    if (anSN.pooled.length && !Q.manualSN) n0.push(["info", "直交表的欄位全部用完、沒有誤差自由度，已依田口慣例把影響最小的項目併入誤差（併入自由度約為一半）*。可在 ANOVA 表調整。"]);
    if (!snF.length && anSN.error.df >= 1) n0.push(["warn", "沒有因子對 S/N 有顯著影響（p < 0.10）：建議條件只是依回應表選最高的水準，預測值等於總平均，可靠性低。可能是雜音條件差異不大、因子水準範圍太窄，或實驗次數不足*。"]);
    if (A.note) n0.push(["info", esc(A.note)]);
    $("tgOut").innerHTML = `<div class="verdict">${pill("sig", "建議條件")}
      <p class="big">${lvTxt.map(esc).join("、")}</p>
      <p>預測 S/N = <b>${fmt(snP.pred, 2)} dB</b>${ciS ? `（95% 區間 ±${fmt(ciS.ci1, 2)}）` : ""}；預測${mLab} = <b>${nf(mP.pred, 5)}</b>${ciM ? `（±${nf(ciM.ci1, 3)}）` : ""}。*需以確認實驗驗證。</p>
      ${isFinite(gain) && Math.abs(gain) > 1e-9 ? `<p>相對目前條件，S/N ${gain >= 0 ? "提高" : "降低"} ${fmt(Math.abs(gain), 2)} dB，相當於雜音造成的品質損失約為原本的 ${fmt(100 * Math.pow(10, -gain / 10), 0)}%*（目前條件可在下方「兩步驟最佳化」設定）。</p>` : ""}</div>
      ${kv([["直交表", A.name + "（" + A.runs + " 組）"], ["雜音條件", Q.noise.length + " 個"], ["穩健因子", snF.map(f => TGE.LETTERS[f]).join("、") || "無"], ["調整因子", adjF.map(f => TGE.LETTERS[f]).join("、") || "無"], ["S/N 誤差自由度", anSN.error.df]])}
      ${notes(n0)}`;
    // optimization sheet
    $("tgOpt").innerHTML = `<p class="help"><b>第 1 步</b>：用 S/N 選出讓產品對雜音最不敏感的水準（穩健因子）。<b>第 2 步</b>：${type === "nominal" || type === "dynamic" ? `用只影響${mLab}、不影響 S/N 的調整因子，把${mLab}拉到目標。${esc(Q.adjNote)}` : "望大／望小沒有調整步驟；不影響 S/N 的因子，選成本低或操作方便的水準即可。"}</p>
      <div class="scroll-x"><table>${table(["因子", "角色", "建議水準", "S/N 最佳水準", "目前條件"], levels.map((L, f) => { const m = anSN.terms[f].means, b = 1 + m.indexOf(Math.max(...m)); return [`<b>${TGE.LETTERS[f]}</b> ${esc(names[f].name)}`, esc(ROLE[role[f]]), `<b>${esc(names[f].lab[lv[f] - 1])}</b>`, esc(names[f].lab[b - 1]), `<select data-cur="${f}" aria-label="${esc(names[f].name)} 目前水準">${names[f].lab.map((t, l) => `<option value="${l + 1}"${Q.cur[f] === l + 1 ? " selected" : ""}>${esc(t)}</option>`).join("")}</select>`]; }))}</table></div>
      ${kv([["預測 S/N（建議條件）", fmt(snP.pred, 2) + " dB"], ["預測 S/N（目前條件）", fmt(curS.pred, 2) + " dB"], ["S/N 增益", fmt(gain, 2) + " dB"], ["預測" + mLab + "（建議）", nf(mP.pred, 5)], ["預測" + mLab + "（目前）", nf(TGE.predict(mM, Q.cur).pred, 5)], ["n_eff（S/N）", fmt(snP.neff, 2)]])}
      <p class="hint">角色判定：S/N ANOVA 中未併入且 p &lt; 0.10 的因子＝穩健因子；對 S/N 不顯著、但對${mLab}顯著（p &lt; 0.10）的因子＝調整因子。預測值只用這些顯著項（田口常用 90% 信心水準*），請配合工程知識確認。</p>`;
    $("tgOpt").querySelectorAll("[data-cur]").forEach(s => s.addEventListener("change", () => { Q.cur[+s.dataset.cur] = +s.value; tgRender(); }));
    // response tables
    const maxL = Math.max(...levels);
    const resp = (an, lab, d) => table([lab].concat(Array.from({ length: maxL }, (_, l) => "水準 " + (l + 1)), ["Delta", "排名"]), an.terms.filter(t => t.kind === "factor").map(t => [`<b>${TGE.LETTERS[t.f]}</b> ${esc(names[t.f].name)}`].concat(Array.from({ length: maxL }, (_, l) => l < t.means.length ? (t.means[l] === Math.max(...t.means) ? `<b>${fmt(t.means[l], d)}</b>` : fmt(t.means[l], d)) : "—"), [fmt(t.delta, d), t.rank])));
    $("tgRespSN").innerHTML = resp(anSN, "S/N 比 (dB)", 3);
    $("tgRespM").innerHTML = resp(anM, mLab, 4);
    // main effects
    const rng2 = an => { const v = [].concat(...an.terms.filter(t => t.kind === "factor").map(t => t.means)); return [Math.min(...v), Math.max(...v)]; };
    const ySN = rng2(anSN), yM = rng2(anM);
    $("tgMainSN").innerHTML = anSN.terms.filter(t => t.kind === "factor").map(t => lineCats({ cats: names[t.f].lab, series: [{ name: "S/N", values: t.means, color: role[t.f] === "sn" ? C.copper : C.teal }], ref: anSN.T, title: `S/N · ${TGE.LETTERS[t.f]} ${names[t.f].name}`, yRange: ySN, w: 240, h: 180 })).join("");
    $("tgMainM").innerHTML = anM.terms.filter(t => t.kind === "factor").map(t => lineCats({ cats: names[t.f].lab, series: [{ name: mLab, values: t.means, color: role[t.f] === "adjust" ? C.copper : C.navy }], ref: type === "dynamic" && Q.target != null && !isNaN(Q.target) ? Q.target : anM.T, title: `${mLab} · ${TGE.LETTERS[t.f]} ${names[t.f].name}`, yRange: yM, w: 240, h: 180 })).join("");
    // ANOVA
    const anovaT = (an, key) => {
      const rows = an.terms.map((t, i) => [`${t.kind === "factor" ? `<b>${t.name}</b> ${esc(names[t.f].name)}` : `<b>${esc(t.name)}</b>`}`, t.df, nf(t.ss, 5), nf(t.ms, 5), t.pooled ? "（併入）" : fmt(t.F, 3), t.pooled ? "" : fmtP(t.p), t.pooled ? "" : pc(t.rho, 1), `<input type="checkbox" data-pool="${key}" data-i="${i}"${t.pooled ? " checked" : ""} aria-label="把 ${esc(t.name)} 併入誤差">`]);
      rows.push(["誤差" + (an.pooled.length ? "（含併入）" : ""), an.error.df, nf(an.error.ss, 5), an.error.df > 0 ? nf(an.error.ms, 5) : "—", "", "", pc(an.error.rho, 1), ""], ["總計", an.dfT, nf(an.SST, 5), "", "", "", "100.0%", ""]);
      return table(["來源", "自由度", "SS", "MS", "F", "p", "貢獻率 ρ", "併入"], rows);
    };
    $("tgAnovaSN").innerHTML = anovaT(anSN, "sn"); $("tgAnovaMTitle").textContent = `ANOVA（${mLab}）`; $("tgAnovaM").innerHTML = anovaT(anM, "m");
    $("tgAnovaNote").textContent = `貢獻率 ρ = (SS − 自由度 × 誤差 MS) ÷ 總 SS。${anSN.resid.df > 0 ? `未使用的欄位提供 ${anSN.resid.df} 個誤差自由度。` : "直交表欄位全部用完，誤差只能靠併入。"}勾選「併入」可手動調整。小樣本下 p 值僅供參考；先把最小的項併入再做 F 檢定，會讓顯著性偏樂觀*。田口方法較重視貢獻率與回應表。預測區間的誤差另把 p ≥ 0.10、未進入模型的項也併入。`;
    document.querySelectorAll("#tgAnovaSN [data-pool], #tgAnovaM [data-pool]").forEach(cb => cb.addEventListener("change", () => {
      const key = cb.dataset.pool, list = [...document.querySelectorAll(`#tgAnova${key === "sn" ? "SN" : "M"} [data-pool]:checked`)].map(x => +x.dataset.i);
      if (key === "sn") { tg.poolSN = list; Q.manualSN = true; } else tg.poolM = list;
      const keep = { cur: Q.cur, confirm: Q.confirm, manualSN: Q.manualSN }; tgRun(); Object.assign(TQ.tg, keep); tgRender();
    }));
    // confirmation
    const cols = tgCols();
    $("tgConfirm").innerHTML = `<p class="help">在建議條件（${lvTxt.map(esc).join("、")}）下，用同樣的雜音條件${type === "dynamic" ? "與訊號水準" : ""}做確認實驗，填入結果：</p>
      <div class="tg-confirm">${cols.map((c, j) => `<label class="field"><span>${esc(c.label)}</span><input type="number" step="any" inputmode="decimal" data-cf="${j}" value="${Q.confirm[j] ?? ""}"></label>`).join("")}</div>
      <div class="run-row"><button class="btn small" type="button" id="tgConfBtn">比較預測與實際</button></div><div id="tgConfOut"></div>`;
    $("tgConfirm").querySelectorAll("[data-cf]").forEach(i => i.addEventListener("input", () => { Q.confirm[+i.dataset.cf] = i.value; }));
    $("tgConfBtn").addEventListener("click", () => tgConfirmRun(snP, mP, ciS, ciM, mLab));
    if (cols.every((_, j) => Q.confirm[j] != null && Q.confirm[j] !== "")) tgConfirmRun(snP, mP, ciS, ciM, mLab);
    // per-run table
    $("tgRunTable").innerHTML = table(["組"].concat(tg.design.cols.map((c, f) => TGE.LETTERS[f]), ["S/N (dB)", mLab]), Q.R.map((x, r) => [r + 1].concat(tg.design.cols.map(c => A.matrix[r][c]), [fmt(x.sn, 3), nf(x.m, 5)])));
    $("tgSheets").hidden = false;
    // AI context
    Q.ctx = [`田口方法：${A.name}（${A.runs} 組），品質特性 ${TG_TYPE[type]}${type === "nominal" ? "（" + (Q.nomT === "nominal" ? "10log(ȳ²/s²)" : "−10log(s²)") + "）" : ""}${type === "dynamic" ? `；訊號 ${$("tgSigName").value}：${Q.signals.join("、")}；S/N 公式 ${$("tgDynFormula").value === "std" ? "標準式（扣除 Ve）" : "β²/Ve"}` : ""}；反應變數 ${Q.yName}`,
      "控制因子：" + names.map((n, f) => `${TGE.LETTERS[f]} ${n.name}（${n.lab.join("／")}）`).join("；"),
      "雜音條件：" + Q.noise.join("、") + (($("tgNoiseDesc").value || "").trim() ? "；說明：" + $("tgNoiseDesc").value.trim() : ""),
      Q.design.inter.length ? "交互作用：" + Q.design.inter.map(x => `${TGE.LETTERS[x.a]}×${TGE.LETTERS[x.b]}`).join("、") : "未配置交互作用",
      "S/N 回應表：" + anSN.terms.filter(t => t.kind === "factor").map(t => `${t.name} ${t.means.map(v => fmt(v, 2)).join("/")}（Delta ${fmt(t.delta, 2)}，排名 ${t.rank}）`).join("；"),
      mLab + " 回應表：" + anM.terms.filter(t => t.kind === "factor").map(t => `${t.name} ${t.means.map(v => nf(v, 4)).join("/")}`).join("；"),
      "S/N ANOVA：" + anSN.terms.map(t => `${t.name}${t.pooled ? " 併入" : ` ρ ${pc(t.rho, 1)} p ${fmtP(t.p)}`}`).join("；") + `；誤差 df ${anSN.error.df}`,
      "預測使用的項（p < 0.10）：S/N " + (mSN.terms.filter(t => !t.pooled).map(t => t.name).join("、") || "無") + "；" + mLab + " " + (mM.terms.filter(t => !t.pooled).map(t => t.name).join("、") || "無"),
      "角色：" + levels.map((_, f) => `${TGE.LETTERS[f]} ${ROLE[role[f]]}`).join("；"),
      "建議條件：" + lvTxt.join("、") + `；預測 S/N ${fmt(snP.pred, 2)} dB${ciS ? " ±" + fmt(ciS.ci1, 2) : ""}，預測${mLab} ${nf(mP.pred, 5)}；目前條件 S/N ${fmt(curS.pred, 2)} dB，增益 ${fmt(gain, 2)} dB${Q.adjNote ? "；" + Q.adjNote : ""}`,
      Q.confText || ""].filter(Boolean).join("\n");
  }
  function tgConfirmRun(snP, mP, ciS, ciM, mLab) {
    const Q = TQ.tg, cols = tgCols(), vals = cols.map((_, j) => num(Q.confirm[j] ?? ""));
    if (vals.some(isNaN)) { $("tgConfOut").innerHTML = `<p class="hint"><span class="status ng">請填入全部 ${cols.length} 個確認實驗結果。</span></p>`; return; }
    const r = tgRespForRun(vals);
    if (!isFinite(r.sn)) { $("tgConfOut").innerHTML = `<p class="hint"><span class="status ng">確認實驗的 S/N 無法計算（變異為 0 或數值不適用）。</span></p>`; return; }
    const inS = ciS ? Math.abs(r.sn - snP.pred) <= ciS.ci2 : null, inM = ciM ? Math.abs(r.m - mP.pred) <= ciM.ci2 : null;
    $("tgConfOut").innerHTML = `${kv([["實際 S/N", fmt(r.sn, 2) + " dB"], ["預測 S/N", fmt(snP.pred, 2) + (ciS ? " ± " + fmt(ciS.ci2, 2) : "")], ["實際" + mLab, nf(r.m, 5)], ["預測" + mLab, nf(mP.pred, 5) + (ciM ? " ± " + nf(ciM.ci2, 3) : "")]])}
      ${notes([inS == null ? ["warn", "沒有誤差自由度，無法計算確認實驗的預測區間。"] : inS ? ["info", "實際 S/N 落在預測區間內：因子效果大致可加、結論有再現性。"] : ["warn", "實際 S/N 超出預測區間：可能有未配置的交互作用、雜音條件不足，或實驗條件與當初不同*。建議檢查後再實驗。"]])}
      <p class="hint">確認實驗區間 = ±√(F(0.05; 1, 誤差自由度) × 誤差 MS × (1/n_eff + 1/r))，r = 1（一組確認實驗）。</p>`;
    Q.confText = `確認實驗：實際 S/N ${fmt(r.sn, 2)} dB（預測 ${fmt(snP.pred, 2)}${ciS ? " ± " + fmt(ciS.ci2, 2) : ""}），實際${mLab} ${nf(r.m, 5)}（預測 ${nf(mP.pred, 5)}${ciM ? " ± " + nf(ciM.ci2, 3) : ""}）`;
    if (Q.ctx && !Q.ctx.includes("確認實驗：")) Q.ctx += "\n" + Q.confText; else if (Q.ctx) Q.ctx = Q.ctx.replace(/確認實驗：.*$/m, Q.confText);
    toolChanged("taguchi");
  }
