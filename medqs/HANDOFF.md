# 醫材品質統計輔助工具：交接檔（給 Claude Code）

最後更新：2026-10-18。內容以 repo 的實際狀態為準；推論的地方標 *。

---

## 0. 先讀：使用者規則（一定要遵守）

- **全程繁體中文**，不可出現簡體中文。
- **線索根據事實**：不清楚就不下結論；推論可以，但要標 `*`。
- **依事實與邏輯回答**，不要順著使用者想要的答案推測。使用者質疑時，耐心說明。
- **AI 不產生量測數值**：σ、不良率、樣本數、規格一律由使用者依資料填。
- **去識別化**：只用代號。
- **API key 絕不寫進 repo、不貼出、不發布。**
- 「**先討論**」＝先提方案或示意，不要直接改。**使用者做決定**，不要自行決定。
- 系統要**簡單**；避免長串說明文字。
- **正式版要能還原**：先在試作版做，使用者同意後才合併到 `main`。

---

## 1. 專案在哪裡

| 項目 | 位置 |
|---|---|
| GitHub repo | `ChiuChangRu/DMAIC_02`，程式在 `medqs/` |
| 正式網頁（claude.ai artifact，知道連結的人都能開） | https://claude.ai/artifact/3jLxswUNecKJTLez6QCFSh （目前 v150 ＝ `main` c9e15fe） |
| 試作網頁（只有擁有者能開） | https://claude.ai/artifact/SZQw889NdRQ6reHHBxh1KZ （目前 v21 ＝ `hf-p1` 75b1937） |
| 舊版保留分支 | `keep-v148`（ab32421，2026-10-17 合併試作版前的正式版）、`keep/v87-before-fbpick` |
| 架構與使用簡報（Slides artifact） | https://claude.ai/artifact/LJEDhL9R9cjDYKrtyxsWfA |

**分支狀態**：`hf-p1` 比 `main` 多 5 個 commit（v17～v21：排除必填理由、對策層次、閉環魚骨圖、驗證計畫死路修正與手勢補齊）。**尚未合併**，要等使用者說「推上去」。

Commit 署名：`git -c user.name=chiuchangru -c user.email=gogoyankee@gmail.com commit …`，訊息結尾加上 session 要求的 Co-Authored-By／Claude-Session 兩行。

---

## 2. 架構

```
使用者 → 網頁介面（單一 HTML）
           ├─ AI（claude.ai 的 window.claude.use("sample")，或自帶 key：byok.js）
           │    只處理去識別化文字；不產生數值；建議要按「採用」才寫入
           ├─ 計算引擎（stats.js / quality.js / taguchi.js / sample.js / regress.js）
           │    全部在瀏覽器內算；每次改版要跑確效（SciPy 2938、NIST 87、邏輯 161，0 失敗）
           └─ 外部資料（選用，MCP）：NyquistAI、PubMed、USPTO（patent-mcp）、openFDA、Health Canada、KM 示範
資料：localStorage（mdqs.*）；案件可暫存、匯出、匯入（case.js）
```

- 兩種用法：**方法一 工具箱**（單一工具），**方法二 PDCA 流程**：① 定義問題 → ② 魚骨圖 → ③ 驗證計畫 → ④ PDCA 報告。
- artifact 宣告的 capabilities：`mcp`（NyquistAI MedTech、PubMed、USPTO Patents）、`sample`、`downloads`。重新發布時沿用即可，不要改。

### 建置方式（重要）
- `medqs/build.py` 把 `template_head.html` + `template_body.html` 串起來，再把各 `.js` 依序**串接**到 `/*__FISHBONE_JS__*/` 位置，輸出 `index.html`。
- 所有 JS **共用同一個 script 作用域**。所以 `hf_ui.js`（最後串接）可以直接讀寫其他檔的變數和函式，例如 `fb`、`busy`、`ctl`、`chatKey`、`turns`、`svOk`、`vrNonStat`、`SV_Q`、`VP_TOOLS`。
- **以 `function` 宣告的函式可以被重新指定**，試作層就是靠這點包裝原函式：`fbDiagram`、`pdcaHtml`、`aiBody`、`hubPlan`、`vrGo`、`fbSaveNow`、`carryToFishbone`。`const` 宣告的不能重新指定（例如 `svOk`），只能改它讀的資料。
- 串接順序就是執行順序。`hf_ui.js` 裡的 `const` 有 TDZ 問題：初始化時就會被呼叫的輔助函式（例如手勢 `next()` 用到的）要寫成 `function` 宣告，不能用 `const` 箭頭函式。

---

## 3. 檔案地圖（`medqs/`）

| 類別 | 檔案 |
|---|---|
| 計算引擎（動了就要跑確效） | `stats.js`、`quality.js`、`taguchi.js`、`sample.js`、`regress.js` |
| 確效 | `validate/`（`gen_ref*.py` 產生 SciPy 參考值 → `ref.json`；`validate_core.js`；`run_validation.js`） |
| 版面 | `template_head.html`（CSS）、`template_body.html`（HTML＋主程式：AI 對話、aiBody、chipGroup、homeQ…） |
| 魚骨圖 | `fishbone.js`（fbRepair、fbDiagram、小視窗、待決定清單、fbPlanAI）、`fb_pick.js` |
| ③ 驗證計畫 | `pdca_report.js`（驗證清單 vpRender／vpSyncFb、PDCA 報告 pdcaHtml）、`plan_hub.js`（卡片 hubRender、工具箱 TB）、`ss_link.js`（樣本數連動 SV_Q／svOk）、`vr_link.js`（分析結果存報告 vrGo／附錄） |
| 規劃 AI | `plan_kit.js`（樣本數／假設檢定／DOE／田口的「請 AI 建議設計」，id 前綴 pks/pkh/pkd/pkt）、`msa_plan.js`（mpAi）、`spc_plan.js`（spAi） |
| 外部資料 | `ext_sources.js`（XS：openfda、uspto、pubmed、hc）、`nyquist.js`、`src_icons.js`、`km.js`、`km_demo.js` |
| 其他 | `flow_ui.js`（流程列、暫存）、`case.js`（案件存取）、`byok.js`、`ai_status.js`（AIS.busy 計數）、`pub_examples.js`（公開範例：PLOS 支架 DOE、IEOM Gage R&R） |
| **人因試作層** | `hf_ui.js`（見第 4 節）＋ `template_head.html` 檔尾的對應 CSS |

---

## 4. `hf_ui.js`（人因試作層）各模組

全部是包在 IIFE 裡的模組，依檔案順序：

| 模組 | 功能 |
|---|---|
| `hfInit` | 「本案問題」欄（#caseQ，與 fbProblem 雙向同步、推給各工具的問題欄）、說明開關、執行鈕固定在下緣 |
| `glInit` | **👉 手勢導引**：`next()` 依目前畫面決定指哪裡。規則：全站第一步是本案問題；指分頁時，若同頁有同功能按鈕（`[data-route-go]`）就改指按鈕；目標不在畫面內時顯示「下一步在上面／下面」 |
| `w5Inline` | 5W 建議鈕（問題框、魚骨圖問題點、AI 輸入框） |
| `carryDirect` | AI 回答中的「帶入魚骨圖，逐一確認 →」 |
| `refLinks` | AI 回答提到的案例編號變成連結 |
| `hubInline` | ③ 卡片內選驗證策略；DOE／田口可勾「略過樣本數計算」（ss.q = "bypass"，附警語） |
| `nvInit` | 「本項不驗證」＋原因；報告標示草稿、結案鎖定 |
| `fbOnly` | ③ 只收魚骨圖的原因；AI 建議列入時，魚骨圖上已有的原因自動標 ◇；「← 回 ② 魚骨圖改原因」 |
| `itemAI` | 卡片「🤖 問 AI 這一項」（vitem 區塊 → 採用到卡片）；進工具頁時自動按該頁 AI 建議，每項每頁一次 |
| `aiWait` | AI 思考中遮罩（看 AIS.busy、busy，以及「AI 診斷分析」外部檢索階段） |
| `svBypass` | 樣本數頁 DOE 項目可選「略過樣本數，直接進入分析」 |
| `fbDone` | 魚骨圖「✓ 魚骨圖修改完成」按鈕（fb.fbDoneSig；之後再改魚骨圖會自動失效） |
| `exclReason` | **排除必填理由**（原因存 f.reason，子因子存 fb.sxr[id]）；報告第 2 段列「已排除的原因與理由」；刪除不用理由 |
| `levelInit` | **對策層次**（x.lv：1 根因調查／2 製程或放行卡控／3 臨床控管 IFU）、「＋ 同原因再加一項」；報告對策表加層次欄 |
| `fbDiagram` 改寫 | **閉環魚骨圖**（CEDAC 式）：取代原魚骨圖，斜骨頭一側是原因、另一側是對策（層次顏色＋策略），不加框；含已排除的原因與理由 |
| `hfxPersist` | 試作新增欄位的保存（見第 5 節） |

---

## 5. 資料模型與陷阱

- `fb`：魚骨圖與驗證計畫的整包狀態，存在 localStorage `FB_STORE`；案件快照用 `JSON.parse(JSON.stringify(fb))`。
- `fb.factors[]`：`{id, text, st: "cand"|"use"|"excl", cat:{[set]:catId}, key, verify(◇), reason, subs[]}`。
- `fb.vplan[]`（③ 驗證項目）：`{id, on, fid(對應魚骨圖原因), fbt, cause, method, data, tool, ss{q,n,sum,why,…}, vr{st,note}, apx[]}`。
- **陷阱：`fbRepair` 會把 vplan 項目照固定欄位重建**，不在白名單的欄位在載入案件時會被丟掉。所以試作欄位 `nv`、`ssPrev`、`aiAuto`、`lv` 另外存在 `fb.hfx`（頂層欄位不會被丟），載入後由 `hfxPersist` 補回。新增欄位時，要嘛加進這個機制，要嘛存在 fb 頂層。
- 子因子沒有理由欄位，排除理由存在 `fb.sxr`。
- `vrNonStat(x)`：策略以「不用統計」開頭，或 `ss.q === "none"` → 不走樣本數和分析，直接填結論。

---

## 6. 部署流程

### 試作版（hf-p1）
1. 在工作副本改 `hf_ui.js`、`template_head.html`（及必要的其他檔）。
2. 複製到試作打包資料夾，`python3 build.py`，再 `cd validate && node run_validation.js`，要看到 **SciPy 2938 / NIST 87 / logic 161，fail 0**。
3. `git checkout hf-p1` → 複製 `medqs/` → commit → `git push origin hf-p1` → `git checkout main`。
4. 產生試作頁：複製建置結果，**只改第一個 `<title>`**：`sed -i '0,/<title>[^<]*<\/title>/s||<title>醫材統計工具（人因試作）</title>|'`。**不要用全域 `s|...|...|g`**，SVG 裡的 `<title>`（圖表提示）也會被換掉。
5. 用 Artifact 發布到試作網址。

### 正式版（main）
- 只有使用者說「推上去」才做。`hf-p1` 通常可以直接 `git merge --ff-only hf-p1` 到 main，或用 `--no-ff` 留合併紀錄。
- 合併後重新建置並跑確效 → `git push origin main` → 用 Artifact 發布到正式網址。
- 舊的正式版要能還原：重大合併前先開 `keep-…` 分支（tag 推送曾失敗，改用分支）。

---

## 7. 測試方式

- 用 Playwright（headless Chromium）跑模擬使用者的腳本：開 `index.html`，以 `addInitScript` 注入假的 `window.claude.use("sample")`，回傳固定的 AI 文字（含 ```fishbone／```verify／```vitem 區塊）。
- 每一步記錄手勢顯示的文字和目標，確認流程從定義問題一路到報告都有下一步提示。
- *前一個工作環境的測試腳本放在暫存區（/tmp），已經不在 repo 裡。需要的話，建議把共用函式（開頁、建魚骨圖、走 ③）整理進 `medqs/validate/ui/` 再 commit。
- 截圖放暫存區，不要存進 repo 或工作目錄。

---

## 8. 待使用者決定 / 尚未驗證

**待決定**
- `hf-p1`（v17～v21）何時合併到正式版。
- 從工具箱直接進的單一工具頁：寫好本案問題後，要不要也有「下一步」手勢。
- 報告「目前狀態」檢核清單尚未認得「不驗證」項目，改它會動到共用檔 `pdca_report.js`。
- 其他工具（假設檢定、MSA 等）要不要也開放「略過樣本數」。
- 長期方向（已討論、未啟動）：計算引擎做成 MCP＋REST 雙入口（Cloudflare Worker，之後可搬地端 Node.js 給鼎新數智等系統呼叫）；skill 只當入口和陪跑，計算不讓 AI 自己算。

**尚未驗證***
- 真實 AI 回答是否照格式（verify／vitem 區塊）、遮罩出現和消失的時機。
- NyquistAI、PubMed、USPTO 實際連線。`patent-mcp` Worker（MedAPI repo 的 `patent-mcp` 分支）由使用者自行部署到 Cloudflare，尚未部署。
- 暗色模式下拉選單在使用者的 Chrome 上的實際顏色。
