  // =====================================================================
  // 共用匯入（試作）：目前接 SPC 的資料框
  // 原則與 regress_ui.js 的匯入相同：Excel／CSV／Word／PDF 文字層由程式讀取；掃描檔與照片才請 AI 轉錄；
  // AI 只照抄看得到的數字，不計算、不補值；AI 轉錄的結果須人工逐格核對才可填入。
  // 自動判讀（o.plan）：欄位角色、資料型態、規格。AI 依判斷法則回傳 impmeta，程式再檢查；結果顯示在確認區、可修改，填入時一併套用。
  // 沿用：regress_ui.js 的 readXlsx、textTable；fishbone.js 的 pdfLib、renderPage、unzip、imgLimits、PDFJS
  // =====================================================================
  function mkImporter(o) {
    // o = { key: id 前綴, data: 資料框 id, pickCols: 是否讓使用者勾選要用的欄, numOnly: 勾選的欄是否只能是數字, clearOn: 會改寫資料框的其他按鈕（選擇器）,
    //       metaPrompt: 給 AI 的判讀法則, roleLabel: 欄位角色的顯示名稱, plan(S, note) → 判讀結果, planHtml(P), planCheck(P) → 錯誤文字, onFill(P, src) → 附加的來源說明 }
    const K = o.key, D = $(o.data);
    const S = { file: null, kind: "", sheets: null, table: null, from: "", ai: false, imgs: [], pdf: null, use: [], meta: null, plan: null };
    const reset = () => Object.assign(S, { file: null, kind: "", sheets: null, table: null, from: "", ai: false, imgs: [], pdf: null, use: [], meta: null, plan: null });
    const el = s => $(K + s);
    D.insertAdjacentHTML("beforebegin", `<div class="run-row" style="margin-top:0"><button class="btn" type="button" id="${K}Btn">匯入／拖入檔案（Excel、CSV、Word、PDF、照片）</button><input autocomplete="off" type="file" id="${K}File" accept=".xlsx,.csv,.tsv,.txt,.docx,.pdf,image/png,image/jpeg,image/webp" hidden><span class="hint" id="${K}Src"></span></div><div class="reg-imp" id="${K}" hidden></div>`);
    el("Btn").addEventListener("click", () => el("File").click());
    // 拖曳檔案：拖到按鈕列或資料框都可以；拖的是文字時維持瀏覽器原本行為
    const hasFile = e => e.dataTransfer && [...(e.dataTransfer.types || [])].includes("Files");
    [el("Btn").parentNode, D].forEach(z => {
      z.addEventListener("dragover", e => { if (!hasFile(e)) return; e.preventDefault(); e.dataTransfer.dropEffect = "copy"; D.classList.add("imp-over"); });
      z.addEventListener("dragleave", () => D.classList.remove("imp-over"));
      z.addEventListener("drop", e => { if (!hasFile(e)) return; e.preventDefault(); D.classList.remove("imp-over"); const f = e.dataTransfer.files[0]; if (f) open(f); });
    });
    el("File").addEventListener("change", () => { const f = el("File").files[0]; el("File").value = ""; if (f) open(f); });
    const msg = (m, bad) => { const e = el("Msg"); if (e) e.innerHTML = bad ? `<span class="status ng">${esc(m)}</span>` : esc(m); };
    function close() { el("").hidden = true; el("").innerHTML = ""; reset(); }
    function shell(title) {
      el("").hidden = false;
      el("").innerHTML = `<p class="reg-imp-h"><b>匯入確認區</b> <span class="pk-src" id="${K}SrcTag"></span> <span class="hint">${esc(title)}</span></p><div id="${K}Ctl"></div><p class="hint" id="${K}Msg"></p><div id="${K}Body"></div><div class="run-row" id="${K}Act" hidden><label class="reg-chk" id="${K}ChkW" hidden><input type="checkbox" id="${K}Chk"> 我已逐格核對，與原始檔案一致</label><button class="btn primary small" type="button" id="${K}Go">填入資料</button><button class="btn ghost small" type="button" id="${K}Cancel">取消</button></div><p class="hint" id="${K}Why"></p>`;
      el("Cancel").addEventListener("click", close);
      el("Go").addEventListener("click", apply);
      el("Chk").addEventListener("change", gate);
    }
    async function open(file) {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      if (file.size > 25 * 1024 * 1024) { shell(file.name); msg("檔案太大（超過 25 MB）。", true); return; }
      close(); shell(file.name); S.file = file;
      try {
        if (ext === "xlsx") { S.kind = "xlsx"; msg("讀取 Excel 中…"); S.sheets = await readXlsx(file); pickSheet("工作表", s => `程式讀取「${file.name}」工作表「${s.name}」`); if (S.sheets.length) msg("Excel 的公式會讀取最後存檔時的計算結果；日期會變成序號數字。"); }
        else if (ext === "docx") { S.kind = "docx"; msg("讀取 Word 中…"); S.sheets = (await docxTables(file)).map((rows, i) => ({ name: `表格 ${i + 1}`, rows })); if (!S.sheets.length) throw new Error("這個 Word 檔裡沒有表格。若數據是圖片，請截圖後用照片匯入。"); pickSheet("表格", s => `程式讀取「${file.name}」${s.name}`); msg("合併儲存格會變成空白格，請核對。"); }
        else if (["csv", "tsv", "txt"].includes(ext)) { S.kind = "text"; show(textTable(await file.text()), `程式讀取「${file.name}」`); }
        else if (ext === "pdf") { S.kind = "pdf"; msg("讀取 PDF 中…"); await pdf(file); }
        else if (/^image\//.test(file.type)) { S.kind = "image"; S.imgs = [{ b: file, name: file.name }]; needAi("照片沒有文字層，需要請 AI 轉錄表格。"); }
        else if (ext === "xls") msg("舊版 Excel（.xls）請另存為 .xlsx 或 CSV。", true);
        else msg("不支援這種檔案；可用 Excel（.xlsx）、CSV、Word（.docx）、PDF 或照片。", true);
      } catch (e) { msg((e && e.message) || "讀取失敗。", true); }
    }
    function pickSheet(word, from) {
      if (!S.sheets.length) { msg("檔案裡沒有資料。", true); return; }
      el("Ctl").innerHTML = S.sheets.length > 1 ? `<div class="field" style="max-width:320px"><label for="${K}Sheet">${word}</label><select id="${K}Sheet">${S.sheets.map((s, i) => `<option value="${i}">${esc(s.name)}（${s.rows.length} 列）</option>`).join("")}</select></div>` : "";
      const go = i => show(S.sheets[i].rows, from(S.sheets[i]));
      if (S.sheets.length > 1) el("Sheet").addEventListener("change", e => go(+e.target.value));
      go(0);
    }
    async function pdf(file) {
      let lib; try { lib = await pdfLib(); } catch (_) { throw new Error("無法載入 PDF 讀取程式（需要連到 cdnjs.cloudflare.com）。"); }
      let doc; try { doc = await lib.getDocument({ data: new Uint8Array(await file.arrayBuffer()), isEvalSupported: false, disableFontFace: true, cMapUrl: PDFJS + "cmaps/", cMapPacked: true, standardFontDataUrl: PDFJS + "standard_fonts/" }).promise; }
      catch (e) { throw new Error(e && e.name === "PasswordException" ? "PDF 有密碼保護，請先解除。" : "無法讀取這個 PDF。"); }
      S.pdf = doc;
      const r = await pdfTextTable(doc);
      if (!r) { needAi(`這個 PDF 沒有文字層（掃描檔），需要請 AI 轉錄表格（${doc.numPages} 頁，最多送前 4 頁）。`); return; }
      if (!r.tbl) { needAi("PDF 有文字，但程式找不到整齊的表格。可以請 AI 轉錄，或回到 Excel 複製貼上。"); return; }
      show(r.tbl, `程式從「${file.name}」的文字層擷取（${r.width} 欄）`);
      msg(`程式依文字位置重組表格，欄位可能對錯${r.dropped ? `；另有 ${r.dropped} 列欄數不同，已略過` : ""}。請和原檔核對；不對的話可以改請 AI 轉錄。`);
      el("Ctl").innerHTML = `<button class="btn small" type="button" id="${K}AiAlt">改請 AI 轉錄</button>`;
      el("AiAlt").addEventListener("click", () => needAi("改請 AI 從 PDF 頁面圖片轉錄表格。"));
    }
    function needAi(m) {
      el("Body").innerHTML = ""; el("Act").hidden = true; el("Why").textContent = "";
      el("Ctl").innerHTML = `<div class="run-row" style="margin:0"><button class="btn primary small" type="button" id="${K}Ai">請 AI 轉錄表格</button><span class="hint">AI 只把看得到的數字照抄成表格，不計算、不補值；看不清楚的格子會標「?」。轉錄完要由你逐格核對。</span></div>`;
      msg(m);
      el("Ai").addEventListener("click", runAi);
      if (!sample) msg(m + " 目前無法使用 AI（需要在 claude.ai 開啟本頁並登入，或在 GitHub 版設定 API key）。", true);
    }
    async function runAi() {
      if (!sample) return;
      if (!imgLimits) { msg("這個檢視無法把圖片送給 AI。", true); return; }
      el("Ai").disabled = true; msg("準備頁面圖片…");
      try {
        if (S.kind === "pdf" && S.pdf && !S.imgs.length) for (let i = 1; i <= Math.min(S.pdf.numPages, 4, imgLimits.maxCount); i++) { const b = await renderPage(await S.pdf.getPage(i)); if (b) S.imgs.push({ b, name: `${S.file.name} 第 ${i} 頁` }); }
        const imgs = S.imgs.slice(0, imgLimits.maxCount);
        if (!imgs.length) throw new Error("沒有可送出的圖片。");
        msg(`AI 轉錄中（${imgs.length} 張圖片）…`);
        const q = ["你是資料轉錄員。請把附上圖片中的數據表格，照原樣轉成 Tab 分隔的純文字表格。",
          "規則：1. 只抄寫圖片中看得到的內容，不要計算、推估、補齊或修正任何數字。2. 看不清楚或被遮住的格子填 ?。3. 第一列是欄名（照原表格；沒有欄名就寫 欄1、欄2…）。4. 每一列對應原表格的一列，順序不變；合計、平均、全距等統計列或統計欄不要抄。5. 有多個表格時，只抄最主要的數據表，並在說明中提到。6. 數字保留原本的小數位數，不要加千分位逗號。",
          "輸出格式：先用最多 3 行說明表格在哪一頁、有幾列幾欄、哪些地方看不清楚；然後輸出一個 ```impdata 區塊，裡面是 Tab 分隔的表格。",
          o.metaPrompt || "",
          `圖片依序為：${imgs.map((x, i) => `${i + 1}. ${x.name}`).join("；")}。`].filter(Boolean).join("\n");
        const res = await sample([{ role: "user", content: q }], { cache: false, modelTier: "default", images: imgs.map(x => x.b) });
        const m = String(res.text || "").match(/```impdata\s*([\s\S]*?)```/);
        if (!m) throw new Error("AI 沒有回傳表格。可以再試一次，或回到原始檔案複製貼上。");
        const mm = String(res.text).match(/```impmeta\s*([\s\S]*?)```/);
        S.meta = null; if (mm) { try { const j = JSON.parse(mm[1]); if (j && typeof j === "object") S.meta = j; } catch (_) {} }
        const note = String(res.text).replace(/```impdata[\s\S]*?```/, "").replace(/```impmeta[\s\S]*?```/, "").trim();
        S.ai = true;
        show(m[1].split(/\r?\n/).filter(l => l.trim()).map(l => l.split("\t").map(x => x.trim())), `AI 從「${S.file.name}」轉錄`, note);
      } catch (e) { msg((e && (e.message || e.text)) || "AI 轉錄失敗。", true); if (el("Ai")) el("Ai").disabled = false; }
    }
    const isNum = impIsNum;
    function show(rows, from, note) {
      rows = rows.map(r => r.map(x => String(x == null ? "" : x).trim()));
      const k = Math.max(...rows.map(r => r.length)); rows = rows.map(r => { const a = r.slice(); while (a.length < k) a.push(""); return a; });
      S.table = rows; S.from = from;
      // 預設勾選：有判讀時依欄位角色；否則勾資料列全是數字（或 ?／空白）的欄。只是預設，由使用者決定
      S.plan = o.plan ? o.plan(S, note) : null;
      S.use = S.plan && S.plan.use ? S.plan.use.slice() : rows[0].map((_, j) => !o.pickCols || (rows.slice(1).every(r => isNum(r[j]) || r[j] === "?" || r[j] === "") && rows.slice(1).some(r => isNum(r[j]))));
      el("SrcTag").textContent = S.ai ? "來源：AI 轉錄・必須逐格核對" : "來源：" + (S.kind === "pdf" ? "PDF 文字層（程式擷取）・請核對" : "程式讀取（未經 AI）");
      el("SrcTag").classList.toggle("reg-ai", S.ai);
      const show = rows.slice(0, 200);
      const imgs = S.ai && S.imgs.length ? `<div class="reg-imp-imgs">${S.imgs.map(x => `<figure><img alt="${esc(x.name)}" data-src="1"><figcaption>${esc(x.name)}</figcaption></figure>`).join("")}</div>` : "";
      const pick = o.pickCols ? `<tr class="imp-pick"><td class="hint">要用</td>${rows[0].map((_, j) => `<td><label class="chk"><input type="checkbox" data-col="${j}"${S.use[j] ? " checked" : ""}></label>${S.plan && S.plan.roles && o.roleLabel ? `<small class="hint">${esc(o.roleLabel[S.plan.roles[j]] || "")}</small>` : ""}</td>`).join("")}</tr>` : "";
      el("Body").innerHTML = (note ? `<div class="note info">${mdLite(note)}</div>` : "") + (S.plan && o.planHtml ? o.planHtml(S.plan) : "") + `<div class="reg-imp-grid${imgs ? " two" : ""}">${imgs}<div class="scroll-x reg-imp-tbl"><table class="mini"><tbody>${pick}${show.map((r, i) => `<tr${i === 0 ? ' class="reg-imp-head"' : ""}><td class="hint">${i === 0 ? "欄名" : i}</td>${r.map((x, j) => `<td contenteditable="true" spellcheck="false" data-r="${i}" data-c="${j}" class="${x === "?" ? "pk-miss" : ""}">${esc(x)}</td>`).join("")}</tr>`).join("")}</tbody></table>${rows.length > 200 ? `<p class="hint">只顯示前 200 列（共 ${rows.length} 列，填入時全部帶入）。</p>` : ""}</div></div>`;
      if (imgs) [...el("Body").querySelectorAll("img[data-src]")].forEach((im, i) => { im.src = URL.createObjectURL(S.imgs[i].b); });
      el("Body").querySelectorAll("[data-plan]").forEach(c => c.addEventListener(c.type === "checkbox" || c.tagName === "SELECT" ? "change" : "input", () => { S.plan[c.dataset.plan] = c.type === "checkbox" ? c.checked : c.value.trim(); gate(); }));
      el("Body").querySelectorAll("input[data-col]").forEach(c => c.addEventListener("change", () => { S.use[+c.dataset.col] = c.checked; gate(); }));
      el("Body").querySelectorAll("td[data-r]").forEach(td => td.addEventListener("input", () => { const v = td.textContent.trim(); S.table[+td.dataset.r][+td.dataset.c] = v; td.classList.toggle("pk-miss", v === "?"); gate(); }));
      if (S.ai) { el("Ctl").innerHTML = `<button class="btn small" type="button" id="${K}AiRe">重新請 AI 轉錄</button>`; el("AiRe").addEventListener("click", () => { S.ai = false; needAi("重新請 AI 轉錄。"); }); }
      el("Act").hidden = false; el("ChkW").hidden = !S.ai; el("Chk").checked = false;
      const q = rows.reduce((a, r) => a + r.filter(x => x === "?").length, 0);
      msg(`${rows.length - 1} 列資料、${k} 欄。表格中的格子可以直接點選修改。${q ? `有 ${q} 格 AI 看不清楚（紅色「?」），請對照原檔改成正確數字。` : ""}${S.ai ? " AI 轉錄可能抄錯（例如 1 和 7、小數點），請逐格和左邊的原始圖片核對，勾選後才能填入。" : ""}`);
      gate();
    }
    // 檢查勾選的欄：不可有 ?、空白或（numOnly 時）非數字，否則 SPC 讀取時欄位會錯位
    function problems() {
      const cols = S.use.map((u, j) => (u ? j : -1)).filter(j => j >= 0), out = [];
      if (!cols.length) return { cols, out: ["請至少勾選一欄。"] };
      const pe = S.plan && o.planCheck ? o.planCheck(S.plan) : ""; if (pe) out.push(pe);
      S.table.slice(1).forEach((r, i) => cols.forEach(j => { const x = r[j]; if (x === "?" || x === "" || (o.numOnly && !isNum(x))) out.push(`第 ${i + 1} 列「${S.table[0][j] || "欄" + (j + 1)}」${x === "" ? "是空白" : `是「${x}」`}`); }));
      return { cols, out };
    }
    function gate() {
      if (!S.table) return;
      const p = problems();
      el("Why").innerHTML = p.out.length ? `<span class="status ng">還不能填入：${esc(p.out.slice(0, 5).join("；"))}${p.out.length > 5 ? `；另有 ${p.out.length - 5} 處` : ""}。請在表格中修改，或取消勾選該欄。</span>` : "";
      el("Go").disabled = !!p.out.length || (S.ai && !el("Chk").checked);
    }
    function apply() {
      if (!S.table) return;
      const p = problems(); if (p.out.length || (S.ai && !el("Chk").checked)) { gate(); return; }
      const put = () => {
        D.value = S.table.map(r => p.cols.map(j => r[j].replace(/[\t\n]/g, " ")).join("\t")).join("\n");
        const P = S.plan, src = `資料來源：${S.from}${S.ai ? "（使用者已核對）" : ""}。`;
        close(); el("Src").textContent = src;
        D.dispatchEvent(new Event("input", { bubbles: true }));
        if (o.onFill) { const more = o.onFill(P, src); if (more) el("Src").textContent = src + more; }
      };
      if (D.value.trim()) {
        if (el("Rep")) return;
        el("Act").insertAdjacentHTML("afterend", `<div class="pk-ask" id="${K}Rep"><p>資料框已經有內容，要用匯入的資料取代嗎？</p><div class="run-row" style="margin:0"><button class="btn small primary" type="button" id="${K}RepY">取代</button><button class="btn small ghost" type="button" id="${K}RepN">取消</button></div></div>`);
        el("RepY").addEventListener("click", put); el("RepN").addEventListener("click", () => el("Rep").remove());
      } else put();
    }
    // 使用者自己改資料框、或按範例改寫後，來源標示就不再準確
    D.addEventListener("input", e => { if (e.isTrusted) el("Src").textContent = ""; });
    if (o.clearOn) document.querySelectorAll(o.clearOn).forEach(b => b.addEventListener("click", () => { el("Src").textContent = ""; }));
    return { open, close };
  }
  const impIsNum = x => x !== "" && isFinite(+String(x).replace(/，/g, ","));
  // ---- Word（.docx）：取出文件中的表格（不含巢狀表格），每個表格至少 2 列 ----
  async function docxTables(file) {
    let z, xml; try { z = await unzip(await file.arrayBuffer()); xml = await z.get("word/document.xml"); } catch (_) { xml = null; }
    if (!xml) throw new Error("無法讀取這個 Word 檔（請確認是 .docx）。");
    const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main", d = new DOMParser().parseFromString(new TextDecoder().decode(xml), "application/xml");
    const txt = e => [...e.getElementsByTagNameNS(W, "t")].map(t => t.textContent).join("").trim();
    return [...d.getElementsByTagNameNS(W, "tbl")].filter(t => !t.parentNode.closest || !t.parentNode.closest("tbl")).map(t => [...t.children].filter(r => r.localName === "tr").map(tr => [...tr.children].filter(c => c.localName === "tc").map(txt))).filter(t => t.length >= 2);
  }
  // ---- PDF 文字層：依座標重組成列；沒有文字層回傳 null，找不到整齊表格回傳 { tbl: null } ----
  async function pdfTextTable(doc) {
    const n = Math.min(doc.numPages, 20), rows = []; let textPages = 0;
    for (let i = 1; i <= n; i++) {
      const pg = await doc.getPage(i), tc = await pg.getTextContent();
      const items = tc.items.filter(x => x.str && x.str.trim()).map(x => ({ s: x.str.trim(), x: x.transform[4], y: x.transform[5], w: x.width || 0, h: Math.abs(x.transform[3]) || 8 }));
      if (items.length < 4) continue; textPages++;
      items.sort((a, b) => b.y - a.y || a.x - b.x);
      const lines = []; items.forEach(it => { const ln = lines.find(l => Math.abs(l.y - it.y) <= Math.max(2, it.h * 0.45)); if (ln) ln.items.push(it); else lines.push({ y: it.y, items: [it] }); });
      lines.forEach(l => { l.items.sort((a, b) => a.x - b.x); const cells = []; let cur = null; l.items.forEach(it => { if (cur && it.x - (cur.x + cur.w) < Math.max(3, it.h * 0.6)) { cur.s += (/[一-鿿]$/.test(cur.s) ? "" : " ") + it.s; cur.w = it.x + it.w - cur.x; } else { cur = { s: it.s, x: it.x, w: it.w }; cells.push(cur); } }); rows.push(cells.map(c => c.s)); });
    }
    if (!textPages) return null;
    const cnt = {}; rows.forEach(r => { if (r.length >= 2) cnt[r.length] = (cnt[r.length] || 0) + 1; });
    const width = +(Object.entries(cnt).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0] || [0])[0];
    const tbl = rows.filter(r => r.length === width);
    if (width < 2 || tbl.length < 3) return { tbl: null };
    return { tbl, width, dropped: rows.filter(r => r.length >= 2 && r.length !== width).length };
  }
  // ---- 規格文字：「a～b」「m±d」「LSL a／USL b」→ { lsl, usl, tgt }；讀不出來回傳 null ----
  function parseSpecText(t) {
    const s = String(t || "").replace(/[～〜~–—]/g, "~").replace(/＋/g, "+").replace(/[－−]/g, "-").replace(/：/g, ":").replace(/，/g, ",");
    const N = "(-?\\d+(?:\\.\\d+)?)", r10 = x => +(+x).toFixed(10);
    let m = s.match(new RegExp(N + "\\s*(?:±|\\+\\s*/\\s*-|\\+-)\\s*(\\d+(?:\\.\\d+)?)"));
    if (m) return { lsl: r10(+m[1] - +m[2]), usl: r10(+m[1] + +m[2]), tgt: +m[1] };
    m = s.match(new RegExp(N + "\\s*(?:~|至|到|-)\\s*(\\d+(?:\\.\\d+)?)"));
    if (m && +m[1] < +m[2]) return { lsl: +m[1], usl: +m[2] };
    const L = s.match(new RegExp("LSL\\s*[:=]?\\s*" + N, "i")), U = s.match(new RegExp("USL\\s*[:=]?\\s*" + N, "i"));
    if (L || U) { const o = {}; if (L) o.lsl = +L[1]; if (U) o.usl = +U[1]; if (L && U && !(o.lsl < o.usl)) return null; return o; }
    return null;
  }

  // =====================================================================
  // SPC：自動判讀（欄位角色、資料型態、規格）
  // AI 依法則回傳 impmeta；程式檢查：欄名須存在、規格須與 AI 抄的原文一致、數據須大致落在規格附近（防單位不同）
  // =====================================================================
  const SPC_META_PROMPT = [
    "另外輸出一個 ```impmeta 區塊（JSON），只根據圖片上寫的內容判斷，沒寫就填 null，不可依數據推估：",
    '{"cols":{"欄名（與表格第一列完全相同）":"value 或 order 或 id 或 other"},"kind":"var 或 defective 或 defect 或 null","lsl":數字或null,"usl":數字或null,"target":數字或null,"unit":"規格的單位或null","spec_text":"圖片上規格的原文或null"}',
    "判斷法則：1. 時間、日期、序號、編號、批號、樣本編號是 order 或 id，不是量測值。2. 同一時間點的多個量測值（例如 X1～X5、樣本1～5）都是 value，代表同一子組。3. 量測數值 kind=var；不良數與抽樣數 kind=defective；缺點數 kind=defect。4. 規格寫成「a～b」時 lsl=a、usl=b；寫成「m±d」時 lsl=m−d、usl=m+d、target=m；只寫上限或下限就只填那一個。5. 規格的單位和數據不同（例如 μm 對 mm）時，lsl、usl 填 null，並在 spec_text 說明。6. 頁面上沒有寫規格就填 null，不可自己推估。7. 規格、標題、簽名等不是數據的文字不要抄進表格。"
  ].join("\n");
  const SPC_ROLE = { value: "量測值", order: "時間／序號（不列入）", id: "編號（不列入）", other: "其他（不列入）", text: "文字（不列入）" };
  function spcColRole(head, vals) {
    if (vals.some(x => x !== "" && x !== "?" && !impIsNum(x)) || !vals.some(impIsNum)) return "text";
    if (/時間|日期|序號|編號|批|樣本號|^(no\.?|#|id|time|date|seq)\b/i.test(String(head).trim())) return "order";
    const n = vals.filter(impIsNum).map(Number);
    if (n.length >= 3) { const d = n[1] - n[0]; if (d !== 0 && n.every((v, i) => !i || Math.abs(v - n[i - 1] - d) <= 1e-9 * Math.max(1, Math.abs(v)))) return "order"; }
    return "value";
  }
  function spcPlan(S, note) {
    const T = S.table, H = T[0], body = T.slice(1), m = S.meta, notes = [];
    const fin = v => typeof v === "number" && isFinite(v);
    const roles = H.map((h, j) => spcColRole(h, body.map(r => r[j])));
    // AI 只能把量測值降級（改判為時間／編號／其他），不能把程式認定的時間、序號或文字欄升級為量測值
    if (m && m.cols && typeof m.cols === "object") H.forEach((h, j) => { const r = m.cols[h]; if (["order", "id", "other"].includes(r) && roles[j] === "value") roles[j] = r; });
    const kind = m && ["var", "defective", "defect"].includes(m.kind) ? m.kind : "";
    let sp = null, src = "";
    if (m) {
      if (fin(m.lsl) || fin(m.usl)) {
        sp = { lsl: fin(m.lsl) ? m.lsl : "", usl: fin(m.usl) ? m.usl : "", tgt: fin(m.target) ? m.target : "" };
        src = `AI 從原始資料讀取${m.spec_text ? `「${m.spec_text}」` : ""}`;
        const c = m.spec_text ? parseSpecText(m.spec_text) : null;
        if (c && ((c.lsl !== undefined && c.lsl !== sp.lsl) || (c.usl !== undefined && c.usl !== sp.usl))) { notes.push(`AI 給的規格數字和它抄的原文「${m.spec_text}」對不上，未帶入，請自行填寫。`); sp = null; }
      } else if (m.spec_text) notes.push(`AI 看到規格「${m.spec_text}」但沒有給數值（可能單位不同），請自行判斷後填寫。`);
    } else {
      const texts = [].concat(...T, note ? [note] : []).filter(x => /規格|公差|spec|LSL|USL|tolerance/i.test(x));
      for (const t of texts) { const r = parseSpecText(t); if (r) { sp = { lsl: r.lsl ?? "", usl: r.usl ?? "", tgt: r.tgt ?? "" }; src = `檔案中寫的「${t.slice(0, 40)}」`; break; } }
    }
    // 合理性：數據大致要落在規格附近，否則可能單位不同或讀錯
    const vals = [].concat(...body.map(r => r.filter((x, j) => roles[j] === "value" && impIsNum(x)).map(Number)));
    if (sp && kind !== "defective" && kind !== "defect" && vals.length) {
      const L = sp.lsl === "" ? null : +sp.lsl, U = sp.usl === "" ? null : +sp.usl;
      let ok = true;
      if (L !== null && U !== null) { const w = U - L; ok = L < U && vals.filter(v => v >= L - w && v <= U + w).length >= vals.length * 0.8; }
      else { const lim = L !== null ? L : U, med = vals.slice().sort((a, b) => a - b)[vals.length >> 1]; if (lim && med) { const k = Math.abs(med / lim); ok = k <= 10 && k >= 0.1; } }
      if (!ok) { notes.push(`讀到的規格（${L ?? "—"}～${U ?? "—"}）和數據範圍差太多，可能單位不同或讀錯，未帶入，請自行確認。`); sp = null; }
    }
    return { use: roles.map(r => r === "value"), roles, kind, lsl: sp ? String(sp.lsl) : "", usl: sp ? String(sp.usl) : "", tgt: sp ? String(sp.tgt) : "", src: sp ? src : "", notes };
  }
  function spcPlanHtml(P) {
    const kinds = [["", "維持目前選擇"], ["var", "計量值"], ["defective", "不良品"], ["defect", "缺點數"]];
    const inp = (k, lab) => `<div class="field"><label>${lab}</label><input type="text" inputmode="decimal" autocomplete="off" data-plan="${k}" value="${esc(P[k])}"></div>`;
    return `<div class="imp-plan"><p><b>自動判讀</b> <span class="hint">填入時一併套用，可修改</span></p><div class="fields"><div class="field"><label>資料型態</label><select data-plan="kind">${kinds.map(([v, t]) => `<option value="${v}"${P.kind === v ? " selected" : ""}>${t}</option>`).join("")}</select></div>${inp("lsl", "規格下限 LSL")}${inp("tgt", "目標值")}${inp("usl", "規格上限 USL")}</div>`
      + `<p class="hint">規格來源：${P.src ? esc(P.src) : "沒有找到規格（可自行填寫）"}</p>`
      + (P.notes.length ? P.notes.map(n => `<p class="hint"><span class="status ng">${esc(n)}</span></p>`).join("") : "")
      + `</div>`;
  }
  function spcPlanCheck(P) {
    const f = k => (P[k] === "" ? null : impIsNum(P[k]) ? +P[k] : NaN);
    const L = f("lsl"), U = f("usl"), G = f("tgt");
    if ([L, U, G].some(v => Number.isNaN(v))) return "規格要填數字";
    if (L !== null && U !== null && !(L < U)) return "規格下限要小於上限";
    return "";
  }
  function spcOnFill(P) {
    if (!P) return "";
    if (P.kind && spcKind() !== P.kind) { const b = document.querySelector(`#spcKind [data-v="${P.kind}"]`); if (b) b.click(); }
    let more = "";
    if (spcKind() === "var" && (P.lsl !== "" || P.usl !== "" || P.tgt !== "")) {
      [["spcLsl", P.lsl], ["spcUsl", P.usl], ["spcTgt", P.tgt]].forEach(([id, v]) => { $(id).value = v; $(id).dispatchEvent(new Event("input", { bubbles: true })); });
      more = `規格：${P.src || "使用者填寫"}（LSL ${P.lsl || "—"}、USL ${P.usl || "—"}）。`;
    }
    return more;
  }
  // ---- SPC 資料框檢查（貼上或匯入都適用）：等距遞增的欄看起來是時間或序號，放進來會被當成子組的量測值 ----
  function spcSeqCols() {
    const p = parseNumRows($("spcData").value); if (p.error || p.rows.length < 5) return [];
    const k = p.rows[0].length; if (k < 2 || p.rows.some(r => r.length !== k)) return [];
    const out = [];
    for (let j = 0; j < k; j++) { const v = p.rows.map(r => r[j]), d = v[1] - v[0]; if (d > 0 && v.every((x, i) => !i || Math.abs(x - v[i - 1] - d) <= 1e-9 * Math.max(1, Math.abs(x)))) out.push({ j, name: p.header && p.header[j] ? p.header[j] : `第 ${j + 1} 欄`, head: v.slice(0, 3) }); }
    return out;
  }
  $("spcDetect").insertAdjacentHTML("afterend", `<p class="hint" id="spcSeqWarn" hidden></p>`);
  function spcSeqCheck() {
    const w = $("spcSeqWarn"), c = spcSeqCols();
    w.hidden = !c.length; if (!c.length) { w.innerHTML = ""; return; }
    w.innerHTML = c.map(x => `<span class="status ng">「${esc(x.name)}」是等距遞增（${x.head.join(", ")}…），看起來是時間或序號，不是量測值；留著會被當成子組的一部分，管制圖會算錯。</span> <button class="btn small" type="button" data-seqdel="${x.j}">移除這一欄</button>`).join("<br>");
  }
  $("spcSeqWarn").addEventListener("click", e => {
    const b = e.target.closest("[data-seqdel]"); if (!b) return;
    const j = +b.dataset.seqdel, D = $("spcData");
    D.value = D.value.split(/\r?\n/).map(l => { const t = splitLine(l, true); if (!t.length) return l; t.splice(j, 1); return t.join("\t"); }).join("\n");
    D.dispatchEvent(new Event("input", { bubbles: true }));
  });
  $("spcData").addEventListener("input", spcSeqCheck);
  // ---- 自動執行分析（管制圖維持「自動選擇」由程式判斷）----
  // 貼上、拖入、匯入、範例、移除欄、切換資料型態、離開資料框或規格欄時執行；逐字打字時不執行。
  // 資料有錯或有時間／序號欄警告時不執行，避免畫出錯的圖。
  let spcAutoT = 0;
  function spcAutoRun() {
    clearTimeout(spcAutoT);
    spcAutoT = setTimeout(() => {
      if (!$("spcData").value.trim() || spcSeqCols().length) return;
      const p = spcRows(); if (p.error) return;
      if ($("spcType").value === "auto" && QQ.spcAuto(p.rows, spcKind()).error) return;
      spcRun();
    }, 150);
  }
  $("spcData").addEventListener("input", e => { if (!e.isTrusted || /^insertFrom(Paste|Drop)$/.test(e.inputType || "")) spcAutoRun(); });
  $("spcData").addEventListener("change", spcAutoRun);
  ["spcLsl", "spcUsl", "spcTgt", "spcType"].forEach(id => $(id).addEventListener("change", () => { if (TQ.spc) spcAutoRun(); }));
  document.querySelectorAll("#viewSPC [data-ex], #spcKind button").forEach(b => b.addEventListener("click", spcAutoRun));
  document.querySelectorAll("#viewSPC [data-ex], #spcKind button").forEach(b => b.addEventListener("click", () => setTimeout(spcSeqCheck, 0)));
  $("spcRun").addEventListener("click", spcSeqCheck, true);
  mkImporter({ key: "spcImp", data: "spcData", pickCols: true, numOnly: true, clearOn: "#viewSPC [data-ex]", metaPrompt: SPC_META_PROMPT, roleLabel: SPC_ROLE, plan: spcPlan, planHtml: spcPlanHtml, planCheck: spcPlanCheck, onFill: spcOnFill });
