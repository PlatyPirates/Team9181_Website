// Builds the Google Apps Script a Lead pastes into their form's response Sheet.
// It forwards each new response to /api/recruiting/intake.

export function buildAppsScript({ endpoint, secret, kind }: { endpoint: string; secret: string; kind: string }) {
  return `/** @OnlyCurrentDoc */
// Platy Pirates: send Google Form responses to the portal's Recruiting app.
// Paste this into the response Sheet: Extensions > Apps Script.
// Then pick "setup" in the function menu above and press Run (approve the prompts once).
// @OnlyCurrentDoc (first line) limits its access to this one Sheet.

const ENDPOINT = ${JSON.stringify(endpoint)};
const SECRET = ${JSON.stringify(secret)};
const KIND = ${JSON.stringify(kind)}; // "student", "mentor", "sponsor", or "auto" (one form for everyone)

// Run once. Turns on "send every new response to the portal".
function setup() {
  ScriptApp.getProjectTriggers()
    .filter(function (t) { return t.getHandlerFunction() === "onFormSubmit"; })
    .forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger("onFormSubmit").forSpreadsheet(SpreadsheetApp.getActive()).onFormSubmit().create();
  Logger.log("All set. New responses will now show up in the Recruiting app.");
}

// Runs automatically on every new response.
function onFormSubmit(e) {
  var answers = {};
  Object.keys(e.namedValues).forEach(function (q) {
    if (q === "Timestamp") return;
    answers[q] = e.namedValues[q].join(", ");
  });
  var stamp = (e.namedValues["Timestamp"] || [""])[0];
  send_(answers, responseId_(stamp, answers), new Date().toISOString(), true);
}

// Optional: run once to copy responses that came in before setup.
// These are imported quietly (no emails or phone alerts). Safe to run twice.
function importExistingResponses() {
  var sheet = e_responseSheet_();
  var display = sheet.getDataRange().getDisplayValues();
  var raw = sheet.getDataRange().getValues();
  var headers = display[0];
  for (var i = 1; i < display.length; i++) {
    var answers = {};
    var stamp = "";
    var when = null;
    headers.forEach(function (h, j) {
      if (!h) return;
      if (h === "Timestamp") { stamp = display[i][j]; when = raw[i][j]; return; }
      answers[h] = display[i][j];
    });
    if (!stamp) continue;
    send_(answers, responseId_(stamp, answers), when instanceof Date ? when.toISOString() : null, false);
  }
  Logger.log("Imported " + (display.length - 1) + " rows.");
}

function e_responseSheet_() {
  var sheets = SpreadsheetApp.getActive().getSheets();
  for (var i = 0; i < sheets.length; i++) if (sheets[i].getFormUrl()) return sheets[i];
  return sheets[0];
}

function responseId_(stamp, answers) {
  var email = "";
  Object.keys(answers).forEach(function (q) { if (!email && /e-?mail/i.test(q)) email = String(answers[q]).toLowerCase(); });
  return SpreadsheetApp.getActive().getId() + ":" + stamp + ":" + email;
}

function send_(answers, responseId, submittedAt, notify) {
  var res = UrlFetchApp.fetch(ENDPOINT, {
    method: "post",
    contentType: "application/json",
    muteHttpExceptions: true,
    payload: JSON.stringify({
      secret: SECRET, kind: KIND, responseId: responseId,
      submittedAt: submittedAt, notify: notify, answers: answers,
    }),
  });
  if (res.getResponseCode() !== 200) Logger.log("Portal said " + res.getResponseCode() + ": " + res.getContentText());
}
`;
}
