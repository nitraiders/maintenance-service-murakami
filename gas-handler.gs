/**
 * メンテナンスサービス村上 問い合わせフォーム用 GAS バックエンド
 */

function doPost(e) {
  // -------------------------------------------------------------
  // 【最重要】ここに通知を受け取りたいメールアドレスを記入してください
  const TARGET_EMAIL = "murakamiyu1jp@gmail.com"; 
  // -------------------------------------------------------------

  try {
    // データの取得 (URL-encoded: URLSearchParams 形式に最適化)
    let name, email, message;
    
    if (e.parameter && e.parameter.name) {
      name = e.parameter.name;
      email = e.parameter.email;
      message = e.parameter.message;
    } else {
      const params = JSON.parse(e.postData.contents);
      name = params.name;
      email = params.email;
      message = params.message;
    }

    name = name || "不明";
    email = email || "不明";
    message = message || "内容なし";
    const timestamp = new Date();

    // 1. スプレッドシートに保存 (スプレッドシートに紐付いたスクリプトとして実行)
    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
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

    // 【SKILL.md: 信頼のレスポンス】
    return ContentService.createTextOutput(JSON.stringify({ status: "success" }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error("Error in doPost:", error.toString());
    return ContentService.createTextOutput(JSON.stringify({ status: "error", message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
