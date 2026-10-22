  // =====================================================================
  // DOE／混合設計／田口：「填入模擬數據」——用一條設定好的預測方程式（真實模型）算出每一列，再加常態隨機誤差。
  // 不是整欄亂數：少數因子有明顯效應（可能含一個交互作用），其他因子影響很小，分析後應能找回設定的效應。
  // 僅供練習與教學：結果欄上方標示「模擬數據」，不能作為驗證或確效依據；真實方程式收在「對答案」區。
  // =====================================================================
  (function simFillInit() {
    const R = () => Math.random(), N01 = () => { let u = 0; while (u === 0) u = R(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * R()); };
    const pick = (n, m) => { const a = Array.from({ length: n }, (_, i) => i); for (let i = n - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, m); };
    const r1 = v => Math.round(v * 10) / 10, sg = v => (v < 0 ? "− " : "+ ") + Math.abs(v).toFixed(2);
    const NOTE = "以下結果欄是<b>模擬數據</b>（預測方程式＋隨機誤差），只供練習分析流程，不能作為驗證或確效依據。";
    function ui(matrixId, key) {
      const box = $(matrixId).closest(".scroll-x"); if (!box) return;
      box.insertAdjacentHTML("beforebegin", `<div class="sim-row"><button type="button" class="btn small" id="${key}Sim">填入模擬數據（預測方程式＋隨機誤差）</button><span class="hint">先產生實驗表；每按一次換一組方程式與誤差</span></div>
        <p class="sim-badge" id="${key}SimBadge" hidden></p><details class="sim-eq" id="${key}SimEq" hidden><summary>模擬用的真實方程式（分析完再打開對答案）</summary><div class="sim-eq-b"></div></details>`);
    }
    function show(key, eq) { const b = $(key + "SimBadge"), d = $(key + "SimEq"); b.innerHTML = NOTE; b.hidden = false; d.hidden = false; d.open = false; d.querySelector(".sim-eq-b").innerHTML = eq; }
    function hide(key) { const b = $(key + "SimBadge"), d = $(key + "SimEq"); if (b) b.hidden = true; if (d) d.hidden = true; }
    // ---- 2 水準因子設計（全因子、部分因子、PB）：coded −1／+1 ----
    ui("doeMatrix", "doe");
    $("doeSim").addEventListener("click", () => {
      if (!doe) { $("doeHint").textContent = "請先按「產生實驗矩陣」。"; return; }
      const M = doe.design.matrix, k = doe.design.k, full = doeKind() === "full";
      const imp = pick(k, Math.min(k, k >= 3 ? 3 : 2)), b = new Array(k).fill(0);
      b[imp[0]] = (R() < 0.5 ? -1 : 1) * (3 + 2 * R()); if (imp[1] != null) b[imp[1]] = (R() < 0.5 ? -1 : 1) * (1.8 + 1.2 * R()); if (imp[2] != null) b[imp[2]] = (R() < 0.5 ? -1 : 1) * (0.9 + 0.6 * R());
      for (let i = 0; i < k; i++) if (!imp.includes(i)) b[i] = (R() - 0.5) * 0.4;
      const inter = full && k >= 2 ? { a: Math.min(imp[0], imp[1]), c: Math.max(imp[0], imp[1]), v: (R() < 0.5 ? -1 : 1) * (1.0 + 0.8 * R()) } : null;
      const b0 = 50, sd = 0.6 + 0.4 * R();
      M.forEach((row, i) => { for (let j = 0; j < doe.r; j++) { let y = b0 + row.reduce((t, x, c) => t + b[c] * x, 0) + (inter ? inter.v * row[inter.a] * row[inter.c] : 0) + sd * N01(); doe.y[i + "_" + j] = String(r1(y)); } });
      doeMatrix();
      const nm = c => esc(QQ.LETTERS[c] + "（" + (doeF[c].name || "因子") + "）");
      const terms = b.map((v, c) => `${sg(v)}·${QQ.LETTERS[c]}`).join(" ") + (inter ? ` ${sg(inter.v)}·${QQ.LETTERS[inter.a]}${QQ.LETTERS[inter.c]}` : "");
      const eff = b.map((v, c) => [Math.abs(v), `${nm(c)} 效應 ${(2 * v).toFixed(2)}`]).sort((x, y) => y[0] - x[0]).map(x => x[1]);
      show("doe", `<p><b>y = ${b0} ${terms} + ε</b>，ε ~ N(0, ${sd.toFixed(2)}²)；因子以 −1（低水準）／+1（高水準）編碼。</p><p>主效應由大到小：${eff.join("、")}${inter ? `；交互作用 ${QQ.LETTERS[inter.a]}${QQ.LETTERS[inter.c]} 效應 ${(2 * inter.v).toFixed(2)}` : full ? "" : "（部分因子／PB 設計的交互作用與主效應混淆，模擬時不加交互作用）"}。</p><p class="hint">效應 = 高水準平均 − 低水準平均 = 2 × 係數。分析結果的效應應接近這些數值；誤差越大、重複越少，估計越不準。</p>`);
      $("doeHint").textContent = "已填入模擬數據，請按「分析效應」。";
    });
    // ---- 混合設計：Scheffé 二次模型 ----
    ui("mixMatrix", "mix");
    $("mixSim").addEventListener("click", () => {
      if (!mix) { $("mixHint").textContent = "請先按「產生實驗點」。"; return; }
      const q = mix.q, lin = Array.from({ length: q }, () => r1(55 + 30 * R())), pairs = [];
      for (let i = 0; i < q; i++) for (let j = i + 1; j < q; j++) pairs.push([i, j, 0]);
      const big = Math.floor(R() * pairs.length); pairs.forEach((p, n) => { p[2] = n === big ? (R() < 0.5 ? -1 : 1) * r1(20 + 15 * R()) : r1((R() - 0.5) * 6); });
      const sd = 0.5 + 0.3 * R();
      mix.pts.forEach((x, i) => { for (let j = 0; j < mix.r; j++) { let y = lin.reduce((t, b, c) => t + b * x[c], 0) + pairs.reduce((t, [a, c, v]) => t + v * x[a] * x[c], 0) + sd * N01(); mix.y[i + "_" + j] = String(r1(y)); } });
      mixMatrix();
      const L = QQ.LETTERS, names = mixNamesArr.slice(0, q);
      show("mix", `<p><b>y = ${lin.map((b, c) => `${c ? "+ " : ""}${b}·${L[c]}`).join(" ")} ${pairs.map(([a, c, v]) => `${sg(v)}·${L[a]}${L[c]}`).join(" ")} + ε</b>，ε ~ N(0, ${sd.toFixed(2)}²)；${names.map((n, c) => `${L[c]} = ${esc(n || "成分")} 的比例`).join("、")}（0～1，合計 1）。</p><p>明顯的混合效應：${L[pairs[big][0]]}${L[pairs[big][1]]}（係數 ${pairs[big][2]}，${pairs[big][2] > 0 ? "加成" : "拮抗"}）。分析時「自動」應選到二次模型，並找回這一項。</p>`);
      $("mixHint").textContent = "已填入模擬數據，請按「分析」。";
    });
    // ---- 田口：各因子水準效應＋雜音條件，含一個「降低雜音影響」的穩健因子 ----
    ui("tgMatrix", "tg");
    $("tgSim").addEventListener("click", () => {
      if (!tg) { $("tgHint").textContent = "請先按「產生直交表」。"; return; }
      const A = TGE.ARR[tg.design.array], k = tg.k, Ls = tg.design.cols.map(c => Math.max(...A.matrix.map(r => r[c])));
      const type = tg.type, base = type === "smaller" ? 20 : type === "nominal" ? 10 : 50, scale = type === "nominal" ? 0.25 : 1;
      const imp = pick(k, Math.min(k, 3)), robust = imp[imp.length - 1];
      const eff = tg.design.cols.map((_, f) => { const big = imp.slice(0, 2).includes(f), mag = (2.5 + 1.5 * R()) * scale * (R() < 0.5 ? -1 : 1);   // 每個因子一個方向與大小（不是每個水準各自隨機）
        return Array.from({ length: Ls[f] }, (_, l) => big ? (l - (Ls[f] - 1) / 2) * mag : (R() - 0.5) * 0.6 * scale); });
      eff.forEach(e => { const m = e.reduce((a, b) => a + b, 0) / e.length; e.forEach((_, i) => { e[i] = +(e[i] - m).toFixed(2); }); });
      const sens = Array.from({ length: Ls[robust] }, (_, l) => +(1 - 0.75 * l / Math.max(1, Ls[robust] - 1)).toFixed(2));   // 穩健因子：水準越高，雜音影響越小
      const nShift = Array.from({ length: tg.noiseN }, (_, kk) => +((kk - (tg.noiseN - 1) / 2) * 0.3 * base / Math.max(1, tg.noiseN - 1)).toFixed(2)), sd = 0.4 * scale + 0.2;   // 雜音條件約造成 ±15% 偏移
      const cols = tgCols(), beta0 = 2;
      A.matrix.forEach((row, r) => {
        const lv = tg.design.cols.map(c => row[c] - 1), mu = base + eff.reduce((t, e, f) => t + e[lv[f]], 0), s = sens[lv[robust]];
        cols.forEach((c, j) => {
          let y = type === "dynamic" ? (beta0 + (mu - base) / 20) * tg.signals[c.s] + nShift[c.k] * 0.3 * s + sd * N01() : mu + nShift[c.k] * s + sd * N01();
          if (type !== "dynamic") y = Math.max(0.1, y);
          tg.y[r + "_" + j] = String(r1(y));
        });
      });
      tgMatrix();
      const L = TGE.LETTERS, nm = f => esc(L[f] + "（" + (tgF[f].name || "因子") + "）");
      const effTxt = eff.map((e, f) => `${nm(f)}：${e.map((v, l) => `${tgF[f].lab[l] || "水準 " + (l + 1)} ${v >= 0 ? "+" : ""}${v}`).join("，")}`).join("<br>");
      show("tg", `<p><b>${type === "dynamic" ? `y = β·M + 雜音 + ε，β = ${beta0} + (各因子效應合計) ÷ 20` : `y = ${base} + 各因子水準效應 + 雜音條件偏移 × 敏感度 + ε`}</b>，ε ~ N(0, ${sd.toFixed(2)}²)。</p><p>各因子水準效應：<br>${effTxt}</p><p>雜音條件偏移：${tgNoise.slice(0, tg.noiseN).map((n, i) => `${esc(n)} ${nShift[i] >= 0 ? "+" : ""}${nShift[i]}`).join("、")}。<b>${nm(robust)}</b> 是穩健因子：水準越高，雜音的影響越小（敏感度 ${sens.join(" → ")}），分析時看 S/N 比的因子效應，這個因子的 S/N 差異應該明顯；平均值主要受前兩個效應大的因子影響。</p>`);
      $("tgHint").textContent = "已填入模擬數據，請按「分析」。";
    });
    // 重新產生表格時拿掉模擬標示
    const _dg = doeGenerate; doeGenerate = function (keepY) { hide("doe"); return _dg(keepY); };
    const _mg = mixGenerate; mixGenerate = function (keepY) { hide("mix"); return _mg(keepY); };
    const _tg = tgGenerate; tgGenerate = function (keepY) { hide("tg"); return _tg(keepY); };
  })();
