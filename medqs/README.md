# 醫材品質統計輔助工具（原始碼）

- `index.html`：建置好的完整網頁（單一檔案），可直接放到 GitHub Pages。
- 原始碼：`template_head.html`、`template_body.html`、各 `.js`（stats/quality/taguchi/sample 為計算引擎；其餘為介面）、`tiles/tiles.json`（圖示）。
- 建置：`python3 build.py` 產生 `hypothesis-test.html`，再改名為 `index.html`。
- 確效：`validate/`（參考值產生程式 gen_ref*.py 與 ref.json；`node validate/run_validation.js` 在 Node 中執行全部確效案例）。
- AI：在 claude.ai 中開啟時使用平台 AI（模式 1）；在其他網站開啟時，到「AI 設定」→「AI 連線方式」貼上自己的 API key（模式 2，支援 Claude API 與 OpenAI 相容格式）。
- 學習頁：`learn.html`（統計觀念圖解，獨立網頁，不需建置；第 1～4 節：假設檢定、TOST、t 檢定、比例與卡方）。
