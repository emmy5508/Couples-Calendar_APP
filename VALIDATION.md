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
