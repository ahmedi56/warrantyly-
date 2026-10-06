const MAX_SIDE = 1280;
const QUALITY = 0.75;

/**
 * Web version of savePhoto (see photos.ts). The image picker returns `blob:` URLs, which stop working
 * when the page reloads, and camera photos are full-size `data:` URLs that quickly fill the
 * browser's ~5 MB storage. Re-encodes the image as a compact JPEG data URL (max 1280 px),
 * which survives reloads and keeps saved data small.
 */
export async function savePhoto(uri: string | undefined): Promise<string | undefined> {
  if (!uri || !/^(blob|data):/.test(uri)) return uri;
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = uri;
    });
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', QUALITY);
  } catch (e) {
    console.warn('[photos] could not re-encode photo; keeping the original', e);
    return uri;
  }
}


export function deletePhoto(_uri: string | undefined) {}
