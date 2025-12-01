// uiHandlers.js
// UI操作（ファイル選択・プレビュー）だけを担当

export function handleFileSelect(inputElement, previewElement, onFileLoaded) {
    inputElement.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // プレビュー
        const reader = new FileReader();
        reader.onload = (ev) => {
            previewElement.src = ev.target.result;
            if (onFileLoaded) onFileLoaded(file);
        };
        reader.readAsDataURL(file);
    });
}
