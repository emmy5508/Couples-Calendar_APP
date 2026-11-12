# 驗證紀錄

執行日期：2026-11-11（台灣時間）。測試在目前雲端工作區執行；不代表已部署、已發布環境快照或已驗證正式 Firebase。

| 檢查                               | 結果                                                                                                                                     |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 日期單元測試                       | 7 項通過：月末與閏年、重複起訖、單次修改／刪除、搬移單次活動、跨日重複、週一起始與跨年日期運算                                           |
| 390px 手機與 1440px 桌面瀏覽器     | 通過：無水平溢出、活動新增與編輯、月曆／清單切換、分類新增、重複活動單次編輯／刪除；無未捕捉的頁面錯誤                                   |
| Firebase Authentication 本機模擬器 | 通過：註冊、未驗證信箱阻擋、驗證信箱、登出、重新登入、密碼重設信產生；沒有寄送真實郵件                                                   |
| 正式建置與 PWA                     | 通過：manifest、圖示、service worker、360px 版面、離線唯讀與離線重載應用程式外殼                                                         |
| 正式執行相依套件稽核               | `npm audit --omit=dev --audit-level=high`：0 vulnerabilities；grpc 使用相容的修補版本覆寫                                                |
| 正式 build                         | 通過；Firebase 分塊約 489 kB（gzip 約 114 kB），已移除不需要的跨來源登入處理器，無大於 500 kB 分塊提示                                                      |
| Firestore 安全規則整合測試         | **未執行完成**。測試已寫在 `tests/rules.integration.js`；官方模擬器 JAR 下載被 `storage.googleapis.com` CONNECT 403 擋住，模擬器沒有啟動 |
| 正式 Firebase 登入／同步／多人隔離 | **未驗證**。目前無可用的管理端部署授權；僅使用者提供的公開 Web 設定可用                                                                  |
| Firebase Hosting 與安全規則部署    | **尚未部署**。CLI `firebase projects:list --non-interactive` 回應 Failed to authenticate                                                 |
| 雲端可重用設定草稿                 | **儲存未確認**。平台讀寫工具回傳 INVALID_ARGUMENT；安裝、啟動與部署流程已保留於 README 和 package scripts                                |

Firestore 整合測試設計涵蓋：陌生人不可讀取、未驗證者不可讀取、合法邀請加入、無效邀請拒絕、禁止自行升權、檢視者不可改分類或刪活動、編輯者可修改他人活動、原子所有權轉移、移除／退出後失去讀取權，以及刪除日曆。

解除網路限制後，先跑 `npm run test:rules` 並處理所有失敗，再依 README 部署安全規則與網站，最後使用兩個真實帳號完成正式環境驗收。iOS／Android 真機安裝尚未實測。

## 2026-11-11 再次檢查

- Firebase：重新執行 `firebase projects:list --non-interactive`，exit 1，`Failed to authenticate, have you run firebase login?`。CLI 沒有已記錄的帳號或 token，已提供的預設憑證檔為空物件。沒有執行部署。
- Firestore：重新執行 `npm run test:rules`，exit 2，停止於官方模擬器下載；以新的 HTTPS 請求確認 `storage.googleapis.com` 仍為 CONNECT 403。規則測試仍未執行，不能視為通過。另有先前 Auth 模擬器占用 hub/logging port 的警告，CLI 已自動改用其他 port，並非此次下載失敗的原因。
- 環境草稿：讀取重試兩次，更新安裝及啟動欄位一次，均回傳 `INVALID_ARGUMENT`。儲存、套用與發布仍未確認。沒有覆寫未知的網路清單。
- 環境狀態：目前觀測有效，限制型網路政策已套用，沒有新增的執行時憑證綁定；未允許 `storage.googleapis.com`。

## 網域設定套用後再次檢查（2026-11-11）

- 環境已恢復為 running，最新觀測有效，spec revision 2 已套用；`storage.googleapis.com` 明確列入允許清單。官方 JAR HTTPS 請求回傳 200。
- Firestore 權限整合測試：**1 項整合測試通過、0 失敗、0 略過**，子檢查涵蓋隔離、邀請、角色、轉移與退出／移除。原始命令結束碼 0。先前的「尚未執行」狀態已解除。
- CLI 預設模擬器目錄 `/home/agent/.cache/firebase/emulators` 無法建立，改用官方支援的 `FIREBASE_EMULATORS_PATH=/workspace/.firebase-cache/emulators`；官方下載及 CLI 內建檔案大小／checksum 驗證保留。
- 成功命令：`FIREBASE_EMULATORS_PATH=/workspace/.firebase-cache/emulators XDG_CONFIG_HOME=/workspace/.firebase-config FIREBASE_CLI_DISABLE_UPDATE_CHECK=1 npm run test:rules`。
- Firebase CLI 專案列表仍回覆 Failed to authenticate（exit 1），尚未部署；本機模擬器通過不代表正式專案同步已驗證。
- 草稿讀取重試仍回覆 INVALID_ARGUMENT。只能確認網路設定已套用，無法從草稿工具核對安裝／啟動欄位或確認發佈。不要將此問題誤認為使用者新增網域沒有生效。

## 邀請家人修正驗證（2026-11-11）

- 已用完整瀏覽器流程重現：新建日曆的樂觀訂閱可能早於成員寫入在伺服器完成，日曆監聽被拒絕後不會恢復，導致可見邀請按鈕卻缺少日曆資料。修正為等待訂閱的 pending writes 完成，並在日曆資料尚未載入時禁止邀請及提供明確錯誤。
- 邀請碼使用 Web Crypto `getRandomValues` 的 128 位元安全亂數，避免依賴部分瀏覽器缺少的 `randomUUID`，不使用 Math.random 作為替代。
- 9 項單元測試通過、正式 build 通過。
- `tests/invite.browser.mjs` 已在 Auth + Firestore 模擬器通過：註冊並驗證建立者、建立日曆、模擬缺少 randomUUID、產生邀請連結、另一個已驗證帳號加入、確認加入者為檢視者且不可邀請其他人。
- 使用者截圖已證實先前版本由 Cloud Shell 成功部署。這次修正尚需 Cloud Shell 拉取更新後重新部署。

## 暱稱功能驗證（2026-11-11）

- 已新增驗證信箱後的暱稱設定流程，既有沒有個人設定的帳號也會補填；側欄與日曆設定可隨時改名，更新自己已加入的日曆成員副本。
- 成員清單、成員頭像、權限選單的標籤、活動參與者及帳號側欄改用暱稱；舊成員未設定時顯示「尚未設定暱稱」，不退回顯示 Email。
- 11 項單元測試、2 項 Firestore 權限整合測試通過；正式 build 通過。
- Auth + Firestore 模擬器的兩帳號瀏覽器流程通過：設定暱稱、邀請加入、檢視者自行改名、另一帳號即時看到新暱稱、成員清單與參與者畫面不包含測試信箱；登入／登出及忘記密碼流程也通過。
- 權限檢查涵蓋：個人暱稱資料僅本人可讀寫、舊成員資料補填、只允許本人改自己的暱稱、拒絕同時更動角色或信箱、拒絕幫別人改名、拒絕空白／過長暱稱。
- 修正首次儲存暱稱後立即建立日曆的畫面競態，避免儲存完成的回呼關閉新開的日曆表單。
- 此更新需從 Cloud Shell 拉取並執行完整 `npm run deploy`，以同時發布網站與新的 Firestore 規則。

## 週末日期與假日標示（2026-11-12）

- 移除週六、週日的固定底色，週六、週日與假日的日期及欄標均為紅色；今天與選取狀態的提示保留。
- 內建 2026、2027 年 46 筆國定假日／補假，來源與鏡像固定版本記錄在 docs/holidays-sources.md。官方網站在環境中無法直接連線，資料透過標示政府原始來源的公開鏡像取得；未聲稱直接讀取原始公告。
- 14 項單元測試通過，涵蓋兩年度假日、恢復放假的紀念日、農曆節日、週末補假與 2027-12-31 跨年補假；正式 build 通過。
- 假日瀏覽器測試通過：一般週六／週日與週間日期的底色相同而文字色不同、月曆與當日完整名稱、補假、無私人行程也顯示假日的清單、來源連結、390／320 px 手機無水平溢出及桌面版截圖檢查。
- 這些固定標示不修改使用者活動、分類、權限或資料庫，也不增加私人行程計數；尚需 Cloud Shell 拉取新版並部署才能出現在正式網站。
