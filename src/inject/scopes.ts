// Which hide rule scopes are live on a page (charter section 8.4). Pure and
// browser safe: the injected script applies scoped rules with it, and the
// tests hold the bundled copy to the same answers.

import { normalizePath } from '../rules/decide';

export type PageScope = 'home' | 'explore-search' | 'post-page';

function isSingleSegment(path: string, prefixes: string[]): boolean {
  return prefixes.some((prefix) => {
    if (!path.startsWith(prefix)) return false;
    const rest = path.slice(prefix.length);
    return rest.length > 0 && !rest.slice(0, -1).includes('/');
  });
}

/** Scope tokens for the given path. Query strings, hashes and case are
 * already ignored by normalizePath. */
export function pageScopes(pathname: string): PageScope[] {
  const path = normalizePath(pathname);
  if (path === '/') return ['home'];
  if (path.startsWith('/explore/search/')) return ['explore-search'];
  if (isSingleSegment(path, ['/p/', '/reel/', '/tv/'])) return ['post-page'];
  return [];
}
