// uiHandlers.js
// UI操作（ファイル選択・プレビュー・プログレスバー）だけを担当

/**
 * ファイル選択時にプレビュー表示
 * @param {HTMLInputElement} inputElement
 * @param {HTMLImageElement} previewElement
 * @param {function} onFileLoaded
 */
export function handleFileSelect(inputElement, previewElement, onFileLoaded) {
    inputElement.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            previewElement.src = ev.target.result;
            if (onFileLoaded) onFileLoaded(file);
        };
        reader.readAsDataURL(file);
    });
}

/**
 * プログレスバー更新
 * @param {HTMLDivElement} progressFill
 * @param {number} percent
 */
export function updateProgressBar(progressFill, percent) {
    progressFill.style.width = `${percent}%`;
}
