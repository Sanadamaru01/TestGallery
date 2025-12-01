// uiHandlers.js

export function setupFileInput(fileInput, previewElement, onFileSelected) {
    fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            previewElement.src = ev.target.result;
            if (onFileSelected) onFileSelected(file);
        };
        reader.readAsDataURL(file);
    });
}

export function createProgressBar(container) {
    const bar = document.createElement("div");
    bar.className = "progress-bar";
    const fill = document.createElement("div");
    fill.className = "progress-fill";
    bar.appendChild(fill);
    container.appendChild(bar);
    return fill;
}

export function createImageRow(imageData, onDelete, onUpdate) {
    const row = document.createElement("div");
    row.className = "file-row";

    const img = document.createElement("img");
    img.src = imageData.file;
    row.appendChild(img);

    const meta = document.createElement("div");
    meta.className = "file-meta";

    const titleInput = document.createElement("input");
    titleInput.value = imageData.title;
    meta.appendChild(titleInput);

    const captionInput = document.createElement("input");
    captionInput.value = imageData.caption;
    meta.appendChild(captionInput);

    const authorInput = document.createElement("input");
    authorInput.value = imageData.author;
    meta.appendChild(authorInput);

    const btnDelete = document.createElement("button");
    btnDelete.textContent = "削除";
    btnDelete.onclick = () => onDelete(imageData.id);
    meta.appendChild(btnDelete);

    const btnUpdate = document.createElement("button");
    btnUpdate.textContent = "更新";
    btnUpdate.onclick = () => onUpdate(imageData.id, {
        title: titleInput.value,
        caption: captionInput.value,
        author: authorInput.value
    });
    meta.appendChild(btnUpdate);

    row.appendChild(meta);

    return row;
}
