// ファイル選択 → プレビュー表示
export function handleFileSelect(inputElement, previewElement, onFileLoaded) {
    inputElement.addEventListener("change", e => {
        const files = Array.from(e.target.files || []);
        previewElement.innerHTML = "";
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = ev => {
                const img = document.createElement("img");
                img.src = ev.target.result;
                img.style.width = "120px";
                img.style.objectFit = "cover";
                previewElement.appendChild(img);
                if (onFileLoaded) onFileLoaded(file);
            };
            reader.readAsDataURL(file);
        });
    });
}
