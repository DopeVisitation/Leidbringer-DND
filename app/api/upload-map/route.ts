import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

// Handles battle map image uploads from the GM
// Saves to public/tokens/maps/ so they're served as static files
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!ext || !['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Sanitize filename
    const safeName = file.name.replace(/[^a-zA-Z0-9._\-\s]/g, '').replace(/\s+/g, '_')
    const dir = path.join(process.cwd(), 'public', 'tokens', 'maps')
    await mkdir(dir, { recursive: true })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const dest = path.join(dir, safeName)
    await writeFile(dest, buffer)

    return NextResponse.json({
      url: `/tokens/maps/${encodeURIComponent(safeName)}`,
      name: safeName.replace(/\.[^.]+$/, ''),
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
