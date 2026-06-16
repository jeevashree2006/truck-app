/**
 * Gmail OTP relay for Fleet Owner / Lorry Kanakku.
 *
 * This runs on Google's servers and sends email from THIS Google account's Gmail
 * over HTTPS — so it works even on hosts (like Render) that block outbound SMTP.
 *
 * Setup (see deploy/apps-script/README.md):
 *   1) script.google.com -> New project -> paste this code.
 *   2) Replace SHARED_SECRET below with the secret your server uses (GAS_SHARED_SECRET).
 *   3) Deploy -> New deployment -> Web app -> Execute as: Me, Who has access: Anyone.
 *   4) Authorize, then copy the Web app URL (ends in /exec) into GAS_WEBHOOK_URL.
 */
var SHARED_SECRET = "REPLACE_WITH_YOUR_SECRET";

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    if (!SHARED_SECRET || data.secret !== SHARED_SECRET) {
      return ContentService.createTextOutput("FORBIDDEN");
    }
    MailApp.sendEmail({
      to: data.to,
      subject: data.subject,
      htmlBody: data.html,
      body: data.text || data.html,
      name: data.fromName || "Fleet Owner"
    });
    return ContentService.createTextOutput("OK");
  } catch (err) {
    return ContentService.createTextOutput("ERROR: " + err);
  }
}
