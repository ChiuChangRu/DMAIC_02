
  // =====================================================================
  // 標題列的 AI 連線標籤：只顯示「上次呼叫的結果」，不假裝即時監看。
  // 綠點＝上次成功；紅點＝上次失敗；空心＝已設定但還沒呼叫過；黃點閃動＝正在回答。
  // 名稱標籤的顏色只是辨識用，不是各公司的 Logo。claude.ai 模式不知道帳號方案，所以不寫 Pro。
  // =====================================================================
  const AIS = { ok: null, at: null, busy: 0, code: "" };
  const AI_BRAND = { claude: ["claude.ai", "#A34A16"], anthropic: ["Claude API", "#A34A16"], gemini: ["Gemini", "#2F63B8"], kimi: ["Kimi", "#6B46B8"], openai: ["OpenAI 相容", "#526173"] };
  const AI_FAIL = /^byok|network|rate_limited|upstream|not_granted|sampling|unavailable|auth|forbidden|quota/i;   // 這些代表「連不上或被拒」；格式或內容問題不算
  function aiTrack(p) {
    AIS.busy++; aiChipRender();
    return Promise.resolve(p).then(r => { AIS.busy--; AIS.ok = true; AIS.at = new Date(); AIS.code = ""; aiChipRender(); return r; },
      e => { AIS.busy--; const c = e && e.code || ""; if (c !== "cancelled" && (AI_FAIL.test(c) || !c)) { AIS.ok = false; AIS.at = new Date(); AIS.code = c; } aiChipRender(); throw e; });
  }
  const aiHM = d => d ? String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0") : "";
  function aiChipRender() {
    const box = $("aiChips"); if (!box) return;
    const usable = aiMode === "claude" || aiMode === "byok";
    let h = "";
    if (!usable) {
      h = `<button type="button" class="ai-chip" data-ai-go title="尚未設定 AI。點一下到「AI 設定」"><i class="ai-dot idle"></i><span class="ai-st">尚未設定 AI</span></button>`;
    } else {
      const key = aiMode === "claude" ? "claude" : byokCfg.provider, B = AI_BRAND[key] || AI_BRAND.openai;
      const nm = aiMode === "claude" ? B[0] : B[0] + "・" + byokModel();
      const dot = AIS.busy ? "busy" : AIS.ok === false ? "bad" : AIS.ok === true ? "ok" : aiMode === "claude" ? "ok" : "idle";
      const st = AIS.busy ? "回答中…" : AIS.ok === false ? "上次失敗" + (AIS.at ? " " + aiHM(AIS.at) : "") : AIS.ok === true ? "上次成功 " + aiHM(AIS.at) : aiMode === "claude" ? "已連線" : "已設定，尚未測試";
      const tip = AIS.ok === false ? String((typeof ERR !== "undefined" && ERR[AIS.code]) || AIS.code || "呼叫失敗").replace(/[。.]+$/, "") + "。點一下到「AI 設定」" : "點一下到「AI 設定」";
      h = `<button type="button" class="ai-chip" data-ai-go title="${esc(tip)}"><i class="ai-dot ${dot}"></i><b class="ai-name" style="background:${B[1]}">${esc(nm)}</b><span class="ai-st">${esc(st)}</span></button>`;
    }
    if (aiMode === "claude" && typeof nqFound !== "undefined" && nqFound) h += `<button type="button" class="ai-chip" data-ai-go title="NyquistAI 連接器已偵測到"><i class="ai-dot ok"></i><b class="ai-name" style="background:#3D6B66">NyquistAI</b><span class="ai-st">已連接</span></button>`;
    box.innerHTML = h;
  }
  $("aiChips").addEventListener("click", e => { if (!e.target.closest("[data-ai-go]")) return; const b = document.querySelector('[data-route="aisettings"]'); if (b) b.click(); });
  aiChipRender();
