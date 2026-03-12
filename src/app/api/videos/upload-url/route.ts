import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Mux from '@mux/mux-node'

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
})

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { filename } = body

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 })
    }

    const sanitizedFilename = filename.trim()
    if (!sanitizedFilename) {
      return NextResponse.json({ error: 'filename cannot be empty' }, { status: 400 })
    }

    // Create Mux direct upload with auto-generated subtitles
    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ['public'],
        inputs: [
          {
            generated_subtitles: [
              { language_code: 'en', name: 'English (auto)' },
            ],
          },
        ],
      },
      cors_origin: request.headers.get('origin') || '*',
    })

    // Create Video record in waiting state
    const video = await prisma.video.create({
      data: {
        filename: sanitizedFilename,
        provider: 'mux',
        metadata: { status: 'waiting' },
        uploadedById: session.user.id,
        muxUploadId: upload.id,
      },
    })

    return NextResponse.json({
      uploadUrl: upload.url,
      videoId: video.id,
    })
  } catch (error) {
    console.error('Video upload URL error:', error instanceof Error ? error.message : error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create upload URL' },
      { status: 500 }
    )
  }
}
