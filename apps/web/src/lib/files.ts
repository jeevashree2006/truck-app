/** Read a file to a data URL. Images are downscaled + recompressed so storing a
 *  couple of document photos doesn't bloat the Mongo document. PDFs are kept as-is. */
export async function fileToDataUrl(file: File, maxDim = 1400, quality = 0.72): Promise<string> {
  const raw = await readAsDataUrl(file);
  if (!file.type.startsWith("image/")) return raw; // PDF etc.

  try {
    const img = await loadImage(raw);
    let { width, height } = img;
    if (Math.max(width, height) > maxDim) {
      const scale = maxDim / Math.max(width, height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return raw;
    ctx.drawImage(img, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    return raw;
  }
}

export function isImageUrl(url: string): boolean {
  return url.startsWith("data:image") || /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}
