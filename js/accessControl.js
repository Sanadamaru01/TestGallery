// -----------------------------------------------------
// accessControl.js
// Firestore の Timestamp → Date は main.js 側で変換済み前提
// Firestore から来る値は Date なので、new Date() しない
// -----------------------------------------------------

console.log("[DEBUG] accessControl loaded");

/**
 * startDate / endDate でアクセス制御を行う
 * - 両方 null → 非公開（警告表示）
 * - now が期間内 → true
 * - 期間外 → false（理由のメッセージを表示）
 */
export function checkAccessAndShowMessage(startDate, endDate) {
  const now = new Date();
  console.log("[DEBUG] checkAccess inputs:", { startDate, endDate, now });

  // --- Firestore Timestamp → Date 変換済みで渡される想定 ---
  // Date でなければ null 扱い
  const start = startDate instanceof Date ? startDate : null;
  const end = endDate instanceof Date ? endDate : null;

  console.log("[DEBUG] normalized start/end:", {
    start,
    end,
    startValid: start instanceof Date,
    endValid: end instanceof Date
  });

  // ★ 両方 null → 非公開
  if (!start && !end) {
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = 'このギャラリーは現在非公開です。（公開設定がされていません）';
    document.body.appendChild(msg);
    console.log("[DEBUG] result = false (both null)");
    return false;
  }

  const inPeriod =
    (!start || now >= start) &&
    (!end || now <= end);

  console.log("[DEBUG] inPeriod =", inPeriod);

  // 公開
  if (inPeriod) {
    console.log("[DEBUG] result = true (inPeriod)");
    return true;
  }

  // 非公開メッセージ生成
  const msg = document.createElement('div');
  msg.className = 'message';

  if (start && now < start) {
    msg.textContent = 'このギャラリーはまだ公開されていません。';
    console.log("[DEBUG] reason: before start");
  } else if (end && now > end) {
    msg.textContent = 'このギャラリーの展示期間は終了しました。';
    console.log("[DEBUG] reason: after end");
  } else {
    msg.textContent = '現在このギャラリーは非公開です。';
    console.log("[DEBUG] reason: other");
  }

  document.body.appendChild(msg);
  return false;
}
