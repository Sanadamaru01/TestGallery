export function checkAccessAndShowMessage(startDateStr, endDateStr) {
  const now = new Date();
  const start = startDateStr ? new Date(startDateStr) : null;
  const end = endDateStr ? new Date(endDateStr) : null;
  
  // ★ 両方 null → 非公開にする
  if (!start && !end) {
    const msg = document.createElement('div');
    msg.className = 'message';
    msg.textContent = 'このギャラリーは現在非公開です。（公開設定がされていません）';
    document.body.appendChild(msg);
    return false;
  }
  const inPeriod =
    (!start || now >= start) &&
    (!end || now <= end);

  if (inPeriod) return true;

  const msg = document.createElement('div');
  msg.className = 'message';

  if (start && now < start) {
    msg.textContent = 'このギャラリーはまだ公開されていません。';
  } else if (end && now > end) {
    msg.textContent = 'このギャラリーの展示期間は終了しました。';
  } else {
    msg.textContent = '現在このギャラリーは非公開です。';
  }

  document.body.appendChild(msg);
  return false;
}
