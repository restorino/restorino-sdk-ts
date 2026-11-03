/**
 * Storefront scope guard.
 *
 * This SDK is published for **public storefronts and the customer account
 * area only**. It must never reach backoffice, POS, staff, driver, support or
 * administrative endpoints — not even through the generic
 * `client.http.request()` escape hatch.
 *
 * The allowlist is intentionally written as prefixes, so adding a new public
 * storefront endpoint requires no SDK change, while any new privileged
 * `/api/...` surface is denied by default (fail closed).
 */

/** Prefixes owned by the storefront / customer space. */
const ALLOWED_PREFIXES: readonly string[] = [
  '/api/public/',
  '/api/auth/customers/',
  '/api/customers/',
  '/api/notifications/customers/'
];

/** Exact paths that do not fit a prefix above. */
const ALLOWED_EXACT: ReadonlySet<string> = new Set([
  '/api/auth/refresh',
  '/api/vitrine/resolve-domain'
]);

/** Public vitrine reads: `/api/vitrine/{tenant}/public` and `/schema.json`. */
const ALLOWED_VITRINE_READ = /^\/api\/vitrine\/[^/]+\/(public|schema\.json)$/;

/**
 * Collapses `.` / `..` segments, duplicate slashes, backslashes and any
 * query/fragment. Used before matching so `/api/public/../admin/x`
 * cannot slip past a prefix test.
 */
export function normalizeEndpointPath(endpoint: string): string {
  const withoutQuery = String(endpoint ?? '')
    .split('?')[0]
    .split('#')[0]
    .replace(/\\/g, '/')
    .replace(/[\r\n\x00-\x1F\x7F\u2028\u2029]/g, '');

  const segments: string[] = [];
  for (const segment of withoutQuery.split('/')) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      segments.pop();
      continue;
    }
    segments.push(segment);
  }

  return `/${segments.join('/')}`;
}

/**
 * True when `endpoint` belongs to the storefront / customer surface.
 */
export function isStorefrontEndpoint(endpoint: string): boolean {
  const rawPath = String(endpoint ?? '')
    .split('?')[0]
    .split('#')[0];

  // Un séparateur encodé (`%2F`, `%5C`) ou un point encodé (`%2E`) peut être
  // décodé par un proxy intermédiaire et reconstruire un `/../` : refusé par
  // principe, aucun chemin storefront légitime n'en contient.
  if (/%2f|%5c|%00|%2e/i.test(rawPath)) return false;

  const path = normalizeEndpointPath(endpoint);

  if (ALLOWED_EXACT.has(path)) return true;
  if (ALLOWED_VITRINE_READ.test(path)) return true;

  return ALLOWED_PREFIXES.some(
    (prefix) => path === prefix.slice(0, -1) || path.startsWith(prefix)
  );
}
