// imageUtils.js
export async function loadImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = e => resolve(e.target.result);
        reader.onerror = e => reject(e);
        reader.readAsDataURL(file);
    });
}

export async function loadImageElement(dataUrl) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = e => reject(e);
        img.src = dataUrl;
    });
}

export async function resizeAndConvert(img, maxLongSide = 1600, quality = 0.9) {
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

    // pica を CDN から利用
    const picaInstance = window.pica();
    await picaInstance.resize(sourceCanvas, targetCanvas);

    return new Promise(resolve => targetCanvas.toBlob(resolve, "image/webp", quality));
}
