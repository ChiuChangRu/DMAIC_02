
  // =====================================================================
  // AI 連線方式：(1) claude.ai（平台 AI）；(2) 自帶 API key（Claude API、Gemini、Kimi、StepFun 或 OpenAI 相容格式；Gemini、Kimi、StepFun 使用 OpenAI 相容的 /chat/completions）
  // 模式 (2) 只在 claude.ai 以外（例如 GitHub Pages）可用：claude.ai 的安全規則禁止網頁連到外部 API。
  // key 只存在使用者自己的瀏覽器，直接送到使用者填的 AI 服務，不經過其他伺服器。
  // =====================================================================
  const BYOK_CFG = "mdqs.byok.v1", BYOK_KEY = "mdqs.byok.key";
  const BYOK_PROV = {
    anthropic: { name: "Claude API（Anthropic）", base: "https://api.anthropic.com", model: "claude-sonnet-5-5", needKey: true },
    kimi: { name: "Kimi（Moonshot AI）", base: "https://api.moonshot.ai/v1", model: "kimi-k2.6", needKey: true },
    stepfun: { name: "StepFun 階躍星辰", base: "https://api.stepfun.ai/v1", model: "step-3.5-flash", needKey: true },
    gemini: { name: "Gemini API（Google）", base: "https://generativelanguage.googleapis.com/v1beta/openai", model: "gemini-3.8-flash", needKey: true },
    openai: { name: "OpenAI 相容格式（GPT、Azure OpenAI、公司私有雲等）", base: "https://api.openai.com/v1", model: "", needKey: false }
  };

  // 模型清單：特性說明。價格來自第三方整理頁（2026-10 查到，未逐一對官方核實*），實際以各服務官網為準。
  const BYOK_MODELS = {
    anthropic: [
      { model: "claude-sonnet-5-5", label: "Claude Sonnet 5.5（建議預設）", note: "速度與品質平衡，支援圖片。輸入約 $2、輸出約 $10／百萬 token。適合日常魚骨圖、問題改善、統計說明。" },
      { model: "claude-haiku-5-5", label: "Claude Haiku 5.5（最省*）", note: "最快、最便宜*（價格未核實），支援圖片*。適合快速測試、簡單詢問；複雜的根因推論與長篇樣板可能較淺*。" },
      { model: "claude-opus-5-5", label: "Claude Opus 5.5（複雜問題）", note: "針對複雜問題的較強模型，費用高於 Sonnet*（價格未核實）。適合查廠答辯、多證據交叉比對等重要案件。" },
      { model: "claude-fable-5-1", label: "Claude Fable 5.1（最強、最貴*）", note: "Anthropic 最高階層級，價格未核實*。一般統計輔助說明通常用不到；先用 Sonnet，不夠再升級。" }
    ],
    kimi: [
      { model: "kimi-k2.6", label: "Kimi K2.6（Moonshot，省錢）", note: "官方模型總覽：K2.6 預設開啟思考模式，回答前會先推理，所以較慢；網站預設關閉思考（下方可改）。約 $0.5–1 輸入／$2.4–4 輸出（百萬 token）*，上下文 256K，支援圖片（base64）。中文表現佳，費用約為 Sonnet 的一半以下*。海外帳號用此網址；中國大陸帳號請把 API 網址改成 https://api.moonshot.cn/v1。瀏覽器直連是否可行未驗證*。" },
      { model: "kimi-k3", label: "Kimi K3（Moonshot，較強）", note: "依官方 K3 快速入門（platform.kimi.com）：上下文 1M、原生支援圖片（base64）、固定為思考模式（無法關閉），可用下方「思考深度」調整（官方預設 max，越深越慢、越貴*）。官方範例的 API 網址是 https://api.moonshot.cn/v1，帳號在那個平台時請把上面的 API 網址改成這個。須儲值至少 10 元人民幣，註冊贈送額度不能用於 K3。價格見官方計價頁，這裡未核實*。多輪對話是否需要回傳思考內容，未實測*。" },
    ],
    stepfun: [
      { model: "step-3.5-flash", label: "Step 3.5 Flash（StepFun，建議預設）", note: "依 StepFun 官方 GitHub（stepfun-ai/Step-3.5-Flash）：OpenAI 相容格式，國際站 API 網址 https://api.stepfun.ai/v1，上下文 256K。是否支援圖片官方頁未寫*，請先「測試連線」並附一張圖試試。回答可能是簡體中文，網站已預設轉繁體。價格未核實*。API key 在 https://platform.stepfun.ai/interface-key 申請（中國站帳號：platform.stepfun.com，API 網址改成 https://api.stepfun.com/v1，須 +86 手機驗證）。StepFun 不允許網頁直接呼叫，網站會自動經由自己 Cloudflare 上的轉送站連線（只轉給 StepFun；key 不記錄、不儲存）。" },
      { model: "step-3.7-flash", label: "Step 3.7 Flash（StepFun，看圖*）", note: "StepFun 文件的圖片理解範例使用這個型號*（未能直接開官方頁核實）。需要上傳照片時可試這個。價格未核實*。API key 在 https://platform.stepfun.ai/interface-key 申請（中國站帳號：platform.stepfun.com，API 網址改成 https://api.stepfun.com/v1，須 +86 手機驗證）。" },
      { model: "step-5-preview", label: "Step 5 Preview（StepFun，預覽版*）", note: "StepFun 文件（Step Plan）列為建議首次驗證用的型號*；預覽版名稱與行為可能變動。價格未核實*。API key 在 https://platform.stepfun.ai/interface-key 申請（中國站帳號：platform.stepfun.com，API 網址改成 https://api.stepfun.com/v1，須 +86 手機驗證）。" }
    ],
    gemini: [
      { model: "gemini-3.8-flash", label: "Gemini 3.8 Flash（Google，建議預設）", note: "依 Google 官方模型頁（ai.google.dev）：目前最強的 Flash，官方建議新專案使用，適合長任務與一般問答。網站走 Google 的 OpenAI 相容端點（官方文件註明支援串流與 base64 圖片）。價格與思考模式的預設行為這裡未核實*，用量以 Google AI Studio 的帳單為準。瀏覽器直連是否可行未驗證*，請先「測試連線」。" },
      { model: "gemini-3.5-flash-lite", label: "Gemini 3.5 Flash-Lite（Google，最省*）", note: "官方模型頁列為 3.5 世代最快、最省的型號。適合快速測試與簡單詢問；複雜根因推論可能較淺*。價格未核實*。" },
      { model: "gemini-4-argon", label: "Gemini 4 Argon（Google，旗艦）", note: "官方模型頁列為旗艦推理模型，上下文 1M。費用應高於 Flash*（未核實）。重要案件、Flash 答得不夠深時再用。" },
      { model: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro（Google，預覽版）", note: "官方模型頁列為 Pro 型號，標示為預覽版，預覽版的名稱與行為可能變動*。" }
    ],
    openai: [
      { model: "gpt-6.1-sol", label: "GPT-6.1 Sol（OpenAI，通用）", base: "https://api.openai.com/v1", note: "約 $2／$10（百萬 token）*，與 Sonnet 同級。是否支援圖片未確認*，請先「測試連線」並附一張圖試試。公司以 GPT 為主時，這項最容易導入。瀏覽器直連是否可行未驗證*。" },
      { model: "gpt-6-luna", label: "GPT-6 Luna（OpenAI，最省*）", base: "https://api.openai.com/v1", note: "約 $0.10／$0.50（百萬 token）*，最便宜。適合簡單詢問；複雜根因推論可能較淺*。圖片支援未確認*。" },
      { model: "gpt-5.6-terra", label: "GPT-5.6 Terra（OpenAI，中階）", base: "https://api.openai.com/v1", note: "約 $2／$12（百萬 token）*，中階。圖片支援未確認*。" }
    ]
  };
  let byokCustomMode = false;
  const BYOK_CUSTOM = "__custom__";
  const CUSTOM_NOTE = "自訂模型（公司私有雲、Azure 等）：請同時填 API 網址，並確認該模型支援圖片輸入（需要上傳照片時）。費用依該服務計價。";
  const byokPreset = () => (BYOK_MODELS[byokCfg.provider] || []).find(m => m.model === byokModel());
  const OPENCC_URL = "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/cn2t.js";
  let byokCfg = { provider: "anthropic", base: "", model: "", imgs: true, s2t: false, keep: false, effort: "max", think: "off" };
  try { Object.assign(byokCfg, JSON.parse(localStorage.getItem(BYOK_CFG) || "{}")); } catch (_) {}
  if (byokCfg.provider === "openai" && /^kimi/i.test(byokCfg.model || "")) { byokCfg.provider = "kimi"; if (/api\.moonshot\.ai/.test(byokCfg.base || "")) byokCfg.base = ""; }   // 舊設定：Kimi 原本放在 OpenAI 相容格式
  if (!BYOK_PROV[byokCfg.provider]) byokCfg.provider = "anthropic";
  let byokKeyMem = "";
  try { byokKeyMem = localStorage.getItem(BYOK_KEY) || ""; } catch (_) {}
  let aiMode = "none";   // "claude" | "byok" | "none"
  const byokBase = () => (byokCfg.base || BYOK_PROV[byokCfg.provider].base).replace(/\/+$/, "");
  const byokModel = () => (byokCfg.model || BYOK_PROV[byokCfg.provider].model).trim();
  const byokUsable = () => !!byokModel() && (!!byokKeyMem || !BYOK_PROV[byokCfg.provider].needKey);
  // StepFun 不允許網頁直接呼叫（CORS），官方網址改走自己 Cloudflare 上的轉送站（只轉 StepFun、只接受本網站；key 不記錄）
  const BYOK_RELAY = { "https://api.stepfun.ai/v1": "https://medapi-mcp.gogoyankee.workers.dev/relay/stepfun/v1/chat/completions", "https://api.stepfun.com/v1": "https://medapi-mcp.gogoyankee.workers.dev/relay/stepfun-cn/v1/chat/completions" };
  const byokRelayUrl = (prov, base) => prov === "stepfun" ? BYOK_RELAY[base] || "" : "";
  const byokErr = (code, message, text) => Object.assign({ code, message: message || "" }, text ? { text } : {});

  // ---- 簡體轉繁體（需要時才載入 OpenCC） ----
  let s2tFn = null, s2tP = null;
  function s2tLoad() {
    if (!s2tP) s2tP = loadScript(OPENCC_URL).then(() => { const c = window.OpenCC.Converter({ from: "cn", to: "twp" }); s2tFn = t => c(t).replace(/臺/g, "台"); }).catch(e => { s2tP = null; throw e; });
    return s2tP;
  }
  const s2t = t => (byokCfg.s2t && s2tFn ? s2tFn(t) : t);

  // ---- 圖片：縮到長邊 1600 px、轉成 JPEG base64 ----
  async function imgToB64(blob) {
    try {
      const bmp = await createImageBitmap(blob), k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const cv = document.createElement("canvas"); cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
      const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(bmp, 0, 0, cv.width, cv.height);
      return { mt: "image/jpeg", data: cv.toDataURL("image/jpeg", 0.85).split(",")[1] };
    } catch (_) { throw byokErr("image_rejected", "無法讀取圖片"); }
  }
  // 把頁面的對話整理成交替的 user / assistant
  function byokTurns(input) {
    const arr = typeof input === "string" ? [{ role: "user", content: input }] : input, out = [];
    arr.forEach(t => { const last = out[out.length - 1]; if (last && last.role === t.role) last.content += "\n\n" + t.content; else out.push({ role: t.role, content: String(t.content) }); });
    return out;
  }
  // 讀 SSE 串流：每一行 data: {...}
  async function readSSE(res, onData, signal) {
    const rd = res.body.getReader(), dec = new TextDecoder(); let buf = "";
    for (;;) {
      if (signal && signal.aborted) { try { rd.cancel(); } catch (_) {} throw byokErr("cancelled"); }
      const { value, done } = await rd.read(); if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n"); buf = lines.pop();
      for (const ln of lines) { const m = ln.match(/^data:\s?(.*)$/); if (m && m[1].trim() && m[1].trim() !== "[DONE]") { let j; try { j = JSON.parse(m[1]); } catch (_) { continue; } onData(j); } }
    }
  }
  async function byokHttpErr(res) {
    let msg = ""; try { const j = await res.json(); msg = (j.error && (j.error.message || j.error.type)) || j.message || ""; } catch (_) {}
    const st = res.status;
    return byokErr(st === 401 || st === 403 ? "byok_auth" : st === 404 ? "byok_model" : st === 429 ? "rate_limited" : st === 413 ? "prompt_too_large" : st >= 500 ? "upstream_error" : "byok_bad", (msg || "").slice(0, 200) + ` (HTTP ${st})`);
  }
  // 與平台 sample() 相同的介面：sample(input, {onText, signal, images}) → {text, truncated}
  const byokSample = (input, opts) => aiTrack(byokSampleRaw(input, opts));
  async function byokSampleRaw(input, opts) {
    opts = opts || {};
    if (!byokUsable()) throw byokErr("byok_nokey");
    if (byokCfg.s2t && !s2tFn) { try { await s2tLoad(); } catch (_) {} }
    const msgs = byokTurns(input), imgs = byokCfg.imgs && opts.images ? [].concat(...[opts.images].map(x => x instanceof Blob ? [x] : [...x])) : [];
    const b64 = []; for (const b of imgs.slice(0, 8)) b64.push(await imgToB64(b));
    const prov = byokCfg.provider, base = byokBase(), model = byokModel();
    let url, headers, body;
    if (prov === "anthropic") {
      const m = msgs.map((t, i) => (i === msgs.length - 1 && b64.length ? { role: t.role, content: [...b64.map(x => ({ type: "image", source: { type: "base64", media_type: x.mt, data: x.data } })), { type: "text", text: t.content }] } : t));
      url = base + "/v1/messages";
      headers = { "content-type": "application/json", "x-api-key": byokKeyMem, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" };
      body = { model, max_tokens: 8000, stream: true, messages: m };
    } else {
      const m = msgs.map((t, i) => (i === msgs.length - 1 && b64.length ? { role: t.role, content: [{ type: "text", text: t.content }, ...b64.map(x => ({ type: "image_url", image_url: { url: `data:${x.mt};base64,${x.data}` } }))] } : t));
      url = byokRelayUrl(prov, base) || base + "/chat/completions";
      headers = Object.assign({ "content-type": "application/json" }, byokKeyMem ? { authorization: "Bearer " + byokKeyMem } : {});
      body = { model, stream: true, messages: m };
      if (prov === "kimi" && /^kimi-k3/i.test(model) && ["low", "high", "max"].includes(byokCfg.effort)) body.reasoning_effort = byokCfg.effort;
      else if (prov === "kimi" && /^kimi-k2\.6/i.test(model)) body.thinking = { type: byokCfg.think === "on" ? "enabled" : "disabled" };   // K2.6 預設開啟思考；網站預設關閉以加快回答   // K3 固定思考模式；temperature 等參數官方建議不要傳
    }
    let res;
    try { res = await fetch(url, { method: "POST", headers, body: JSON.stringify(body), signal: opts.signal }); }
    catch (e) { if (opts.signal && opts.signal.aborted) throw byokErr("cancelled"); throw byokErr("byok_network", String(e && e.message || "")); }
    if (!res.ok) throw await byokHttpErr(res);
    let text = "", truncated = false, failed = null;
    const push = d => { if (!d) return; text += d; try { opts.onText && opts.onText({ text: s2t(text), delta: d }); } catch (_) {} };
    try {
      await readSSE(res, j => {
        if (prov === "anthropic") {
          if (j.type === "content_block_delta" && j.delta && j.delta.type === "text_delta") push(j.delta.text);
          else if (j.type === "message_delta" && j.delta && j.delta.stop_reason === "max_tokens") truncated = true;
          else if (j.type === "error") failed = byokErr("upstream_error", j.error && j.error.message);
        } else {
          const c = j.choices && j.choices[0]; if (j.error) failed = byokErr("upstream_error", j.error.message);
          if (c) { if (c.delta && typeof c.delta.content === "string") push(c.delta.content); if (c.finish_reason === "length") truncated = true; }
        }
      }, opts.signal);
    } catch (e) { if (e && e.code) throw Object.assign(e, text ? { text: s2t(text) } : {}); if (opts.signal && opts.signal.aborted) throw byokErr("cancelled", "", s2t(text)); throw byokErr("upstream_error", String(e && e.message || ""), s2t(text)); }
    if (failed) throw Object.assign(failed, text ? { text: s2t(text) } : {});
    if (!text.trim()) throw byokErr("empty_completion");
    return { text: s2t(text), truncated };
  }
  byokSample.limits = async () => ({ maxPromptBytes: 600000, ...(byokCfg.imgs ? { images: { maxCount: 8, maxInputBytes: 20000000, mediaTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"] } } : {}) });
  byokSample.json = async (input, opts) => {
    const r = await byokSample(input, opts), t = r.text.trim();
    const tries = [t, (t.match(/```(?:json)?\s*([\s\S]*?)```/) || [])[1], t.slice(Math.min(...["{", "["].map(c => t.indexOf(c)).filter(i => i >= 0)), Math.max(t.lastIndexOf("}"), t.lastIndexOf("]")) + 1)];
    for (const x of tries) { if (!x) continue; try { return JSON.parse(x); } catch (_) {} }
    throw byokErr("invalid_json", "", r.text);
  };

  // ---- 設定畫面 ----
  const inClaudeView = () => !!(window.claude && window.claude.use);
  function byokActivate() {
    if (aiMode === "claude") { byokRender(); aiChipRender(); return; }
    if (byokUsable() && !inClaudeView()) { sample = byokSample; aiMode = "byok"; aiErr = ""; }
    else { if (sample === byokSample) sample = null; aiMode = "none";
      aiErr = inClaudeView() ? aiErr : "目前無法使用 AI：這個頁面不在 claude.ai 中開啟。請到「AI 設定與案件存取」→「AI 連線方式」貼上你自己的 API key，就能使用 AI；統計計算不受影響。"; }
    try { attInitLimits(); } catch (_) {}
    setHelpText(); updateChatControls(); byokRender(); aiChipRender();
  }
  function byokRender() {
    const inC = inClaudeView();
    $("aiModeLine").innerHTML = aiMode === "claude"
      ? "目前使用：<b>模式 (1) claude.ai</b>。AI 用的是開啟者自己的 Claude 帳號額度；帳號安裝 NyquistAI 連接器後，可檢索 FDA 外部案例。"
      : aiMode === "byok" ? `目前使用：<b>模式 (2) 自帶 API key</b>（${esc(BYOK_PROV[byokCfg.provider].name)}・模型 ${esc(byokModel())}）。費用由 key 的擁有者負擔；NyquistAI 外部案例在這個模式無法使用。`
      : inC ? "目前無法使用 AI。在 claude.ai 中只能使用模式 (1)，而這個帳號無法使用（可能原因*：未登入，或帳號與發布者不在同一個組織）。要用自己的 API key，請改開 GitHub 版的網址。"
      : "目前尚未設定 AI。貼上 API key 並按「儲存並啟用」後即可使用。";
    $("byokForm").hidden = inC;
    $("byokInClaude").hidden = !inC;
    if (inC) return;
    $("byokProv").value = byokCfg.provider;
    const P = BYOK_PROV[byokCfg.provider];
    $("byokBase").placeholder = P.base; if (document.activeElement !== $("byokBase")) $("byokBase").value = byokCfg.base || P.base;   // 直接顯示預設網址，使用者看得到、需要時再改
    const ms = BYOK_MODELS[byokCfg.provider] || [], pr = byokPreset(), cur = byokModel();
    const sel = $("byokModelSel");
    sel.innerHTML = (cur || byokCustomMode ? "" : '<option value="">請選擇模型…</option>') +
      ms.map(m => `<option value="${esc(m.model)}">${esc(m.label)}</option>`).join("") + `<option value="${BYOK_CUSTOM}">自訂（手動輸入）</option>`;
    const custom = byokCustomMode || (!pr && !!cur);
    sel.value = custom ? BYOK_CUSTOM : pr ? pr.model : "";
    $("byokModelCustomWrap").hidden = !custom;
    if (document.activeElement !== $("byokModel")) $("byokModel").value = custom ? byokCfg.model : "";
    $("byokModelNote").textContent = custom ? CUSTOM_NOTE : pr ? pr.note : "請先選擇模型。標 * 的是第三方資料或推論，未逐一核實；費用與功能以各服務官網為準。";
    $("byokKeyLab").textContent = P.needKey ? "API key" : "API key（公司私有雲不需要時可留空）";
    $("byokEffortF").hidden = !(byokCfg.provider === "kimi" && /^kimi-k3/i.test(cur)); $("byokEffort").value = byokCfg.effort || "max";
    $("byokThinkF").hidden = !(byokCfg.provider === "kimi" && /^kimi-k2\.6/i.test(cur)); $("byokThink").value = byokCfg.think === "on" ? "on" : "off";
    $("byokKeep").checked = !!byokCfg.keep; $("byokImgs").checked = !!byokCfg.imgs; $("byokS2t").checked = !!byokCfg.s2t;
    const kf = $("byokKey");
    kf.placeholder = byokKeyMem ? "••••••••••••••••（已輸入，結尾 " + byokKeyMem.slice(-4) + "；要更換再貼新的）" : "貼上後按「儲存並啟用」";
    kf.classList.toggle("key-set", !!byokKeyMem);
    $("byokKeyState").textContent = byokKeyMem ? (byokCfg.keep ? "✓ 已輸入 key，並記在這個瀏覽器" : "✓ 已輸入 key（只用在這次開啟，關閉網頁就清除）") : "尚未輸入 key";
    $("byokKeyState").classList.toggle("key-ok", !!byokKeyMem);
    $("byokClear").disabled = !byokKeyMem;
  }
  function byokSaveCfg() { try { localStorage.setItem(BYOK_CFG, JSON.stringify(byokCfg)); if (byokCfg.keep && byokKeyMem) localStorage.setItem(BYOK_KEY, byokKeyMem); else localStorage.removeItem(BYOK_KEY); } catch (_) {} }
  $("byokProv").innerHTML = Object.entries(BYOK_PROV).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join("");
  $("byokProv").addEventListener("change", e => { byokCfg.provider = e.target.value; byokCfg.base = ""; byokCfg.model = ""; byokCustomMode = false; if (byokCfg.provider === "kimi" || byokCfg.provider === "stepfun") byokCfg.s2t = true; byokRender(); });
  $("byokModelSel").addEventListener("change", e => {
    const v = e.target.value;
    if (v === BYOK_CUSTOM) { byokCustomMode = true; byokCfg.model = ""; byokRender(); $("byokModel").focus(); return; }
    byokCustomMode = false; byokCfg.model = v;
    const m = (BYOK_MODELS[byokCfg.provider] || []).find(x => x.model === v);
    if (m && m.base) { byokCfg.base = m.base; $("byokBase").value = byokCfg.base; }   // 預設清單沒有指定網址時，保留使用者填的 API 網址（例如 Kimi 中國站）
    byokRender();
  });
  $("byokSave").addEventListener("click", async () => {
    byokCfg.base = $("byokBase").value.trim(); byokCfg.model = ($("byokModelSel").value === BYOK_CUSTOM ? $("byokModel").value : $("byokModelSel").value).trim();
    byokCfg.keep = $("byokKeep").checked; byokCfg.imgs = $("byokImgs").checked; byokCfg.effort = $("byokEffort").value; byokCfg.think = $("byokThink").value; byokCfg.s2t = $("byokS2t").checked;
    const k = $("byokKey").value.trim(); if (k) byokKeyMem = k; $("byokKey").value = "";
    byokSaveCfg();
    if (byokCfg.s2t) s2tLoad().catch(() => { $("byokHint").textContent = "簡轉繁工具載入失敗，回答會保持原樣。"; });
    $("byokHint").textContent = byokUsable() ? "已啟用。可以按「測試連線」確認。" : !byokModel() ? "請填寫模型名稱。" : "請輸入 API key。";
    byokActivate();
  });
  $("byokClear").addEventListener("click", () => { byokKeyMem = ""; byokSaveCfg(); $("byokHint").textContent = "已清除 key。"; byokActivate(); });
  $("byokTest").addEventListener("click", async () => {
    if (aiMode !== "byok") { $("byokHint").textContent = "請先填好設定並按「儲存並啟用」。"; return; }
    $("byokTest").disabled = true; $("byokHint").textContent = "測試中…";
    const t0 = Date.now();
    try { const r = await byokSample("請只用繁體中文回答兩個字：正常"); $("byokHint").textContent = `連線成功（${((Date.now() - t0) / 1000).toFixed(1)} 秒）：「${r.text.trim().slice(0, 40)}」`; }
    catch (e) { $("byokHint").textContent = "連線失敗：" + (ERR[e && e.code] || ERR.upstream_error) + (e && e.message ? "（" + e.message + "）" : ""); }
    finally { $("byokTest").disabled = false; }
  });
  aiReadyP.then(() => { if (sample && sample !== byokSample) aiMode = "claude"; byokActivate(); });
