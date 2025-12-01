// imageUtils.js
// ファイル読み込み・リサイズ・変換などを担当

/**
 * File → DataURL
 * @param {File} file
 * @returns {Promise<string>} dataUrl
 */
export function loadImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * DataURL → HTMLImageElement
 * @param {string} dataUrl
 * @returns {Promise<HTMLImageElement>}
 */
export function loadImageElement(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });
}

/**
 * リサイズ＆JPEG変換
 * @param {HTMLImageElement} img
 * @param {number} maxLongSide
 * @param {number} quality
 * @returns {Promise<Blob>}
 */
export function resizeAndConvert(img, maxLongSide = 600, quality = 0.85) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ratio = Math.min(maxLongSide / img.width, maxLongSide / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
    });
}
