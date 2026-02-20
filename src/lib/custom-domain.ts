/**
 * Server-side custom domain detection.
 *
 * On custom domains (e.g. informatikgarten.ch), the proxy prepends the
 * teacher's pageSlug to all paths. URLs built server-side must omit the
 * pageSlug prefix to avoid double-prefixing.
 */

const MAIN_DOMAINS = ['localhost', 'eduskript.org', 'www.eduskript.org']

/** Check if the given host is a custom domain (not eduskript.org or localhost). */
export function isCustomDomainServer(host: string): boolean {
  const domain = host.split(':')[0] // Strip port
  return !MAIN_DOMAINS.includes(domain)
}
