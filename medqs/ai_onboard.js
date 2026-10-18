  // =====================================================================
  // 未連接 AI 時的提醒（GitHub 版等 claude.ai 以外的開啟方式）
  // 條件：不在 claude.ai 中、也沒有可用的自帶 API key。提供 Kimi API 申請連結，或直接到設定頁貼 key。
  // claude.ai 中不顯示（那裡只能用模式 (1)，不能貼 key）。「不再提醒」存在 localStorage。
  // =====================================================================
  (function aiOnboard() {
    const OFF = "mdqs.aiOnboard.off", KIMI = "https://platform.kimi.com/console/account";
    const off = () => { try { return localStorage.getItem(OFF) === "1"; } catch (_) { return false; } };
    function show() {
      if ($("aiOnb")) return;
      document.body.insertAdjacentHTML("beforeend", `<dialog id="aiOnb" class="ai-onb" aria-labelledby="aiOnbT">
        <h2 id="aiOnbT">尚未連接 AI</h2>
        <p>統計計算不需要 AI，可以直接使用。照片轉錄、AI 建議與說明需要 API key。</p>
        <p>可以先申請 <b>Kimi API（免信用卡）</b>，取得 key 後到「⚙ 設定與案件」貼上即可。</p>
        <div class="run-row"><a class="btn primary" id="aiOnbGo" href="${KIMI}" target="_blank" rel="noopener">前往申請 Kimi API ↗</a><button class="btn" type="button" id="aiOnbSet">已有 key，去設定</button><button class="btn ghost" type="button" id="aiOnbLater">稍後再說</button></div>
        <label class="chk"><input type="checkbox" id="aiOnbOff"> 不再提醒</label>
      </dialog>`);
      const d = $("aiOnb");
      const close = () => { if ($("aiOnbOff").checked) { try { localStorage.setItem(OFF, "1"); } catch (_) {} } d.close(); d.remove(); };
      $("aiOnbLater").addEventListener("click", close);
      d.addEventListener("cancel", e => { e.preventDefault(); close(); });
      $("aiOnbSet").addEventListener("click", () => {
        close();
        if (!byokKeyMem) { byokCfg.provider = "kimi"; byokCfg.base = ""; byokCfg.model = ""; byokCfg.s2t = true; }
        route("aisettings"); byokRender();
        setTimeout(() => { const k = $("byokKey"); if (k) { k.scrollIntoView({ behavior: "smooth", block: "center" }); k.focus(); } }, 50);
      });
      try { d.showModal(); } catch (_) { d.setAttribute("open", ""); }
    }
    aiReadyP.then(() => setTimeout(() => { if (!inClaudeView() && aiMode === "none" && !off()) show(); }, 400));
  })();
