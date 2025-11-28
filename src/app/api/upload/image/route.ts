import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { uploadTeacherFile, getTeacherFileUrl, isTeacherS3Configured } from '@/lib/s3'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isTeacherS3Configured()) {
      return NextResponse.json({ error: 'File storage not configured' }, { status: 500 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'page-icon', 'profile-image', etc.

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 })
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Image must be less than 2MB' }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate content hash for deduplication
    const hash = crypto.createHash('sha256').update(buffer).digest('hex')
    const ext = file.name.split('.').pop() || 'png'

    // Upload to teacher bucket using existing utility
    // Key format: files/{hash}.{ext} (content-addressed)
    const key = await uploadTeacherFile(hash, ext, buffer, file.type)

    // Get public URL
    const url = getTeacherFileUrl(key)

    return NextResponse.json({ url })
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json(
      { error: 'Failed to upload image' },
      { status: 500 }
    )
  }
}
