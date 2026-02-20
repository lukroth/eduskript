'use client'

import { useMemo } from 'react'

const MAIN_DOMAINS = ['localhost', 'eduskript.org', 'www.eduskript.org']

/**
 * Builds public-facing URLs, accounting for custom domains.
 *
 * On custom domains (e.g. informatikgarten.ch), the proxy already prepends the
 * teacher's pageSlug, so we must omit it from the URL path.
 * On eduskript.org, the pageSlug is needed as the first path segment.
 */
export function usePublicUrl(pageSlug: string | undefined) {
  const isCustomDomain = useMemo(() => {
    if (typeof window === 'undefined') return false
    return !MAIN_DOMAINS.includes(window.location.hostname)
  }, [])

  /** Build a public page URL: /{collection}/{skript}/{page} */
  function buildPageUrl(collectionSlug: string, skriptSlug: string, pageSlugg: string) {
    if (isCustomDomain) {
      return `/${collectionSlug}/${skriptSlug}/${pageSlugg}`
    }
    return `/${pageSlug}/${collectionSlug}/${skriptSlug}/${pageSlugg}`
  }

  /** Build a preview URL for unpublished content */
  function buildPreviewUrl(collectionSlug: string, skriptSlug: string, pageSlugg: string) {
    return `/preview/${pageSlug}/${collectionSlug}/${skriptSlug}/${pageSlugg}`
  }

  /**
   * Build the correct URL depending on publish status.
   * Published content uses public routes (custom-domain-aware).
   * Unpublished content always uses /preview/ (bypasses proxy).
   */
  function buildViewUrl(
    collectionSlug: string,
    skriptSlug: string,
    pageSlugg: string,
    isFullyPublished: boolean
  ) {
    if (isFullyPublished) {
      return buildPageUrl(collectionSlug, skriptSlug, pageSlugg)
    }
    return buildPreviewUrl(collectionSlug, skriptSlug, pageSlugg)
  }

  return { buildPageUrl, buildPreviewUrl, buildViewUrl, isCustomDomain }
}
