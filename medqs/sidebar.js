  // =====================================================================
  // 左側欄：方法一（工具箱：各工具 → 子分頁）、方法二（PDCA 四步 → 驗證項目／報告段落）
  // 沿用原本 .toolnav 的按鈕（data-route、完成狀態、導引手指都不變），只是搬到左側欄重新排列。
  // 「設定與案件」放在上方標題列。預設全部收合，點了才展開。
  // 電腦：工具的子分頁只在側欄；手機（側欄收成 ☰）：工具頁上方保留子分頁。
  // =====================================================================
  const SB_SUBS = {
    hypothesis: [["compare", "比較檢定（量測數值）"], ["count", "次數資料（不良率、類別）"], ["tol", "統計允差區間"]],
    msa: [["grr", "Gage R&R"], ["bias", "偏差"], ["lin", "線性"], ["stab", "穩定性"], ["attr", "屬性一致性"]],
    doe: [["fact", "因子設計（製程參數）"], ["mix", "混合設計（配方比例）"]]
  };
  const SB_TOOLS = ["sample", "hypothesis", "regression", "msa", "spc", "doe", "taguchi"];
  const SB_PD = [["1", "記錄問題"], ["2", "分析問題（魚骨圖）"], ["3", "找出原因（5 個為什麼）"], ["4", "採取對策"], ["5", "驗證結果與標準化"], ["6", "前幾輪的結果"]];
  function sbReveal(b) {   // 導引手指要指的按鈕在收合的群組裡：展開那一組
    const g = b && b.closest && b.closest(".sb-grp"); if (!g || !g.querySelector(".sb-body").hidden) return;
    sbOpen(g, true);
  }
  function sbOpen(g, on) { g.querySelector(".sb-body").hidden = !on; g.querySelector(".sb-gh").setAttribute("aria-expanded", String(on)); }
  (function sbInit() {
    const nav = document.querySelector("nav.toolnav"), wrap = document.querySelector(".wrap"), head = document.querySelector("header.top");
    if (!nav || !wrap || !head) return;
    const btn = r => nav.querySelector(`[data-route="${r}"]`);
    // 設定與案件 → 上方標題列
    const set = btn("aisettings"), acts = head.querySelector(".top-actions");
    if (set && acts) { set.className = "btn ghost-light small sb-set"; set.removeAttribute("role"); acts.insertBefore(set, acts.firstChild); set.addEventListener("click", () => route("aisettings")); }
    // 版面：標題列下方分成 左側欄＋主畫面
    const lay = document.createElement("div"); lay.className = "sb-layout";
    const side = document.createElement("aside"); side.className = "sb"; side.id = "sideNav"; side.setAttribute("aria-label", "功能選單");
    const main = document.createElement("div"); main.className = "sb-main";
    while (head.nextSibling) main.appendChild(head.nextSibling);
    lay.append(side, main); wrap.appendChild(lay); wrap.classList.add("sb-wide");
    const sub = (t, k, lab) => `<button type="button" class="sb-s" data-sbt="${t}" data-sbs="${k}">${esc(lab)}</button>`;
    const grp = (g, small, title) => `<div class="sb-grp" data-g="${g}"><button type="button" class="sb-gh" aria-expanded="false"><small>${small}</small><b>${title}</b><i class="sb-car" aria-hidden="true"></i></button><div class="sb-body" hidden></div></div>`;
    nav.className = "toolnav sb-nav"; nav.setAttribute("aria-label", "方法一：工具箱；方法二：PDCA 改善流程"); nav.removeAttribute("role");
    const hid = nav.querySelector(".nv-hid");
    const tb = btn("toolbox"), steps = [...nav.querySelectorAll("[data-step]")];
    nav.insertAdjacentHTML("afterbegin", grp("tb", "方法一", "工具箱") + grp("flow", "方法二", "PDCA 改善流程"));
    const [gTb, gFl] = nav.querySelectorAll(".sb-grp"), bTb = gTb.querySelector(".sb-body"), bFl = gFl.querySelector(".sb-body");
    const item = (b, key, subs) => { const d = document.createElement("div"); d.className = "sb-tool"; d.dataset.t = key; b.className = (b.className + " sb-it").trim(); b.removeAttribute("tabindex"); b.removeAttribute("role"); d.appendChild(b); if (subs) { b.classList.add("sb-has"); d.insertAdjacentHTML("beforeend", `<div class="sb-sub" hidden>${subs}</div>`); } return d; };
    if (tb) { tb.textContent = "從情境找工具（總覽）"; bTb.appendChild(item(tb, "toolbox")); }
    SB_TOOLS.forEach(t => { const b = btn(t); if (!b) return; bTb.appendChild(item(b, t, t === "sample" ? " " : SB_SUBS[t] ? SB_SUBS[t].map(([k, l]) => sub(t, k, l)).join("") : "")); });
    steps.forEach(b => { const k = b.dataset.route; bFl.appendChild(item(b, k, k === "plan" || k === "pdca" ? " " : "")); });
    nav.querySelectorAll(".nv-grp, .nv-arr").forEach(x => x.remove());
    if (hid) nav.appendChild(hid);   // 計算驗證等仍然隱藏
    side.appendChild(nav);
    side.insertAdjacentHTML("beforeend", `<div class="sb-foot" id="sbFoot"></div>`);
    // 手機：☰ 開關側欄
    head.querySelector(".top-row").insertAdjacentHTML("afterbegin", `<button type="button" class="sb-burger" id="sbBurger" aria-controls="sideNav" aria-expanded="false" aria-label="開啟功能選單">☰</button>`);
    document.body.insertAdjacentHTML("beforeend", `<div class="sb-mask" id="sbMask" hidden></div>`);
    const drawer = on => { document.body.classList.toggle("sb-drawer", on); $("sbMask").hidden = !on; $("sbBurger").setAttribute("aria-expanded", String(on)); };
    $("sbBurger").addEventListener("click", () => drawer(!document.body.classList.contains("sb-drawer")));
    $("sbMask").addEventListener("click", () => drawer(false));
    const mobile = () => matchMedia("(max-width: 899px)").matches;

    // 動態子項目：樣本數（問題）、③ 驗證項目、④ 報告段落
    function fill(t) {
      const box = nav.querySelector(`.sb-tool[data-t="${t}"] .sb-sub`); if (!box) return;
      if (t === "sample") box.innerHTML = [...document.querySelectorAll("#ssQ [data-q]")].map(b => { let t = ""; try { t = (SSQ[b.dataset.q] || {}).title || ""; } catch (_) {} t = (t || b.textContent || "").replace(/\s+/g, " ").trim(); return sub("sample", b.dataset.q, t.split("？")[0].slice(0, 30) + (t.includes("？") ? "？" : "")); }).join("");
      else if (t === "plan") {
        const L = [...document.querySelectorAll("#planHub .hub-item")];
        box.innerHTML = L.length ? L.map((x, i) => sub("plan", i, `${i + 1}. ${(x.querySelector(".hub-t") || x).textContent.trim()}`)).join("") : `<span class="sb-none">尚無驗證項目</span>`;
      } else if (t === "pdca") {
        const has6 = [...document.querySelectorAll("#pdcaWrap .pd-sec h4")].some(h => /^6/.test(h.textContent.trim()));
        box.innerHTML = SB_PD.filter(([n]) => n !== "6" || has6).map(([n, l]) => sub("pdca", n, `${n}　${l}`)).join("");
      }
    }
    const cv = () => { try { return currentView; } catch (_) { return ""; } };   // currentView 在本模組之後才宣告（初始化時讀會 TDZ）
    function sync() {
      const v = cv();
      if (set) set.classList.toggle("on", v === "aisettings");
      nav.querySelectorAll(".sb-tool").forEach(d => d.classList.toggle("on", d.dataset.t === v));
      nav.querySelectorAll(".sb-grp").forEach(g => g.classList.toggle("on", !!g.querySelector(`.sb-tool[data-t="${v}"]`)));
      nav.querySelectorAll(".sb-s").forEach(s => {
        const t = s.dataset.sbt, k = s.dataset.sbs; let on = false;
        if (t !== v) on = false;
        else if (t === "hypothesis") on = !!document.querySelector(`#viewAnalyze .subtabs [data-sub="${k}"][aria-selected="true"]`);
        else if (t === "msa" || t === "doe") on = !!document.querySelector(`#${t}Tabs [data-tsub="${k}"][aria-selected="true"]`);
        else if (t === "sample") on = !!document.querySelector(`#ssQ [data-q="${k}"][aria-pressed="true"]`);
        s.classList.toggle("on", on);
      });
    }
    nav.addEventListener("click", e => {
      const gh = e.target.closest(".sb-gh");
      if (gh) { const g = gh.closest(".sb-grp"); sbOpen(g, g.querySelector(".sb-body").hidden); return; }
      const s = e.target.closest(".sb-s");
      if (s) {
        const t = s.dataset.sbt, k = s.dataset.sbs;
        if (t === "sample") { const b = btn("sample"); if (b && cv() !== "sample") b.click(); try { ssPick(k); } catch (_) {} }
        else if (t === "plan" || t === "pdca") {
          const b = btn(t); if (b && cv() !== t) b.click();
          setTimeout(() => {
            const el = t === "plan" ? document.querySelectorAll("#planHub .hub-item")[+k] : [...document.querySelectorAll("#pdcaWrap .pd-sec")].find(x => { const h = x.querySelector("h4"); return h && h.textContent.trim().startsWith(k); });
            if (el) { el.scrollIntoView({ behavior: "smooth", block: "start" }); el.classList.add("sb-flash"); setTimeout(() => el.classList.remove("sb-flash"), 1400); }
          }, 120);
        } else gotoTool(t, k);
        setTimeout(sync, 0); if (mobile()) drawer(false); return;
      }
      const it = e.target.closest(".sb-it");
      if (it && !e.isTrusted) { setTimeout(sync, 0); return; }   // 程式代按（導引、跳轉）：只前往，不改展開狀態
      if (it) {   // 點工具或步驟：前往（.toolnav 原本的處理），有子項目就展開；已在這頁再點一次就收合
        const d = it.closest(".sb-tool"), sb = d.querySelector(".sb-sub");
        if (sb) { const was = d.dataset.t === cv() && !sb.hidden; setTimeout(() => { fill(d.dataset.t); sb.hidden = was; it.setAttribute("aria-expanded", String(!was)); sync(); }, 0); }
        else setTimeout(sync, 0);
        if (mobile() && !sb) drawer(false);
      }
    });
    // 頁面上切換子分頁時，側欄跟著標示
    document.addEventListener("click", e => { if (e.target.closest(".subtabs, #ssQ")) setTimeout(sync, 0); });
    const _route = route;
    route = function (name) { _route(name); try { ["plan", "pdca", "sample"].forEach(t => { const sb = nav.querySelector(`.sb-tool[data-t="${t}"] .sb-sub`); if (sb && !sb.hidden) fill(t); }); sync(); } catch (e) { console.warn("sidebar", e); } };
    // 暫存進度、重新檢討魚骨圖、輪次：顯示在側欄底部（按鈕轉給原本流程列處理）
    const fl = $("flowBar");
    const foot = () => { const s = fl && fl.querySelector(".fl-slim"); $("sbFoot").innerHTML = s ? s.innerHTML : ""; };
    if (fl) { new MutationObserver(foot).observe(fl, { childList: true, subtree: true, characterData: true, attributes: true }); foot(); }
    $("sbFoot").addEventListener("click", e => {
      const b = e.target.closest("[data-fl]"); if (!b || !fl) return;
      const o = fl.querySelector(`.fl-slim [data-fl="${b.dataset.fl}"]`); if (o) o.click();
      if (mobile()) drawer(false);
    });
    sync();
  })();
  // =====================================================================
  // 操作問題回饋：側欄「暫存進度」上方。填寫後開啟 GitHub「新增 Issue」頁（內容已帶入），使用者登入 GitHub 後按送出。
  // 網頁不存任何 GitHub 金鑰；自動附上的只有頁面、執行環境、瀏覽器與畫面寬度，不含案件內容（去識別化）。
  // =====================================================================
  (function bugFeedback() {
    const side = $("sideNav"), foot = $("sbFoot"); if (!side || !foot) return;
    const REPO = "https://github.com/ChiuChangRu/DMAIC_02";
    foot.insertAdjacentHTML("beforebegin", `<div class="sb-bug"><button type="button" class="sb-bug-btn" id="sbBug">🐞 操作問題回饋</button></div>`);
    document.body.insertAdjacentHTML("beforeend", `<dialog class="bug-dlg" id="bugDlg" aria-labelledby="bugT"><form method="dialog">
      <h3 id="bugT">🐞 操作問題回饋</h3>
      <p class="hint">寫下遇到的問題，按「到 GitHub 送出」會開啟 GitHub 的回報頁（內容已帶入），登入 GitHub 後按「Submit new issue」即完成。<b>請勿寫入人名、單位、客戶或醫院名稱等可識別資料</b>；GitHub 上的回報是公開的。</p>
      <label class="group-label" for="bugTitle">標題（一句話）</label><input type="text" id="bugTitle" maxlength="120" placeholder="例如：③ 驗證計畫按「規劃」後回來，策略不見了">
      <label class="group-label" for="bugDesc">發生什麼事？怎麼操作的？</label><textarea id="bugDesc" rows="6" placeholder="1. 在哪一頁做了什麼&#10;2. 預期看到什麼&#10;3. 實際看到什麼"></textarea>
      <label class="bug-env"><input type="checkbox" id="bugEnv" checked> 附上目前頁面、執行環境、瀏覽器與畫面寬度（不含案件內容）</label>
      <pre class="bug-envtxt" id="bugEnvTxt"></pre>
      <p class="hint" id="bugHint"></p>
      <div class="run-row"><button type="button" class="btn primary" id="bugGo">到 GitHub 送出 ↗</button><button type="button" class="btn" id="bugCopy">複製內容</button><button type="submit" class="btn ghost" value="cancel">取消</button></div>
    </form></dialog>`);
    const D = $("bugDlg");
    const VIEW = { home: "① 定義問題", fishbone: "② 魚骨圖", plan: "③ 驗證計畫", pdca: "④ PDCA 報告", toolbox: "工具箱", aisettings: "設定與案件", sample: "樣本數規劃", hypothesis: "假設檢定", regression: "相關與回歸", msa: "MSA", spc: "SPC", doe: "DOE", taguchi: "田口方法", validation: "計算驗證" };
    const env = () => { let v = ""; try { v = currentView; } catch (_) {}
      const host = /claude\.ai|claudeusercontent/.test(location.href) || window.claude ? "claude.ai" : location.host || "本機檔案";
      return [`- 頁面：${VIEW[v] || v || "（不明）"}`, `- 執行環境：${host}`, `- 瀏覽器：${navigator.userAgent}`, `- 畫面寬度：${innerWidth}px`, `- 回報時間：${new Date().toLocaleString("zh-TW", { hour12: false })}`].join("\n"); };
    const body = () => `## 問題描述\n${$("bugDesc").value.trim() || "（未填）"}\n` + ($("bugEnv").checked ? `\n## 環境（自動附上，不含案件內容）\n${env()}\n` : "") + `\n---\n_由 PDCA品質輔助系統「操作問題回饋」產生_`;
    const title = () => "[操作問題] " + ($("bugTitle").value.trim() || "（未填標題）");
    const paint = () => { $("bugEnvTxt").hidden = !$("bugEnv").checked; $("bugEnvTxt").textContent = env(); };
    $("sbBug").addEventListener("click", () => { $("bugHint").textContent = ""; paint(); try { D.showModal(); } catch (_) { D.setAttribute("open", ""); } setTimeout(() => $("bugTitle").focus(), 0); });
    $("bugEnv").addEventListener("change", paint);
    $("bugGo").addEventListener("click", () => {
      if (!$("bugDesc").value.trim() && !$("bugTitle").value.trim()) { $("bugHint").textContent = "請先寫標題或問題描述。"; return; }
      const url = `${REPO}/issues/new?title=${encodeURIComponent(title())}&body=${encodeURIComponent(body())}`;
      try { window.open(url, "_blank", "noopener"); } catch (_) {}
      $("bugHint").innerHTML = `已開啟 GitHub 回報頁（新分頁）。若沒有出現，請按「複製內容」後到 <a href="${REPO}/issues/new" target="_blank" rel="noopener">GitHub 回報頁</a> 貼上。`;
    });
    $("bugCopy").addEventListener("click", async () => {
      const t = title() + "\n\n" + body();
      try { await navigator.clipboard.writeText(t); $("bugHint").textContent = "已複製。"; }
      catch (_) { const ta = document.createElement("textarea"); ta.value = t; document.body.appendChild(ta); ta.select(); let ok = false; try { ok = document.execCommand("copy"); } catch (__) {} ta.remove(); $("bugHint").textContent = ok ? "已複製。" : "這個檢視無法複製，請手動選取上面的文字。"; }
    });
  })();
