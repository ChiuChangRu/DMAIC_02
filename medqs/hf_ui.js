  // =====================================================================
  // 人因改善（第一優先）：
  //  1. 工具頁的資料輸入移到第一屏：「AI 規劃」預設收合；本頁問題描述收成一行
  //  2. 8 個「問題描述」合併成上方一個「本案問題」（與魚骨圖問題點同步；各頁仍可另寫）
  //  3. 說明文字預設收合，按「ⓘ 說明」才顯示
  //  ＋ 執行鈕固定在畫面下緣，不跟著捲走
  // =====================================================================
  (function hfInit() {
    const HELP_KEY = "mdqs.help.on";
    const TOOL_P = () => [...document.querySelectorAll('textarea[id$="Problem"]')].filter(t => t.id !== "fbProblem");
    // ---- 上方「本案問題」列 ----
    const fbar = $("flowBar"); if (!fbar) return;
    fbar.insertAdjacentHTML("afterend", `<div class="caseq" id="caseQBar"><label for="caseQ">本案問題</label><input autocomplete="off" id="caseQ" type="text" placeholder="一句話寫問題，例如：HDC-1428 動脈端 Luer 鎖接開裂（各工具頁共用）"><button type="button" class="btn small" id="helpTgl" aria-pressed="false" title="顯示／隱藏各頁說明文字">ⓘ 說明</button></div>`);
    const cq = $("caseQ");
    let last = "";
    function pushShared(v) {
      TOOL_P().forEach(t => { if (t.dataset.custom === "1") return; if (t.value !== v) { t.value = v; t.dataset.auto = v; } });
      auxSum();
    }
    cq.addEventListener("input", () => {
      const v = cq.value; last = v;
      const fp = $("fbProblem"); if (fp && fp.value !== v) { fp.value = v; fp.dispatchEvent(new Event("input", { bubbles: true })); }
      pushShared(v);
    });
    // 魚骨圖問題點（或載入案件）改了 → 同步到本案問題
    setInterval(() => {
      const fp = $("fbProblem"); if (!fp || document.activeElement === cq) return;
      if (fp.value !== last) { last = fp.value; cq.value = fp.value; pushShared(fp.value); }
    }, 800);
    // ---- 各工具頁的問題描述收成一行（可展開另寫） ----
    document.querySelectorAll(".tool-problem").forEach(tp => {
      const d = document.createElement("details"); d.className = "tool-aux";
      d.innerHTML = `<summary><span class="aux-t">本頁問題描述</span><span class="aux-s"></span></summary>`;
      tp.parentNode.insertBefore(d, tp); d.appendChild(tp);
      const t = tp.querySelector("textarea"); if (t) t.addEventListener("input", e => { if (e.isTrusted) { t.dataset.custom = t.value.trim() && t.value !== cq.value ? "1" : ""; auxSum(); } });
    });
    function auxSum() {
      document.querySelectorAll(".tool-aux").forEach(d => { const t = d.querySelector("textarea"), s = d.querySelector(".aux-s"); if (!t || !s) return;
        s.textContent = !t.value.trim() ? "（未填）" : t.dataset.custom === "1" ? "本頁另寫：" + t.value.slice(0, 40) : t.value === cq.value ? "＝本案問題" : t.value.slice(0, 40); });
    }
    setInterval(auxSum, 2000);
    // ---- AI 規劃卡預設收合（AI 帶入結果時程式會自動展開） ----
    setTimeout(() => document.querySelectorAll("details.mp-card").forEach(c => { c.open = false; }), 0);
    // ---- 執行鈕固定在畫面下緣 ----
    ["runBtn", "regRun", "spcRun", "grrRun", "biasRun", "attrRun", "doeRun", "tgRun"].forEach(id => { const b = $(id), r = b && b.closest(".run-row"); if (r) r.classList.add("run-sticky"); });
    // ---- 魚骨圖頁已有「問題點」，上方本案問題只留說明開關，避免重複 ----
    const vf = document.querySelector('[data-view="fishbone"]');
    const fbOn = () => $("caseQBar").classList.toggle("on-fb", !!vf && !vf.hidden);
    if (vf) new MutationObserver(fbOn).observe(vf, { attributes: true, attributeFilter: ["hidden"] }); fbOn();
    // ---- 說明文字開關 ----
    let on = false; try { on = localStorage.getItem(HELP_KEY) === "1"; } catch (_) {}
    const setHelp = v => { document.body.classList.toggle("help-off", !v); $("helpTgl").setAttribute("aria-pressed", String(v)); try { localStorage.setItem(HELP_KEY, v ? "1" : "0"); } catch (_) {} };
    setHelp(on);
    $("helpTgl").addEventListener("click", () => setHelp(document.body.classList.contains("help-off")));
  })();
  // =====================================================================
  // 👉 導引手勢（第 1～6 步）
  // 定義問題：① 寫下問題（5W 建議）→ ② 回答角度 → ③ 引用資料 → ④ AI 診斷分析 → ⑤ AI 回覆（回答 AI 或列原因）→ ⑥ 魚骨圖
  // 魚骨圖：待決定採用／排除 → 點原因 → 標 ◇ → ③ 驗證計畫
  // 同一時間只指一個；②③ 問過 AI 就不再指，也可「略過」；使用者照自己的順序做也不擋
  // =====================================================================
  (function glInit() {
    const KEY = "mdqs.guide.on";
    const bar = $("caseQBar"); if (!bar) return;
    // 「AI 要用什麼角度回答？」搬到問題框與資料來源之間（順序＝導引順序）
    const ps = document.querySelector(".persp-sheet"), xs = $("xsBox");
    if (ps && xs) { ps.classList.add("persp-in"); xs.parentNode.insertBefore(ps, xs); }
    $("helpTgl").insertAdjacentHTML("beforebegin", `<button type="button" class="btn small" id="glTgl" aria-pressed="true" title="顯示／隱藏下一步導引">👉 導引</button>`);
    document.body.insertAdjacentHTML("beforeend", `<div id="glove" class="glove" hidden><span class="gl-t"></span><button type="button" class="gl-skip" hidden>略過 ▸</button><span class="gl-h" aria-hidden="true">👉</span></div><div id="gl5w" class="gl5w" hidden></div><button type="button" id="gloveEdge" class="glove-edge" hidden></button>`);
    const G = $("glove"), E = $("gloveEdge"), W = $("gl5w");
    const W5 = [["What", "不良現象："], ["When", "發生時間／批號："], ["Where", "工站／使用端："], ["Who", "發現者："], ["How many", "數量／比例："]];
    W.innerHTML = `<span class="w-lab">5W 建議（不知道可略）</span>` + W5.map(([k, t]) => `<button type="button" data-w="${t}">${k}</button>`).join("");
    let on = true; try { on = localStorage.getItem(KEY) !== "0"; } catch (_) {}
    const seen = { persp: false, src: false };
    const setOn = v => { on = v; $("glTgl").setAttribute("aria-pressed", String(v)); try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (_) {} tick(); };
    $("glTgl").addEventListener("click", () => setOn(!on));
    const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; };
    const view = () => { const s = [...document.querySelectorAll("section[data-view]")].find(x => !x.hidden); return s ? s.dataset.view : ""; };
    const nav = r => document.querySelector(`.toolnav [data-route="${r}"]`);
    const homeTurns = () => { try { return chatKey === "home" ? turns.length : ((chats.home && chats.home.turns) || []).length; } catch (_) { return 0; } };
    const panelOpen = () => !$("aiPanel").hidden;
    let w5Target = null;
    // 依目前狀態決定下一步：[步驟, 目標, 短字, 選項{skip, w5}]
    function next() {
      const v = view(), F = (typeof fb !== "undefined" && fb && fb.factors) || [];
      const cand = F.filter(f => f.st === "cand"), use = F.filter(f => f.st === "use"), ver = F.filter(f => f.verify && f.st !== "excl");
      if (v === "home") {
        if (F.length) return ver.length ? [6, nav("plan"), "下一步"] : [6, nav("fishbone"), "到魚骨圖"];
        if (homeTurns()) {
          let b = false; try { b = busy; } catch (_) {}
          if (b) return null;   // AI 回覆中
          if (!panelOpen()) return [5, $("aiFab"), "看 AI 回覆"];
          if ($("msgs").querySelector(".sug-peek")) { const gb = [...$("msgs").querySelectorAll("[data-fbgo]")].pop(); return gb ? [6, gb, "帶入魚骨圖"] : [6, nav("fishbone"), "到魚骨圖"]; }
          return [5, $("askBox"), "回答 AI 的問題", { w5: true }];
        }
        if (!$("homeQ").value.trim()) return [1, $("homeQ"), "寫下問題", { w5: true }];
        if (!seen.persp) return [2, $("homePersp"), "選回答角度", { skip: "persp" }];
        if (!seen.src) return [3, $("xsList"), "要引用資料？", { skip: "src" }];
        return [4, $("homeQBtn"), "按這裡"];
      }
      if (v === "fishbone") {
        const pop = $("fbPop");
        if (pop && vis(pop)) { const vb = pop.querySelector('[data-p="verify"]'); if (vb && vb.getAttribute("aria-pressed") !== "true") return [6, pop.querySelector("input,textarea") || vb, "要驗證？可標◇"]; }
        if (cand.length) return [6, document.querySelector('.fb-f.st-cand .fb-f-text'), `逐一確認（剩 ${cand.length}）`];   // 指原因本身，不指「採用」，避免誤以為要同意
        if (use.length && !ver.length) return [6, document.querySelector("#fbSvgWrap [data-f]"), "點原因"];
        if (ver.length) return [6, nav("plan"), "下一步"];
        if (!F.length && !$("fbProblem").value.trim()) return [1, $("fbProblem"), "寫下問題", { w5: true }];
        return null;
      }
      return null;   // 第 7～8 步之後再做
    }
    function place(n) {
      const [step, el, txt, o] = n; const opt = o || {};
      G.dataset.step = step; G.querySelector(".gl-t").textContent = txt;
      const sk = G.querySelector(".gl-skip"); sk.hidden = !opt.skip; sk.dataset.k = opt.skip || "";
      const r = el.getBoundingClientRect(), H = innerHeight;
      if (r.bottom < 60 || r.top > H - 40) {   // 不在畫面內：邊緣提示
        G.hidden = true; W.hidden = true; E.hidden = false; E.textContent = r.top > H - 40 ? "👇 下一步在下面" : "👆 下一步在上面"; E.classList.toggle("up", r.bottom < 60);
        E.onclick = () => el.scrollIntoView({ behavior: "smooth", block: "center" }); return;
      }
      E.hidden = true; G.hidden = false;
      const gw = G.offsetWidth, gh = G.offsetHeight;
      let x = r.left - gw + 4, y = r.top + Math.min(r.height / 2, 40) - (gh - 15);
      if (x < 4) { x = r.right + 6; G.classList.add("flip"); } else G.classList.remove("flip");
      G.style.left = x + "px"; G.style.top = Math.max(4, y) + "px";
      // 5W 建議：貼在目標上緣
      w5Target = null; W.hidden = true;   /* 5W 改成固定在問題框旁（見下方 w5Inline） */
      if (false) { W.style.left = Math.max(4, r.left) + "px"; W.style.top = Math.max(4, r.top - W.offsetHeight - 4) + "px"; W.style.maxWidth = Math.max(240, r.width) + "px"; }
    }
    W.addEventListener("click", e => { const b = e.target.closest("[data-w]"); if (!b || !w5Target) return; const t = w5Target; t.value = (t.value && !/\n$/.test(t.value) ? t.value + "\n" : t.value) + b.dataset.w; t.dispatchEvent(new Event("input", { bubbles: true })); t.focus(); t.setSelectionRange(t.value.length, t.value.length); });
    G.querySelector(".gl-skip").addEventListener("click", e => { const k = e.currentTarget.dataset.k; if (k) seen[k] = true; tick(); });
    // 使用者自己選了角度／資料來源，就當作看過
    document.addEventListener("click", e => { if (e.target.closest("#homePersp")) seen.persp = true; if (e.target.closest("#xsBox")) { seen.persp = true; seen.src = true; } if (e.target.closest("#homeQBtn")) { seen.persp = seen.src = true; } setTimeout(tick, 80); }, true);
    // AI 回答中有整理好的問題點 → 帶入「本案問題」（空白或先前也是自動帶入時才覆寫）
    setInterval(() => {
      const cq = $("caseQ"); if (!cq || document.activeElement === cq) return;
      let log = []; try { log = chatKey === "home" ? chatLog : ((chats.home && chats.home.log) || []); } catch (_) {}
      for (let i = log.length - 1; i >= 0; i--) { const m = log[i]; if (!m || m.role === "user" || typeof m.text !== "string") continue;
        const sp = fbSplit(m.text, true), pr = sp && sp.sug && sp.sug.problem; if (!pr) continue;
        if ((!cq.value.trim() || cq.dataset.auto === "1") && cq.value !== pr) { cq.value = pr; cq.dataset.auto = "1"; /* 只填上方欄位；不先寫進魚骨圖，避免進魚骨圖時被當成「已有內容」而多跳確認框（帶入時魚骨圖會用同一個問題點） */ }
        break; }
    }, 1500);
    $("caseQ").addEventListener("input", e => { if (e.isTrusted) $("caseQ").dataset.auto = ""; });
    let lastV = "";
    function tick() {
      const v = view();
      if (v !== lastV) { lastV = v; if (v === "fishbone" && on) setTimeout(() => { const c = document.querySelector(".fb-f.st-cand"); if (c) { try { closePanel(); } catch (_) {} (c.closest("section") || c).scrollIntoView({ behavior: "smooth", block: "start" }); } }, 250); }
      const n = on ? next() : null;
      if (!n || !vis(n[1])) { G.hidden = true; E.hidden = true; W.hidden = true; return; }
      place(n);
    }
    setInterval(tick, 400); addEventListener("scroll", tick, { passive: true }); addEventListener("resize", tick);
    setOn(on);
  })();

  // =====================================================================
  // 5W 建議：固定放在問題描述框（定義問題、魚骨圖問題點）與 AI 對話框輸入欄上方
  // 只是建議：點一下插入開頭字，不檢查、不擋送出
  // =====================================================================
  (function w5Inline() {
    const W5 = [["What", "不良現象："], ["When", "發生時間／批號："], ["Where", "工站／使用端："], ["Who", "發現者："], ["How many", "數量／比例："]];
    const row = () => `<div class="w5row"><span class="w-lab">5W</span>${W5.map(([k, t]) => `<button type="button" data-w5="${t}" title="插入「${t}」">${k}</button>`).join("")}<span class="w-hint">建議，不知道可略</span></div>`;
    const add = (ta, before) => { if (!ta || ta.dataset.w5) return; ta.dataset.w5 = "1"; (before || ta).insertAdjacentHTML("beforebegin", row()); const r = (before || ta).previousElementSibling; r.dataset.for = ta.id; };
    add($("homeQ")); add($("fbProblem")); add($("askBox"), $("askBox") && $("askBox").closest(".ask"));
    // AI 對話框的 5W 只在「定義問題」「魚骨圖」顯示（工具頁的對話是解讀結果，用不到）
    setInterval(() => { const r = document.querySelector('.w5row[data-for="askBox"]'); if (!r) return; let k = ""; try { k = chatKey; } catch (_) {} r.hidden = !(k === "home" || k === "fishbone"); }, 500);
    document.addEventListener("click", e => {
      const b = e.target.closest("[data-w5]"); if (!b) return;
      const t = $(b.closest(".w5row").dataset.for); if (!t) return;
      t.value = (t.value && !/\n$/.test(t.value) ? t.value + "\n" : t.value) + b.dataset.w5;
      t.dispatchEvent(new Event("input", { bubbles: true })); t.focus(); t.setSelectionRange(t.value.length, t.value.length);
    });
  })();
  // =====================================================================
  // 定義問題 → 魚骨圖：在 AI 回答裡按「帶入魚骨圖逐一確認」（不必點上方分頁）
  // 帶入時不再跳確認框或勾選框：所有 AI 建議的原因（多次回答合併、去重）直接放進「待決定」，由使用者逐一採用或排除
  // =====================================================================
  (function carryDirect() {
    const kOf = t => String(t || "").replace(/[*＊\s]/g, "");
    carryToFishbone = function (sug, homeLog) {   // 取代原本的「多次回答勾選」與「另開／加入」確認框
      const rounds = homeRounds(homeLog), seenK = new Set(), factors = [];
      rounds.map(r => r.sug).concat([sug || { factors: [] }]).forEach(s => (s.factors || []).forEach(f => { const k = kOf(f.text); if (k && !seenK.has(k)) { seenK.add(k); factors.push(f); } }));
      const last = rounds.length ? rounds[rounds.length - 1].sug : {};
      const S = Object.assign({}, sug || {}, { factors, problem: (sug && sug.problem) || last.problem || "" });
      const lastQ = ([...homeLog].reverse().find(m => m.role === "user") || {}).text || "";
      const empty = fbEmpty();
      if (!fb.problem.trim()) fb.problem = (S.problem || lastQ).slice(0, 200);
      if (homeExt) fb.ext = homeExt;
      const r = fbApplySug(S, false); fbRenderEditor();
      fbNote("已帶入 AI 建議的原因到「待決定」，請逐一確認採用或排除。" + (S.factors.length ? sugMsg(r, false) : ""));
      if (empty) resetChat();
      if (homeAtt.items.length && !fbAtt.items.length) { fbAtt.items = homeAtt.items.map(a => Object.assign({}, a, { sent: false })); fbAtt.render(); }
      chatPrefix = homeTranscript(homeLog);
      appendLog([{ role: "note", text: "以下延續自定義問題的對話" }, ...homeLog.map(m => Object.assign({}, m, { carried: true })), { role: "note", text: "定義問題對話到此。" }]);
      updateChatControls(); fbSaveNow(); closePanel(); $("aiDot").hidden = false;
    };
    // AI 回答（有原因建議）下方加按鈕
    function addBtn() {
      let k = ""; try { k = chatKey; } catch (_) {}
      if (k !== "home") return;
      const peeks = [...$("msgs").querySelectorAll(".sug-peek")];
      peeks.forEach(d => { const sm = d.querySelector("summary"); if (sm && /由你勾選帶入/.test(sm.textContent)) sm.textContent = sm.textContent.replace(/（前往魚骨圖時[^）]*）/, "（帶入魚骨圖後逐一確認）"); });
      const p = peeks[peeks.length - 1];
      if (!p || p.parentNode.querySelector(".fb-go")) return;
      p.insertAdjacentHTML("afterend", `<div class="run-row fb-go"><button type="button" class="btn small primary" data-fbgo="1">帶入魚骨圖，逐一確認 →</button></div>`);
      const g = p.parentNode.querySelector(".fb-go"); if (g && !$("aiPanel").hidden) g.scrollIntoView({ block: "nearest" });
    }
    setInterval(addBtn, 600);
    $("msgs").addEventListener("click", e => { if (!e.target.closest("[data-fbgo]")) return; closePanel(); route("fishbone"); });
  })();
