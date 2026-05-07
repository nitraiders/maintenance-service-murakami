/**
 * メンテナンスサービス村上 統合バックエンド (修正版)
 */

// -------------------------------------------------------------
// 【設定エリア】
// -------------------------------------------------------------
const TARGET_EMAIL = "info@m-s-murakami.com"; 
const ADMIN_PASSWORD = "msm2724";            // 指定のパスワード
const SAVE_FOLDER_ID = "1xMaFpSHnJhrDS1jbSW0bve4Y1QAeJvSB"; // 画像保存先フォルダID
// -------------------------------------------------------------

function doPost(e) {
  try {
    // データの安全な取得
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({ status: "error", message: "データが空です" });
    }

    const params = JSON.parse(e.postData.contents);

    // --- 新着情報・作業実績の投稿処理 ---
    if (params.action === 'post_news') {
      // パスワード認証
      if (params.password !== ADMIN_PASSWORD) {
        return createJsonResponse({ status: "error", message: "認証に失敗しました" });
      }

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = ss.getSheetByName("新着情報");
      if (!sheet) {
        sheet = ss.insertSheet("新着情報");
        sheet.appendRow(["日付", "カテゴリ", "内容", "画像URL", "登録日時"]);
      }

      let imageUrl = "";
      if (params.image && params.image.includes("base64")) {
        imageUrl = saveImageToDrive(params.image);
      }

      sheet.appendRow([
        params.date,
        params.category,
        params.content,
        imageUrl,
        new Date()
      ]);

      return createJsonResponse({ status: "success", type: "news" });
    }

    // --- 新着情報・作業実績の削除処理 ---
    if (params.action === 'delete_news') {
      if (params.password !== ADMIN_PASSWORD) {
        return createJsonResponse({ status: "error", message: "認証に失敗しました" });
      }
      return deleteNews(params);
    }

    // --- FAQの投稿処理 ---
    if (params.action === 'post_faq') {
      if (params.password !== ADMIN_PASSWORD) {
        return createJsonResponse({ status: "error", message: "認証に失敗しました" });
      }

      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = ss.getSheetByName("FAQ");
      if (!sheet) {
        sheet = ss.insertSheet("FAQ");
        sheet.appendRow(["質問", "回答", "登録日時"]);
      }

      sheet.appendRow([
        params.question,
        params.answer,
        new Date()
      ]);

      return createJsonResponse({ status: "success", type: "faq" });
    }

    // --- FAQの削除処理 ---
    if (params.action === 'delete_faq') {
      if (params.password !== ADMIN_PASSWORD) {
        return createJsonResponse({ status: "error", message: "認証に失敗しました" });
      }
      return deleteFaq(params);
    }

    // --- 問い合わせフォーム処理 ---
    return handleInquiry(params);

  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

function handleInquiry(params) {
  const timestamp = new Date();
  const name = params.name || "不明";
  const email = params.email || "不明";
  const message = params.message || "内容なし";

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];
  sheet.appendRow([timestamp, name, email, message]);

  const subject = "[メンテナンスサービス村上] 新規お問い合わせ";
  const body = `Webサイトよりお問い合わせがありました。\n\nお名前: ${name} 様\n内容:\n${message}`;

  if (TARGET_EMAIL) {
    GmailApp.sendEmail(TARGET_EMAIL, subject, body);
  }

  return createJsonResponse({ status: "success", type: "inquiry" });
}

function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const result = { news: [], faq: [] };

    // --- 新着情報シートの読み込み ---
    const newsSheet = ss.getSheetByName("新着情報");
    if (newsSheet) {
      const newsData = newsSheet.getDataRange().getValues();
      if (newsData.length > 1) {
        newsData.shift();
        result.news = newsData.map(row => ({
          id: row[4] instanceof Date ? row[4].getTime() : row[4],
          date: row[0] instanceof Date ? Utilities.formatDate(row[0], "JST", "yyyy/MM/dd") : row[0],
          category: row[1],
          content: row[2],
          image: row[3]
        })).reverse();
      }
    }

    // --- FAQシートの読み込み ---
    const faqSheet = ss.getSheetByName("FAQ");
    if (faqSheet) {
      const faqData = faqSheet.getDataRange().getValues();
      if (faqData.length > 1) {
        faqData.shift();
        result.faq = faqData.map(row => ({
          id: row[2] instanceof Date ? row[2].getTime() : row[2],
          question: row[0],
          answer: row[1]
        }));
      }
    }

    return createJsonResponse(result);
  } catch (error) {
    return createJsonResponse({ status: "error", message: error.toString() });
  }
}

function deleteNews(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("新着情報");
  if (!sheet) return createJsonResponse({ status: "error", message: "シートが見つかりません" });

  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    const rowId = data[i][4] instanceof Date ? data[i][4].getTime() : data[i][4];
    const rowDate = data[i][0] instanceof Date ? Utilities.formatDate(data[i][0], "JST", "yyyy-MM-dd") : data[i][0];
    const rowContent = String(data[i][2]).trim();
    
    if ((params.id && rowId == params.id) || 
        (!params.id && rowContent === String(params.content).trim() && rowDate === params.date)) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ status: "success", message: "削除しました" });
    }
  }
  return createJsonResponse({ status: "error", message: "対象が見つかりませんでした" });
}

function deleteFaq(params) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("FAQ");
  if (!sheet) return createJsonResponse({ status: "error", message: "シートが見つかりません" });

  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    const rowId = data[i][2] instanceof Date ? data[i][2].getTime() : data[i][2];
    if (params.id && rowId == params.id) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ status: "success", message: "削除しました" });
    }
  }
  return createJsonResponse({ status: "error", message: "対象が見つかりませんでした" });
}

function saveImageToDrive(base64Data) {
  const folder = SAVE_FOLDER_ID ? DriveApp.getFolderById(SAVE_FOLDER_ID) : DriveApp.getRootFolder();
  const contentType = base64Data.split(";")[0].split(":")[1];
  const bytes = Utilities.base64Decode(base64Data.split(",")[1]);
  const blob = Utilities.newBlob(bytes, contentType, `murakami_work_${Date.now()}`);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return `https://drive.google.com/uc?export=view&id=${file.getId()}`;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
