import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { Album, Asset, AssetField, MediaType, Query, requestPermissionsAsync } from 'expo-media-library';
import { Platform } from 'react-native';

/* Screenshots for saved resources: shown from the gallery, shrunk before upload, and deleted once read. */

export type Shot = { id: string; uri: string; at: number };

/** The newest screenshots (Screenshots album when there is one), for picking right after sharing a reel. */
export async function recentScreenshots(limit = 18): Promise<Shot[] | 'denied'> {
  if (Platform.OS === 'web') return [];
  const { granted } = await requestPermissionsAsync(false, ['photo']);
  if (!granted) return 'denied';
  const album = await Album.get('Screenshots').catch(() => null);
  let q = new Query().eq(AssetField.MEDIA_TYPE, MediaType.IMAGE).orderBy({ key: AssetField.CREATION_TIME, ascending: false }).limit(limit);
  if (album) q = q.album(album);
  const assets = await q.exe();
  return Promise.all(assets.map(async (a) => ({ id: a.id, uri: await a.getUri(), at: (await a.getCreationTime()) ?? 0 })));
}

/** A JPEG data URL about 1080 px wide: small enough to send quickly, sharp enough to read. */
export async function shrink(uri: string): Promise<string> {
  const ref = await ImageManipulator.manipulate(uri).resize({ width: 1080 }).renderAsync();
  const out = await ref.saveAsync({ base64: true, compress: 0.7, format: SaveFormat.JPEG });
  if (!out.base64) throw new Error('That screenshot couldn’t be read');
  return `data:image/jpeg;base64,${out.base64}`;
}

/**
 * Deletes screenshots from the gallery. Android asks the user to confirm in its own dialog.
 * Returns false when they decline, or when an item isn't a gallery photo (e.g. shared from Google Photos' cloud).
 */
export async function deleteScreenshots(ids: string[]): Promise<boolean> {
  if (!ids.length || Platform.OS === 'web') return true;
  try { await Asset.delete(ids.map((id) => new Asset(id))); return true; } catch { return false; }
}

/** The first web link in shared text ("Check this out https://www.instagram.com/reel/…?igsh=…"). Tracking params are dropped. */
export function firstLink(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>"]+/i);
  if (!m) return null;
  try {
    const u = new URL(m[0]);
    ['igsh', 'igshid', 'utm_source', 'utm_medium', 'utm_campaign', 'si'].forEach((k) => u.searchParams.delete(k));
    return u.toString();
  } catch { return m[0]; }
}
