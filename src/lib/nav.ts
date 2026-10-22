import { Href, router } from 'expo-router';

/** Back to the previous screen, or to `fallback` when there is none (after a reload or a deep link). */
export function goBack(fallback: Href = '/') {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
