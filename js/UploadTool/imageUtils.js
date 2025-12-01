// imageUtils.js
// 画像読み込み・リサイズ・JPEG変換・orientation修正など

export async function loadImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

export async function loadImageElement(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = dataUrl;
    });
}

// EXIFのorientation対応（簡易版：iOS対策）
export function fixOrientation(ctx, img, width, height, orientation = 1) {
    switch (orientation) {
        case 6: // 90deg
            ctx.rotate(90 * Math.PI / 180);
            ctx.translate(0, -height);
            break;
        case 8: // -90deg
            ctx.rotate(-90 * Math.PI / 180);
            ctx.translate(-width, 0);
            break;
        case 3: // 180deg
            ctx.rotate(Math.PI);
            ctx.translate(-width, -height);
            break;
        default:
            break;
    }
}

export async function resizeAndConvert(img, maxLongSide = 2000, quality = 0.85) {
    const longSide = Math.max(img.width, img.height);
    const scale = maxLongSide / longSide;

    const newWidth = Math.round(img.width * scale);
    const newHeight = Math.round(img.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = newWidth;
    canvas.height = newHeight;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, newWidth, newHeight);

    const blob = await new Promise((resolve) => {
        canvas.toBlob(
            (blob) => resolve(blob),
            "image/jpeg",
            quality
        );
    });

    return blob;
}
