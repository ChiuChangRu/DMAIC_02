  // =====================================================================
  // 共用匯入（試作）：目前接 SPC 的資料框
  // 原則與 regress_ui.js 的匯入相同：Excel／CSV／Word／PDF 文字層由程式讀取；掃描檔與照片才請 AI 轉錄；
  // AI 只照抄看得到的數字，不計算、不補值；AI 轉錄的結果須人工逐格核對才可填入。
  // 沿用：regress_ui.js 的 readXlsx、textTable；fishbone.js 的 pdfLib、renderPage、unzip、imgLimits、PDFJS
  // =====================================================================
  function mkImporter(o) {
    // o = { key: id 前綴, data: 資料框 id, pickCols: 是否讓使用者勾選要用的欄, numOnly: 勾選的欄是否只能是數字, clearOn: 會改寫資料框的其他按鈕（選擇器） }
    const K = o.key, D = $(o.data);
    const S = { file: null, kind: "", sheets: null, table: null, from: "", ai: false, imgs: [], pdf: null, use: [] };
    const reset = () => Object.assign(S, { file: null, kind: "", sheets: null, table: null, from: "", ai: false, imgs: [], pdf: null, use: [] });
    const el = s => $(K + s);
    D.insertAdjacentHTML("beforebegin", `<div class="run-row" style="margin-top:0"><button class="btn" type="button" id="${K}Btn">匯入檔案（Excel、CSV、Word、PDF、照片）</button><input autocomplete="off" type="file" id="${K}File" accept=".xlsx,.csv,.tsv,.txt,.docx,.pdf,image/png,image/jpeg,image/webp" hidden><span class="hint" id="${K}Src"></span></div><div class="reg-imp" id="${K}" hidden></div>`);
    el("Btn").addEventListener("click", () => el("File").click());
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
          `圖片依序為：${imgs.map((x, i) => `${i + 1}. ${x.name}`).join("；")}。`].join("\n");
        const res = await sample([{ role: "user", content: q }], { cache: false, modelTier: "default", images: imgs.map(x => x.b) });
        const m = String(res.text || "").match(/```impdata\s*([\s\S]*?)```/);
        if (!m) throw new Error("AI 沒有回傳表格。可以再試一次，或回到原始檔案複製貼上。");
        const note = String(res.text).replace(/```impdata[\s\S]*?```/, "").trim();
        S.ai = true;
        show(m[1].split(/\r?\n/).filter(l => l.trim()).map(l => l.split("\t").map(x => x.trim())), `AI 從「${S.file.name}」轉錄`, note);
      } catch (e) { msg((e && (e.message || e.text)) || "AI 轉錄失敗。", true); if (el("Ai")) el("Ai").disabled = false; }
    }
    const isNum = x => x !== "" && isFinite(+String(x).replace(/，/g, ","));
    function show(rows, from, note) {
      rows = rows.map(r => r.map(x => String(x == null ? "" : x).trim()));
      const k = Math.max(...rows.map(r => r.length)); rows = rows.map(r => { const a = r.slice(); while (a.length < k) a.push(""); return a; });
      S.table = rows; S.from = from;
      // 預設勾選：資料列全是數字（或 ?／空白）且至少有一個數字的欄。只是預設，由使用者決定
      S.use = rows[0].map((_, j) => !o.pickCols || (rows.slice(1).every(r => isNum(r[j]) || r[j] === "?" || r[j] === "") && rows.slice(1).some(r => isNum(r[j]))));
      el("SrcTag").textContent = S.ai ? "來源：AI 轉錄・必須逐格核對" : "來源：" + (S.kind === "pdf" ? "PDF 文字層（程式擷取）・請核對" : "程式讀取（未經 AI）");
      el("SrcTag").classList.toggle("reg-ai", S.ai);
      const show = rows.slice(0, 200);
      const imgs = S.ai && S.imgs.length ? `<div class="reg-imp-imgs">${S.imgs.map(x => `<figure><img alt="${esc(x.name)}" data-src="1"><figcaption>${esc(x.name)}</figcaption></figure>`).join("")}</div>` : "";
      const pick = o.pickCols ? `<tr class="imp-pick"><td class="hint">要用</td>${rows[0].map((_, j) => `<td><label class="chk"><input type="checkbox" data-col="${j}"${S.use[j] ? " checked" : ""}></label></td>`).join("")}</tr>` : "";
      el("Body").innerHTML = (note ? `<div class="note info">${mdLite(note)}</div>` : "") + `<div class="reg-imp-grid${imgs ? " two" : ""}">${imgs}<div class="scroll-x reg-imp-tbl"><table class="mini"><tbody>${pick}${show.map((r, i) => `<tr${i === 0 ? ' class="reg-imp-head"' : ""}><td class="hint">${i === 0 ? "欄名" : i}</td>${r.map((x, j) => `<td contenteditable="true" spellcheck="false" data-r="${i}" data-c="${j}" class="${x === "?" ? "pk-miss" : ""}">${esc(x)}</td>`).join("")}</tr>`).join("")}</tbody></table>${rows.length > 200 ? `<p class="hint">只顯示前 200 列（共 ${rows.length} 列，填入時全部帶入）。</p>` : ""}</div></div>`;
      if (imgs) [...el("Body").querySelectorAll("img[data-src]")].forEach((im, i) => { im.src = URL.createObjectURL(S.imgs[i].b); });
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
        const src = `資料來源：${S.from}${S.ai ? "（使用者已核對）" : ""}。`;
        close(); el("Src").textContent = src;
        D.dispatchEvent(new Event("input", { bubbles: true }));
        o.onFill && o.onFill(src);
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
  mkImporter({ key: "spcImp", data: "spcData", pickCols: true, numOnly: true, clearOn: "#viewSPC [data-ex]" });
