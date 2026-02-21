import { redirect } from 'next/navigation'

// Legacy redirect: /{domain}/{collectionSlug}/{skriptSlug}/{pageSlug}
// → /{domain}/{skriptSlug}/{pageSlug}
// Handles old URLs that included the collection slug prefix.

interface LegacyPageProps {
  params: Promise<{
    domain: string
    skriptSlug: string // actually the old collection slug (ignored)
    pageSlug: string // actually the skript slug
    legacyPageSlug: string // actually the page slug
  }>
}

export default async function LegacyRedirectPage({ params }: LegacyPageProps) {
  const { domain, pageSlug, legacyPageSlug } = await params
  redirect(`/${domain}/${pageSlug}/${legacyPageSlug}`)
}
