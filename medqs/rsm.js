  // =====================================================================
  // DOE：反應曲面（中心複合設計 CCD）——設計、二次模型、ANOVA（含失適性）、駐點、3D 曲面圖（色條＋底部等高線，可旋轉）
  // 計算在 coded 單位（−1／+1 = 低／高水準，±α = 軸點，0 = 中心）；顯示時換回實際單位。
  // =====================================================================
  (function rsmInit() {
    const tabs = $("doeTabs"), view = tabs && tabs.closest("[data-view]"); if (!view) return;
    const L = QQ.LETTERS;
    tabs.insertAdjacentHTML("beforeend", `<button type="button" role="tab" data-tsub="rsm" aria-selected="false">反應曲面（CCD）</button>`);
    const mixView = view.querySelector('[data-tview="mix"]');
    mixView.insertAdjacentHTML("afterend", `<div data-tview="rsm" hidden>
      <div class="grid">
        <main class="card">
          <div class="step">
            <span class="qref">STEP 1</span><h2 class="q">設計：中心複合設計（CCD）</h2>
            <p class="help">已經知道哪幾個因子重要（例如先做過因子設計），要找最佳點或看曲面時用。由 2 水準角點、軸點（±α）與中心點組成，可以估計二次（彎曲）效應。</p>
            <div class="fields">
              <div class="field"><label for="rsK">因子數</label><select autocomplete="off" id="rsK"><option value="2">2</option><option value="3" selected>3</option><option value="4">4</option><option value="5">5</option></select></div>
              <div class="field"><label for="rsAlpha">軸點距離 α</label><select autocomplete="off" id="rsAlpha"><option value="rot">可旋轉（α = (2^k)^¼）</option><option value="face">面心（α = 1，軸點在高低水準上）</option></select></div>
              <div class="field"><label for="rsC">中心點次數</label><input autocomplete="off" id="rsC" type="number" min="2" max="12" step="1" value="6" inputmode="numeric"></div>
              <div class="field"><label for="rsY">反應變數名稱</label><input autocomplete="off" id="rsY" type="text" value="反應"></div>
            </div>
            <div id="rsFactors" class="doe-factors"></div>
            <p class="hint" id="rsAxHint"></p>
            <div class="run-row"><button class="btn small" type="button" id="rsGen">產生實驗表</button><span class="hint" id="rsGenHint"></span></div>
          </div>
          <div class="step">
            <span class="qref copper">STEP 2</span><h2 class="q">填入結果並分析</h2>
            <div class="sim-row"><button type="button" class="btn small" id="rsSim">填入模擬數據（預測方程式＋隨機誤差）</button><span class="hint">先產生實驗表；每按一次換一組方程式與誤差</span></div>
            <p class="sim-badge" id="rsSimBadge" hidden></p><details class="sim-eq" id="rsSimEq" hidden><summary>模擬用的真實方程式（分析完再打開對答案）</summary><div class="sim-eq-b"></div></details>
            <div class="scroll-x"><table id="rsMatrix" class="doe-matrix"></table></div>
            <div class="fields">
              <div class="field"><label for="rsGoal">目標</label><select autocomplete="off" id="rsGoal"><option value="max">望大</option><option value="min">望小</option><option value="target">望目</option></select></div>
              <div class="field" id="rsTgtF" hidden><label for="rsTgt">目標值</label><input autocomplete="off" id="rsTgt" type="number" step="any" inputmode="decimal"></div>
            </div>
            <div class="run-row"><button class="btn primary" id="rsRun" type="button">分析</button><span class="hint" id="rsHint"></span></div>
          </div>
        </main>
        <aside class="card preview" data-ask="反應曲面結果"><div class="preview-head"><span class="filename"><span class="tag">RESULT</span> <b id="rsTitle">尚未分析</b></span><span class="ask-slot"></span></div><div class="preview-body" id="rsOut"><p class="help">產生實驗表、填入結果後按「分析」。</p></div></aside>
      </div>
      <div class="sheets" id="rsSheets" hidden>
        <section class="card sheet" data-ask="反應曲面圖"><h3>反應曲面圖</h3>
          <div class="fields rs-ctl">
            <div class="field"><label for="rsPX">橫軸因子</label><select autocomplete="off" id="rsPX"></select></div>
            <div class="field"><label for="rsPY">縱軸因子</label><select autocomplete="off" id="rsPY"></select></div>
            <div class="field"><label for="rsAz">水平旋轉 <output id="rsAzO"></output></label><input id="rsAz" type="range" min="0" max="359" step="1" value="35"></div>
            <div class="field"><label for="rsEl">俯仰角 <output id="rsElO"></output></label><input id="rsEl" type="range" min="10" max="85" step="1" value="30"></div>
          </div>
          <div id="rsHold" class="rs-hold"></div>
          <p class="hint">在圖上按住拖曳也可以旋轉。底部是同一個曲面的等高線；其他因子固定在下方設定的值（預設為中心點）。</p>
          <div class="rs-plot"><svg id="rsSvg" viewBox="0 0 760 520" role="img" aria-label="反應曲面 3D 圖"></svg></div>
        </section>
        <section class="card sheet" data-ask="二次模型係數"><h3>二次模型係數（coded 單位）</h3><div class="scroll-x"><table id="rsCoef"></table></div></section>
        <section class="card sheet" data-ask="反應曲面 ANOVA"><h3>ANOVA（含失適性檢定）</h3><div class="scroll-x"><table id="rsAnova"></table></div><p class="help" id="rsAnovaNote"></p></section>
      </div>
    </div>`);
    const rsF = Array.from({ length: 5 }, (_, i) => ({ name: "因子 " + L[i], lo: "", hi: "" }));
    let rs = null, fit = null;
    const kNow = () => +$("rsK").value, aNow = k => $("rsAlpha").value === "face" ? 1 : Math.pow(2 ** k, 0.25);
    const lohi = i => { const lo = num(rsF[i].lo), hi = num(rsF[i].hi); return isNaN(lo) || isNaN(hi) ? null : { lo, hi, c: (lo + hi) / 2, h: (hi - lo) / 2 }; };
    const act = (i, x) => { const r = lohi(i); return r ? r.c + r.h * x : x; };
    const fmtA = (i, x) => { const r = lohi(i); return r ? nf(act(i, x), 4) : (x >= 0 ? "+" : "") + nf(x, 3); };
    function factorsUI() {
      const k = kNow();
      $("rsFactors").innerHTML = `<div class="doe-frow doe-fhead"><span>代號</span><span>因子名稱（含單位）</span><span>低水準（−1）</span><span>高水準（+1）</span></div>` + rsF.slice(0, k).map((f, i) => `<div class="doe-frow"><b>${L[i]}</b><input type="text" data-ri="${i}" data-rk="name" value="${esc(f.name)}" aria-label="因子 ${L[i]} 名稱"><input type="text" inputmode="decimal" data-ri="${i}" data-rk="lo" value="${esc(f.lo)}" placeholder="例：120" aria-label="${L[i]} 低水準"><input type="text" inputmode="decimal" data-ri="${i}" data-rk="hi" value="${esc(f.hi)}" placeholder="例：140" aria-label="${L[i]} 高水準"></div>`).join("");
      axHint();
    }
    function axHint() {
      const k = kNow(), a = aNow(k), parts = rsF.slice(0, k).map((f, i) => { const r = lohi(i); return r ? `${L[i]} ${nf(r.c - r.h * a, 4)}～${nf(r.c + r.h * a, 4)}` : ""; }).filter(Boolean);
      $("rsAxHint").textContent = `α = ${nf(a, 4)}。` + (parts.length ? `軸點會做到：${parts.join("、")}（請確認設備與製程做得到；做不到時改用面心 α = 1）。` : "填入高低水準後，這裡會顯示軸點的實際值。");
    }
    $("rsFactors").addEventListener("input", e => { const t = e.target.closest("[data-ri]"); if (!t) return; rsF[+t.dataset.ri][t.dataset.rk] = t.value; axHint(); if (rs) matrix(); });
    ["rsK", "rsAlpha"].forEach(id => $(id).addEventListener("change", () => { if (id === "rsK") $("rsC").value = { 2: 5, 3: 6, 4: 7, 5: 10 }[kNow()]; factorsUI(); }));
    $("rsGoal").addEventListener("change", () => { $("rsTgtF").hidden = $("rsGoal").value !== "target"; });
    factorsUI();
    function design(k, a, nc) {
      const pts = [];
      for (let m = 0; m < 2 ** k; m++) pts.push({ t: "角點", x: Array.from({ length: k }, (_, j) => (m >> j) & 1 ? 1 : -1) });
      for (let j = 0; j < k; j++) for (const s of [-1, 1]) pts.push({ t: "軸點", x: Array.from({ length: k }, (_, i) => i === j ? s * a : 0) });
      for (let c = 0; c < nc; c++) pts.push({ t: "中心點", x: new Array(k).fill(0) });
      return pts;
    }
    function gen(keepY) {
      const k = kNow(), a = aNow(k), nc = Math.max(2, Math.min(12, Math.round(+$("rsC").value || 5)));
      const pts = design(k, a, nc), ord = pts.map((_, i) => i); for (let i = ord.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
      const run = {}; ord.forEach((p, i) => { run[p] = i + 1; });
      rs = { k, a, nc, pts, run, y: keepY || {} }; fit = null;
      $("rsSheets").hidden = true; $("rsTitle").textContent = "尚未分析"; $("rsOut").innerHTML = `<p class="help">照執行順序做實驗、填入結果後按「分析」。</p>`;
      $("rsSimBadge").hidden = true; $("rsSimEq").hidden = true;
      matrix();
      const p = 1 + 2 * k + k * (k - 1) / 2;
      $("rsGenHint").textContent = `${2 ** k} 個角點＋${2 * k} 個軸點＋${nc} 個中心點 = ${pts.length} 次實驗；二次模型有 ${p} 個係數，殘差自由度 ${pts.length - p}（其中純誤差 ${nc - 1}）。`;
    }
    function matrix() {
      const { k, pts, run } = rs;
      const head = ["標準順序", "執行順序", "類型"].concat(rsF.slice(0, k).map((f, i) => esc(L[i] + " " + f.name)), [esc($("rsY").value || "反應")]);
      $("rsMatrix").innerHTML = table(head, pts.map((p, i) => [i + 1, run[i], p.t].concat(p.x.map((x, j) => `${fmtA(j, x)}<small class="rs-cd">（${x === 0 ? "0" : (x > 0 ? "+" : "−") + nf(Math.abs(x), 3)}）</small>`), [`<input type="number" step="any" inputmode="decimal" data-rsr="${i}" value="${esc(rs.y[i] ?? "")}" aria-label="第 ${i + 1} 組結果">`])));
    }
    $("rsMatrix").addEventListener("input", e => { const t = e.target.closest("[data-rsr]"); if (t && rs) rs.y[t.dataset.rsr] = t.value; });
    $("rsGen").addEventListener("click", () => {
      const k = kNow(), miss = rsF.slice(0, k).map((f, i) => lohi(i) ? -1 : i).filter(i => i >= 0);
      $("rsFactors").querySelectorAll('[data-rk="lo"], [data-rk="hi"]').forEach(el => el.classList.toggle("pk-miss", +el.dataset.ri < k && isNaN(num(el.value))));
      if (miss.length) { $("rsGenHint").innerHTML = `<span class="status ng">請填 ${esc(miss.map(i => L[i]).join("、"))} 的低／高水準（紅色格子）。</span>`; return; }
      if (rsF.slice(0, k).some((f, i) => lohi(i).h <= 0)) { $("rsGenHint").innerHTML = `<span class="status ng">高水準要大於低水準。</span>`; return; }
      gen();
    });
    $("rsY").addEventListener("input", () => { if (rs) matrix(); });
    // ---- 二次模型 ----
    const termsOf = k => { const T = [{ n: "常數", f: () => 1, kind: "c" }]; for (let i = 0; i < k; i++) T.push({ n: L[i], f: x => x[i], kind: "l", i }); for (let i = 0; i < k; i++) T.push({ n: L[i] + "²", f: x => x[i] * x[i], kind: "q", i }); for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) T.push({ n: L[i] + L[j], f: x => x[i] * x[j], kind: "i", i, j }); return T; };
    function sse(X, y, cols) { const f = QQ.ols(X.map(r => cols.map(c => r[c])), y); return f ? f.sse : NaN; }
    function analyze() {
      if (!rs) { $("rsHint").textContent = "請先產生實驗表。"; return; }
      const y = [], miss = []; rs.pts.forEach((_, i) => { const v = num(rs.y[i] ?? ""); if (isNaN(v)) miss.push(i + 1); y.push(v); });
      if (miss.length) { $("rsHint").innerHTML = `<span class="status ng">還有 ${miss.length} 個結果沒填（標準順序第 ${miss.slice(0, 8).join("、")}${miss.length > 8 ? "…" : ""} 組）。</span>`; return; }
      const k = rs.k, T = termsOf(k), X = rs.pts.map(p => T.map(t => t.f(p.x))), f = QQ.ols(X, y);
      if (!f || f.df < 1) { $("rsHint").innerHTML = `<span class="status ng">實驗點不足以估計二次模型。</span>`; return; }
      const n = y.length, yb = y.reduce((a, b) => a + b, 0) / n, SST = y.reduce((a, v) => a + (v - yb) ** 2, 0), SSR = SST - f.sse, p = T.length;
      const all = T.map((_, i) => i), grp = kind => all.filter(i => T[i].kind === kind);
      const seq = [["一次項（線性）", grp("l")], ["平方項", grp("q")], ["交互作用項", grp("i")]].map(([nm, cols]) => { const rest = all.filter(i => !cols.includes(i)), ss = sse(X, y, rest) - f.sse; return { nm, df: cols.length, ss }; });   // 調整後（Type III 型）平方和
      // 失適性：純誤差來自中心點重複
      const groups = {}; rs.pts.forEach((pt, i) => { const key = pt.x.map(v => v.toFixed(6)).join(","); (groups[key] = groups[key] || []).push(y[i]); });
      let SSPE = 0, dfPE = 0; Object.values(groups).forEach(g => { if (g.length > 1) { const m = g.reduce((a, b) => a + b, 0) / g.length; SSPE += g.reduce((a, v) => a + (v - m) ** 2, 0); dfPE += g.length - 1; } });
      const SSLF = f.sse - SSPE, dfLF = f.df - dfPE;
      // 駐點：x* = −½ B⁻¹ b
      const b = T.filter(t => t.kind === "l").map(t => f.beta[T.indexOf(t)]), B = Array.from({ length: k }, () => new Array(k).fill(0));
      T.forEach((t, c) => { if (t.kind === "q") B[t.i][t.i] = f.beta[c]; if (t.kind === "i") { B[t.i][t.j] = f.beta[c] / 2; B[t.j][t.i] = f.beta[c] / 2; } });
      const Bi = QQ.matInv(B), xs = Bi ? Bi.map(r => -0.5 * r.reduce((a, v, j) => a + v * b[j], 0)) : null, ev = eig(B);
      const pred = x => T.reduce((a, t, c) => a + f.beta[c] * t.f(x), 0);
      const goal = $("rsGoal").value, tgt = num($("rsTgt").value);
      if (goal === "target" && isNaN(tgt)) { $("rsHint").innerHTML = `<span class="status ng">望目時請填目標值。</span>`; return; }
      const opt = search(k, pred, goal, tgt);
      fit = { T, f, y, n, p, yb, SST, SSR, seq, SSPE, dfPE, SSLF, dfLF, xs, ev, pred, opt, goal, tgt, R2: SSR / SST, R2a: 1 - (f.sse / f.df) / (SST / (n - 1)), F: (SSR / (p - 1)) / f.mse, pF: HT.fSf((SSR / (p - 1)) / f.mse, p - 1, f.df) };
      $("rsHint").textContent = "";
      render(); toolChanged("doe");
    }
    function search(k, pred, goal, tgt) {   // 在 coded 立方體 [−1, 1]^k（實驗的高低水準範圍）內找最佳
      const sc = v => goal === "max" ? v : goal === "min" ? -v : -Math.abs(v - tgt); let best = null;
      const steps = k <= 3 ? 21 : k === 4 ? 11 : 7, g = Array.from({ length: steps }, (_, i) => -1 + 2 * i / (steps - 1)), idx = new Array(k).fill(0);
      for (;;) { const x = idx.map(i => g[i]), v = pred(x), s = sc(v); if (!best || s > best.s) best = { x, v, s }; let d = 0; while (d < k && ++idx[d] === steps) { idx[d] = 0; d++; } if (d === k) break; }
      for (let it = 0; it < 200; it++) { const h = 0.05 * (1 - it / 200); best.x.forEach((_, j) => { [-h, h].forEach(dv => { const x = best.x.slice(); x[j] = Math.max(-1, Math.min(1, x[j] + dv)); const v = pred(x), s = sc(v); if (s > best.s) best = { x, v, s }; }); }); }
      return best;
    }
    function eig(A) {   // 對稱矩陣 Jacobi 法
      const n = A.length, a = A.map(r => r.slice());
      for (let sweep = 0; sweep < 60; sweep++) { let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] ** 2; if (off < 1e-20) break;
        for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) { if (Math.abs(a[p][q]) < 1e-15) continue; const th = (a[q][q] - a[p][p]) / (2 * a[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
          for (let r = 0; r < n; r++) { const arp = a[r][p], arq = a[r][q]; a[r][p] = c * arp - s * arq; a[r][q] = s * arp + c * arq; }
          for (let r = 0; r < n; r++) { const apr = a[p][r], aqr = a[q][r]; a[p][r] = c * apr - s * aqr; a[q][r] = s * apr + c * aqr; } } }
      return a.map((r, i) => r[i]).sort((x, y) => x - y);
    }
    const pTxt = v => !isFinite(v) ? "—" : v < 0.0001 ? "< 0.0001" : nf(v, 4);
    function render() {
      const F = fit, k = rs.k, yN = esc($("rsY").value || "反應"), names = i => esc(L[i] + "（" + (rsF[i].name || "因子") + "）");
      const sig = F.T.map((t, c) => ({ t, c, p: F.f.p[c] })).filter(o => o.t.kind !== "c" && o.p < 0.05);
      const nature = !F.xs ? "無法求駐點（矩陣奇異）" : F.ev.every(v => v < 0) ? "最大點（曲面向下彎）" : F.ev.every(v => v > 0) ? "最小點（曲面向上彎）" : "鞍點（某些方向上升、某些方向下降）";
      const inside = F.xs && F.xs.every(v => Math.abs(v) <= rs.a + 1e-9);
      const lof = F.dfLF > 0 && F.dfPE > 0 ? HT.fSf((F.SSLF / F.dfLF) / (F.SSPE / F.dfPE), F.dfLF, F.dfPE) : NaN;
      $("rsTitle").textContent = `反應曲面：${yN}`;
      $("rsOut").innerHTML = `<div class="verdict">${pill(F.pF < 0.05 ? "good" : "bad", F.pF < 0.05 ? "二次模型顯著" : "模型不顯著")}${isFinite(lof) ? pill(lof < 0.05 ? "warn" : "good", lof < 0.05 ? "失適性顯著" : "失適性不顯著") : ""}
        <p class="big">${{ max: "望大", min: "望小", target: "望目" }[F.goal]}的建議設定（在實驗的高低水準範圍內搜尋）：${F.opt.x.map((x, i) => `${names(i)} = ${fmtA(i, x)}`).join("、")}，預測 ${yN} ≈ <b>${nf(F.opt.v, 4)}</b>。*需以確認實驗驗證。</p>
        <p>駐點：${F.xs ? F.xs.map((x, i) => `${L[i]} = ${fmtA(i, x)}`).join("、") + `，預測 ${nf(F.pred(F.xs), 4)}；性質：${nature}${inside ? "" : "；<b>駐點在實驗範圍外</b>，外插不可靠，建議往該方向移動再做實驗（陡升法）"}。` : nature}</p>
        <p>顯著項（p &lt; 0.05）：${sig.length ? sig.map(o => esc(o.t.n)).join("、") : "無"}。</p></div>
        ${kv([["實驗次數", F.n], ["R²", nf(100 * F.R2, 3) + "%"], ["R²（調整）", nf(100 * F.R2a, 3) + "%"], ["S", nf(Math.sqrt(F.f.mse), 4)], ["模型 p", pTxt(F.pF)], ["失適性 p", pTxt(lof)], ["α", nf(rs.a, 4)]])}`;
      $("rsCoef").innerHTML = table(["項", "係數", "SE", "t", "p"], F.T.map((t, c) => [esc(t.n), nf(F.f.beta[c], 5), nf(F.f.se[c], 4), t.kind === "c" ? "—" : nf(F.f.t[c], 4), t.kind === "c" ? "—" : (F.f.p[c] < 0.05 ? `<b>${pTxt(F.f.p[c])}</b>` : pTxt(F.f.p[c]))]));
      const row = (nm, df, ss, ms, Fv, pv) => [nm, df, nf(ss, 5), ms == null ? "" : nf(ms, 5), Fv == null ? "" : nf(Fv, 4), pv == null ? "" : pTxt(pv)];
      const MSE = F.f.mse, rows = [row("迴歸（模型）", F.p - 1, F.SSR, F.SSR / (F.p - 1), F.F, F.pF)];
      F.seq.forEach(s => rows.push(row("　" + s.nm, s.df, s.ss, s.ss / s.df, (s.ss / s.df) / MSE, HT.fSf((s.ss / s.df) / MSE, s.df, F.f.df))));
      rows.push(row("殘差", F.f.df, F.f.sse, MSE));
      if (F.dfLF > 0 && F.dfPE > 0) { const Fl = (F.SSLF / F.dfLF) / (F.SSPE / F.dfPE); rows.push(row("　失適性", F.dfLF, F.SSLF, F.SSLF / F.dfLF, Fl, lof), row("　純誤差", F.dfPE, F.SSPE, F.SSPE / F.dfPE)); }
      rows.push(row("總計", F.n - 1, F.SST));
      $("rsAnova").innerHTML = table(["來源", "自由度", "SS", "MS", "F", "p"], rows);
      $("rsAnovaNote").textContent = "一次項、平方項、交互作用項的 SS 是調整後平方和（拿掉該組項後殘差增加多少）。失適性顯著代表二次模型還不夠描述資料（可能需要轉換或更高階模型）；純誤差來自中心點重複。";
      plotUI(); $("rsSheets").hidden = false;
      const ctx = [`反應曲面（CCD，k=${k}，α=${nf(rs.a, 4)}，中心點 ${rs.nc}）；反應 ${$("rsY").value}`, `係數：${F.T.map((t, c) => `${t.n} ${nf(F.f.beta[c], 5)}（p ${pTxt(F.f.p[c])}）`).join("；")}`, `R² ${nf(100 * F.R2, 3)}%，模型 p ${pTxt(F.pF)}，失適性 p ${pTxt(lof)}`, `駐點 ${F.xs ? F.xs.map((x, i) => L[i] + "=" + fmtA(i, x)).join("、") : "無"}（${nature}）；建議設定 ${F.opt.x.map((x, i) => L[i] + "=" + fmtA(i, x)).join("、")} 預測 ${nf(F.opt.v, 4)}`];
      if (!$("rsSimBadge").hidden) ctx.push("（注意：結果欄是模擬數據）");
      TQ.rsm = { ctx: ctx.join("\n") };
    }
    $("rsRun").addEventListener("click", analyze);
    // ---- 3D 曲面圖 ----
    let hold = [];
    function plotUI() {
      const k = rs.k, opts = Array.from({ length: k }, (_, i) => `<option value="${i}">${esc(L[i] + " " + rsF[i].name)}</option>`).join("");
      const px = $("rsPX").value, py = $("rsPY").value;
      $("rsPX").innerHTML = opts; $("rsPY").innerHTML = opts;
      $("rsPX").value = px !== "" && +px < k ? px : "0"; $("rsPY").value = py !== "" && +py < k && py !== $("rsPX").value ? py : (+$("rsPX").value === 1 ? "0" : "1");
      if (hold.length !== k) hold = new Array(k).fill(0);
      holdUI(); draw();
    }
    function holdUI() {
      const k = rs.k, ix = +$("rsPX").value, iy = +$("rsPY").value, others = Array.from({ length: k }, (_, i) => i).filter(i => i !== ix && i !== iy);
      $("rsHold").innerHTML = others.length ? `<span class="group-label">其他因子固定在</span>` + others.map(i => `<label class="rs-hold-i">${esc(L[i] + " " + rsF[i].name)} <output>${fmtA(i, hold[i])}</output><input type="range" data-hold="${i}" min="${-rs.a}" max="${rs.a}" step="0.05" value="${hold[i]}"></label>`).join("") : "";
    }
    $("rsHold").addEventListener("input", e => { const t = e.target.closest("[data-hold]"); if (!t) return; hold[+t.dataset.hold] = +t.value; t.previousElementSibling.textContent = fmtA(+t.dataset.hold, hold[+t.dataset.hold]); draw(); });
    ["rsPX", "rsPY"].forEach(id => $(id).addEventListener("change", () => { if ($("rsPX").value === $("rsPY").value) { const o = id === "rsPX" ? "rsPY" : "rsPX"; $(o).value = String((+$(id).value + 1) % rs.k); } holdUI(); draw(); }));
    ["rsAz", "rsEl"].forEach(id => $(id).addEventListener("input", draw));
    const CMAP = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];   // viridis 近似
    const cmap = t => { t = Math.max(0, Math.min(1, t)); const s = t * (CMAP.length - 1), i = Math.min(CMAP.length - 2, Math.floor(s)), u = s - i, c = CMAP[i].map((v, j) => Math.round(v + (CMAP[i + 1][j] - v) * u)); return `rgb(${c.join(",")})`; };
    function draw() {
      if (!fit || !rs) return;
      const ix = +$("rsPX").value, iy = +$("rsPY").value, a = rs.a, G = 26, az = +$("rsAz").value * Math.PI / 180, el = +$("rsEl").value * Math.PI / 180;
      $("rsAzO").textContent = $("rsAz").value + "°"; $("rsElO").textContent = $("rsEl").value + "°";
      const at = (u, v) => { const x = hold.slice(); x[ix] = u; x[iy] = v; return fit.pred(x); };
      const Z = []; let zmin = Infinity, zmax = -Infinity;
      for (let i = 0; i <= G; i++) { Z.push([]); for (let j = 0; j <= G; j++) { const z = at(-a + 2 * a * i / G, -a + 2 * a * j / G); Z[i].push(z); zmin = Math.min(zmin, z); zmax = Math.max(zmax, z); } }
      if (zmax - zmin < 1e-12) zmax = zmin + 1;
      const W = 760, H = 520, ZH = 1.1, zb = -0.85;   // 正規化：x,y ∈ [−1,1]，z ∈ [0, ZH]，底面 z = zb
      const nz = z => (z - zmin) / (zmax - zmin) * ZH;
      const P0 = (x, y, z) => { const x1 = x * Math.cos(az) - y * Math.sin(az), y1 = x * Math.sin(az) + y * Math.cos(az); return { u: x1, v: z * Math.cos(el) + y1 * Math.sin(el), d: y1 * Math.cos(el) - z * Math.sin(el) }; };
      // 依目前角度自動縮放置中：整個方塊（含底面座標標籤）放進繪圖區，不會被切掉
      const keyPts = []; [-1.35, 1.35].forEach(x => [-1.35, 1.35].forEach(y => [zb, ZH].forEach(z => keyPts.push(P0(x, y, z)))));
      const u0 = Math.min(...keyPts.map(p => p.u)), u1 = Math.max(...keyPts.map(p => p.u)), v0 = Math.min(...keyPts.map(p => p.v)), v1 = Math.max(...keyPts.map(p => p.v));
      const areaW = W - 150, areaH = H - 50, S = Math.min(areaW / (u1 - u0), areaH / (v1 - v0)), ox = 20 + (areaW - S * (u1 - u0)) / 2 - S * u0, oy = 25 + (areaH - S * (v1 - v0)) / 2 + S * v1;
      const P = (x, y, z) => { const q = P0(x, y, z); return { X: ox + S * q.u, Y: oy - S * q.v, d: q.d }; };
      const gx = i => -1 + 2 * i / G;
      let s = "";
      // 底面框與等高線
      const base = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => P(x, y, zb));
      s += `<polygon points="${base.map(p => p.X.toFixed(1) + "," + p.Y.toFixed(1)).join(" ")}" fill="var(--surface)" stroke="var(--muted)" stroke-opacity=".5"/>`;
      const NL = 10;
      for (let l = 1; l < NL; l++) {
        const lv = zmin + (zmax - zmin) * l / NL, col = cmap(l / NL);
        for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
          const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], v = c.map(([p, q]) => Z[p][q]), pts = [];
          for (let e = 0; e < 4; e++) { const a1 = v[e], a2 = v[(e + 1) % 4]; if ((a1 < lv) !== (a2 < lv)) { const t = (lv - a1) / (a2 - a1), [p1, q1] = c[e], [p2, q2] = c[(e + 1) % 4]; pts.push([gx(p1 + (p2 - p1) * t), gx(q1 + (q2 - q1) * t)]); } }
          for (let m = 0; m + 1 < pts.length; m += 2) { const A = P(pts[m][0], pts[m][1], zb), B = P(pts[m + 1][0], pts[m + 1][1], zb); s += `<line x1="${A.X.toFixed(1)}" y1="${A.Y.toFixed(1)}" x2="${B.X.toFixed(1)}" y2="${B.Y.toFixed(1)}" stroke="${col}" stroke-width="1.6"/>`; }
        }
      }
      // 設計點（投影在底面）
      rs.pts.forEach(p => { const u = p.x[ix] / a, v = p.x[iy] / a, q = P(u, v, zb); s += `<circle cx="${q.X.toFixed(1)}" cy="${q.Y.toFixed(1)}" r="2.6" fill="var(--ink)" fill-opacity=".55"/>`; });
      // 曲面（由遠到近畫）
      const quads = [];
      for (let i = 0; i < G; i++) for (let j = 0; j < G; j++) {
        const c = [[i, j], [i + 1, j], [i + 1, j + 1], [i, j + 1]], pts = c.map(([p, q]) => P(gx(p), gx(q), nz(Z[p][q]))), zm = c.reduce((t, [p, q]) => t + Z[p][q], 0) / 4;
        quads.push({ d: pts.reduce((t, p) => t + p.d, 0) / 4, pts, col: cmap((zm - zmin) / (zmax - zmin)) });
      }
      quads.sort((p, q) => q.d - p.d).forEach(qd => { s += `<polygon points="${qd.pts.map(p => p.X.toFixed(1) + "," + p.Y.toFixed(1)).join(" ")}" fill="${qd.col}" stroke="${qd.col}" stroke-width=".6" stroke-opacity=".9"/>`; });
      // 垂直座標軸（離觀看者最遠的角落；畫在曲面之後）
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]], far = corners.map(([x, y]) => ({ x, y, d: P(x, y, 0).d })).sort((p, q) => q.d - p.d)[0];
      const zt = 5; for (let t = 0; t <= zt; t++) { const z = ZH * t / zt, A = P(far.x, far.y, z); s += `<line x1="${A.X - 4}" x2="${A.X}" y1="${A.Y}" y2="${A.Y}" stroke="var(--muted)"/><text x="${A.X - 7}" y="${A.Y + 4}" text-anchor="end" font-size="11" fill="var(--muted)" paint-order="stroke" stroke="var(--surface)" stroke-width="3">${nf(zmin + (zmax - zmin) * t / zt, 4)}</text>`; }
      const z0 = P(far.x, far.y, 0), z1 = P(far.x, far.y, ZH); s += `<line x1="${z0.X}" y1="${z0.Y}" x2="${z1.X}" y2="${z1.Y}" stroke="var(--muted)"/>`;
      // 底面座標刻度（實際單位）
      const axLab = (fixed, along, idx) => { [-1, 0, 1].forEach(t => { const pt = along === "x" ? P(t, fixed, zb) : P(fixed, t, zb), o = along === "x" ? P(t, fixed * 1.14, zb) : P(fixed * 1.14, t, zb);   // 沿底面邊的外法線方向推出去，兩軸在角落不會重疊
          s += `<line x1="${pt.X.toFixed(1)}" y1="${pt.Y.toFixed(1)}" x2="${(pt.X + (o.X - pt.X) * 0.5).toFixed(1)}" y2="${(pt.Y + (o.Y - pt.Y) * 0.5).toFixed(1)}" stroke="var(--muted)"/><text x="${o.X.toFixed(1)}" y="${(o.Y + 4).toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--muted)">${fmtA(idx, t * a)}</text>`; });
        const m = along === "x" ? P(0, fixed * 1.25, zb) : P(fixed * 1.25, 0, zb); s += `<text x="${m.X.toFixed(1)}" y="${(m.Y + 16).toFixed(1)}" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--ink)">${esc(L[idx] + " " + rsF[idx].name)}</text>`; };
      const nearY = P(0, -1, zb).d < P(0, 1, zb).d ? -1 : 1, nearX = P(-1, 0, zb).d < P(1, 0, zb).d ? -1 : 1;
      axLab(nearY, "x", ix); axLab(nearX, "y", iy);
      // 色條
      const bx = W - 70, by0 = 70, bh = 330, NB = 40;
      for (let t = 0; t < NB; t++) s += `<rect x="${bx}" y="${(by0 + bh * (1 - (t + 1) / NB)).toFixed(1)}" width="18" height="${(bh / NB + 0.6).toFixed(1)}" fill="${cmap((t + 0.5) / NB)}"/>`;
      s += `<rect x="${bx}" y="${by0}" width="18" height="${bh}" fill="none" stroke="var(--muted)" stroke-opacity=".6"/>`;
      for (let t = 0; t <= 5; t++) { const yy = by0 + bh * (1 - t / 5); s += `<line x1="${bx + 18}" x2="${bx + 23}" y1="${yy}" y2="${yy}" stroke="var(--muted)"/><text x="${bx + 26}" y="${yy + 4}" font-size="11" fill="var(--muted)">${nf(zmin + (zmax - zmin) * t / 5, 4)}</text>`; }
      s += `<text x="${bx + 9}" y="${by0 - 12}" text-anchor="middle" font-size="12.5" font-weight="700" fill="var(--ink)">${esc($("rsY").value || "反應")}</text>`;
      $("rsSvg").innerHTML = s;
    }
    // 拖曳旋轉
    (function drag() {
      const svg = $("rsSvg"); let st = null;
      svg.addEventListener("pointerdown", e => { st = { x: e.clientX, y: e.clientY, az: +$("rsAz").value, el: +$("rsEl").value }; svg.setPointerCapture(e.pointerId); });
      svg.addEventListener("pointermove", e => { if (!st) return; $("rsAz").value = String(((Math.round(st.az - (e.clientX - st.x) * 0.5) % 360) + 360) % 360); $("rsEl").value = String(Math.max(10, Math.min(85, Math.round(st.el + (e.clientY - st.y) * 0.3)))); draw(); });
      ["pointerup", "pointercancel"].forEach(t => svg.addEventListener(t, () => { st = null; }));
    })();
    // ---- 模擬數據：有最大點的二次曲面（一個因子可能幾乎不影響）＋誤差 ----
    $("rsSim").addEventListener("click", () => {
      if (!rs) { $("rsHint").textContent = "請先按「產生實驗表」。"; return; }
      const k = rs.k, R = Math.random, N = () => { let u = 0; while (u === 0) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R()); };
      const xs = Array.from({ length: k }, () => +((R() - 0.5) * 1.2).toFixed(2)), A = Array.from({ length: k }, () => new Array(k).fill(0));
      const weak = k >= 4 ? Math.floor(R() * k) : -1;
      for (let i = 0; i < k; i++) A[i][i] = i === weak ? 0.15 : +(1.2 + 2 * R()).toFixed(2);
      if (k >= 2) { const i = Math.floor(R() * k), j = (i + 1 + Math.floor(R() * (k - 1))) % k, v = +((R() - 0.5) * 0.6 * Math.min(A[i][i], A[j][j])).toFixed(2); A[i][j] = A[j][i] = v; }
      if (weak >= 0) xs[weak] = 0;
      const y0 = 80, sd = +(0.5 + 0.4 * R()).toFixed(2), qf = x => { let t = 0; for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) t += (x[i] - xs[i]) * A[i][j] * (x[j] - xs[j]); return y0 - t; };
      rs.pts.forEach((p, i) => { rs.y[i] = String(Math.round((qf(p.x) + sd * N()) * 10) / 10); }); matrix();
      // 展開成一般二次式係數
      const c0 = y0 - xs.reduce((t, xi, i) => t + xs.reduce((u, xj, j) => u + xi * A[i][j] * xj, 0), 0), lin = xs.map((_, i) => 2 * xs.reduce((t, xj, j) => t + A[i][j] * xj, 0));
      const terms = [`${nf(c0, 4)}`].concat(lin.map((v, i) => `${v < 0 ? "−" : "+"} ${nf(Math.abs(v), 4)}·${L[i]}`), A.map((r, i) => `− ${nf(r[i], 4)}·${L[i]}²`));
      for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) if (A[i][j]) terms.push(`${-2 * A[i][j] < 0 ? "−" : "+"} ${nf(Math.abs(2 * A[i][j]), 4)}·${L[i]}${L[j]}`);
      $("rsSimBadge").innerHTML = "以下結果欄是<b>模擬數據</b>（預測方程式＋隨機誤差），只供練習分析流程，不能作為驗證或確效依據。"; $("rsSimBadge").hidden = false;
      const d = $("rsSimEq"); d.hidden = false; d.open = false;
      d.querySelector(".sim-eq-b").innerHTML = `<p><b>y = ${terms.join(" ")} + ε</b>，ε ~ N(0, ${sd}²)；coded 單位（−1／+1 = 低／高水準）。</p><p>真正的最大點在 ${xs.map((x, i) => `${L[i]} = ${fmtA(i, x)}（coded ${x}）`).join("、")}，最大值 ${y0}。${weak >= 0 ? `${L[weak]} 幾乎不影響反應（平方項很小）。` : ""}分析的駐點應接近這個位置，性質應為「最大點」。</p>`;
      $("rsHint").textContent = "已填入模擬數據，請按「分析」。";
    });
    // DOE 子分頁說明
    tabs.addEventListener("click", e => { const b = e.target.closest('[data-tsub="rsm"]'); if (b) setTimeout(() => { $("doeSubHint").textContent = "中心複合設計（CCD）：估計二次曲面、找最佳點、畫 3D 曲面與等高線"; }, 0); });
  })();
