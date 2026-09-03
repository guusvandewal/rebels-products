import { useEffect } from 'react';

const SUFFIX = 'Rebels Products';

/**
 * Keeps `document.title` in step with the current view. Single-page
 * navigations don't change the title on their own, which leaves every
 * route sharing the one static `<title>` — WCAG 2.4.2 (Page Titled) wants
 * each view to describe its own topic. Each page passes its own label; the
 * next page overwrites it, so there's nothing to restore on unmount.
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · ${SUFFIX}` : SUFFIX;
  }, [title]);
}
