
  // =====================================================================
  // AI 連線方式：(1) claude.ai（平台 AI）；(2) 自帶 API key（Claude API 或 OpenAI 相容格式）
  // 模式 (2) 只在 claude.ai 以外（例如 GitHub Pages）可用：claude.ai 的安全規則禁止網頁連到外部 API。
  // key 只存在使用者自己的瀏覽器，直接送到使用者填的 AI 服務，不經過其他伺服器。
  // =====================================================================
  const BYOK_CFG = "mdqs.byok.v1", BYOK_KEY = "mdqs.byok.key";
  const BYOK_PROV = {
    anthropic: { name: "Claude API（Anthropic）", base: "https://api.anthropic.com", model: "claude-sonnet-5-5", needKey: true },
    openai: { name: "OpenAI 相容格式（GPT、Kimi、Azure OpenAI、公司私有雲等）", base: "https://api.openai.com/v1", model: "", needKey: false }
  };
  const OPENCC_URL = "https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/cn2t.js";
  let byokCfg = { provider: "anthropic", base: "", model: "", imgs: true, s2t: false, keep: false };
  try { Object.assign(byokCfg, JSON.parse(localStorage.getItem(BYOK_CFG) || "{}")); } catch (_) {}
  let byokKeyMem = "";
  try { byokKeyMem = localStorage.getItem(BYOK_KEY) || ""; } catch (_) {}
  let aiMode = "none";   // "claude" | "byok" | "none"
  const byokBase = () => (byokCfg.base || BYOK_PROV[byokCfg.provider].base).replace(/\/+$/, "");
  const byokModel = () => (byokCfg.model || BYOK_PROV[byokCfg.provider].model).trim();
  const byokUsable = () => !!byokModel() && (!!byokKeyMem || !BYOK_PROV[byokCfg.provider].needKey);
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
  async function byokSample(input, opts) {
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
      url = base + "/chat/completions";
      headers = Object.assign({ "content-type": "application/json" }, byokKeyMem ? { authorization: "Bearer " + byokKeyMem } : {});
      body = { model, stream: true, messages: m };
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
    if (aiMode === "claude") { byokRender(); return; }
    if (byokUsable() && !inClaudeView()) { sample = byokSample; aiMode = "byok"; aiErr = ""; }
    else { if (sample === byokSample) sample = null; aiMode = "none";
      aiErr = inClaudeView() ? aiErr : "目前無法使用 AI：這個頁面不在 claude.ai 中開啟。請到「AI 設定」→「AI 連線方式」貼上你自己的 API key，就能使用 AI；統計計算不受影響。"; }
    try { attInitLimits(); } catch (_) {}
    setHelpText(); updateChatControls(); byokRender();
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
    $("byokBase").placeholder = P.base; if (document.activeElement !== $("byokBase")) $("byokBase").value = byokCfg.base;
    $("byokModel").placeholder = P.model || "例如 gpt-4.1、kimi-k2.6，或公司提供的模型名稱"; if (document.activeElement !== $("byokModel")) $("byokModel").value = byokCfg.model;
    $("byokKeyLab").textContent = P.needKey ? "API key" : "API key（公司私有雲不需要時可留空）";
    $("byokKeep").checked = !!byokCfg.keep; $("byokImgs").checked = !!byokCfg.imgs; $("byokS2t").checked = !!byokCfg.s2t;
    $("byokKeyState").textContent = byokKeyMem ? (byokCfg.keep ? "已儲存 key（存在這個瀏覽器）" : "已輸入 key（只用在這次開啟，關閉網頁就清除）") : "尚未輸入 key";
    $("byokClear").disabled = !byokKeyMem;
  }
  function byokSaveCfg() { try { localStorage.setItem(BYOK_CFG, JSON.stringify(byokCfg)); if (byokCfg.keep && byokKeyMem) localStorage.setItem(BYOK_KEY, byokKeyMem); else localStorage.removeItem(BYOK_KEY); } catch (_) {} }
  $("byokProv").innerHTML = Object.entries(BYOK_PROV).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join("");
  $("byokProv").addEventListener("change", e => { byokCfg.provider = e.target.value; byokCfg.base = ""; byokCfg.model = ""; byokRender(); });
  $("byokSave").addEventListener("click", async () => {
    byokCfg.base = $("byokBase").value.trim(); byokCfg.model = $("byokModel").value.trim();
    byokCfg.keep = $("byokKeep").checked; byokCfg.imgs = $("byokImgs").checked; byokCfg.s2t = $("byokS2t").checked;
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
