import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { PublicSiteLayout } from '@/components/public/layout'
import { MarkdownRenderer } from '@/components/public/markdown-renderer'

interface PageProps {
  params: Promise<{
    domain: string
    scriptSlug: string
    chapterSlug: string
    pageSlug: string
  }>
}

// Enable ISR
export const dynamic = 'force-dynamic'
export const revalidate = 60

export default async function PublicPage({ params }: PageProps) {
  const { domain, scriptSlug, chapterSlug, pageSlug } = await params

  try {
    // Find teacher by subdomain or custom domain
    const teacher = await prisma.user.findFirst({
      where: {
        OR: [
          { subdomain: domain },
          { customDomains: { some: { domain, isActive: true } } }
        ]
      },
      include: {
        scripts: {
          where: { isPublished: true },
          include: {
            chapters: {
              where: { isPublished: true },
              include: {
                pages: {
                  where: { isPublished: true },
                  orderBy: { order: 'asc' }
                }
              },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!teacher) {
      notFound()
    }

    // Find the specific page
    const script = teacher.scripts.find((s: any) => s.slug === scriptSlug)
    if (!script) {
      notFound()
    }

    const chapter = script.chapters.find((c: any) => c.slug === chapterSlug)
    if (!chapter) {
      notFound()
    }

    const page = chapter.pages.find((p: any) => p.slug === pageSlug)
    if (!page) {
      notFound()
    }

    const pageData = {
      id: page.id,
      title: page.title,
      content: page.content,
      slug: page.slug,
      updatedAt: page.updatedAt.toISOString()
    }

    const chapterData = {
      title: chapter.title,
      slug: chapter.slug
    }

    const scriptData = {
      title: script.title,
      slug: script.slug
    }

    const teacherData = {
      name: teacher.name || 'Teacher',
      subdomain: teacher.subdomain || '',
      bio: teacher.bio,
      title: teacher.title
    }

    return (
      <PublicSiteLayout 
        teacher={teacherData} 
        siteStructure={teacher.scripts} 
        currentPath={`/${script.slug}/${chapter.slug}/${page.slug}`}
      >
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <div className="text-sm text-gray-500 mb-2">
              {scriptData.title} → {chapterData.title}
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              {pageData.title}
            </h1>
          </div>
          
          <div className="prose prose-lg max-w-none dark:prose-invert">
            <MarkdownRenderer content={pageData.content} />
          </div>
        </div>
      </PublicSiteLayout>
    )
  } catch (error) {
    console.error('Error fetching page:', error)
    notFound()
  }
}
