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
        if (pop && vis(pop)) { const vb = pop.querySelector('[data-p="verify"]'); if (vb && vb.getAttribute("aria-pressed") !== "true") return [6, vb, "要驗證？按這裡"]; }
        if (cand.length) return [6, document.querySelector('.fb-f.st-cand .fb-f-text'), `逐一確認（剩 ${cand.length}）`];   // 指原因本身，不指「採用」，避免誤以為要同意
        if (use.length && !ver.length) return [6, document.querySelector("#fbSvgWrap [data-f]"), "點原因，標 ◇ 待驗證"];
        if (ver.length) return [6, nav("plan"), "下一步"];
        if (!F.length && !$("fbProblem").value.trim()) return [1, $("fbProblem"), "寫下問題", { w5: true }];
        return null;
      }
      // ---- ③ 驗證計畫：建議策略 → 勾選 → 選策略 → 每一項（樣本數 → 分析 → 存報告；不用統計的填結論）→ ④ 報告 ----
      if (v === "plan") {
        const L = (fb && fb.vplan) || [], on = L.filter(x => x.on);
        if (!L.length) return [7, document.querySelector('#planSum [data-hub="ai"]') || $("fbPlanAI"), "請 AI 建議策略"];
        if (!on.length) { const c = document.querySelector("#fbVplan [data-vpon]"); if (c && $("planEdit")) $("planEdit").open = true; return [7, c, "勾選要驗證的"]; }
        const noTool = on.find(x => !String(x.tool || "").trim() && !(x.nv && String(x.nv.why || "").trim()));
        if (noTool) return [7, document.querySelector(`#planHub .hub-tool[data-id="${noTool.id}"]`), "選驗證策略"];
        for (const x of on) {
          if (x.nv) { if (String(x.nv.why || "").trim()) continue; return [8, document.querySelector(`[data-nvwhy="${x.id}"]`), "寫不驗證的原因"]; }
          if (vrNonStat(x)) { if (!(x.vr && x.vr.st)) return [8, document.querySelector(`[data-hubvr="${x.id}"]`), "填結論（照實）"]; continue; }
          if (!svOk(x)) return [8, document.querySelector(`#planHub [data-hub="plan"][data-id="${x.id}"]`), /^DOE|田口|實驗設計/.test(x.tool || "") ? "規劃樣本數（或勾略過）" : "規劃樣本數"];
          if (!(x.apx || []).length) return [8, document.querySelector(`#planHub [data-hub="go"][data-id="${x.id}"]`), "開始分析"];
        }
        return [9, nav("pdca"), "看報告"];
      }
      if (v === "pdca") {
        const on = ((fb && fb.vplan) || []).filter(x => x.on);
        const todo = on.filter(x => !(x.nv && String(x.nv.why || "").trim()) && (vrNonStat(x) ? !(x.vr && x.vr.st) : !(x.apx || []).length));
        return todo.length ? [9, nav("plan"), `還有 ${todo.length} 項未完成`] : null;
      }
      // ---- 從驗證計畫進到工具頁：樣本數帶回／分析後存到報告 ----
      let ctx = ""; try { ctx = navCtx; } catch (_) {}
      if (ctx === "plan") {
        if (v === "sample") {
          const sv = document.querySelector("[data-svsave]"); if (vis(sv)) return [8, sv, "帶回驗證計畫"];
          let cur = ""; try { cur = svCur; } catch (_) {}
          const sel = cur ? document.querySelector(`#svList [data-svq="${cur}"]`) : [...document.querySelectorAll("#svList [data-svq]")].find(x => !x.value);
          if (sel && !sel.value) return [8, sel, "選要證明什麼"];
          const run = [...document.querySelectorAll('[data-view="sample"] .btn.primary')].find(b => vis(b) && !b.closest("#svList,#svBar"));
          return run ? [8, run, "填條件後計算"] : null;
        }
        if (["hypothesis", "regression", "msa", "spc", "doe", "taguchi"].includes(v)) {
          const box = [...document.querySelectorAll("[data-vrbox]")].find(b => vis(b));
          if (box) { const st = box.querySelector("[data-vrst][aria-pressed='true']"), dv = box.querySelector("[data-vrdev]");
            if (!st) return [8, box.querySelector("[data-vrst]").parentElement, "選結論（照實）"];
            if (dv && vis(dv) && !dv.value.trim()) return [8, dv, "寫少於規劃的理由"];
            return [8, box.querySelector("[data-vrsave]"), "存到報告"]; }
          const op = [...document.querySelectorAll("[data-vropen]")].find(vis); if (op) return [8, op, "看完結果，存到報告"];
          const run = [...document.querySelectorAll(".run-sticky .btn.primary")].find(vis); if (run) return [8, run, "填資料後按這裡"];
        }
      }
      return null;
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
  // =====================================================================
  // AI 回答中提到的外部案例編號（FDA 召回、MAUDE、PMID、美國專利、Health Canada）自動變成連結，點了直接開原始紀錄
  // 只連結「這次檢索結果裡真的有」的編號；KM 引用［KM-n］點了展開下方「已參考 KM」
  // =====================================================================
  (function refLinks() {
    const reEsc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    function refMap() {
      const M = new Map();
      const add = (k, url, title) => { k = String(k || "").trim(); if (k.length >= 5 && url && !M.has(k)) M.set(k, { url, title: title || "" }); };
      let exts = []; try { exts = [homeExt, typeof fb !== "undefined" && fb ? fb.ext : null]; } catch (_) {}
      exts.forEach(e => { if (!e) return;
        (e.recalls || []).forEach(r => add(r.no, r.url, r.title || r.reason));
        if (e.maude) (e.maude.samples || []).forEach(s => add(s.no, s.url, s.title));
        (e.more || []).forEach(m => (m.items || []).forEach(it => { add(it.ref, it.url, it.title); add(String(it.ref).replace(/^\S+\s+/, ""), it.url, it.title); }));
      });
      return M;
    }
    function linkIn(root, M, re) {
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.parentElement.closest("a,button,textarea,input,script,style,.ref-link") ? NodeFilter.FILTER_REJECT : (re.test(n.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP) });
      const nodes = []; let n; while ((n = w.nextNode())) nodes.push(n);
      nodes.forEach(t => {
        const frag = document.createDocumentFragment(); let s = t.nodeValue, last = 0; re.lastIndex = 0; let m;
        while ((m = re.exec(s))) {
          frag.appendChild(document.createTextNode(s.slice(last, m.index)));
          const k = m[0];
          if (/^KM-\d+$/.test(k)) { const a = document.createElement("a"); a.href = "#"; a.className = "ref-link km"; a.dataset.km = "1"; a.textContent = k; frag.appendChild(a); }
          else { const v = M.get(k); const a = document.createElement("a"); a.href = v.url; a.target = "_blank"; a.rel = "noopener"; a.className = "ref-link"; a.title = (v.title || "開啟原始紀錄").slice(0, 120); a.textContent = k + " ↗"; frag.appendChild(a); }
          last = m.index + k.length;
        }
        frag.appendChild(document.createTextNode(s.slice(last))); t.parentNode.replaceChild(frag, t);
      });
    }
    function run() {
      const M = refMap(), keys = [...M.keys()].sort((a, b) => b.length - a.length).map(reEsc);
      const re = new RegExp((keys.length ? keys.join("|") + "|" : "") + "KM-\\d+", "g"), reT = new RegExp(re.source);
      re.test = s => { reT.lastIndex = 0; return reT.test(s); };
      [$("msgs"), document.querySelector('[data-view="fishbone"] .fb-stack')].forEach(r => { if (r) linkIn(r, M, re); });
    }
    setInterval(run, 1200);
    document.addEventListener("click", e => { const a = e.target.closest("a.ref-link.km"); if (!a) return; e.preventDefault(); const d = $("kmOut"); if (d && !d.hidden) { d.open = true; d.scrollIntoView({ behavior: "smooth", block: "center" }); } });
  })();
  // =====================================================================
  // ③ 驗證計畫：驗證策略直接在每張卡片的 ① 格選（下方清單只留勾選、新增、刪除）
  // DOE／田口：② 樣本數可勾「略過樣本數計算（僅測試）」，附警語
  // =====================================================================
  (function hubInline() {
    const hub = $("planHub"); if (!hub) return;
    const BYP = "bypass", BYP_WHY = "略過樣本數計算（使用者勾選）：僅供測試，結果不可作為設計驗證或確效的依據。";
    try { if (!SV_Q.some(o => o[0] === BYP)) SV_Q.push([BYP, "略過樣本數，直接進入分析（僅測試）"]); SV_MANUAL[BYP] = 1; } catch (_) {}
    const isDoe = x => /^DOE|田口|實驗設計/.test(String(x.tool || ""));
    const item = id => (fb.vplan || []).find(y => y.id === id);
    const done = () => { try { vpChanged(true); } catch (_) { try { fbSave(); pdcaRender(); } catch (__) {} } };
    function deco() {
      hub.querySelectorAll(".hub-item").forEach(it => {
        const eb = it.querySelector('[data-hub="edit"]'), x = eb && item(eb.dataset.id); if (!x) return;
        const c = it.querySelectorAll(".hc");
        const v1 = c[0] && c[0].querySelector(".hc-v");
        if (v1 && !v1.querySelector(".hub-tool")) {
          let h = ""; try { h = vpToolCell(x); } catch (_) {}
          if (h) v1.innerHTML = h.replace(/class="vp-tool"/, 'class="vp-tool hub-tool"');
        }
        if (isDoe(x) && c[1] && !vrNonStat(x) && !c[1].querySelector("[data-hubbyp]")) {
          const on = (x.ss || {}).q === BYP;
          c[1].insertAdjacentHTML("beforeend", `<label class="hub-byp"><input type="checkbox" data-hubbyp="${x.id}"${on ? " checked" : ""}> 略過樣本數計算</label>${on ? `<div class="hub-bypw">⚠ 僅供測試：沒有統計依據，結果不能當驗證或確效的依據</div>` : ""}`);
        }
      });
    }
    new MutationObserver(deco).observe(hub, { childList: true });
    deco();
    hub.addEventListener("change", e => {
      const s = e.target.closest("select.hub-tool");
      if (s) { const x = item(s.dataset.id); if (!x) return; s.blur();
        if (s.value === "__custom") { const i = document.createElement("input"); i.className = "hub-tool-in"; i.value = (x.tool && !VP_TOOLS.includes(x.tool)) ? x.tool : ""; i.placeholder = "輸入驗證策略，按 Enter 完成"; s.replaceWith(i); i.focus();
          const fin = () => { x.tool = i.value.trim(); i.blur(); done(); };
          i.addEventListener("keydown", k => { if (k.key === "Enter") { k.preventDefault(); fin(); } }); i.addEventListener("blur", () => { if (i.isConnected) fin(); }, { once: true }); return; }
        x.tool = s.value; done(); return; }
      const b = e.target.closest("[data-hubbyp]");
      if (b) { const x = item(b.dataset.hubbyp); if (!x) return; b.blur();
        if (b.checked) { if ((x.ss || {}).q !== BYP) x.ssPrev = x.ss || null; x.ss = { q: BYP, n: "未計算（略過）", sum: "⚠ 略過樣本數計算，僅供測試", why: BYP_WHY }; }
        else { x.ss = x.ssPrev || undefined; delete x.ssPrev; if (!x.ss) delete x.ss; }
        done(); }
    }, true);
  })();
  // =====================================================================
  // AI 思考中：蓋一層半透明遮罩＋提示框，請使用者先不要操作（AI 視窗本身不擋，可看回覆）
  // =====================================================================
  (function aiWait() {
    document.body.insertAdjacentHTML("beforeend", `<div id="aiWait" class="ai-wait" hidden role="alertdialog" aria-live="polite" aria-label="AI 思考中"><div class="aw-box"><span class="aw-spin" aria-hidden="true"></span><div><b>AI 思考中，請稍候…</b><div class="aw-sub">完成前請先不要操作頁面　<span class="aw-t"></span></div></div><button type="button" class="btn small aw-stop" hidden>停止</button></div></div>`);
    const W = $("aiWait"), T = W.querySelector(".aw-t"), S = W.querySelector(".aw-stop");
    let t0 = 0;
    const isBusy = () => { try { return AIS.busy > 0; } catch (_) { return false; } };
    const canStop = () => { try { return !!(busy && ctl); } catch (_) { return false; } };
    setInterval(() => {
      if (isBusy()) {
        if (!t0) t0 = Date.now();
        const s = Math.floor((Date.now() - t0) / 1000);
        if (Date.now() - t0 < 500) return;   // 很快就回來的不閃
        if (W.hidden) { W.hidden = false; document.body.classList.add("ai-waiting"); if (document.activeElement && !document.activeElement.closest("#aiPanel")) document.activeElement.blur(); }
        T.textContent = s + " 秒"; S.hidden = !canStop();
      } else if (t0) { t0 = 0; W.hidden = true; document.body.classList.remove("ai-waiting"); }
    }, 250);
    S.addEventListener("click", () => { try { if (busy && ctl) ctl.abort(); } catch (_) {} });
    // 遮罩擋住鍵盤操作頁面（AI 視窗內除外）
    document.addEventListener("keydown", e => { if (!W.hidden && !e.target.closest("#aiPanel, #aiWait")) { e.preventDefault(); e.stopPropagation(); } }, true);
  })();
  // =====================================================================
  // 樣本數頁：DOE／田口項目可選「略過樣本數，直接進入分析（僅測試）」→ 存好後直接到分析頁
  // 其他工具的項目不列這個選項
  // =====================================================================
  (function svBypass() {
    const box = $("svList"); if (!box) return;
    const BYP = "bypass", isDoe = x => /^DOE|田口|實驗設計/.test(String(x.tool || ""));
    const trim = () => box.querySelectorAll("select[data-svq]").forEach(s => {
      const x = (fb.vplan || []).find(y => y.id === s.dataset.svq), o = s.querySelector(`option[value="${BYP}"]`);
      if (o && x && !isDoe(x) && s.value !== BYP) o.remove();
    });
    new MutationObserver(trim).observe(box, { childList: true, subtree: true }); trim();
    box.addEventListener("change", e => {
      const s = e.target.closest("select[data-svq]"); if (!s || s.value !== BYP) return;
      const x = (fb.vplan || []).find(y => y.id === s.dataset.svq); if (!x) return;
      e.stopImmediatePropagation(); s.blur();
      if ((x.ss || {}).q !== BYP) x.ssPrev = x.ss || null;
      x.ss = { q: BYP, n: "未計算（略過）", sum: "⚠ 略過樣本數計算，僅供測試", why: "略過樣本數計算（使用者勾選）：僅供測試，結果不可作為設計驗證或確效的依據。" };
      try { if (svCur === x.id) svCur = ""; } catch (_) {}
      fbSave(); try { svRender(); pdcaRender(); } catch (_) {}
      navCtx = "plan"; vrGo(x);
    }, true);
  })();
  // =====================================================================
  // 報告完整性：每個勾選的驗證項目要「已驗證」或「不驗證＋寫原因」（例如臨時撤案）
  // 有未處理的項目 → 報告標「草稿」、結案核准不能勾；未驗證的照實寫「尚未驗證」或「未驗證：原因」
  // =====================================================================
  const nvOk = x => !!(x && x.nv && String(x.nv.why || "").trim());
  const vDone = x => vrNonStat(x) ? !!(x.vr && x.vr.st) : !!(x.apx || []).length;
  const vTodo = () => ((fb && fb.vplan) || []).filter(x => x.on && !vDone(x) && !nvOk(x));
  (function nvInit() {
    const hub = $("planHub"); if (!hub) return;
    const item = id => (fb.vplan || []).find(y => y.id === id);
    function deco() {
      hub.querySelectorAll(".hub-item").forEach(it => {
        const eb = it.querySelector('[data-hub="edit"]'), x = eb && item(eb.dataset.id); if (!x || vDone(x) || it.querySelector(".hub-nv")) return;
        const on = !!x.nv;
        it.insertAdjacentHTML("beforeend", `<div class="hub-nv"><label><input type="checkbox" data-nvon="${x.id}"${on ? " checked" : ""}> 本項不驗證</label>${on ? `<input type="text" data-nvwhy="${x.id}" value="${esc((x.nv || {}).why || "")}" placeholder="原因（必填），例如：客戶撤案、改由其他 CAPA 處理">${nvOk(x) ? "" : `<span class="hub-nvw">寫了原因才算完成</span>`}` : ""}</div>`);
        if (nvOk(x)) it.classList.add("hub-nvd");
      });
    }
    new MutationObserver(deco).observe(hub, { childList: true }); deco();
    const save = () => { fbSave(); try { pdcaRender(); flowRender(); } catch (_) {} };
    hub.addEventListener("change", e => {
      const c = e.target.closest("[data-nvon]"); if (!c) return; const x = item(c.dataset.nvon); if (!x) return; c.blur();
      if (c.checked) x.nv = { why: (x.nv && x.nv.why) || "" }; else delete x.nv;
      save(); if (c.checked) setTimeout(() => { const i = hub.querySelector(`[data-nvwhy="${x.id}"]`); if (i) i.focus(); }, 50);
    });
    hub.addEventListener("input", e => { const i = e.target.closest("[data-nvwhy]"); if (!i) return; const x = item(i.dataset.nvwhy); if (x) { x.nv = { why: i.value }; fbSave(); } });
    hub.addEventListener("focusout", e => { if (e.target.closest("[data-nvwhy]")) setTimeout(save, 0); });
    // ---- 報告：草稿標示、結案核准鎖定、未驗證照實寫 ----
    const orig = pdcaHtml;
    pdcaHtml = function (mode) {
      let h = orig(mode);
      const on = ((fb && fb.vplan) || []).filter(x => x.on); if (!on.length) return h;
      const todo = vTodo(), nv = on.filter(x => !vDone(x) && nvOk(x));
      const t = document.createElement("template"); t.innerHTML = h; const R = t.content;
      const red = "color:#B3261E;font-weight:800", grey = "color:#6B6B6B;font-weight:700";
      // 結論欄：依原因文字找列
      R.querySelectorAll("table").forEach(tb => {
        const ths = [...tb.querySelectorAll("thead th, tr:first-child th")], ci = ths.findIndex(th => th.textContent.trim() === "結論"); if (ci < 0) return;
        tb.querySelectorAll("tbody tr").forEach(tr => {
          const tds = [...tr.children]; if (tds.length !== ths.length) return;
          const x = on.find(y => tds.some(td => td.textContent.trim() === String(y.cause || "").trim())); if (!x || vDone(x)) return;
          tds[ci].innerHTML = nvOk(x) ? `<span class="pd-vr-nv" style="${grey}">未驗證：${esc(x.nv.why.trim())}</span>` : `<span class="pd-vr-none" style="${red}">尚未驗證</span>`;
        });
      });
      // 草稿標示
      const head = R.querySelector(".pd-head");
      if (head && todo.length) head.insertAdjacentHTML("afterend", `<div class="pd-draft" style="margin:10px 0;padding:10px 14px;border:2px solid #B3261E;border-radius:8px;background:#FDECEA;color:#7A1A12;font-weight:700">草稿：尚有 ${todo.length} 個驗證項目尚未驗證（${todo.map(x => esc(x.cause)).join("、")}），報告不完整，不能結案。<br><span style="font-weight:500">請完成驗證，或在 ③ 驗證計畫勾「本項不驗證」並寫原因。</span></div>`);
      else if (head && nv.length) head.insertAdjacentHTML("afterend", `<div class="pd-nvnote" style="margin:10px 0;padding:8px 14px;border:1px solid #B9B0A0;border-radius:8px;color:#4A4A4A">${nv.length} 個驗證項目未驗證，已寫原因：${nv.map(x => esc(x.cause) + "（" + esc(x.nv.why.trim()) + "）").join("；")}</div>`);
      // 結案核准：有未處理項目時鎖定
      if (todo.length) R.querySelectorAll(".pd-box").forEach(b => { const li = b.closest("li"); if (!li || !/PDCA 結案核准/.test(li.textContent)) return; const s = document.createElement("span"); s.className = "pd-box"; s.style.opacity = ".35"; b.replaceWith(s); li.insertAdjacentHTML("beforeend", `<span style="${red};font-size:12px">（尚有 ${todo.length} 項未驗證，不能結案）</span>`); });
      const d = document.createElement("div"); d.appendChild(R); return d.innerHTML;
    };
    // 已勾的結案核准，若後來又有未處理項目，取消勾選
    setInterval(() => { try { const P = pdState(); if (P.c["ap.ok"] && vTodo().length) { delete P.c["ap.ok"]; fbSave(); } } catch (_) {} }, 1500);
  })();
  // =====================================================================
  // ③ 驗證項目只來自 ② 魚骨圖（標 ◇ 的原因）：不再手動新增，AI 也不新增原因，只補空白欄位
  // 要加或改原因 → 回 ② 魚骨圖；③ 已填的策略、樣本數、結果都跟著原因保留
  // =====================================================================
  (function fbOnly() {
    const sum = $("planSum"), hub = $("planHub"); if (!sum || !hub) return;
    const item = id => (fb.vplan || []).find(y => y.id === id);
    const sh = document.querySelector("#planEdit > summary .hint"); if (sh) sh.textContent = "　勾選要驗證的原因；原因要新增或修改請回 ② 魚骨圖";
    const decoSum = () => { sum.querySelectorAll(".hint").forEach(h => { if (/新增項目/.test(h.textContent)) h.textContent = h.textContent.replace(/；也可以按「＋ 新增項目」自己寫/, ""); }); const a = sum.querySelector(".ps-act"); if (a && !a.querySelector("[data-gofb]")) a.insertAdjacentHTML("afterbegin", `<button type="button" class="btn small" data-gofb="1" title="原因在魚骨圖新增或修改；這裡已填的內容會保留">← 回 ② 魚骨圖改原因</button>`); };
    const decoHub = () => hub.querySelectorAll(".hub-item").forEach(it => {
      const eb = it.querySelector('[data-hub="edit"]'), x = eb && item(eb.dataset.id); if (!x || x.fid || it.querySelector("[data-nofbdel]")) return;
      eb.insertAdjacentHTML("afterend", `<button type="button" class="linkbtn hub-nofb" data-nofbdel="${x.id}" title="這一項不是從魚骨圖帶入的">刪除（非魚骨圖原因）</button>`);
    });
    new MutationObserver(decoSum).observe(sum, { childList: true }); decoSum();
    new MutationObserver(decoHub).observe(hub, { childList: true }); decoHub();
    document.addEventListener("click", e => {
      if (e.target.closest("[data-gofb]")) { route("fishbone"); return; }
      const d = e.target.closest("[data-nofbdel]");
      if (d) { if (!d.dataset.armed) { d.dataset.armed = "1"; d.textContent = "確定刪除？再按一次"; return; } fb.vplan = (fb.vplan || []).filter(y => y.id !== d.dataset.nofbdel); try { vpChanged(true); } catch (_) {} return; }
      // AI 建議的驗證項目：只補清單中已有（魚骨圖帶入）的原因，新的原因不列入
      const b = e.target.closest("[data-vpadd]"); if (!b || b.disabled || b.dataset.fbonly) return;
      let items; try { items = JSON.parse(b.dataset.vpadd); } catch (_) { return; }
      const L = fb.vplan || [], ok = items.filter(x => L.some(y => vpKey(y) === vpKey(x) || vpSim(y.cause, x.cause) >= VP_SIM)), drop = items.length - ok.length;
      b.dataset.fbonly = "1";
      if (!ok.length) { e.stopImmediatePropagation(); b.disabled = true; b.textContent = "AI 建議的原因都不在驗證清單，未列入"; fbNote(`AI 建議的 ${drop} 個原因不在驗證清單（魚骨圖沒有或未標 ◇），未列入。要加入請回 ② 魚骨圖新增或標 ◇。`); return; }
      b.dataset.vpadd = JSON.stringify(ok);
      if (drop) setTimeout(() => fbNote(`另有 ${drop} 個 AI 建議的原因不在驗證清單（魚骨圖沒有或未標 ◇），未列入；要加入請回 ② 魚骨圖新增或標 ◇。`), 30);
    }, true);
  })();
