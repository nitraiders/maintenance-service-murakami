/**
 * メンテナンスサービス村上 問い合わせフォーム用 GAS バックエンド
 */

function doPost(e) {
  // -------------------------------------------------------------
  // 【最重要】ここに通知を受け取りたいメールアドレスを記入してください
  const TARGET_EMAIL = "info@m-s-murakami.com"; 
  // -------------------------------------------------------------

  try {
    let params;
    
    // データの取得 (URL-encoded または JSON 形式)
    if (e.parameter && e.parameter.name) {
      params = e.parameter;
    } else {
      params = JSON.parse(e.postData.contents);
    }

    const timestamp = new Date();
    const ss = SpreadsheetApp.getActiveSpreadsheet();

    // --- 新着情報・作業実績の投稿処理 ---
    if (params.action === 'post_news') {
      let sheet = ss.getSheetByName("新着情報");
      // シートが存在しない場合は作成
      if (!sheet) {
        sheet = ss.insertSheet("新着情報");
        sheet.appendRow(["日付", "カテゴリ", "内容", "画像URL", "登録日時"]);
      }
      
      sheet.appendRow([
        params.date,
        params.category,
        params.content,
        params.image,
        timestamp
      ]);

      return ContentService.createTextOutput(JSON.stringify({ status: "success", type: "news" }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // --- 通常の問い合わせフォーム処理 ---
    const name = params.name || "不明";
    const email = params.email || "不明";
    const message = params.message || "内容なし";

    // 1. 問い合わせシートに保存 (1枚目のシート)
    try {
      const sheet = ss.getSheets()[0];
      sheet.appendRow([timestamp, name, email, message]);
    } catch (ssError) {
      console.warn("Spreadsheet append failed:", ssError.toString());
    }

    // 2. メール通知
    const subject = "[メンテナンスサービス村上]";
    const body = `
メンテナンスサービス村上 担当者様

Webサイトより新しいお問い合わせがありました。

■送信日時: ${timestamp}
■お名前: ${name} 様
■メールアドレス: ${email}
■相談内容:
${message}

--
Maintenance Service Murakami Notification System
`;
    
    if (TARGET_EMAIL && !TARGET_EMAIL.includes("ここに")) {
        GmailApp.sendEmail(TARGET_EMAIL, subject, body);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "success", type: "inquiry" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error in doPost:", error.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
