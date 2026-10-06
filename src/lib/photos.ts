import { Directory, File, Paths } from 'expo-file-system';

/**
 * Makes a picked/captured photo permanent. The camera and image picker write to the cache
 * folder, which the OS may clear at any time, so the product would later show a broken image.
 * Copies the file into the app's document folder and returns the new URI.
 * Remote (https) and already-saved files are returned unchanged. Web: see photos.web.ts.
 */
export async function savePhoto(uri: string | undefined): Promise<string | undefined> {
  if (!uri || !uri.startsWith('file:')) return uri;
  const dir = new Directory(Paths.document, 'photos');
  if (uri.startsWith(dir.uri)) return uri;
  try {
    if (!dir.exists) dir.create();
    const ext = uri.match(/\.(jpe?g|png|heic|webp)$/i)?.[0] ?? '.jpg';
    const dest = new File(dir, `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
    new File(uri).copy(dest);
    return dest.uri;
  } catch (e) {
    console.warn('[photos] could not save photo permanently; keeping the original', e);
    return uri;
  }
}

/** Deletes a photo previously saved by savePhoto (no-op for anything else). */
export function deletePhoto(uri: string | undefined) {
  if (!uri) return;
  const dir = new Directory(Paths.document, 'photos');
  if (!uri.startsWith(dir.uri)) return;
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch (e) {
    console.warn('[photos] could not delete photo', e);
  }
}
