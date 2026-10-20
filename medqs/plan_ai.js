  // =====================================================================
  // ③ 驗證計畫：驗證策略預設用 AI 建議，人可以改
  // 進入 ③ 時，有勾選的項目還沒選策略、AI 可用 → 自動請 AI 建議一次（同一批項目只問一次）；
  // AI 回答裡的 verify 建議直接填進「還沒選策略」的項目（不覆蓋已選的），並標「AI 建議」；改選後標記消失。
  // =====================================================================
  (function planAiInit() {
    const hub = $("planHub"); if (!hub) return;
    const asked = new Set(), applied = new Set();
    const blank = x => x.on && !String(x.tool || "").trim() && !(x.nv && String(x.nv.why || "").trim());
    const aiOn = () => { try { return aiMode === "claude" || aiMode === "byok"; } catch (_) { return false; } };
    const note = m => { const el = $("planMsg"); if (el) el.textContent = m; };
    function autoAsk() {
      if (!aiOn()) return;
      let b = false; try { b = busy; } catch (_) {} if (b) return;
      try { vpSyncFb(); } catch (_) {}
      const todo = (fb.vplan || []).filter(x => blank(x) && !asked.has(x.id)); if (!todo.length) return;
      todo.forEach(x => asked.add(x.id));
      note(`已自動請 AI 建議 ${todo.length} 個項目的驗證策略；回覆後會直接填入「① 驗證策略」，可以再自行修改。`);
      $("fbPlanAI").click();
    }
    // AI 回覆完成：verify 建議填進還沒選策略的項目
    function apply(text) {
      let items = null; try { items = vpParse(text); } catch (_) {} if (!items) return 0;
      const key = items.map(i => i.cause + "|" + i.tool).join("\n"); if (applied.has(key)) return 0; applied.add(key);
      let n = 0;
      (fb.vplan || []).filter(blank).forEach(x => {
        const it = items.find(i => VP_TOOLS.includes(i.tool) && vpSim(i.cause, x.cause) >= VP_SIM); if (!it) return;
        x.tool = it.tool; x.toolAi = it.tool;
        if (!String(x.method || "").trim() && it.method) x.method = it.method;
        if (!String(x.data || "").trim() && it.data) x.data = it.data;
        n++;
      });
      if (n) { try { vpChanged(true); } catch (_) {} try { closePanel(); } catch (_) {} note(`已依 AI 建議填入 ${n} 個項目的驗證策略（標「AI 建議」）；請自行判斷，可直接在選單改選。`); }
      return n;
    }
    // 填入後收起 AI 視窗，露出已填入的策略（回覆仍可從「問 AI」再看）
    const ob = aiBody;
    aiBody = function (text, final, key) { const h = ob(text, final, key); if (final) setTimeout(() => { try { apply(text); } catch (e) { console.warn("plan ai", e); } }, 0); return h; };
    // 「AI 建議」標記：策略仍是 AI 給的值才顯示
    const deco = () => hub.querySelectorAll(".hub-item").forEach(it => {
      const s = it.querySelector("select.hub-tool"); if (!s) return; const x = (fb.vplan || []).find(y => y.id === s.dataset.id);
      const tag = it.querySelector(".hub-aitag"), on = !!(x && x.toolAi && x.tool === x.toolAi);
      if (on && !tag) s.insertAdjacentHTML("afterend", `<span class="hub-aitag" title="AI 建議的策略，請自行判斷；可直接在選單改選">🤖 AI 建議，可修改</span>`);
      else if (!on && tag) tag.remove();
    });
    new MutationObserver(() => setTimeout(deco, 0)).observe(hub, { childList: true, subtree: true });
    const _route = route;
    route = function (name) { _route(name); if (name === "plan") setTimeout(() => { try { autoAsk(); } catch (e) { console.warn("plan ai", e); } }, 300); };
  })();
