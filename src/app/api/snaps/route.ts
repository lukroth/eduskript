/**
 * API endpoint for snap image uploads
 *
 * POST: Upload snap image to Scaleway bucket, return URL
 *       Falls back to returning data URL directly if S3 not configured (dev mode)
 * DELETE: Remove snap image from bucket
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadSnapImage, deleteSnapImage, isS3Configured } from '@/lib/s3'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { pageId, snapId, imageData } = body

    if (!pageId || !snapId || !imageData) {
      return NextResponse.json(
        { error: 'Missing required fields: pageId, snapId, imageData' },
        { status: 400 }
      )
    }

    // Validate image data format
    if (!imageData.startsWith('data:image/')) {
      return NextResponse.json(
        { error: 'Invalid image data format' },
        { status: 400 }
      )
    }

    // Check image size (limit to 2MB)
    const base64Length = imageData.length - imageData.indexOf(',') - 1
    const sizeInBytes = (base64Length * 3) / 4
    const maxSize = 2 * 1024 * 1024 // 2MB

    if (sizeInBytes > maxSize) {
      return NextResponse.json(
        { error: 'Image too large. Maximum size is 2MB.' },
        { status: 400 }
      )
    }

    // If S3 is not configured, return the data URL directly (dev mode fallback)
    // This stores the image inline in the database - fine for dev, not for production
    if (!isS3Configured()) {
      console.warn('S3 not configured - storing snap as data URL (dev mode)')
      return NextResponse.json({ imageUrl: imageData })
    }

    // Upload to S3
    const imageUrl = await uploadSnapImage(
      session.user.id,
      pageId,
      snapId,
      imageData
    )

    return NextResponse.json({ imageUrl })
  } catch (error) {
    console.error('Error uploading snap:', error)
    return NextResponse.json(
      { error: 'Failed to upload snap image' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get('imageUrl')

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Missing imageUrl parameter' },
        { status: 400 }
      )
    }

    // If it's a data URL, nothing to delete from S3
    if (imageUrl.startsWith('data:')) {
      return NextResponse.json({ success: true })
    }

    // Check S3 configuration for actual S3 URLs
    if (!isS3Configured()) {
      return NextResponse.json(
        { error: 'Object storage not configured' },
        { status: 503 }
      )
    }

    // Verify the URL belongs to this user (security check)
    if (!imageUrl.includes(`/snaps/${session.user.id}/`)) {
      return NextResponse.json(
        { error: 'Unauthorized to delete this image' },
        { status: 403 }
      )
    }

    await deleteSnapImage(imageUrl)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting snap:', error)
    return NextResponse.json(
      { error: 'Failed to delete snap image' },
      { status: 500 }
    )
  }
}
