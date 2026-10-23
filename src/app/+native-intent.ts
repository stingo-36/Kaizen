/* Shares from other apps (a reel link from Instagram, screenshots from the gallery) open the save screen. */
export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    if (new URL(path).hostname === 'expo-sharing') return '/share';
  } catch { /* not a full URL: a normal in-app path */ }
  return path;
}
