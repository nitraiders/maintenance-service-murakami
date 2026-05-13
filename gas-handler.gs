/**
 * 🛠️ メンテナンスサービス村上 - 統合同期エンジン
 * 新着情報、作業実績、FAQをスプレッドシートで管理します。
 */

const SPREADSHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const ADMIN_PASSWORD = "msm2724";

// ──────────────────────────────────────────────────────────────
// 🛠️ API ハンドラ (doGet / doPost)
// ──────────────────────────────────────────────────────────────

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // 1. ニュース取得
  const newsSheet = ss.getSheetByName("news") || createNewsSheet(ss);
  const newsData = newsSheet.getDataRange().getValues();
  const news = [];
  for (let i = 1; i < newsData.length; i++) {
    if (!newsData[i][2]) continue; // 内容がない場合はスキップ
    news.push({
      id: i, // 行番号をID代わりにする（簡易版）
      date: newsData[i][0] instanceof Date ? Utilities.formatDate(newsData[i][0], "Asia/Tokyo", "yyyy-MM-dd") : newsData[i][0],
      category: newsData[i][1],
      content: newsData[i][2],
      image: newsData[i][3]
    });
  }
  
  // 2. FAQ取得
  const faqSheet = ss.getSheetByName("faq") || createFaqSheet(ss);
  const faqData = faqSheet.getDataRange().getValues();
  const faq = [];
  for (let i = 1; i < faqData.length; i++) {
    if (!faqData[i][0]) continue;
    faq.push({
      id: i,
      question: faqData[i][0],
      answer: faqData[i][1],
      date: faqData[i][2]
    });
  }

  const payload = {
    news: news.reverse(), // 新しい順
    faq: faq
  };

  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  let params;
  try {
    params = JSON.parse(e.postData.contents);
  } catch (err) {
    // フォーム形式（URLSearchParams）の場合
    params = e.parameter;
  }

  if (params.password !== ADMIN_PASSWORD && params.action !== undefined) {
    return createJsonResponse({ status: "error", message: "認証失敗" });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // アクション分岐
  switch (params.action) {
    case 'post_news':
      return handlePostNews(ss, params);
    case 'delete_news':
      return handleDeleteNews(ss, params);
    case 'post_faq':
      return handlePostFaq(ss, params);
    case 'delete_faq':
      return handleDeleteFaq(ss, params);
    default:
      // お問い合わせフォームなどのPOST（mode: 'no-cors'）
      return handleContactForm(ss, params);
  }
}

// ──────────────────────────────────────────────────────────────
// 📝 各種処理ロジック
// ──────────────────────────────────────────────────────────────

function handlePostNews(ss, params) {
  const sheet = ss.getSheetByName("news") || createNewsSheet(ss);
  let imageUrl = "";
  
  // 画像がある場合はGoogleドライブに保存
  if (params.image && params.image.startsWith("data:image")) {
    imageUrl = saveImageToDrive(params.image, `news_${Date.now()}.jpg`);
  }
  
  sheet.appendRow([params.date || new Date(), params.category || "お知らせ", params.content, imageUrl, new Date()]);
  return createJsonResponse({ status: "success", message: "投稿完了" });
}

function handleDeleteNews(ss, params) {
  const sheet = ss.getSheetByName("news");
  if (!sheet) return createJsonResponse({ status: "error", message: "シートが見つかりません" });
  
  const data = sheet.getDataRange().getValues();
  // 内容と日付で一致する行を探す（簡易的な削除ロジック）
  for (let i = data.length - 1; i >= 1; i--) {
    const rowDate = data[i][0] instanceof Date ? Utilities.formatDate(data[i][0], "Asia/Tokyo", "yyyy-MM-dd") : data[i][0];
    if (data[i][2] === params.content && rowDate === params.date) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ status: "success", message: "削除完了" });
    }
  }
  return createJsonResponse({ status: "error", message: "対象が見つかりません" });
}

function handlePostFaq(ss, params) {
  const sheet = ss.getSheetByName("faq") || createFaqSheet(ss);
  sheet.appendRow([params.question, params.answer, new Date()]);
  return createJsonResponse({ status: "success", message: "FAQ追加完了" });
}

function handleDeleteFaq(ss, params) {
  const sheet = ss.getSheetByName("faq");
  if (!sheet) return createJsonResponse({ status: "error", message: "シートが見つかりません" });
  
  const data = sheet.getDataRange().getValues();
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][0] === params.question) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ status: "success", message: "削除完了" });
    }
  }
  return createJsonResponse({ status: "error", message: "対象が見つかりません" });
}

function handleContactForm(ss, params) {
  const sheet = ss.getSheetByName("contact") || ss.insertSheet("contact");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["日時", "お名前", "メールアドレス", "内容"]);
  }
  sheet.appendRow([new Date(), params.name, params.email, params.message]);
  
  // 管理者にメール通知（オプション）
  // MailApp.sendEmail("your-email@example.com", "【村上サイト】お問い合わせ届きました", `名前: ${params.name}\nメール: ${params.email}\n内容: ${params.message}`);
  
  return createJsonResponse({ status: "success", message: "送信完了" });
}

// ──────────────────────────────────────────────────────────────
// 🛠️ ユーティリティ
// ──────────────────────────────────────────────────────────────

function saveImageToDrive(base64Data, filename) {
  try {
    const splitData = base64Data.split(",");
    const contentType = splitData[0].match(/:(.*?);/)[1];
    const byteCharacters = Utilities.base64Decode(splitData[1]);
    const blob = Utilities.newBlob(byteCharacters, contentType, filename);
    
    // 「murakami_images」フォルダを探すか作成
    let folder;
    const folders = DriveApp.getFoldersByName("murakami_images");
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder("murakami_images");
    }
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return `https://drive.google.com/uc?export=view&id=${file.getId()}`;
  } catch (e) {
    return "";
  }
}

function createNewsSheet(ss) {
  const sheet = ss.insertSheet("news");
  sheet.appendRow(["日付", "カテゴリ", "内容", "画像URL", "登録日時"]);
  return sheet;
}

function createFaqSheet(ss) {
  const sheet = ss.insertSheet("faq");
  sheet.appendRow(["質問", "回答", "登録日時"]);
  return sheet;
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
