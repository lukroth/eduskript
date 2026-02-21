'use client'

import { useMemo } from 'react'
import { isCustomDomainServer } from '@/lib/custom-domain'

/**
 * Builds public-facing URLs, accounting for custom domains.
 *
 * On custom domains (e.g. informatikgarten.ch), the proxy already prepends the
 * teacher's pageSlug, so we must omit it from the URL path.
 * On eduskript.org, the pageSlug is needed as the first path segment.
 *
 * Collection slug is no longer part of public URLs since skript slugs are globally unique.
 */
export function usePublicUrl(pageSlug: string | undefined) {
  const isCustomDomain = useMemo(() => {
    if (typeof window === 'undefined') return false
    return isCustomDomainServer(window.location.hostname)
  }, [])

  /** Build a public page URL: /{skript}/{page} */
  function buildPageUrl(skriptSlug: string, pageSlugg: string) {
    if (isCustomDomain) {
      return `/${skriptSlug}/${pageSlugg}`
    }
    return `/${pageSlug}/${skriptSlug}/${pageSlugg}`
  }

  /** Build a preview URL for unpublished content */
  function buildPreviewUrl(skriptSlug: string, pageSlugg: string) {
    return `/preview/${pageSlug}/${skriptSlug}/${pageSlugg}`
  }

  /**
   * Build the correct URL depending on publish status.
   * Published content uses public routes (custom-domain-aware).
   * Unpublished content always uses /preview/ (bypasses proxy).
   */
  function buildViewUrl(
    skriptSlug: string,
    pageSlugg: string,
    isFullyPublished: boolean
  ) {
    if (isFullyPublished) {
      return buildPageUrl(skriptSlug, pageSlugg)
    }
    return buildPreviewUrl(skriptSlug, pageSlugg)
  }

  return { buildPageUrl, buildPreviewUrl, buildViewUrl, isCustomDomain }
}
