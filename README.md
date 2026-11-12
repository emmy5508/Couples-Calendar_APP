# 共享日曆 🌷

繁體中文、馬卡龍色調的手機優先家庭日曆。React + Vite + Firebase，使用既有專案 `couples-calendar-97907`。只使用 Spark 免費方案支援的 Authentication、Firestore 與 Hosting；不使用 Cloud Functions、Storage、推播或付費服務。免費方案有配額，超額可能暫停服務，不保證無限用量。

## 功能

- Email／密碼註冊、登入、登出、忘記密碼、寄送與確認信箱驗證；未驗證者無法讀寫日曆。
- 每人可建立及加入多本私人日曆；日曆資料與成員只有受邀成員可讀。
- 分享邀請連結，註冊並驗證後直接加入為檢視者。
- 擁有者可調整權限、移除成員、轉移所有權、刪除日曆；非擁有者可自行退出。
- 編輯者可修改所有人的活動與共用分類；檢視者唯讀。規則由 Firestore 伺服器執行。
- 活動分類（單選）、家庭標籤（複選），可改名稱與顏色；家庭標籤不必對應登入帳號。
- 活動標題、開始／結束、全天、地點、備註、參與成員，每天／每週／每月重複及結束日期。月底自動落到最後一天，之後回到原定日期。
- 修改／刪除重複活動的單次或整個系列；月曆、當日行程、月份行程清單、搜尋與分類篩選。
- 週一開始、固定台灣時間；Firestore 即時訂閱；斷網時只看目前頁面已載入資料，禁止操作。為降低共用裝置洩漏風險，不把日曆資料持久儲存至 IndexedDB；離線重新開啟後不保證能讀取先前行程。
- PWA manifest、192／512 圖示與 service worker，可加入手機主畫面。登入前提供不連後端、僅記憶體保存的體驗日曆。

**邀請連結不設停用功能（依需求）。** 被移除者若仍持有連結，可以再次加入。不要公開傳播連結。刪除日曆會刪除邀請；已離開成員的私人訂閱索引可能保留無權存取的 ID，不含日曆內容，介面不會顯示。

## 本機開發

需要 Node.js 22 或 24，建議 Node.js 24。每個雲端任務已有獨立工作區，直接用現有 checkout，不需另建 Git worktree。

```sh
cd /workspace/Couples-Calendar_APP
npm ci
npm run dev
```

瀏覽登入頁，或點「探索體驗日曆」。正式 Firebase 設定在 `src/firebase.js`，前端 Web API key 不是管理員憑證；不要放入服務帳戶私鑰。此版本不啟用 Analytics。

## Firebase 設定與部署

使用者已確認 Email／密碼登入及 Firestore 已啟用。Firebase 專案需維持 **Spark**，不要升級帳單方案。

1. 在 Firebase Console → Authentication → Settings → Authorized domains，確認 Hosting 的 `couples-calendar-97907.web.app` 與 `couples-calendar-97907.firebaseapp.com` 已列入。開發機可按需加入 `localhost`。
2. 在 Authentication → Templates 可調整驗證與重設密碼信件；驗證信、密碼重設信沿用 Firebase 預設郵件處理頁。
3. 在你已授權的開發機執行下列命令。不要將登入 token 或私鑰貼進聊天或提交至 Git。

```sh
npm ci
npx firebase login
npx firebase use couples-calendar-97907
npm run test:rules
npm test
npm run deploy
```

`npm run deploy` 會建置並部署 **Hosting、Firestore 規則與索引**。不可只部署前端而沿用資料庫測試模式規則。部署將更新現有專案的安全規則，請先確認它沒有其他依賴不同規則的應用程式。

部署後，先以兩個真實帳號驗證：註冊／信箱驗證、建立日曆、分享連結加入、活動即時同步、編輯者修改他人的活動、檢視者不可寫、移除成員後失去存取權、轉移所有權、退出與刪除。另以未受邀帳號確認讀不到私人日曆。這些正式環境檢查尚未執行。

## 測試

```sh
npm test                  # 日期、月底／閏年、單次例外與搬移
npm run build             # 正式建置
npm run test:rules        # Firestore emulator 權限整合；需 Java 21
```

瀏覽器測試使用系統 Chromium（`/usr/bin/chromium`）。如環境不同，可在測試的 executablePath 改為已安裝的路徑。

```sh
# 終端一
npm run dev -- --port 5173
# 終端二
npm run test:browser
```

驗證註冊、信箱驗證、登入／登出、密碼重設（只用本機模擬器，不寄真實郵件）：

```sh
# 終端一
npx firebase emulators:start --only auth,firestore --project demo-shared-calendar
# 終端二
VITE_USE_EMULATORS=true npm run dev -- --port 5174
# 終端三
node tests/auth.browser.mjs
```

完整本機後端開發可用 `--only auth,firestore`。`VITE_USE_EMULATORS=true` 時 Firebase 專案與 API key 會切換為 demo 專案，避免碰觸正式資料。正式建置不要設定這個變數。

## 目前驗證與環境限制

- 已完成日期單元測試、手機／桌面瀏覽器行程與分類操作、正式 build；執行結果以交付說明為準。
- Firestore emulator 官方 JAR 下載需要 `storage.googleapis.com`，目前雲端網路政策回應 CONNECT 403，**權限整合測試尚未跑完**。請允許此網域再執行 `npm run test:rules`。
- 雲端 Firebase CLI 尚未有可用帳號或應用程式預設憑證；`firebase projects:list --non-interactive` 回應登入失敗。**尚未部署到 Firebase，也尚未驗證正式資料同步。**
- 若要在此雲端環境完成連線與部署，需在環境設定允許 Firebase 使用的網域：`storage.googleapis.com`、`identitytoolkit.googleapis.com`、`securetoken.googleapis.com`、`firestore.googleapis.com`、`firebase.googleapis.com`、`firebasehosting.googleapis.com`、`firebaserules.googleapis.com`、`cloudresourcemanager.googleapis.com`、`serviceusage.googleapis.com`、`oauth2.googleapis.com`、`accounts.google.com`、`www.googleapis.com` 及專案 Hosting 網域。依實際 CLI 回應確認是否需補其他官方端點；保留原本允許清單。
- Cloud Environment 設定草稿工具發生平台錯誤，尚未確認可重用設定已儲存。此文件及 npm scripts 可用於重建環境，不代表平台草稿或環境快照已發布。

## 資料結構

- `calendars/{calendarId}`：名稱、擁有者、邀請 token。
- `calendars/{calendarId}/members/{uid}`：角色、暱稱、身分驗證用 Email、加入 token。
- `calendars/{calendarId}/categories/{id}`：活動分類／家庭標籤。
- `calendars/{calendarId}/events/{id}`：活動、重複規則與以原始發生日為鍵的單次例外。
- `users/{uid}/subscriptions/{calendarId}`：只允許本人讀寫的日曆索引。
- `invites/{randomToken}`：高熵隨機邀請碼到日曆 ID 的對應；禁止列舉，驗證使用者可用完整 token 讀取。

活動使用台灣本地 ISO 日期時間字串，避免依瀏覽器時區漂移。個人索引不儲存日曆名稱或活動內容，資料讀寫仍須通過當下的成員規則。

PWA 正式建置驗證（先在另一個終端啟動 preview）：

```sh
npm run build
npx vite preview --host 0.0.0.0 --port 4173
# 另一個終端
node tests/pwa.browser.mjs
```

完整驗證結果與尚未執行的檢查見 [VALIDATION.md](VALIDATION.md)。

### 最新環境複查

新增網域已套用，Firestore 權限整合測試已通過（1 項整合測試，0 失敗）。本雲端環境需使用可寫入的模擬器快取目錄：

```sh
FIREBASE_EMULATORS_PATH=/workspace/.firebase-cache/emulators XDG_CONFIG_HOME=/workspace/.firebase-config FIREBASE_CLI_DISABLE_UPDATE_CHECK=1 npm run test:rules
```

上方舊的「模擬器下載被 403 阻擋」紀錄已解除。Firebase 部署授權仍缺少，環境草稿 API 仍報錯；網路設定確定已套用，其他草稿欄位尚無法由工具核對。最新完整結果見 VALIDATION.md 的最後一節。

### 邀請流程回歸測試

先另開終端執行 `VITE_USE_EMULATORS=true npm run dev -- --port 5174`，再執行：

```sh
FIREBASE_EMULATORS_PATH=/workspace/.firebase-cache/emulators XDG_CONFIG_HOME=/workspace/.firebase-config npx firebase emulators:exec --only auth,firestore --project demo-shared-calendar 'node tests/invite.browser.mjs'
```

此測試使用兩個隔離的瀏覽器帳號，驗證新日曆的邀請連結產生及家人以檢視者加入，並模擬缺少 randomUUID 的瀏覽器。

### 暱稱

完成信箱驗證後需設定 1～30 字暱稱；舊帳號下次登入也會補填。可從側欄帳號的「修改暱稱」或日曆設定的「修改我的暱稱」變更。修改會同步更新自己已加入日曆的成員資料。「一起使用的人」、參與成員和帳號顯示均使用暱稱，不以信箱作為未設定時的替代；未補填的家人顯示「尚未設定暱稱」。

`users/{uid}` 保存僅本人可讀寫的暱稱設定，日曆 member 文件保存成員暱稱副本。本人只能變更自己的暱稱，不可藉此更動角色或信箱；暱稱更新與個人設定以批次寫入，已退出／已刪除日曆的舊索引會跳過。信箱仍用於登入與驗證。此更新需同時部署網站和 Firestore 安全規則。

### 週末日期與 2026／2027 國定假日

週六、週日不另設灰底，兩者日期都使用紅色；國定假日與補假也使用紅色日期。保留「今天」及使用者選取日期的提示。

月曆標示假日名稱，點日期後可在當日明細看完整名稱；行程清單也會顯示假日，即使當天沒有私人活動。假日是隨版本內建的固定標示，不寫入 Firestore、不列入私人行程數，也不受私人分類篩選影響。

共收錄 2026 年 22 日、2027 年 24 日，包含補假及落在週末的國定假日。資料源自人事行政總處政府辦公日曆表的公開格式整理鏡像；來源、固定版本、授權及取得限制詳見 [docs/holidays-sources.md](docs/holidays-sources.md)。網站「國定假日說明」提供原始資料與整理來源連結。

驗證：`npm test`；先啟動 `npm run dev -- --port 5173`，再執行 `node tests/holidays.browser.mjs` 檢查手機／桌面版日期配色、假日明細與清單。後續年度或臨時停班停課不自行推算，需依最新公告更新資料後部署。
