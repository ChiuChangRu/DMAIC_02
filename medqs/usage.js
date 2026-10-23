  // =====================================================================
  // 匿名使用紀錄：開啟網頁、切換頁面／工具、PDCA 流程步驟、按「分析／計算」時送一筆到 MyWiki（medapi-mcp /pdca/hit）。
  // 只送：事件類型、頁面／工具／步驟名稱、來源網站網域、網址 ?src= 活動代碼、正式版／試作版、手機或桌機、分頁隨機編號。
  // 不送：任何輸入內容、數據、案件、AI 對話；不用 cookie。送不出去就算了，不影響操作。設定頁可關閉。
  // =====================================================================
  (function usageInit() {
    const URL_HIT = "https://medapi-mcp.gogoyankee.workers.dev/pdca/hit", OFF = "mdqs.nostat";
    const off = () => { try { return localStorage.getItem(OFF) === "1"; } catch (_) { return false; } };
    let sid = "";
    try { sid = sessionStorage.getItem("mdqs.sid") || ""; if (!sid) { sid = Math.random().toString(36).slice(2, 12); sessionStorage.setItem("mdqs.sid", sid); } } catch (_) { sid = Math.random().toString(36).slice(2, 12); }
    let src = ""; try { src = new URLSearchParams(location.search).get("src") || ""; } catch (_) {}
    const base = { sid, host: location.hostname || "file", ver: /人因試作/.test(document.title) ? "trial" : "prod", dev: matchMedia("(max-width: 760px)").matches ? "m" : "d" };
    function send(ev, extra) {
      if (off()) return;
      const body = JSON.stringify(Object.assign({ ev }, base, extra || {}));
      try { if (navigator.sendBeacon && navigator.sendBeacon(URL_HIT, body)) return; } catch (_) {}
      try { fetch(URL_HIT, { method: "POST", body, mode: "no-cors", keepalive: true }).catch(() => {}); } catch (_) {}
    }
    const STEPS = { home: "1 定義問題", fishbone: "2 魚骨圖", plan: "3 驗證計畫", pdca: "4 PDCA 報告" };
    let last = "";
    function track(name) {
      if (!name || name === last) return; last = name;
      if (STEPS[name]) send("step", { step: STEPS[name], view: name });
      else if (NAV_TOOLS.includes(name)) send("tool", { tool: name, view: name });
      else send("view", { view: name });
    }
    send("open", { ref: document.referrer || "", src, view: (location.hash || "").replace("#", "") || "home" });
    const _route = route; route = function (name) { const r = _route(name); try { track(currentView === "placeholder" ? name : currentView); } catch (_) {} return r; };
    try { track(currentView); } catch (_) {}
    // 按下「分析／計算」類按鈕（只記按了哪個頁面的分析，不記內容）
    document.addEventListener("click", e => {
      const b = e.target.closest && e.target.closest("button"); if (!b || !e.isTrusted) return;
      const t = (b.textContent || "").trim(); if (!/^(分析|計算|執行|開始分析|分析效應|檢定)/.test(t) && !/(分析|計算)$/.test(t)) return;
      try { send("analyze", { tool: currentView, view: t.slice(0, 20) }); } catch (_) {}
    }, true);
    // 設定頁：說明與關閉選項
    const sheets = document.querySelector("#viewAISettings .sheets");
    if (sheets) {
      sheets.insertAdjacentHTML("beforeend", `<section class="card sheet" id="statSheet"><h3>匿名使用統計</h3>
        <p class="hint">本網站會記錄<b>匿名</b>的使用次數：開啟網頁、用了哪個工具、PDCA 流程走到哪一步、從哪個網站連進來。<b>不記錄任何輸入內容、數據、案件或 AI 對話</b>，也不記 IP 或帳號。用途是了解哪些功能有人用，作為改善依據。</p>
        <label class="hint"><input type="checkbox" id="statOff"> 不要記錄我的使用（只存在這台電腦的瀏覽器）</label>
        <p class="hint"><button type="button" class="btn small" id="statTest">測試連線</button> <span id="statTestR"></span></p></section>`);
      $("statTest").addEventListener("click", async () => {
        const r = $("statTestR"); r.textContent = "測試中…";
        try {
          const res = await fetch(URL_HIT, { method: "POST", body: JSON.stringify(Object.assign({ ev: "view", view: "連線測試" }, base)) });
          r.textContent = res.ok ? "✓ 連線正常，紀錄已送達（版本 " + base.ver + "，網域 " + base.host + "）" : "✗ 伺服器回應 " + res.status + "：" + (await res.text()).slice(0, 80);
        } catch (e) { r.textContent = "✗ 送不出去（可能被瀏覽器、擴充功能或頁面安全設定擋下）：" + (e && e.message || e); }
      });
      const cb = $("statOff"); cb.checked = off();
      cb.addEventListener("change", () => { try { cb.checked ? localStorage.setItem(OFF, "1") : localStorage.removeItem(OFF); } catch (_) {} });
    }
  })();
