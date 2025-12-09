import { notFound } from 'next/navigation'
import { PublicSiteLayout } from '@/components/public/layout'
import { ServerMarkdownRenderer } from '@/components/markdown/markdown-renderer.server'
import { AnnotationWrapper } from '@/components/public/annotation-wrapper'
import { ExportPDF } from '@/components/public/export-pdf'
import { DevClearDataButton } from '@/components/dev/dev-clear-data-button'
import type { Metadata } from 'next'
import {
  getTeacherByUsernameDeduped,
  getPublishedPage,
  getAllPublishedCollections,
} from '@/lib/cached-queries'

interface PageProps {
  params: Promise<{
    domain: string
    collectionSlug: string
    skriptSlug: string
    pageSlug: string
  }>
}

// Enable ISR - pages are cached until explicitly invalidated via revalidateTag
export const revalidate = false // Cache indefinitely, invalidate on content update
export const dynamicParams = true // Allow new params to be generated on-demand

// Empty generateStaticParams signals Next.js this route uses ISR
// Pages are generated on first request and then cached
export async function generateStaticParams() {
  return []
}

// Generate metadata for SEO (uses cached queries)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { domain, collectionSlug, skriptSlug, pageSlug } = await params

  try {
    // Use cached teacher lookup
    const teacher = await getTeacherByUsernameDeduped(domain)
    if (!teacher) {
      return {
        title: 'Page Not Found',
        description: 'The requested page could not be found.'
      }
    }

    // Use cached content lookup (only returns published content)
    const content = await getPublishedPage(
      teacher.id,
      collectionSlug,
      skriptSlug,
      pageSlug,
      domain
    )

    if (!content) {
      return {
        title: 'Page Not Found',
        description: 'The requested page could not be found.',
        robots: 'noindex'
      }
    }

    const title = `${content.page.title} | ${teacher.name || 'Eduskript'}`
    const description = content.collection.description || `${content.page.title} by ${teacher.name}`

    return {
      title,
      description,
      authors: [{ name: teacher.name || 'Unknown' }],
      openGraph: {
        title,
        description,
        type: 'article',
        siteName: teacher.name || 'Eduskript',
        url: `https://${domain}/${collectionSlug}/${skriptSlug}/${pageSlug}`
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
    return {
      title: 'Eduskript',
      description: 'Educational content platform'
    }
  }
}

export default async function PublicPage({ params }: PageProps) {
  const { domain, collectionSlug, skriptSlug, pageSlug } = await params

  // Filter out obviously invalid domain values (browser/system requests)
  const invalidDomains = ['.well-known', '_next', 'api', 'favicon', 'robots', 'sitemap', 'apple-touch-icon', 'manifest']
  if (invalidDomains.some(invalid => domain.startsWith(invalid) || domain.includes('.'))) {
    notFound()
  }

  // Get teacher from cache
  const teacher = await getTeacherByUsernameDeduped(domain)
  if (!teacher) {
    notFound()
  }

  // Get published content from cache
  const content = await getPublishedPage(
    teacher.id,
    collectionSlug,
    skriptSlug,
    pageSlug,
    domain
  )

  // Not found or not published - 404
  // (Authors can use /preview/[domain]/... to view unpublished content)
  if (!content) {
    notFound()
  }

  const { collection, skript, page, allPages } = content

  // Build site structure for navigation (only published pages)
  const siteStructure = [{
    id: collection.id,
    title: collection.title,
    slug: collection.slug,
    skripts: [{
      id: skript.id,
      title: skript.title,
      slug: skript.slug,
      pages: allPages.map(p => ({
        id: p.id,
        title: p.title,
        slug: p.slug
      }))
    }]
  }]

  // Fetch full site structure if sidebar behavior is "full" (cached)
  let fullSiteStructure = undefined
  if (teacher.sidebarBehavior === 'full') {
    const allCollections = await getAllPublishedCollections(teacher.id, domain)

    fullSiteStructure = allCollections.map(col => ({
      id: col.id,
      title: col.title,
      slug: col.slug,
      skripts: col.collectionSkripts
        .map(cs => cs.skript)
        .filter(s => s.isPublished)
        .map(s => ({
          id: s.id,
          title: s.title,
          slug: s.slug,
          pages: s.pages
        }))
    }))
  }

  // Prepare teacher data for the layout component
  const teacherForLayout = {
    name: teacher.name || teacher.pageSlug || 'Unknown',
    pageSlug: teacher.pageSlug || domain,
    pageName: teacher.pageName || null,
    pageDescription: teacher.pageDescription || null,
    pageIcon: teacher.pageIcon || null,
    bio: teacher.bio || null,
    title: teacher.title || null
  }

  const currentPath = `/${collectionSlug}/${skriptSlug}/${pageSlug}`

  return (
    <PublicSiteLayout
      teacher={teacherForLayout}
      siteStructure={siteStructure}
      currentPath={currentPath}
      fullSiteStructure={fullSiteStructure}
      sidebarBehavior={teacher.sidebarBehavior as 'contextual' | 'full' || 'contextual'}
      typographyPreference={teacher.typographyPreference as 'modern' | 'classic' || 'modern'}
      pageId={page.id}
    >
      <div id="paper" className="paper-responsive py-24 bg-card dark:bg-slate-900/80 paper-shadow border border-border dark:border-white/10" style={{ maxWidth: 'min(1280px, calc(100vw - 48px))', marginLeft: 'auto', marginRight: 'auto' }}>
        <article className="prose-theme">
          <AnnotationWrapper pageId={page.id} content={page.content}>
            <ServerMarkdownRenderer
              content={page.content}
              skriptId={skript.id}
              pageId={page.id}
            />
          </AnnotationWrapper>
        </article>

        <div className="mt-8 pt-8 border-t border-border">
          <ExportPDF
            content={page.content}
            title={page.title}
            author={teacherForLayout.name}
          />
        </div>
      </div>

      {/* Dev-only button to clear user data for this page */}
      <DevClearDataButton pageId={page.id} />
    </PublicSiteLayout>
  )
}
