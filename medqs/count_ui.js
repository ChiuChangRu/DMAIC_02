  // =====================================================================
  // 假設檢定 · 次數資料：單一不良率對目標（精確二項）、兩組以上比例／類別分布（卡方；2×2 樣本少時自動改用 Fisher）
  // 計算在 stats.js（HT.propOne / HT.chi2Table），已與 SciPy 比對；這裡只處理介面與白話說明。
  // =====================================================================
  const CT = { q: "one", rows: ["A 組", "B 組"], cols: ["不良", "良品"], M: [["", ""], ["", ""]], result: null };
  const CT_EX = {
    one0: { q: "one", n: 300, x: 0, p0: 1, desc: "滅菌包裝密封試驗：測 300 個、0 個洩漏，要宣稱洩漏率低於 1%。" },
    one3: { q: "one", n: 200, x: 3, p0: 5, desc: "導管接頭外觀檢查：抽 200 個、3 個不良，看不良率有沒有低於 5%。" },
    tab2: { q: "tab", rows: ["供應商 A", "供應商 B"], cols: ["不良", "良品"], M: [[12, 188], [3, 197]], desc: "兩家供應商的管材各抽 200 支：A 有 12 支不良、B 有 3 支不良。" },
    tab3: { q: "tab", rows: ["模穴 1", "模穴 2", "模穴 3"], cols: ["破裂", "毛邊", "縮痕", "良品"], M: [[6, 12, 5, 277], [5, 30, 6, 259], [4, 11, 18, 267]], desc: "同一副模具三個模穴各抽 300 個，記錄缺陷種類。" },
    tabs: { q: "tab", rows: ["改善前", "改善後"], cols: ["不良", "良品"], M: [[5, 15], [0, 20]], desc: "改善前後各測 20 個：改善前 5 個不良、改善後 0 個。" }
  };
  const ctPct = v => { const a = Math.abs(v) * 100; return (v * 100).toFixed(a === 0 ? 0 : a < 0.1 ? 3 : a < 10 ? 2 : 1) + "%"; };
  const ctGood = name => /良品|合格|通過|正常|OK|good|pass/i.test(name);
  const CT_PAL = ["var(--qic-b)", "var(--chart-a)", "#8A6FB0", "#C9A13B", "#4F86C6", "#B65C7A", "#7C8B3A"];
  const ctW = () => { const w = ($("ctOut") && $("ctOut").clientWidth) || 560; return Math.max(300, Math.min(560, w - 8)); };
  function ctColors(cols) { let k = 0; return cols.map(c => ctGood(c) ? "color-mix(in srgb, var(--muted) 45%, var(--surface))" : CT_PAL[k++ % CT_PAL.length]); }

  function ctSave() { $("ctData").value = JSON.stringify({ q: CT.q, rows: CT.rows, cols: CT.cols, M: CT.M }); }
  function ctLoadData() { try { const d = JSON.parse($("ctData").value || "{}"); if (d && Array.isArray(d.M) && Array.isArray(d.rows) && Array.isArray(d.cols)) { CT.rows = d.rows.map(String); CT.cols = d.cols.map(String); CT.M = d.M.map(r => r.map(v => v === "" || v == null ? "" : Number(v))); } if (d && (d.q === "one" || d.q === "tab")) ctSetQ(d.q, true); ctGrid(); } catch (_) {} }
  function ctSetQ(q, quiet) {
    CT.q = q;
    $("ctQ").querySelectorAll("[data-ctq]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.ctq === q)));
    $("ctWhenOne").hidden = q !== "one"; $("ctWhenTab").hidden = q !== "tab";
    $("ctOneForm").hidden = q !== "one"; $("ctTabForm").hidden = q !== "tab";
    $("ctStep2").textContent = q === "one" ? "填入件數與目標" : "填入每組的件數";
    if (!quiet) { ctSave(); }
  }
  function ctGrid() {
    const R = CT.rows.length, C = CT.cols.length, num = v => (v === "" || v == null ? "" : String(v));
    const rs = CT.M.map(r => r.reduce((s, v) => s + (Number(v) || 0), 0)), cs = CT.cols.map((_, j) => CT.M.reduce((s, r) => s + (Number(r[j]) || 0), 0));
    let h = `<thead><tr><th class="ct-corner">組別 ＼ 結果</th>`;
    CT.cols.forEach((c, j) => { h += `<th><div class="ct-hcell"><input class="ct-name" data-cn="${j}" value="${esc(c)}" aria-label="結果類別名稱 ${j + 1}">${C > 2 ? `<button type="button" class="ct-del" data-dc="${j}" aria-label="刪除這一欄">×</button>` : ""}</div></th>`; });
    h += `<th class="num">合計</th></tr></thead><tbody>`;
    CT.rows.forEach((r, i) => {
      h += `<tr><th><div class="ct-hcell"><input class="ct-name" data-rn="${i}" value="${esc(r)}" aria-label="組別名稱 ${i + 1}">${R > 2 ? `<button type="button" class="ct-del" data-dr="${i}" aria-label="刪除這一組">×</button>` : ""}</div></th>`;
      CT.cols.forEach((_, j) => { h += `<td><input class="ct-num" type="number" min="0" step="1" inputmode="numeric" data-r="${i}" data-c="${j}" value="${num(CT.M[i][j])}" aria-label="${esc(r)} 的 ${esc(CT.cols[j])} 件數"></td>`; });
      h += `<td class="num ct-tot">${rs[i]}</td></tr>`;
    });
    h += `</tbody><tfoot><tr><th>合計</th>${cs.map(v => `<td class="num ct-tot">${v}</td>`).join("")}<td class="num ct-tot">${cs.reduce((s, v) => s + v, 0)}</td></tr></tfoot>`;
    $("ctGrid").innerHTML = h;
  }
  function ctTotals() {
    const g = $("ctGrid"), rs = CT.M.map(r => r.reduce((s, v) => s + (Number(v) || 0), 0)), cs = CT.cols.map((_, j) => CT.M.reduce((s, r) => s + (Number(r[j]) || 0), 0));
    g.querySelectorAll("tbody tr").forEach((tr, i) => { tr.lastElementChild.textContent = rs[i]; });
    const f = g.querySelectorAll("tfoot td"); cs.forEach((v, j) => { f[j].textContent = v; }); f[f.length - 1].textContent = cs.reduce((s, v) => s + v, 0);
  }
  function ctExample(k) {
    const e = CT_EX[k]; if (!e) return;
    ctSetQ(e.q);
    if (e.q === "one") { $("ctN").value = e.n; $("ctX").value = e.x; $("ctP0").value = e.p0; }
    else { CT.rows = e.rows.slice(); CT.cols = e.cols.slice(); CT.M = e.M.map(r => r.slice()); ctGrid(); ctSave(); }
    if (!($("hypProblem").value || "").trim()) $("hypProblem").value = "（示範數據）" + e.desc;
    ctRun();
  }

  // ---------- 圖 ----------
  function ctDrawOne(r) {
    const top = Math.max(r.upper, r.p0, r.rate) * 1.35 || 0.01, W = ctW(), H = 128, L = 18, Rr = 18, X = v => L + v / top * (W - L - Rr), sc = niceScale(0, top, ctW() < 420 ? 3 : 5);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="觀察不良率、信心上限與目標">`;
    sc.ticks.filter(t => t <= top + 1e-12).forEach(t => { s += `<line x1="${X(t)}" x2="${X(t)}" y1="26" y2="${H - 30}" stroke="var(--grid)"/><text x="${X(t)}" y="${H - 12}" text-anchor="middle" font-size="12" fill="var(--muted)">${ctPct(t)}</text>`; });
    const col = r.pass ? "var(--good)" : "var(--qic-b)";
    s += `<rect x="${X(0)}" y="48" width="${Math.max(2, X(r.upper) - X(0))}" height="26" rx="4" fill="${col}" fill-opacity=".16" stroke="${col}" stroke-width="2"/>`;
    s += `<text x="${Math.min(X(r.upper), W - Rr - 4)}" y="42" text-anchor="end" font-size="12" font-weight="700" fill="${col}">${Math.round(r.conf * 100)}% 信心上限 ${ctPct(r.upper)}</text>`;
    s += `<circle cx="${X(r.rate)}" cy="61" r="6" fill="var(--ink)" stroke="var(--surface)" stroke-width="2"/><text x="${X(r.rate) + 9}" y="${r.rate / top < 0.75 ? 92 : 92}" font-size="12" fill="var(--ink)">觀察 ${ctPct(r.rate)}</text>`;
    s += `<line x1="${X(r.p0)}" x2="${X(r.p0)}" y1="18" y2="${H - 30}" stroke="var(--bad)" stroke-width="2" stroke-dasharray="6 4"/><text x="${X(r.p0)}" y="14" text-anchor="middle" font-size="12" font-weight="700" fill="var(--bad)">目標 ${ctPct(r.p0)}</text>`;
    return s + `</svg>`;
  }
  function ctDrawTab(r, rows, cols) {
    // 有「良品」欄時只畫不良（良品通常占 90% 以上，畫進去會把差異壓扁）；軸用各組不良率
    const colr = ctColors(cols), good = cols.map(ctGood), useJ = cols.map((_, j) => j).filter(j => !good[j]);
    const onlyBad = good.some(Boolean) && useJ.length > 0;
    const J = onlyBad ? useJ : cols.map((_, j) => j);
    const tot = rows.map((_, i) => J.reduce((s, j) => s + CT.M[i][j], 0) / r.rs[i]), top = onlyBad ? Math.max(...tot, 1e-9) * 1.18 : 1;
    const sc = onlyBad ? niceScale(0, top, ctW() < 420 ? 3 : 5) : { ticks: [0, 0.25, 0.5, 0.75, 1] }, xmax = onlyBad ? Math.max(top, sc.ticks[sc.ticks.length - 1]) : 1;
    const W = ctW(), L = 92, Rr = 54, bh = 26, gap = 12, H = 14 + rows.length * (bh + gap) + 34, X = v => L + v / xmax * (W - L - Rr);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${onlyBad ? "各組的不良率與不良種類" : "各組的結果比例（100% 堆疊長條）"}">`;
    sc.ticks.filter(t => t <= xmax + 1e-12).forEach(t => { s += `<line x1="${X(t)}" x2="${X(t)}" y1="8" y2="${H - 30}" stroke="var(--grid)"/><text x="${X(t)}" y="${H - 14}" text-anchor="middle" font-size="11.5" fill="var(--muted)">${ctPct(t)}</text>`; });
    rows.forEach((name, i) => {
      const y = 12 + i * (bh + gap); let acc = 0;
      s += `<text x="${L - 8}" y="${y + bh / 2 + 4}" text-anchor="end" font-size="12.5" fill="var(--ink)">${esc(name.length > 8 ? name.slice(0, 8) + "…" : name)}</text>`;
      J.forEach(j => { const c = cols[j], f = CT.M[i][j] / r.rs[i]; if (f <= 0) return; const x0 = X(acc), w = X(acc + f) - x0;
        s += `<rect x="${x0}" y="${y}" width="${Math.max(0.5, w)}" height="${bh}" fill="${colr[j]}"><title>${esc(name)}・${esc(c)}：${CT.M[i][j]} / ${r.rs[i]}（${ctPct(f)}）</title></rect>`;
        if (w > 46) s += `<text x="${x0 + w / 2}" y="${y + bh / 2 + 4}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${good[j] ? "var(--ink)" : "#fff"}">${ctPct(f)}</text>`;
        acc += f; });
      if (onlyBad) s += `<text x="${X(acc) + 6}" y="${y + bh / 2 + 4}" font-size="12" font-weight="700" fill="var(--ink)">${ctPct(acc)}</text>`;
    });
    s += `</svg>`;
    const leg = J.map(j => `<span class="ct-leg"><i style="background:${colr[j]}"></i>${esc(cols[j])}</span>`).join("");
    return s + `<div class="ct-legend">${leg}${onlyBad ? `<span class="ct-leg hint">只畫不良（${esc(cols.filter((_, j) => good[j]).join("、"))}未畫出）；長條總長＝不良率</span>` : ""}</div>`;
  }
  // ---------- 計算 ----------
  function ctRun() {
    const hint = $("ctHint"); hint.textContent = "";
    const conf = Number($("ctConf").value) || 0.95, cpc = Math.round(conf * 100);
    let html = "", table = "", title = "";
    if (CT.q === "one") {
      const n = Number($("ctN").value), x = Number($("ctX").value), p0p = Number($("ctP0").value);
      if (!$("ctN").value || !$("ctX").value || !$("ctP0").value) { hint.textContent = "請填入測了幾個、不良幾個、目標不良率。"; return; }
      if (!Number.isInteger(n) || !Number.isInteger(x)) { hint.textContent = "件數要是整數。"; return; }
      const r = HT.propOne(n, x, p0p / 100, conf); if (r.error) { hint.textContent = r.error; return; }
      CT.result = Object.assign({ kind: "one" }, r);
      let n0 = Math.ceil(Math.log(1 - conf) / Math.log(1 - r.p0)); while (HT.cpUpper(0, n0, conf) >= r.p0) n0++;
      const pill = r.pass ? `<span class="pill sig" style="background:var(--good-soft);color:var(--good)">可以宣稱</span>` : `<span class="pill sig" style="background:var(--bad-soft);color:var(--bad)">還不能宣稱</span>`;
      const next = r.pass ? "" : r.maxX >= 0
        ? `<div class="note">同樣測 ${n} 個時，最多 <b>${r.maxX}</b> 個不良才能宣稱低於 ${ctPct(r.p0)}。目前 ${x} 個，要再多測或先改善。</div>`
        : `<div class="note">即使 0 個不良，測 ${n} 個也不夠證明低於 ${ctPct(r.p0)}；0 不良時至少要測 <b>${n0}</b> 個。</div>`;
      html = `<div class="verdict">${pill}<div class="bignum">不良率 ≤ ${ctPct(r.upper)}</div><p class="big">測了 ${n} 個、${x} 個不良（觀察 ${ctPct(r.rate)}）。有 ${cpc}% 信心，真正的不良率不超過 <b>${ctPct(r.upper)}</b>，${r.pass ? "低於" : "沒有低於"}目標 ${ctPct(r.p0)}。</p></div>
        <div class="chart-wrap">${ctDrawOne(r)}</div>${next}
        <div class="ct-why"><b>為什麼不是直接看 ${ctPct(r.rate)}？</b>只測了一部分產品，觀察到的不良率會因抽樣運氣而偏高或偏低。「信心上限」是考慮這個運氣後，真正不良率最多可能到多少；上限低於目標才能宣稱。</div>
        <div class="kv"><div><span>測試數</span><b>${n}</b></div><div><span>不良數</span><b>${x}</b></div><div><span>觀察不良率</span><b>${ctPct(r.rate)}</b></div><div><span>p 值</span><b>${fmtP(r.p)}</b></div></div>
        ${r.pass ? `<div class="ct-report"><b>報告寫法（參考）</b>抽樣 ${n} 個，不良 ${x} 個；以精確二項法（Clopper-Pearson）計算，不良率單邊 ${cpc}% 信賴上限為 ${ctPct(r.upper)}，低於允收標準 ${ctPct(r.p0)}，判定符合。</div>` : ""}
        <p class="hint">前提：樣本要能代表整批（隨機抽樣、涵蓋不同批次與時段）。計算方法：精確二項檢定與 Clopper-Pearson 信賴上限，不用常態近似，件數少也準確；已與 SciPy 比對確效。</p>`;
      title = `不良率對目標 ${ctPct(r.p0)} · ${cpc}% 信心`;
      table = `<tbody><tr><td>測試數 n／不良數 x</td><td class="num">${n} ／ ${x}</td></tr><tr><td>觀察不良率 x／n</td><td class="num">${ctPct(r.rate)}</td></tr>
        <tr><td>單邊 ${cpc}% 信賴上限（Clopper-Pearson）</td><td class="num">${ctPct(r.upper)}</td></tr><tr><td>雙邊 ${cpc}% 信賴區間</td><td class="num">${ctPct(r.ci[0])} ～ ${ctPct(r.ci[1])}</td></tr>
        <tr><td>目標不良率 p₀</td><td class="num">${ctPct(r.p0)}</td></tr><tr><td>精確二項 p 值（H₁：p &lt; p₀）＝ P(X ≤ ${x} | n=${n}, p₀)</td><td class="num">${fmtP(r.p)}</td></tr>
        <tr><td>判定</td><td class="num">${r.pass ? "上限 < 目標 → 符合" : "上限 ≥ 目標 → 尚不能宣稱"}</td></tr><tr><td>0 不良時至少要測</td><td class="num">${n0} 個</td></tr></tbody>`;
    } else {
      const M = CT.M.map(r => r.map(v => Number(v)));
      if (CT.M.some(r => r.some(v => v === "" || v == null))) { hint.textContent = "每一格都要填件數（沒有就填 0）。"; return; }
      if (M.some(r => r.some(v => !Number.isInteger(v) || v < 0))) { hint.textContent = "件數要是 0 或正整數。"; return; }
      const r = HT.chi2Table(M, conf); if (r.error) { hint.textContent = r.error; return; }
      const alpha = 1 - conf, sig = r.pMain < alpha, rows = CT.rows, cols = CT.cols, two = r.R === 2 && r.C === 2;
      CT.result = Object.assign({ kind: "tab", rows: rows.slice(), cols: cols.slice(), M, alpha, sig }, r);
      const pill = sig ? `<span class="pill sig">有差</span>` : `<span class="pill">看不出有差</span>`;
      const rate = i => M[i][0] / r.rs[i];
      let head = "", detail = "";
      if (two) {
        const d = rate(0) - rate(1);
        head = `${esc(rows[0])}的${esc(cols[0])}率 ${ctPct(rate(0))}，${esc(rows[1])} ${ctPct(rate(1))}，相差 <b>${(Math.abs(d) * 100).toFixed(Math.abs(d) < 0.1 ? 2 : 1)} 個百分點</b>（${cpc}% 信賴區間 ${(r.diffCI[0] * 100).toFixed(2)} ～ ${(r.diffCI[1] * 100).toFixed(2)} 個百分點）。`;
      } else head = `比較 ${r.R} 組、${r.C} 種結果，各組的比例${sig ? "不一樣" : "目前看不出不一樣"}。`;
      const pTxt = `p = ${fmtP(r.pMain)}：如果各組其實一樣，只因抽樣運氣就出現這麼大（或更大）差異的機率${r.pMain < 0.001 ? "不到 0.1%" : "約 " + ctPct(r.pMain)}；${sig ? `低於 ${alpha.toFixed(2)}，判定有差` : `不低於 ${alpha.toFixed(2)}，不能說有差`}。`;
      if (sig) {
        const cand = [];
        M.forEach((row, i) => row.forEach((o, j) => { if (two && j > 0) return; const a = r.adjRes[i][j]; if (Math.abs(a) >= 1.96) cand.push({ i, j, o, a }); }));
        cand.sort((p, q) => Math.abs(q.a) - Math.abs(p.a));
        if (cand.length) detail = `<div class="ct-why"><b>差異主要來自</b><ul>${cand.slice(0, 4).map(c => `<li>${esc(rows[c.i])}的「${esc(cols[c.j])}」比預期<b>${c.a > 0 ? "多" : "少"}</b>：實際 ${c.o}，如果各組一樣約 ${r.E[c.i][c.j].toFixed(1)}。</li>`).join("")}</ul></div>`;
      }
      const methodNote = r.method === "fisher" ? `<div class="note">有格子的期望次數小於 5（件數太少），已自動改用 <b>Fisher 精確檢定</b>，小樣本時較準確。</div>`
        : !r.lowOk ? `<div class="note warn">有 ${r.nLow} 格的期望次數小於 5（占 ${Math.round(r.fracLow * 100)}%），卡方結果可能不準。建議把少見的類別合併（例如併成「其他」），或增加樣本。</div>` : "";
      const notSig = sig ? "" : `<div class="ct-why"><b>注意</b>「看不出有差」不等於「證明一樣」。可能只是件數不夠多。要證明一樣，要事先訂出可接受的差異，通常需要更多樣本。</div>`;
      html = `<div class="verdict">${pill}<p class="big">${head}</p><p>${pTxt}</p></div>${methodNote}
        <div class="chart-wrap">${ctDrawTab(r, rows, cols)}</div>${detail}${notSig}
        <div class="kv"><div><span>總件數</span><b>${r.N}</b></div><div><span>${r.method === "fisher" ? "Fisher p 值" : "卡方 p 值"}</span><b>${fmtP(r.pMain)}</b></div><div><span>χ²（自由度）</span><b>${r.chi2.toFixed(3)}（${r.df}）</b></div><div><span>關聯強度 V</span><b>${r.cramerV.toFixed(3)}</b></div></div>
        <div class="ct-why"><b>有差，原因不一定是組別本身</b>如果兩組的生產時間、原料批號、檢驗人員不同，差異也可能來自這些條件。下結論前先確認比較的條件一致。</div>
        <p class="hint">計算方法：${r.method === "fisher" ? "Fisher 精確檢定（雙尾）" : "Pearson 卡方獨立性檢定（不做連續性校正）"}${two ? "；兩比例差的信賴區間用 Newcombe 法" : ""}；「差異主要來自」依校正殘差 |z| ≥ 1.96 判斷。已與 SciPy 比對確效。</p>`;
      title = `${r.R} 組 × ${r.C} 種結果 · ${r.method === "fisher" ? "Fisher 精確檢定" : "卡方檢定"}`;
      table = `<thead><tr><th>組別</th>${cols.map(c => `<th class="num">${esc(c)}<br><small>實際（若無差的期望）［校正殘差］</small></th>`).join("")}<th class="num">合計</th></tr></thead><tbody>` +
        M.map((row, i) => `<tr><td>${esc(rows[i])}</td>${row.map((o, j) => `<td class="num">${o}（${r.E[i][j].toFixed(2)}）［${r.adjRes[i][j] >= 0 ? "+" : ""}${r.adjRes[i][j].toFixed(2)}］</td>`).join("")}<td class="num">${r.rs[i]}</td></tr>`).join("") +
        `<tr><td>合計</td>${r.cs.map(v => `<td class="num">${v}</td>`).join("")}<td class="num">${r.N}</td></tr></tbody>
        <tbody><tr><td>卡方 χ²／自由度／p</td><td class="num" colspan="${r.C + 1}">${r.chi2.toFixed(4)}／${r.df}／${fmtP(r.p)}</td></tr>
        ${two ? `<tr><td>Fisher 精確 p（雙尾）／勝算比</td><td class="num" colspan="${r.C + 1}">${fmtP(r.fisher.p)}／${isFinite(r.fisher.oddsRatio) ? r.fisher.oddsRatio.toFixed(3) : "∞"}</td></tr><tr><td>${esc(cols[0])}率差（${esc(rows[0])} − ${esc(rows[1])}）${cpc}% CI（Newcombe）</td><td class="num" colspan="${r.C + 1}">${ctPct(r.diffCI[0])} ～ ${ctPct(r.diffCI[1])}</td></tr>` : ""}
        <tr><td>最小期望次數／小於 5 的格數</td><td class="num" colspan="${r.C + 1}">${r.minE.toFixed(2)}／${r.nLow}</td></tr><tr><td>Cramér's V</td><td class="num" colspan="${r.C + 1}">${r.cramerV.toFixed(4)}</td></tr></tbody>`;
    }
    $("ctTitle").textContent = title; $("ctOut").innerHTML = html; $("ctTable").innerHTML = table; $("ctSheets").hidden = false;
    noteResultChanged();
  }
  function ctFormText() {
    if (CT.q === "one") return `問題：不良率有沒有低於目標\n測試數：${$("ctN").value || "未填"}\n不良數：${$("ctX").value || "未填"}\n目標不良率：${$("ctP0").value || "未填"}%\n信心水準：${$("ctConf").value}`;
    return `問題：兩組以上的比例或類別分布有沒有差\n結果類別：${CT.cols.join("、")}\n` + CT.rows.map((r, i) => `${r}：${CT.M[i].map((v, j) => CT.cols[j] + " " + (v === "" ? "未填" : v)).join("、")}`).join("\n");
  }
  function ctContext() {
    const r = CT.result; if (!r) return ctFormText();
    if (r.kind === "one") return `【次數資料：單一不良率對目標】\n測試數 ${r.n}，不良 ${r.x}，觀察不良率 ${ctPct(r.rate)}\n目標不良率 ${ctPct(r.p0)}，信心水準 ${Math.round(r.conf * 100)}%\n單邊信賴上限（Clopper-Pearson）${ctPct(r.upper)}；雙邊區間 ${ctPct(r.ci[0])}～${ctPct(r.ci[1])}\n精確二項 p 值（H1: p < p0）${fmtP(r.p)}\n判定：${r.pass ? "上限低於目標，可以宣稱" : "上限不低於目標，還不能宣稱"}；同 n 下最多可有 ${r.maxX} 個不良`;
    return `【次數資料：列聯表】\n結果類別：${r.cols.join("、")}\n` + r.rows.map((x, i) => `${x}：${r.M[i].map((v, j) => `${r.cols[j]} ${v}（期望 ${r.E[i][j].toFixed(2)}，校正殘差 ${r.adjRes[i][j].toFixed(2)}）`).join("、")}`).join("\n") +
      `\n方法：${r.method === "fisher" ? "Fisher 精確檢定（期望次數 < 5，自動改用）" : "Pearson 卡方"}；χ² = ${r.chi2.toFixed(4)}，df = ${r.df}，卡方 p = ${fmtP(r.p)}${r.fisher ? `，Fisher p = ${fmtP(r.fisher.p)}，比例差 CI ${ctPct(r.diffCI[0])}～${ctPct(r.diffCI[1])}` : ""}\n主要 p = ${fmtP(r.pMain)}，α = ${r.alpha.toFixed(2)}，判定：${r.sig ? "有差" : "看不出有差"}\nCramér's V = ${r.cramerV.toFixed(3)}；最小期望次數 ${r.minE.toFixed(2)}，期望 < 5 的格數 ${r.nLow}${r.lowOk ? "" : "（卡方近似可能不準）"}`;
  }

  // ---------- 事件 ----------
  (function ctInit() {
    if (!$("subCount")) return;
    try { $("ctLearn").href = LEARN_URL.replace(/#s2$/, "#s4"); } catch (_) {}
    ctGrid(); ctSave();
    $("ctQ").addEventListener("click", e => { const b = e.target.closest("[data-ctq]"); if (b) ctSetQ(b.dataset.ctq); });
    $("subCount").addEventListener("click", e => { const b = e.target.closest("[data-ctex]"); if (b) ctExample(b.dataset.ctex); });
    $("ctRun").addEventListener("click", ctRun);
    $("ctAddRow").addEventListener("click", () => { if (CT.rows.length >= 10) return; CT.rows.push(String.fromCharCode(65 + CT.rows.length) + " 組"); CT.M.push(CT.cols.map(() => "")); ctGrid(); ctSave(); });
    $("ctAddCol").addEventListener("click", () => { if (CT.cols.length >= 8) return;   // 新類別放在「良品」之前
      const at = CT.cols.length - (ctGood(CT.cols[CT.cols.length - 1]) ? 1 : 0);
      CT.cols.splice(at, 0, "類別 " + (CT.cols.length + 1)); CT.M.forEach(r => r.splice(at, 0, "")); ctGrid(); ctSave(); });
    const grid = $("ctGrid");
    grid.addEventListener("input", e => { const t = e.target;
      if (t.dataset.rn != null) CT.rows[+t.dataset.rn] = t.value; else if (t.dataset.cn != null) CT.cols[+t.dataset.cn] = t.value;
      else if (t.dataset.r != null) { CT.M[+t.dataset.r][+t.dataset.c] = t.value === "" ? "" : Number(t.value); ctTotals(); }
      ctSave(); });
    grid.addEventListener("click", e => { const b = e.target.closest(".ct-del"); if (!b) return;
      if (b.dataset.dr != null) { const i = +b.dataset.dr; CT.rows.splice(i, 1); CT.M.splice(i, 1); } else { const j = +b.dataset.dc; CT.cols.splice(j, 1); CT.M.forEach(r => r.splice(j, 1)); }
      ctGrid(); ctSave(); });
    grid.addEventListener("paste", e => {   // 從 Excel 貼上一塊數字：由目前格子往右下填入
      const t = e.target; if (t.dataset.r == null) return; const txt = (e.clipboardData || window.clipboardData).getData("text"); if (!/[\t\n]/.test(txt)) return;
      e.preventDefault(); const lines = txt.replace(/\r/g, "").split("\n").filter(l => l.trim() !== ""), r0 = +t.dataset.r, c0 = +t.dataset.c;
      lines.forEach((l, di) => l.split("\t").forEach((v, dj) => { const i = r0 + di, j = c0 + dj; if (i < CT.rows.length && j < CT.cols.length) { const n = Number(v.trim()); CT.M[i][j] = v.trim() === "" || !isFinite(n) ? "" : n; } }));
      ctGrid(); ctSave(); });
    $("ctData").addEventListener("input", ctLoadData);
  })();
