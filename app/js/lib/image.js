// 画像を保存する前に、ブラウザの中で縮小して JPEG にする（長辺 1,600px・1枚おおむね 1MB 以下）

const MAX_SIDE = 1600;
const TARGET_BYTES = 1024 * 1024;
export const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

async function decode(file) {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // 下の方法で試す
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function toBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("画像を変換できませんでした。"))), "image/jpeg", quality);
  });
}

/** 画像ファイルを縮小した JPEG の Blob にする */
export async function resizeToJpeg(file) {
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error(`「${file.name}」は 10MB を超えています。`);
  }
  let source;
  try {
    source = await decode(file);
  } catch {
    throw new Error(`「${file.name}」を読み込めませんでした。jpg または png の画像を選んでください。`);
  }
  const width = source.width;
  const height = source.height;
  const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; // 透過 PNG の背景を白にする
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  if (typeof source.close === "function") source.close();

  let quality = 0.85;
  let blob = await toBlob(canvas, quality);
  while (blob.size > TARGET_BYTES && quality > 0.5) {
    quality -= 0.1;
    blob = await toBlob(canvas, quality);
  }
  return blob;
}
