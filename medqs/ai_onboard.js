  // =====================================================================
  // 未連接 AI 時的提醒（GitHub 版等 claude.ai 以外的開啟方式）
  // 條件：不在 claude.ai 中、也沒有可用的自帶 API key。提供 API 申請連結（Moonshot），或直接到設定頁貼 key。
  // claude.ai 中不顯示（那裡只能用模式 (1)，不能貼 key）。「不再提醒」存在 localStorage。
  // =====================================================================
  (function aiOnboard() {
    const OFF = "mdqs.aiOnboard.off", KIMI = "https://platform.kimi.com/console/account";
    const off = () => { try { return localStorage.getItem(OFF) === "1"; } catch (_) { return false; } };
    function show() {
      if ($("aiOnb")) return;
      document.body.insertAdjacentHTML("beforeend", `<dialog id="aiOnb" class="ai-onb" aria-labelledby="aiOnbT">
        <h2 id="aiOnbT">尚未連接 AI</h2>
        <p>請申請 API，例如 <a id="aiOnbGo" href="${KIMI}" target="_blank" rel="noopener">Moonshot</a>（免信用卡）。</p>
        <p class="hint">取得 key 後到「⚙ 設定與案件」貼上。統計計算不需要 AI，可以直接使用。</p>
        <div class="run-row"><button class="btn primary" type="button" id="aiOnbSet" autofocus>已有 key，去設定</button><button class="btn ghost" type="button" id="aiOnbLater">關閉</button></div>
        <label class="chk"><input type="checkbox" id="aiOnbOff"> 不再提醒</label>
      </dialog>`);
      const d = $("aiOnb");
      const close = () => { if ($("aiOnbOff").checked) { try { localStorage.setItem(OFF, "1"); } catch (_) {} } d.close(); d.remove(); };
      $("aiOnbLater").addEventListener("click", close);
      d.addEventListener("cancel", e => { e.preventDefault(); close(); });
      $("aiOnbSet").addEventListener("click", () => {
        close(); agSt().prov = true;
        if (!byokKeyMem) { byokCfg.provider = "kimi"; byokCfg.base = ""; byokCfg.model = ""; byokCfg.s2t = true; }
        route("aisettings"); byokRender();
        setTimeout(() => { const k = $("byokKey"); if (k) { k.scrollIntoView({ behavior: "smooth", block: "center" }); k.focus(); } }, 50);
      });
      try { d.showModal(); } catch (_) { d.setAttribute("open", ""); }
    }
    $("byokProv").addEventListener("change", () => { agSt().prov = true; });
    $("byokKeep").addEventListener("change", () => { agSt().keep = true; });
    $("byokSave").addEventListener("click", () => { agSt().saved = true; AIS.ok = null; AIS.code = ""; aiChipRender(); });   // 換了設定：回到「已設定，尚未測試」
    document.querySelectorAll('[data-route="aisettings"]').forEach(b => b.addEventListener("click", () => { agSt().lastEl = null; }));   // 重新進設定頁：再捲到目前的目標
    // 開頁偵測 AI：有 AI（claude.ai 或已測試成功的 key）→ 維持「方法二 ① 定義問題」；沒有 AI 或 key 未測試成功 → 跳到「⚙ 設定與案件」（網址有指定頁面、或使用者已切到別頁時不跳）
    const startHash = (location.hash || "").replace("#", "");
    aiReadyP.then(() => setTimeout(() => {
      if (inClaudeView() || off() || (aiMode !== "none" && aiVerified())) return;
      const home = document.querySelector('section[data-view="home"]');
      if ((!startHash || startHash === "home") && home && !home.hidden) route("aisettings");   // 沒有 key，或 key 還沒測試成功過 → 先到設定頁
      if (aiMode === "none") show();
    }, 400));
  })();
  // ---- 手勢導引：尚未連接 AI 時，先指「⚙ 設定與案件」，再逐一指設定步驟（hf_ui.js 的 next() 會先呼叫這裡）----
  // 依設定頁的實際狀態判斷做到哪一步；每一步可「略過」（只在這次開頁有效）；勾「不再提醒」後不指引
  // 回傳 false＝先不顯示手勢（提醒視窗開著）；null＝交給原本的導引
  // 自帶 key 是否「測試成功過」：記這組設定的特徵（提供者、模型、網址、key 長度與末 4 碼，不存完整 key）；換 key 或模型就要重測
  function aiSig() { const k = byokKeyMem || ""; return [byokCfg.provider, byokModel(), byokBase(), k.length, k.slice(-4)].join("|"); }
  function aiVerified() {
    if (aiMode !== "byok") return aiMode === "claude";
    if (AIS.ok === true) { try { localStorage.setItem("mdqs.ai.verified", aiSig()); } catch (_) {} return true; }
    if (AIS.ok === false) return false;
    try { return localStorage.getItem("mdqs.ai.verified") === aiSig(); } catch (_) { return false; }
  }
  // 狀態放在函式宣告裡（會提前宣告）；手勢在初始化時就會呼叫 apiGuide，用 const 會遇到 TDZ
  function agSt() { return agSt.s || (agSt.s = { prov: false, keep: false, saved: false }); }
  function apiGuide(v, seen) {
    const r = apiGuide0(v, seen), AG = agSt();
    // 設定頁上每換一個目標：不在畫面內就自動捲過去（不只顯示「下一步在下面」）
    if (r && v === "aisettings" && r[1] && r[1] !== AG.lastEl) {
      AG.lastEl = r[1]; const b = r[1].getBoundingClientRect();
      if (b.top < 60 || b.bottom > innerHeight - 40) r[1].scrollIntoView({ behavior: "smooth", block: "center" });
    }
    if (!r || v !== "aisettings") AG.lastEl = null;
    return r;
  }
  function apiGuide0(v, seen) {
    const AG = agSt();
    if (typeof aiMode === "undefined" || inClaudeView() || seen.api) return null;
    if ($("aiOnb")) return false;
    try { if (localStorage.getItem("mdqs.aiOnboard.off") === "1") return null; } catch (_) {}
    const hint = ($("byokHint") && $("byokHint").textContent) || "";
    if (aiMode !== "none" && aiVerified()) return null;   // 有 key 而且測試成功過（或本次已成功呼叫）→ 交給原本的導引
    if (v !== "aisettings") { return [0, document.querySelector('[data-route="aisettings"]'), aiMode === "none" ? "先設定 AI：到這裡貼 API key" : "先測試 AI 連線：到這裡", { skip: "api" }]; }
    if (aiMode === "none") {
      if (!AG.prov && !seen.apiProv) return [0, $("byokProv"), "① 選 AI 提供者（例如 Kimi）", { skip: "apiProv" }];
      if (!byokKeyMem && !$("byokKey").value.trim()) return [0, $("byokKey"), "② 貼上 API key"];
      if (!AG.keep && !byokCfg.keep && !seen.apiKeep) return [0, $("byokKeep"), "③ 自己的電腦可勾：記住 key", { skip: "apiKeep" }];
      return [0, $("byokSave"), "④ 按「儲存並啟用」"];
    }
    if (/^連線失敗/.test(hint) || AIS.ok === false) return $("byokKey").value.trim() ? [0, $("byokSave"), "按「儲存並啟用」後再測"] : [0, $("byokKey"), "連不上：重貼 key，或確認 API 網址"];
    if (/^測試中/.test(hint) || AIS.busy) return false;
    return [0, $("byokTest"), "⑤ 測試連線"];
  }
