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
