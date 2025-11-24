import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { prisma } from '@/lib/prisma'
import { PublicSiteLayout } from '@/components/public/layout'

// Force dynamic rendering since we need database access
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const dynamicParams = true // Allow new params to be generated on-demand

interface DomainIndexProps {
  params: Promise<{
    domain: string
  }>
}

// Generate metadata for SEO
export async function generateMetadata({ params }: DomainIndexProps): Promise<Metadata> {
  const { domain } = await params

  try {
    const teacher = await prisma.user.findFirst({
      where: { username: domain }
    })

    if (!teacher) {
      return {
        title: 'Teacher Not Found',
        description: 'The requested teacher could not be found.'
      }
    }

    const title = teacher.name || 'Eduskript'
    const description = teacher.bio || `Educational content by ${teacher.name}`

    return {
      title,
      description,
      authors: [{ name: teacher.name || 'Unknown' }],
      openGraph: {
        title,
        description,
        type: 'website',
        siteName: teacher.name || 'Eduskript',
        url: `https://${domain}`
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

export default async function DomainIndex({ params }: DomainIndexProps) {
  const { domain } = await params

  try {
    // Find teacher by username
    const teacher = await prisma.user.findFirst({
      where: {
        username: domain
      },
      include: {
        pageLayout: {
          include: {
            items: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    })

    if (!teacher) {
      notFound()
    }

    // If teacher has no page layout, show empty state
    const pageItems = teacher.pageLayout?.items || []
    
    // Fetch the actual content based on page layout
    const collections: Array<{
      id: string
      title: string
      slug: string
      skripts: Array<{
        id: string
        title: string
        slug: string
        pages: Array<{
          id: string
          title: string
          slug: string
        }>
      }>
    }> = []
    const rootSkripts: Array<{
      id: string
      title: string
      description: string | null
      slug: string
      collection: { title: string, slug: string }
      pages: Array<{ id: string, title: string, slug: string }>
    }> = []
    
    for (const item of pageItems) {
      if (item.type === 'collection') {
        const collection = await prisma.collection.findFirst({
          where: {
            id: item.contentId,
            isPublished: true,
            authors: {
              some: {
                userId: teacher.id
              }
            }
          },
          include: {
            collectionSkripts: {
              where: {
                skript: { isPublished: true }
              },
              include: {
                skript: {
                  include: {
                    pages: {
                      where: { isPublished: true },
                      orderBy: { order: 'asc' },
                      select: {
                        id: true,
                        title: true,
                        slug: true
                      }
                    }
                  }
                }
              },
              orderBy: { order: 'asc' }
            }
          }
        })
        if (collection) {
          // Transform junction table data to match expected interface
          const transformedCollection = {
            id: collection.id,
            title: collection.title,
            slug: collection.slug,
            skripts: collection.collectionSkripts.map(cs => ({
              id: cs.skript.id,
              title: cs.skript.title,
              slug: cs.skript.slug,
              pages: cs.skript.pages
            }))
          }
          collections.push(transformedCollection)
        }
      } else if (item.type === 'skript') {
        const skript = await prisma.skript.findFirst({
          where: {
            id: item.contentId,
            isPublished: true,
            authors: {
              some: {
                userId: teacher.id
              }
            }
          },
          include: {
            collectionSkripts: {
              include: {
                collection: true
              }
            },
            pages: {
              where: { isPublished: true },
              orderBy: { order: 'asc' },
              select: {
                id: true,
                title: true,
                slug: true
              }
            }
          }
        })
        if (skript) {
          // For backwards compatibility, create a collection reference
          // In the new schema, a skript might belong to multiple collections
          // For now, we'll use the first collection or create a default if none
          const firstCollection = skript.collectionSkripts[0]?.collection
          const transformedSkript = {
            ...skript,
            collection: firstCollection || { title: 'Uncategorized', slug: 'uncategorized' }
          }
          rootSkripts.push(transformedSkript)
        }
      }
    }

    const teacherData = {
      name: teacher.name || 'Teacher',
      username: teacher.username || '',
      bio: teacher.bio || undefined,
      title: teacher.title || undefined
    }

    return (
      <PublicSiteLayout
        teacher={teacherData}
        siteStructure={collections}
        rootSkripts={rootSkripts}
        sidebarBehavior={teacher.sidebarBehavior as 'contextual' | 'full' || 'contextual'}
        typographyPreference={teacher.typographyPreference as 'modern' | 'classic' || 'modern'}
      >
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Welcome to {teacher.name}&apos;s Educational Platform
            </h1>
            
            {teacher.bio && (
              <p className="text-lg text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
                {teacher.bio}
              </p>
            )}

            {pageItems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500 dark:text-gray-400">
                  This teacher hasn&apos;t organized their page yet.
                </p>
              </div>
            ) : (
              <div className="space-y-8 mt-12">
                {/* Render collections */}
                {collections.map((collection) => (
                  <div key={collection.id} className="bg-card border border-border rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold text-foreground mb-3">
                      {collection.title}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {collection.skripts.map((skript) => (
                        <div key={skript.id} className="bg-muted p-4 rounded-lg">
                          <h4 className="font-medium text-foreground">{skript.title}</h4>
                          <div className="text-xs text-muted-foreground mt-2">
                            {skript.pages.length} pages
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                
                {/* Render root-level skripts */}
                {rootSkripts.map((skript) => (
                  <div key={skript.id} className="bg-card border border-border rounded-lg shadow-md p-6">
                    <h2 className="text-2xl font-semibold text-foreground mb-3">
                      {skript.title}
                    </h2>
                    {skript.description && (
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        {skript.description}
                      </p>
                    )}
                    <div className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                      From collection: {skript.collection.title} • {skript.pages.length} pages
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {skript.pages.map((page) => (
                        <div key={page.id} className="bg-muted p-3 rounded-lg">
                          <h4 className="font-medium text-sm text-foreground">{page.title}</h4>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PublicSiteLayout>
    )
  } catch (error) {
    console.error('Error fetching teacher site for domain:', domain, 'Error:', error)
    notFound()
  }
}
