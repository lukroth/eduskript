import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { ChapterRedirect } from '@/components/ChapterRedirect'

// Enable ISR with on-demand regeneration for previews
export const revalidate = 0 // No caching for previews to show latest changes
export const dynamic = 'force-dynamic' // Force dynamic rendering for auth checks

interface ChapterPreviewProps {
  params: Promise<{
    domain: string
    scriptSlug: string
    chapterSlug: string
  }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: ChapterPreviewProps): Promise<Metadata> {
  const { domain, scriptSlug, chapterSlug } = await params
  
  try {
    // Find the teacher and topic
    const teacher = await prisma.user.findUnique({
      where: { subdomain: domain },
      select: { id: true, name: true, title: true }
    })

    if (!teacher) {
      return {
        title: 'Teacher Not Found',
        description: 'The requested teacher profile could not be found.'
      }
    }

    const topic = await prisma.topic.findFirst({
      where: {
        slug: scriptSlug,
        authors: {
          some: {
            userId: teacher.id
          }
        }
      },
      select: { title: true, description: true }
    })

    if (!topic) {
      return {
        title: 'Topic Not Found',
        description: 'The requested topic could not be found.'
      }
    }

    const chapter = await prisma.chapter.findFirst({
      where: {
        slug: chapterSlug,
        topic: {
          slug: scriptSlug,
          authors: {
            some: {
              userId: teacher.id
            }
          }
        }
      },
      select: { title: true }
    })

    if (!chapter) {
      return {
        title: 'Chapter Not Found',
        description: 'The requested chapter could not be found.'
      }
    }

    return {
      title: `${chapter.title} - ${topic.title} | ${teacher.name || domain}`,
      description: `${chapter.title} from ${topic.title} by ${teacher.name || domain}`,
      robots: 'noindex, nofollow' // Prevent search engines from indexing previews
    }
  } catch (error) {
    console.error('Error generating metadata for chapter preview:', error)
    return {
      title: 'Chapter Preview',
      description: 'Preview mode for chapter content'
    }
  }
}

interface TopicPage {
  id: string
  title: string
  slug: string
  order: number
  isPublished: boolean
}





export default async function ChapterPreviewPage({ params }: ChapterPreviewProps) {
  const { domain, scriptSlug, chapterSlug } = await params
  const session = await getServerSession(authOptions)

  try {
    // Find the teacher
    const teacher = await prisma.user.findUnique({
      where: { subdomain: domain },
      select: { 
        id: true, 
        name: true, 
        email: true,
        title: true, 
        bio: true, 
        subdomain: true 
      }
    })

    if (!teacher) {
      notFound()
    }

    // Check if current user is the author
    const isAuthor = session?.user?.email === teacher.email

    // Find the topic with the specific chapter
    const topic = await prisma.topic.findFirst({
      where: {
        slug: scriptSlug,
        authors: {
          some: {
            userId: teacher.id
          }
        }
      },
      include: {
        chapters: {
          where: {
            slug: chapterSlug
          },
          include: {
            pages: {
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                slug: true,
                order: true,
                isPublished: true
              }
            }
          }
        }
      }
    })

    if (!topic) {
      notFound()
    }

    // Authorization check: Only the author can preview unpublished topics
    if (!topic.isPublished && !isAuthor) {
      notFound()
    }

    const chapter = topic.chapters[0]
    if (!chapter) {
      notFound()
    }

    // Authorization check for chapter
    if (!chapter.isPublished && !isAuthor) {
      notFound()
    }

    // Find the first available page to redirect to
    const firstPage = chapter.pages.find((page: TopicPage) => 
      isAuthor || page.isPublished
    )

    if (firstPage) {
      // Redirect to the first available page
      return <ChapterRedirect redirectUrl={`/${domain}/${scriptSlug}/${chapterSlug}/${firstPage.slug}`} />
    }

    // If no pages are available, redirect back to topic
    return <ChapterRedirect redirectUrl={`/${domain}/${scriptSlug}`} />

  } catch (error) {
    console.error('Error loading chapter preview:', error)
    notFound()
  }
} 