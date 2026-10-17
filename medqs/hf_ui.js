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
  // 👉 導引手勢（第 1～6 步：定義問題 → 魚骨圖 → 標 ◇ → 驗證計畫）
  // 同一時間只指一個「下一步」；按下去就移到下一步；不擋任何操作；可用「👉 導引」關掉
  // =====================================================================
  (function glInit() {
    const KEY = "mdqs.guide.on";
    const bar = $("caseQBar"); if (!bar) return;
    $("helpTgl").insertAdjacentHTML("beforebegin", `<button type="button" class="btn small" id="glTgl" aria-pressed="true" title="顯示／隱藏下一步導引">👉 導引</button>`);
    document.body.insertAdjacentHTML("beforeend", `<div id="glove" class="glove" hidden aria-hidden="true"><span class="gl-h">👉</span><span class="gl-t"></span></div><button type="button" id="gloveEdge" class="glove-edge" hidden></button>`);
    const G = $("glove"), E = $("gloveEdge");
    let on = true; try { on = localStorage.getItem(KEY) !== "0"; } catch (_) {}
    const setOn = v => { on = v; $("glTgl").setAttribute("aria-pressed", String(v)); try { localStorage.setItem(KEY, v ? "1" : "0"); } catch (_) {} tick(); };
    $("glTgl").addEventListener("click", () => setOn(!on));
    const vis = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== "hidden"; };
    const view = () => { const s = [...document.querySelectorAll("section[data-view]")].find(x => !x.hidden); return s ? s.dataset.view : ""; };
    const nav = r => document.querySelector(`.toolnav [data-route="${r}"]`);
    // 依目前狀態決定下一步：[步驟, 目標元素, 短字]
    function next() {
      const v = view(), F = (typeof fb !== "undefined" && fb && fb.factors) || [];
      const cand = F.filter(f => f.st === "cand"), use = F.filter(f => f.st === "use"), ver = F.filter(f => f.verify && f.st !== "excl");
      if (v === "home") {
        if (F.length) return ver.length ? [6, nav("plan"), "下一步"] : [3, nav("fishbone"), "到魚骨圖"];
        if (document.querySelector("#msgs .sug-peek")) return [2, nav("fishbone"), "到魚骨圖"];
        if (!$("homeQ").value.trim()) return [1, $("homeQ"), "寫下問題"];
        return [1, $("homeQBtn"), "按這裡"];
      }
      if (v === "fishbone") {
        const pop = $("fbPop");
        if (pop && vis(pop)) { const vb = pop.querySelector('[data-p="verify"]'); if (vb && vb.getAttribute("aria-pressed") !== "true") return [5, vb, "標待驗證"]; }
        if (cand.length) { const b = document.querySelector('.fb-f.st-cand [data-act="fst"][data-st="use"]'); return [3, b, "採用或排除"]; }
        if (use.length && !ver.length) { const t = document.querySelector("#fbSvgWrap [data-f]"); return [4, t, "點原因"]; }
        if (ver.length) return [6, nav("plan"), "下一步"];
        if (!F.length && !$("fbProblem").value.trim()) return [1, $("fbProblem"), "寫下問題"];
        return null;
      }
      return null;   // 第 7～8 步之後再做
    }
    function place(step, el, txt) {
      G.dataset.step = step; G.querySelector(".gl-t").textContent = txt;
      const r = el.getBoundingClientRect(), H = innerHeight;
      if (r.bottom < 60 || r.top > H - 40) {   // 不在畫面內：邊緣提示
        G.hidden = true; E.hidden = false; E.textContent = r.top > H - 40 ? "👇 下一步在下面" : "👆 下一步在上面"; E.classList.toggle("up", r.bottom < 60);
        E.onclick = () => el.scrollIntoView({ behavior: "smooth", block: "center" }); return;
      }
      E.hidden = true; G.hidden = false;
      const gw = G.offsetWidth, gh = G.offsetHeight;
      let x = r.left - gw + 4, y = r.top + r.height / 2 - (gh - 15);   // 手指尖對準目標左緣中間
      if (x < 4) { x = r.right + 6; G.classList.add("flip"); } else G.classList.remove("flip");
      G.style.left = x + "px"; G.style.top = Math.max(4, y) + "px";
    }
    let lastV = "";
    function tick() {
      const v = view();
      // 進入魚骨圖且有待決定：直接捲到「待決定」
      if (v !== lastV) { lastV = v; if (v === "fishbone" && on) setTimeout(() => { const c = document.querySelector(".fb-f.st-cand"); if (c) { try { closePanel(); } catch (_) {} c.closest("section") ? c.closest("section").scrollIntoView({ behavior: "smooth", block: "start" }) : c.scrollIntoView({ behavior: "smooth", block: "center" }); } }, 250); }
      const n = on ? next() : null;
      if (!n || !vis(n[1])) { G.hidden = true; E.hidden = true; return; }
      place(n[0], n[1], n[2]);
    }
    setInterval(tick, 400); addEventListener("scroll", tick, { passive: true }); addEventListener("resize", tick);
    document.addEventListener("click", () => setTimeout(tick, 80), true);
    setOn(on);
  })();
