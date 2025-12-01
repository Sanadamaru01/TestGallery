// File → DataURL
export function loadImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

// DataURL → HTMLImageElement
export function loadImageElement(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });
}

// リサイズ＆JPEG変換（長辺600px）
export async function resizeAndConvert(img, maxLongSide = 600, quality = 0.85) {
    const long = Math.max(img.width, img.height);
    const scale = long > maxLongSide ? maxLongSide / long : 1;
    const width = Math.round(img.width * scale);
    const height = Math.round(img.height * scale);

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = img.width;
    sourceCanvas.height = img.height;
    sourceCanvas.getContext("2d").drawImage(img, 0, 0);

    const targetCanvas = document.createElement("canvas");
    targetCanvas.width = width;
    targetCanvas.height = height;
    targetCanvas.getContext("2d").drawImage(sourceCanvas, 0, 0, width, height);

    return new Promise(resolve => targetCanvas.toBlob(resolve, "image/jpeg", quality));
}
