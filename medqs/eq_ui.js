  // =====================================================================
  // 樣本數規劃：問題導向入口＋同等性（TOST）與不劣性
  // 使用者先選「要回答的問題」，程式對應到計算方法；原本的計算機分頁收在「進階」。
  // 統計計算全部在 sample.js（SS.tostPower / niPower …），這裡只處理介面。
  // =====================================================================
  const SSQ = {
    q1: { sub: "power", title: "① 改善後有沒有變好？兩條線、兩家料有沒有差？", prep: ["這個特性平常的波動（σ）：歷史數據、SPC、預試驗", "要抓到的最小差異（Δ）：差多少才值得採取行動", "只關心變好（或變差）一個方向時選「單尾」，要在試驗前決定"], note: "這題是要「證明有差」。如果要證明轉廠、換料後「一樣」，請改選 ②。", set: () => { pkClick('#pwDesign [data-v="two"]'); pkClick('#pwSolve [data-v="n"]'); } },
    q2: { sub: "tost", title: "② 轉廠、換料、換設備後，一樣嗎？", prep: ["差多少以內算一樣（δ）：工程判斷，要寫下依據", "這個特性平常的波動（σ）：舊廠歷史數據、SPC、預試驗", "量完後看平均差的 90% 信賴區間是否整條落在 ±δ 內"], note: "不能用「p > 0.05」證明一樣；要用同等性（TOST）。" },
    q3: { sub: "ni", title: "③ 換了之後，不會變差吧？", prep: ["這個特性是越大越好（強度）還是越小越好（洩漏、毛邊）", "最多可以接受變差多少（δ）：工程判斷，要寫下依據", "這個特性平常的波動（σ）"], note: "只在意「不能變差」、變好沒關係時用；比同等性需要的數量少。" },
    q4: { sub: "power", title: "④ 平均有沒有達到目標值？", prep: ["這個特性平常的波動（σ）", "和目標差多少才算有意義（Δ）", "成對資料（同一件前後量測）也用這題，σ 為差值的標準差"], note: "", set: () => { pkClick('#pwDesign [data-v="one"]'); pkClick('#pwSolve [data-v="n"]'); } },
    q5: { sub: "attr", title: "⑤ 要測幾個全過，才能宣稱可靠度？", prep: ["要宣稱的可靠度與信心水準（例如 95/95），依風險等級與公司程序決定", "允許失效數：0 個最常用；允許越多，要測越多"], note: "", set: () => pkClick('#atMode [data-v="plan"]') },
    q6: { sub: "attr", title: "⑥ 現有抽樣方案（n、Ac）能宣稱什麼？", prep: ["抽樣方案的樣本數 n 與允收數 Ac（例如從 ISO 2859-1 查出）", "AQL（選填）"], note: "AQL 不是可宣稱的可靠度，結果頁會分開說明。", set: () => pkClick('#atMode [data-v="eval"]') },
    q7: { sub: "prop", title: "⑦ 不良率有沒有低於目標？兩邊不良率有沒有差？", prep: ["目標不良率或兩組的預期不良率（歷史資料或規格）"], note: "不良率很低時，需要的數量通常很大；可考慮改用計量型特性。" },
    q8: { sub: "tolp", title: "⑧ 要測幾個，才能宣稱 99% 產品落在規格內？", prep: ["涵蓋比例與信心水準（例如 99%／95%）", "預期平均與標準差（前期數據）、規格界限"], note: "數據量完後，到「假設檢定・統計允差區間」計算。" },
    q9: { sub: "doer", title: "⑨ 實驗要重複幾次？", prep: ["設計（例如全因子 2³）", "重複量測的波動（σ）與要偵測的效應（Δ）"], note: "" },
    q10: { sub: "guide", title: "⑩ MSA、SPC 要收多少？", prep: [], note: "以下是業界手冊與常見做法的建議數量。" },
    q11: { sub: "aql", title: "⑪ 進料、出貨抽檢：抽多少、幾個不良算不合格？", prep: ["批量 N（這一批有多少個）", "檢驗水準：未指定時用一般 II", "AQL：依不良的嚴重程度（主要、次要）由權責單位決定；關鍵不良應全檢"], note: "這是給連續多批的批次檢驗用的（ISO 2859-1:2026）。設計驗證、確效只抽一次時，請改用 ⑤ 或 ⑧。" },
    q12: { sub: "aqlv", title: "⑫ 用量測數值判批次合格，可以少抽一點嗎？", prep: ["規格界限（單邊或雙邊）", "數據要接近常態分布"], note: "計量型 AQL（ISO 3951-1）準備中。" }
  };
  let ssCurQ = "", ssQBusy = false;
  function ssBanner() {
    const b = $("ssQBanner"), q = SSQ[ssCurQ];
    if (!q) { b.hidden = true; return; }
    b.innerHTML = `<b class="t">${esc(q.title)}</b>${q.prep.length ? `<div class="hint">這題要準備：</div><ul>${q.prep.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}${q.note ? `<div class="hint">${esc(q.note)}</div>` : ""}`;
    b.hidden = false;
  }
  function ssPick(q, opts) {
    const d = SSQ[q]; if (!d) return;
    ssCurQ = q;
    $("ssQ").querySelectorAll("[data-q]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.q === q)));
    ssQBusy = true; setSampleSub(d.sub); ssQBusy = false;
    if (d.set && !(opts && opts.keep)) d.set();
    ssBanner(); ssTileMark();
    if (!(opts && opts.noScroll)) $("ssTilesCard").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  // 從進階分頁或其他頁面切換時，同步到對應的問題
  function ssSyncFromSub(s) {
    if (ssQBusy) return;
    if (SSQ[ssCurQ] && SSQ[ssCurQ].sub === s) return;
    const q = s === "power" ? (($("pwDesign").querySelector('[aria-pressed="true"]') || {}).dataset || {}).v === "one" ? "q4" : "q1"
      : s === "attr" ? ((($("atMode").querySelector('[aria-pressed="true"]') || {}).dataset || {}).v === "eval" ? "q6" : "q5")
      : { tost: "q2", ni: "q3", prop: "q7", tolp: "q8", doer: "q9", guide: "q10", aql: "q11", aqlv: "q12" }[s];
    if (q) { ssCurQ = q; $("ssQ").querySelectorAll("[data-q]").forEach(x => x.setAttribute("aria-pressed", String(x.dataset.q === q))); ssBanner(); }
    ssTileMark();
  }
  function ssRestoreQ(q, sub) {
    if (SSQ[q]) ssPick(q, { keep: true, noScroll: true });
    else if (sub) { ssSyncFromSub(sub); }
  }
  $("ssQ").addEventListener("click", e => {
    const b = e.target.closest("[data-q]"); if (b) { ssPick(b.dataset.q); return; }
    if (e.target.closest("#ssAdvBtn")) {
      const t = $("ssTabs"), open = t.hidden; t.hidden = !open; $("ssAdvBtn").setAttribute("aria-expanded", String(open));
      $("ssAdvBtn").querySelector(".ssq-t").textContent = open ? "直接選統計方法 ▾" : "直接選統計方法 ▸";
      if (open && !ssCurQ) ssPick("q1", { noScroll: true });
    }
  });
  $("ssTabs").addEventListener("click", e => { const b = e.target.closest("[data-tsub]"); if (b) ssSyncFromSub(b.dataset.tsub); });

  // ---------------- 同等性（TOST）與不劣性：表單 ----------------
  const EQ_BASIS = [["", "請選擇 δ 的依據"], ["func", "功能／臨床影響"], ["cust", "客戶或下游要求"], ["proc", "舊廠（現行）製程變異"], ["msa", "量測能力（MSA）"], ["spec", "規格或內控標準"], ["other", "其他（請說明）"]];
  function eqFormHtml(p, kind) {
    const ni = kind === "ni";
    return `<div class="grid">
      <main class="card" id="${p}Panel" style="border-top:6px solid var(--teal)"><div class="step">
        <span class="qref">設定</span><h2 class="q">${ni ? "換了之後不會變差：要測幾個" : "變更後一樣嗎：要測幾個"}</h2>
        <p class="help">${ni ? "只在意「新的不能比現行差超過 δ」，變好沒關係（不劣性，單邊）。" : "要證明新、舊兩邊「差異小到可以接受」（同等性 TOST）：量完後平均差的 90% 信賴區間整條落在 ±δ 內，才能宣稱同等。"}</p>
        <div class="fields">
          <div class="field"><label for="${p}Name">要比的特性</label><input id="${p}Name" type="text" autocomplete="off" placeholder="例如：射出件內徑"></div>
          <div class="field"><label for="${p}Unit">單位</label><input id="${p}Unit" type="text" autocomplete="off" placeholder="例如：mm"></div>
          <div class="field"><label for="${p}D">比較方式</label><select id="${p}D"><option value="two" selected>兩組獨立（新、舊各自抽樣）</option><option value="one">成對（同一批料分兩邊做、同一件量兩次）</option></select></div>
          ${ni ? `<div class="field"><label for="${p}Dir">這個特性</label><select id="${p}Dir"><option value="higher" selected>越大越好（例如強度）</option><option value="lower">越小越好（例如洩漏量、毛邊）</option></select></div>` : ""}
        </div>
        <div class="field" style="margin-top:10px"><label for="${p}Delta">${ni ? "最多可以接受變差多少？　δ" : "差多少以內算「一樣」？　± δ"}</label><input id="${p}Delta" type="number" step="any" min="0" inputmode="decimal" placeholder="必填，由你們決定"><small>工程判斷，要在量測前寫進驗證計畫書；AI 不提供這個數字</small>
          <div class="eq-basis"><select id="${p}Basis" aria-label="δ 的依據">${EQ_BASIS.map(o => `<option value="${o[0]}">${o[1]}</option>`).join("")}</select><input id="${p}BasisNote" type="text" autocomplete="off" placeholder="依據說明，例如：內徑差 0.02 mm 內不影響組裝（依組裝驗證）" aria-label="δ 依據說明"></div></div>
        <div class="field" style="margin-top:10px"><label for="${p}Sd">這個特性平常的波動有多大？　σ</label><input id="${p}Sd" type="number" step="any" min="0" inputmode="decimal" placeholder="必填"><small>來自${ni ? "現行" : "舊廠"}歷史數據、SPC、MSA 或預試驗；成對比較時是「差值」的標準差</small>
          <div class="run-row" style="margin-top:6px"><button type="button" class="btn small" id="${p}SdBtn">貼上舊數據幫我算</button></div>
          <div class="eq-paste" id="${p}SdBox" hidden><textarea id="${p}SdData" rows="4" spellcheck="false" placeholder="每列一個值；多欄時每欄視為一組，計算合併標準差"></textarea><div class="run-row"><button type="button" class="btn small" id="${p}SdCalc">計算標準差</button><span class="hint" id="${p}SdHint"></span></div></div></div>
        <div class="fields" style="margin-top:6px">
          <div class="field"><label for="${p}True">預期新、舊的真實差異</label><input id="${p}True" type="number" step="any" value="0" inputmode="decimal"><small>${ni ? "不知道就用 0；預期會稍微變差時填負值（越大越好）" : "不知道就用 0；預期有偏移時填入，需要的數量會變多"}</small></div>
          <div class="field"><label for="${p}Tol">規格公差寬度（選填）</label><input id="${p}Tol" type="number" step="any" min="0" inputmode="decimal" placeholder="例如 ±0.10 填 0.20"><small>填了會顯示 δ 佔公差的比例</small></div>
        </div>
        <details class="eq-adv"><summary>進階（一般不用改）：風險與把握</summary><div class="fields" style="margin-top:8px">
          <div class="field"><label for="${p}Alpha">${ni ? "把「變差」誤判成「沒變差」的風險（α，單邊）" : "把「不一樣」誤判成「一樣」的風險（α，每一邊）"}</label><select id="${p}Alpha"><option value="0.025">2.5%</option><option value="0.05" selected>5%</option><option value="0.10">10%</option></select></div>
          <div class="field"><label for="${p}Power">${ni ? "真的沒變差時，能成功證明的把握" : "真的一樣時，能成功證明的把握"}（檢定力）</label><select id="${p}Power"><option value="0.8">80%</option><option value="0.9" selected>90%</option><option value="0.95">95%</option></select></div>
        </div></details>
        <ul class="mp-check" id="${p}Check" style="margin-top:10px"></ul>
        <div class="run-row"><button class="btn primary" id="${p}Run" type="button">計算</button><span class="hint" id="${p}Hint"></span></div>
      </div></main>
      <aside class="card preview" data-ask="${ni ? "不劣性樣本數結果" : "同等性樣本數結果"}"><div class="preview-head"><span class="filename"><span class="tag">RESULT</span> <b id="${p}Title">尚未計算</b></span><span class="ask-slot"></span></div><div class="preview-body" id="${p}Out"><p class="help">填好條件後按「計算」。</p></div></aside>
    </div>
    <div class="sheets" id="${p}Sheets" hidden>
      <section class="card sheet" data-ask="${ni ? "不劣性" : "同等性"}：不同樣本數的把握"><h3>不同樣本數的把握（檢定力）</h3><div class="chart-wrap" id="${p}Chart"></div><div class="scroll-x"><table id="${p}Table"></table></div><p class="hint">樣本數只是統計估算的下限，實際數量還需依風險、法規與公司程序決定。</p></section>
      <section class="card sheet" id="${p}SheetRec" hidden data-ask="量測記錄表"><h3>量測記錄表</h3><p class="help" id="${p}RecHelp"></p><div class="scroll-x"><table id="${p}Rec"></table></div><div class="run-row"><button type="button" class="btn small" id="${p}RecCopy">複製表格（貼到 Excel）</button><span class="hint" id="${p}RecHint"></span></div></section>
    </div>`;
  }
  (() => {
    const anchor = $("viewSample").querySelector('[data-tview="guide"]');
    [["eq", "tost"], ["ni", "ni"]].forEach(([p, k]) => { const d = document.createElement("div"); d.dataset.tview = k; d.hidden = true; d.innerHTML = eqFormHtml(p, k); anchor.before(d); });
  })();

  const eqRead = p => ({
    design: $(p + "D").value, dir: $(p + "Dir") ? $(p + "Dir").value : null,
    name: $(p + "Name").value.trim(), unit: $(p + "Unit").value.trim(),
    delta: inNum(p + "Delta"), sd: inNum(p + "Sd"), tr: inNum(p + "True"), tol: inNum(p + "Tol"),
    basis: $(p + "Basis").value, basisNote: $(p + "BasisNote").value.trim(),
    alpha: +$(p + "Alpha").value, target: +$(p + "Power").value
  });
  function eqCheck(p, kind) {
    const m = eqRead(p), o = [], bad = x => o.push({ lv: "bad", m: x }), warn = x => o.push({ lv: "warn", m: x }), ok = x => o.push({ lv: "ok", m: x });
    const u = m.unit ? " " + m.unit : "";
    if (m.delta == null) bad("請填 δ：這是工程判斷，要由你們決定並寫下依據。"); else if (!(m.delta > 0)) bad("δ 要是大於 0 的數字。");
    if (m.sd == null) bad("請填 σ：要來自歷史數據、SPC、MSA 或預試驗。"); else if (!(m.sd > 0)) bad("σ 要是大於 0 的數字。");
    if (m.tr != null && isNaN(m.tr)) bad("預期真實差異要是數字（不知道就填 0）。");
    if (m.delta > 0 && m.sd > 0) {
      const tr = m.tr || 0;
      if (kind === "tost" && Math.abs(tr) >= m.delta) bad("預期真實差異已經達到 δ，樣本再多也無法證明同等。");
      else if (kind === "ni" && (m.dir === "lower" ? tr >= m.delta : tr <= -m.delta)) bad("預期新的已經比現行差到 δ 以上，樣本再多也無法證明不劣。");
      else ok(`δ = ${nf(m.delta)}${u}、σ = ${nf(m.sd)}${u}（δ／σ = ${fmt(m.delta / m.sd, 2)}）`);
      if (m.delta / m.sd < 0.25) warn("δ 比平常的波動小很多，需要的數量會非常大；可考慮改善量測（降低 σ）或重新檢討 δ*。");
    }
    if (!m.basis) warn("請選 δ 的依據，並寫下說明；稽核最常追問「δ 為什麼合理」。");
    else if (m.basis === "other" && !m.basisNote) warn("依據選「其他」時請寫說明。");
    if (m.tol != null && m.tol > 0 && m.delta > 0) { const r = m.delta / m.tol; (r > 0.25 ? warn : ok)(`δ 約為公差寬度的 ${fmt(r * 100, 0)}%${r > 0.25 ? "：δ 偏寬時，平均相當仍可能有部分產品超規格，請另外確認製程能力（Cpk）或允差區間*" : ""}`); }
    warn("δ 不要小於量具能分辨的程度（看 MSA）*。");
    if (kind === "ni") warn("單邊的方向要在試驗前決定，不能看完數據再改。");
    $(p + "Check").innerHTML = o.map(x => `<li class="mp-${x.lv}"><b>${x.lv === "bad" ? "✗ 不可行" : x.lv === "warn" ? "⚠ 提醒" : "✓"}</b> ${esc(x.m)}</li>`).join("") + `<li class="hint">標 * 的是一般慣例或推論，以公司程序為準。</li>`;
    $(p + "Run").disabled = o.some(x => x.lv === "bad");
    return { m, ok: !o.some(x => x.lv === "bad") };
  }
  ["eq", "ni"].forEach(p => {
    const kind = p === "eq" ? "tost" : "ni", panel = $(p + "Panel");
    panel.addEventListener("input", e => { if (!e.target.closest(".eq-paste")) eqCheck(p, kind); });
    panel.addEventListener("change", e => { if (!e.target.closest(".eq-paste")) eqCheck(p, kind); });
    $(p + "SdBtn").addEventListener("click", () => { $(p + "SdBox").hidden = !$(p + "SdBox").hidden; });
    $(p + "SdCalc").addEventListener("click", () => {
      const r = parseNumRows($(p + "SdData").value), h = $(p + "SdHint");
      if (r.error) { h.innerHTML = `<span class="status ng">${r.error}</span>`; return; }
      const cols = []; r.rows.forEach(row => row.forEach((v, j) => { (cols[j] = cols[j] || []).push(v); }));
      let ss = 0, df = 0, n = 0; cols.forEach(c => { if (c.length >= 2) { const m = c.reduce((a, b) => a + b, 0) / c.length; ss += c.reduce((a, b) => a + (b - m) ** 2, 0); df += c.length - 1; } n += c.length; });
      if (df < 1) { h.innerHTML = `<span class="status ng">至少要 2 個數值。</span>`; return; }
      const s = Math.sqrt(ss / df);
      $(p + "Sd").value = +s.toPrecision(6); $(p + "Sd").dispatchEvent(new Event("input", { bubbles: true }));
      h.textContent = `已填入 σ = ${nf(s, 6)}（${cols.length > 1 ? `${cols.length} 欄合併標準差，` : ""}共 ${n} 個值${n < 20 ? "；數據少於 20 個時 σ 估計不穩定，建議保留餘裕*" : ""}）。`;
    });
    eqCheck(p, kind);
  });

  // ---------------- 計算與結果 ----------------
  const eqPw = (kind, m, n) => kind === "tost" ? SSE.tostPower(m.design, n, m.delta, m.sd, m.alpha, m.tr || 0) : SSE.niPower(m.design, n, m.delta, m.sd, m.alpha, m.tr || 0, m.dir);
  function eqCurve(wrap, kind, m, nMark) {
    const nMax = Math.max(20, Math.ceil(nMark * 2)), pts = [];
    for (let n = 2; n <= nMax; n++) pts.push([n, eqPw(kind, m, n)]);
    const W = 560, H = 250, L = 52, R = 20, T = 14, B = 42, x = n => L + (n - 2) / (nMax - 2) * (W - L - R), y = p => T + (1 - p) * (H - T - B);
    let s = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="不同樣本數的把握">`;
    for (const p of [0, 0.2, 0.4, 0.6, 0.8, 1]) s += `<line x1="${L}" x2="${W - R}" y1="${y(p)}" y2="${y(p)}" stroke="var(--grid)"/><text x="${L - 8}" y="${y(p) + 4}" text-anchor="end" font-size="12" fill="var(--muted)" font-family="var(--font-mono)">${p.toFixed(1)}</text>`;
    const step = nMax <= 30 ? 5 : nMax <= 100 ? 10 : Math.ceil(nMax / 10 / 10) * 10;
    for (let n = 0; n <= nMax; n += step) { const xn = Math.max(2, n); s += `<text x="${x(xn)}" y="${H - B + 18}" text-anchor="middle" font-size="12" fill="var(--muted)" font-family="var(--font-mono)">${xn}</text>`; }
    s += `<text x="${(L + W - R) / 2}" y="${H - 6}" text-anchor="middle" font-size="12" fill="var(--muted)">${m.design === "two" ? "每組樣本數 n" : "配對數 n"}</text>`;
    s += `<line x1="${L}" x2="${W - R}" y1="${y(m.target)}" y2="${y(m.target)}" stroke="var(--copper)" stroke-dasharray="5 4" stroke-width="1.5"/><text x="${W - R}" y="${y(m.target) - 6}" text-anchor="end" font-size="12" font-weight="700" fill="var(--copper-text)">目標 ${m.target}</text>`;
    s += `<path d="${pts.map((p, i) => (i ? "L" : "M") + x(p[0]).toFixed(1) + " " + y(p[1]).toFixed(1)).join("")}" fill="none" stroke="var(--chart-a)" stroke-width="2.5"/>`;
    const pm = eqPw(kind, m, nMark); s += `<circle cx="${x(nMark)}" cy="${y(pm)}" r="5.5" fill="var(--surface)" stroke="var(--chart-a)" stroke-width="2.5"/><text x="${x(nMark) + 9}" y="${y(pm) + 16}" font-size="12.5" font-weight="700" fill="var(--ink)">n = ${nMark}，${fmt(pm, 3)}</text>`;
    wrap.innerHTML = s + `<line x1="${L}" x2="${L}" y1="${T}" y2="${H - B}" stroke="var(--line)"/></svg>`;
  }
  function eqRun(p) {
    const kind = p === "eq" ? "tost" : "ni", c = eqCheck(p, kind), m = c.m, hint = $(p + "Hint");
    hint.textContent = ""; if (!c.ok) { hint.innerHTML = `<span class="status ng">還有缺少或不可行的設定（✗），請補上。</span>`; return; }
    const n = kind === "tost" ? SSE.tostN(m.design, m.delta, m.sd, m.alpha, m.target, m.tr || 0) : SSE.niN(m.design, m.delta, m.sd, m.alpha, m.target, m.tr || 0, m.dir);
    if (!isFinite(n)) { hint.innerHTML = `<span class="status ng">需要的數量超過 100000，請重新檢討 δ 或降低 σ。</span>`; return; }
    const pw = eqPw(kind, m, n), u = m.unit ? " " + m.unit : "", two = m.design === "two", nm = m.name || "這個特性";
    const plan = { q: kind === "tost" ? "equiv" : "noninf", design: m.design, dir: m.dir, name: m.name, unit: m.unit, delta: m.delta, basis: m.basis, basisNote: m.basisNote, sd: m.sd, trueDiff: m.tr || 0, alpha: m.alpha, target: m.target, n, power: pw };
    TQ[kind] = Object.assign({}, m, { kind, n, power: pw, plan });
    const big = two ? `各量 ${n} 件<small>新、舊各 ${n} 件，共 ${2 * n} 件</small>` : `量 ${n} 對<small>成對比較</small>`;
    const rule = kind === "tost"
      ? `量完後，平均差（新 − 舊）的 ${fmt((1 - 2 * m.alpha) * 100, 0)}% 信賴區間整條落在 ±${nf(m.delta)}${u} 內，就能宣稱同等。`
      : (m.dir === "lower" ? `量完後，平均差（新 − 舊）的 ${fmt((1 - m.alpha) * 100, 1).replace(/\.0$/, "")}% 單邊信賴上限小於 +${nf(m.delta)}${u}，就能宣稱沒有變差超過 δ。` : `量完後，平均差（新 − 舊）的 ${fmt((1 - m.alpha) * 100, 1).replace(/\.0$/, "")}% 單邊信賴下限大於 −${nf(m.delta)}${u}，就能宣稱沒有變差超過 δ。`);
    const mIni = Math.max(2, Math.round(n * 0.6));
    $(p + "Title").textContent = (kind === "tost" ? "同等性（TOST）" : "不劣性") + ` · ${two ? "兩組獨立" : "成對"} · α = ${m.alpha}`;
    $(p + "Out").innerHTML = `<div class="verdict"><div class="bignum">${big}</div>
      <p class="big">${esc(rule)}${(m.tr || 0) === 0 ? `若${kind === "tost" ? "兩邊真的一樣" : "真的沒有變差"}，` : `若真實差異為 ${nf(m.tr)}${u}，`}成功證明的把握約 ${fmt(pw * 100, 0)}%。</p></div>
      <div class="kv"><div><span>${esc(nm)}　δ</span><b>${kind === "tost" ? "±" : ""}${nf(m.delta)}${esc(u)}</b></div><div><span>σ</span><b>${nf(m.sd)}${esc(u)}</b></div><div><span>δ／σ</span><b>${fmt(m.delta / m.sd, 3)}</b></div><div><span>把握（檢定力）</span><b>${fmt(pw, 3)}</b></div></div>
      ${m.basis ? `<p class="hint">δ 的依據：${esc(EQ_BASIS.find(o => o[0] === m.basis)[1])}${m.basisNote ? "——" + esc(m.basisNote) : ""}</p>` : `<p class="hint" style="color:var(--bad)">尚未填寫 δ 的依據。</p>`}
      <div class="eq-slider"><b>如果只能${two ? "各量" : "量"} <span id="${p}SlN">${mIni}</span> ${two ? "件" : "對"}呢？</b><input type="range" id="${p}Sl" min="2" max="${Math.max(n + 20, 2 * n)}" value="${mIni}" aria-label="可量測的數量"><span id="${p}SlTxt"></span></div>
      <div class="eq-next"><button type="button" class="btn primary small" id="${p}RecBtn">產生量測記錄表</button></div>
      <p class="hint">量完後的同等性／不劣性判定，會在下一版加入「假設檢定」，並自動帶入這次的規劃條件；目前規劃已隨案件保存。</p>
      <p class="hint">計算方法：${kind === "tost" ? "兩個單尾 t 檢定（TOST，Schuirmann 1987）的精確檢定力，對樣本標準差的分布做數值積分" : "單邊 t 檢定的精確檢定力（非中心 t 分布）"}；已與 SciPy 獨立計算${kind === "tost" ? "及模擬" : ""}比對確效。假設資料近似常態${two ? "、兩組標準差相同" : ""}。</p>`;
    const sl = $(p + "Sl"), upd = () => {
      const k = +sl.value, pk = eqPw(kind, m, k);
      const dmin = kind === "tost" ? SSE.tostDelta(m.design, k, m.sd, m.alpha, m.target, m.tr || 0) : SSE.niDelta(m.design, k, m.sd, m.alpha, m.target, m.tr || 0, m.dir);
      $(p + "SlN").textContent = k;
      $(p + "SlTxt").innerHTML = `成功證明的把握約 <b style="color:${pk >= m.target ? "var(--good)" : "var(--copper-text)"}">${fmt(pk * 100, 0)}%</b>${pk < m.target && isFinite(dmin) ? `；要維持 ${fmt(m.target * 100, 0)}%，δ 至少要 ${nf(dmin, 4)}${esc(u)}，或用更準的量測降低 σ。` : "。"}`;
    };
    sl.addEventListener("input", upd); upd();
    $(p + "RecBtn").addEventListener("click", () => eqRecord(p, kind));
    eqCurve($(p + "Chart"), kind, m, n);
    const ns = [...new Set([Math.max(2, Math.round(n / 2)), Math.max(2, n - 2), Math.max(2, n - 1), n, n + 1, n + 2, Math.round(n * 1.5), 2 * n])].sort((a, b) => a - b);
    $(p + "Table").innerHTML = `<thead><tr><th class="num">${two ? "每組 n" : "配對數 n"}</th><th class="num">把握（檢定力）</th><th>判讀</th></tr></thead><tbody>` + ns.map(k => { const v = eqPw(kind, m, k); return `<tr class="${k === n ? "hl" : ""}"><td class="num">${k}</td><td class="num">${fmt(v, 3)}</td><td>${v >= m.target ? "達到目標" : "未達目標"}</td></tr>`; }).join("") + "</tbody>";
    $(p + "Sheets").hidden = false; $(p + "SheetRec").hidden = true;
    TQ[kind].ctx = [`${kind === "tost" ? "同等性（TOST）" : "不劣性"}樣本數：${two ? "兩組獨立" : "成對"}${kind === "ni" ? `；特性${m.dir === "lower" ? "越小越好" : "越大越好"}` : ""}`,
      `特性：${m.name || "未填"}（單位 ${m.unit || "未填"}）；δ=${m.delta}；σ=${m.sd}；預期真實差異=${m.tr || 0}；α=${m.alpha}${kind === "tost" ? "（每一邊）" : "（單邊）"}；目標檢定力=${m.target}`,
      `δ 的依據：${m.basis ? EQ_BASIS.find(o => o[0] === m.basis)[1] : "未填"}${m.basisNote ? "；" + m.basisNote : ""}${m.tol ? `；規格公差寬度 ${m.tol}（δ 約為 ${fmt(m.delta / m.tol * 100, 0)}%）` : ""}`,
      `所需樣本數：${two ? "每組 " : ""}${n}${two ? "（共 " + 2 * n + "）" : "（對）"}；檢定力 ${fmt(pw, 4)}`,
      "不同樣本數的檢定力：" + ns.map(k => `n=${k}:${fmt(eqPw(kind, m, k), 3)}`).join("，"),
      kind === "tost" ? "判定規則：平均差的 (1−2α) 信賴區間整條落在 ±δ 內則宣稱同等。計算：TOST 精確檢定力（數值積分）。" : "判定規則：單邊信賴界限未越過 δ 則宣稱不劣。計算：非中心 t 分布。"].join("\n");
    toolChanged("sample");
  }
  function eqRecord(p, kind) {
    const r = TQ[kind]; if (!r) return;
    const two = r.design === "two", u = r.unit ? `（${r.unit}）` : "", head = two ? ["編號", "現行／舊" + u, "新" + u] : ["配對編號", "現行／舊" + u, "新" + u, "差值（新 − 舊）"];
    const rows = Array.from({ length: r.n }, (_, i) => [String(i + 1)].concat(new Array(head.length - 1).fill("")));
    $(p + "Rec").innerHTML = `<thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map(x => `<tr>${x.map(v => `<td>${esc(v)}</td>`).join("")}</tr>`).join("")}</tbody>`;
    $(p + "RecHelp").textContent = `特性：${r.name || "未填"}；${kind === "tost" ? "同等性" : "不劣性"}，δ = ${kind === "tost" ? "±" : ""}${r.delta}${r.unit ? " " + r.unit : ""}；${two ? `新、舊各 ${r.n} 件，依隨機順序量測` : `${r.n} 對`}；量測人員、量具編號、日期請另外記錄。`;
    $(p + "Rec").dataset.tsv = [head].concat(rows).map(x => x.join("\t")).join("\n");
    $(p + "SheetRec").hidden = false; $(p + "SheetRec").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  ["eq", "ni"].forEach(p => {
    $(p + "Run").addEventListener("click", () => eqRun(p));
    $(p + "RecCopy").addEventListener("click", async () => { try { await navigator.clipboard.writeText($(p + "Rec").dataset.tsv || ""); $(p + "RecHint").textContent = "已複製，可直接貼到 Excel。"; } catch (_) { $(p + "RecHint").textContent = "無法自動複製，請選取表格後手動複製。"; } });
  });
