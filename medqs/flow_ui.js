  // =====================================================================
  // 解決問題流程列：工具分頁不變（每個工具都能直接用）；流程列只依資料判斷進度、提供跳轉與「暫存進度」。
  // 暫存＝按了才存（存成案件，存在這個瀏覽器）；不自動存。
  // =====================================================================
  const FLOW_STEPS = [
    { k: "def", lab: "定義問題", go: ["home"] },
    { k: "fb", lab: "魚骨圖", go: ["fishbone", "fbTop"] },
    { k: "vp", lab: "驗證項目", go: ["fishbone", "fbVerify"] },
    { k: "ss", lab: "樣本數", go: ["sample"] },
    { k: "an", lab: "檢定分析", go: ["hypothesis"] },
    { k: "rp", lab: "PDCA 報告", go: ["fishbone", "pdcaWrap"] }
  ];
  const FLOW_VIEWS = ["home", "fishbone", "sample", "hypothesis"];
  const flowTry = f => { try { return !!f(); } catch (_) { return false; } };
  function flowDone() {
    const any = o => o && Object.values(o).some(Boolean);
    return {
      def: flowTry(() => ($("homeQ").value || "").trim() || (chats.home && chats.home.log && chats.home.log.length) || (chatKey === "home" && chatLog.length)),
      fb: flowTry(() => fb.factors.some(f => f.st === "use")),
      vp: flowTry(() => (fb.vplan || []).some(x => x.on) || fb.factors.some(f => f.verify && f.st !== "excl")),
      ss: flowTry(() => pw.result || at.result || TQ.prop || TQ.tolp || TQ.doer || TQ.tost || TQ.ni || TQ.aql),
      an: flowTry(() => (state.result && !Object.values(EXAMPLES).some(e => e && e.text === $("pasteBox").value)) || tl.result || CT.result || TQ.spc || TQ.grr || TQ.bias || TQ.lin || TQ.stab || TQ.attr || TQ.doe || TQ.tg || REG.res),
      rp: flowTry(() => fb.pdca && (fb.pdca.out || any(fb.pdca.t) || any(fb.pdca.c)))
    };
  }
  let flowMin = false; try { flowMin = localStorage.getItem("mdqs.flow.min") === "1"; } catch (_) {}
  let flowSig = "", flowNoResume = false;
  function flowCase() { try { if (!caseCur) return null; const e = caseLoadList().find(x => x.id === caseCur.id); return e ? { name: e.name, at: e.savedAt } : null; } catch (_) { return null; } }
  const flowHM = iso => { const d = new Date(iso); return isNaN(d) ? "" : `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  function flowResume() {   // 開啟網頁時：還沒有內容、也沒有目前案件 → 提示最近一次暫存的案件
    try { if (flowNoResume || caseCur) return null; const d = flowDone(); if (Object.values(d).some(Boolean)) return null; const L = caseLoadList(); return L.length ? L[0] : null; } catch (_) { return null; }
  }
  function flowRender(force) {
    const box = $("flowBar"); if (!box) return;
    const d = flowDone(), nowI = FLOW_STEPS.findIndex(s => !d[s.k]), nDone = FLOW_STEPS.filter(s => d[s.k]).length;
    const inFlow = FLOW_VIEWS.includes(currentView), mini = flowMin || !inFlow, cs = flowCase(), rs = flowResume();
    const sig = JSON.stringify([d, mini, cs, rs && rs.id, currentView]);
    if (!force && sig === flowSig) return; flowSig = sig;
    const save = `<button type="button" class="fl-save" data-fl="save" title="存成案件（存在這個瀏覽器；換電腦請到「AI 設定與案件存取」匯出）">💾 ${mini ? "暫存" : "暫存進度"}</button>`;
    const caseTxt = cs ? `案件：${esc(cs.name)}　上次暫存 ${flowHM(cs.at)}` : "尚未暫存";
    const resume = rs ? `<div class="fl-resume">繼續上次的案件：<b>${esc(rs.name)}</b>（${flowHM(rs.savedAt)} 暫存）<button type="button" class="fl-mini-btn" data-fl="resume" data-id="${rs.id}">載入</button><button type="button" class="fl-x" data-fl="noresume">不用</button></div>` : "";
    if (mini) {
      box.className = "flow-wrap mini";
      box.innerHTML = `${resume}<div class="fl-minirow"><button type="button" class="fl-open" data-fl="open">📋 解決問題流程　<b>已完成 ${nDone}／${FLOW_STEPS.length}</b>${nowI >= 0 ? `　下一步：${FLOW_STEPS[nowI].lab}` : "　全部完成"}　展開 ▾</button>${save}</div>`;
      return;
    }
    box.className = "flow-wrap";
    const st = (s, i) => { const done = d[s.k], now = i === nowI; return `<li class="${done ? "done" : now ? "now" : ""}"><button type="button" class="st" data-fl="go" data-i="${i}" aria-label="${s.lab}：${done ? "已完成" : now ? "目前在這一步" : "未開始"}"><span class="dot">${done ? "✓" : i + 1}</span><span class="lab">${s.lab}</span><span class="sub">${done ? "已完成" : now ? "目前在這一步" : "未開始"}</span></button></li>`; };
    box.innerHTML = `${resume}<div class="flowbar"><div class="fl-top"><span class="fl-t">解決問題流程<small>不一定要照順序，每個工具都能直接用</small></span><span class="fl-act"><span class="fl-save-t">${caseTxt}</span>${save}<button type="button" class="fl-x" data-fl="min">收起 ▴</button></span></div><ol>${FLOW_STEPS.map(st).join("")}</ol></div>`;
  }
  function flowGo(i) {
    const s = FLOW_STEPS[i]; if (!s) return;
    const b = document.querySelector(`.toolnav [data-route="${s.go[0]}"]`); if (b) b.click(); else route(s.go[0]);
    if (s.go[1]) setTimeout(() => { const el = s.go[1] === "fbTop" ? document.querySelector('[data-view="fishbone"]') : $(s.go[1]); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60);
  }
  setTimeout(function flowInit() {   // 延後到整段程式載入完成（currentView 等變數在後面才宣告）
    const box = $("flowBar"); if (!box) return;
    box.addEventListener("click", e => {
      const b = e.target.closest("[data-fl]"); if (!b) return; const a = b.dataset.fl;
      if (a === "go") flowGo(+b.dataset.i);
      else if (a === "min" || a === "open") { flowMin = a === "min"; try { localStorage.setItem("mdqs.flow.min", flowMin ? "1" : "0"); } catch (_) {} if (a === "open" && !FLOW_VIEWS.includes(currentView)) flowGo(Math.max(0, FLOW_STEPS.findIndex(s => !flowDone()[s.k]))); flowRender(true); }
      else if (a === "save") { const ok = caseStore(!flowCase()); if (ok) { b.textContent = "✓ 已暫存"; b.classList.add("ok"); setTimeout(() => flowRender(true), 1400); } else document.querySelector('.toolnav [data-route="aisettings"]').click(); }
      else if (a === "resume") { const x = caseLoadList().find(y => y.id === b.dataset.id); if (x) caseOpen(x); }
      else if (a === "noresume") { flowNoResume = true; flowRender(true); }
    });
    document.querySelector(".toolnav").addEventListener("click", () => setTimeout(() => flowRender(), 0));
    setInterval(() => { try { flowRender(); } catch (_) {} }, 1500);
    try { flowRender(true); } catch (_) {}
  }, 0);
