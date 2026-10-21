  // =====================================================================
  // SPC：上市後趨勢報告規則（MDR 第 88 條 Trend Reporting）
  // 依公司簡報「醫療器材 MDR 趨勢報告介紹」（2026/08/17）第 7、9 頁的雙重觸發條件（TCF-008-05-0-1-P）：
  //   發生率 X(%) = 事件數 ÷ 市場產品銷售量
  //   條件 1（絕對門檻）：X ≥ IT（IT 依風險分析 RMP 設定；簡報以 PD(TCF008) 為例 IT = 0.1%）
  //   條件 2（相對趨勢）：連續 ≥ 6 點持續上升（即使 X < IT）；簡報註明為 Nelson 規則 3，依 ISO/TR 20416 指導原則
  // 只用在「事件數, 銷售量」資料（p 圖／np 圖）；門檻由使用者輸入，程式不預設 IT 數值。
  // =====================================================================
  (function spcTrendInit() {
    const rules = $("spcRules"), box = rules && rules.closest("details"); if (!box) return;
    box.insertAdjacentHTML("afterend", `<details class="fb-more spc-trend" id="spcTrendBox"><summary>上市後趨勢報告規則（MDR 第 88 條；TCF-008 雙重觸發條件）</summary>
      <p class="hint">適用資料：資料型態選「不良品」，每列一個期間的「事件數, 市場銷售量」（p 圖）。發生率 = 事件數 ÷ 銷售量。門檻 IT 依風險分析（RMP）設定。</p>
      <label class="chk"><input type="checkbox" id="trOn"> 套用趨勢報告規則</label>
      <div class="fields">
        <div class="field"><label for="trIt">條件 1：發生率門檻 IT（%）</label><input autocomplete="off" id="trIt" type="number" step="any" min="0" inputmode="decimal" placeholder="依 RMP；例：PD（TCF-008）0.1"></div>
        <div class="field"><label for="trN">條件 2：連續上升點數 ≥</label><input autocomplete="off" id="trN" type="number" step="1" min="3" value="6" inputmode="numeric"></div>
      </div>
      <p class="hint"><a class="link" id="trLearn" target="_blank" rel="noopener" href="https://chiuchangru.github.io/DMAIC_02/medqs/learn.html#s5">教學：統計觀念圖解第 5 章（各種管制圖、趨勢報告規則與範例）↗</a></p>
      <p class="hint">任一條件成立即觸發趨勢報告程序。條件 2 即 Nelson 規則 3 只看「上升」的方向；依公司簡報，ISO/TR 20416 指導原則為連續 6 點以上持續上升即判定趨勢成立。</p>
    </details>`);
    try { if (/github\.io$/.test(location.hostname)) document.querySelectorAll("#trLearn, .spc-learn").forEach(a => { a.href = "learn.html#s5"; }); } catch (_) {}
    const pct = v => (v * 100).toFixed(4).replace(/0+$/, "").replace(/\.$/, "") + "%";
    function trend() {
      const S = TQ.spc; if (!S || !$("trOn").checked) return null;
      if (!["p", "np"].includes(S.type)) return { err: "趨勢報告規則需要「事件數, 銷售量」資料（資料型態選「不良品」，p 圖／np 圖）。" };
      const itS = $("trIt").value.trim(), it = itS === "" ? null : +itS, n = Math.round(+$("trN").value || 6);
      if (it != null && !(it >= 0)) return { err: "發生率門檻 IT 要是 0 以上的數字。" };
      if (!(n >= 3)) return { err: "連續上升點數至少 3。" };
      const lab = S.res.panels[0].labels, rate = S.rows.map(r => r[1] > 0 ? r[0] / r[1] : NaN);
      const c1 = it == null ? [] : rate.map((x, i) => x * 100 >= it - 1e-12 ? i : -1).filter(i => i >= 0);
      const c2 = []; let s = 0;   // 連續上升：每一點都比前一點高；連續 n 點（含起點）即成立
      for (let i = 1; i <= rate.length; i++) {
        if (i < rate.length && rate[i] > rate[i - 1]) continue;
        if (i - s >= n) c2.push([s, i - 1]);
        s = i;
      }
      return { it, n, rate, lab, c1, c2, hit: c1.length > 0 || c2.length > 0 };
    }
    const _render = spcRender;
    spcRender = function () {
      _render();
      const T = trend(); if (!T) return;
      const out = $("spcOut");
      if (T.err) { out.insertAdjacentHTML("beforeend", `<div class="tr-box"><b>上市後趨勢報告規則</b><p class="status ng">${esc(T.err)}</p></div>`); return; }
      const L1 = T.it == null ? "未設定門檻 IT，條件 1 未判定" : T.c1.length ? `成立：${T.c1.map(i => `${esc(T.lab[i])}（${pct(T.rate[i])}）`).join("、")}` : `未成立（所有期間 < ${T.it}%）`;
      const L2 = T.c2.length ? `成立：${T.c2.map(([a, b]) => `第 ${esc(T.lab[a])}～${esc(T.lab[b])} 點連續 ${b - a + 1} 點上升`).join("；")}` : `未成立（沒有連續 ${T.n} 點以上持續上升）`;
      out.insertAdjacentHTML("beforeend", `<div class="tr-box"><div class="verdict">${T.hit ? pill("bad", "觸發趨勢報告程序") : T.it == null ? pill("warn", "條件 2 未觸發；條件 1 未判定（請填 IT）") : pill("good", "未觸發趨勢報告")}</div>
        <ul class="reasons"><li>條件 1（發生率 ≥ IT${T.it == null ? "" : " " + T.it + "%"}）：${L1}</li><li>條件 2（連續 ≥ ${T.n} 點上升）：${L2}</li></ul>
        <p class="hint">發生率 = 事件數 ÷ 銷售量。觸發後依程序：啟動 CAPA、更新風險管理（RMP／RMR）與臨床評估（CER／PMCF）；非嚴重事件或預期副作用的趨勢需評估是否通報主管機關（MDR 第 88 條）。判定依據為公司 TCF-008 雙重觸發條件，請以公司程序為準。</p></div>`);
      S_ctx(T);
    };
    function S_ctx(T) {
      const S = TQ.spc; if (!S) return;
      S.trend = T;
      S.ctx = (S.ctx || "") + `\n上市後趨勢報告規則（TCF-008）：條件 1 發生率 ≥ IT ${T.it == null ? "（未設定）" : T.it + "%"} → ${T.c1.length ? "成立：" + T.c1.map(i => T.lab[i] + " " + pct(T.rate[i])).join("、") : "未成立"}；條件 2 連續 ≥ ${T.n} 點上升 → ${T.c2.length ? "成立：" + T.c2.map(([a, b]) => T.lab[a] + "～" + T.lab[b]).join("；") : "未成立"}；結論：${T.hit ? "觸發趨勢報告程序" : T.it == null ? "條件 2 未觸發，條件 1 未設定門檻未判定" : "未觸發"}`;
    }
    ["trOn", "trIt", "trN"].forEach(id => $(id).addEventListener("change", () => { if (TQ.spc) { try { spcRender(); } catch (e) { console.warn("spc trend", e); } } }));
  })();
