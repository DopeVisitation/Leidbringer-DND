import { NextRequest, NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import path from 'path'

// Returns lists of available token images from public/tokens/
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') ?? 'creatures' // 'creatures' | 'assets' | 'maps'

  const allowed = ['creatures', 'assets', 'maps']
  if (!allowed.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  try {
    const dir = path.join(process.cwd(), 'public', 'tokens', category)
    const files = await readdir(dir)
    const images = files
      .filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
      .sort()
      .map(f => ({
        name: f
          .replace(/\s+S\.(png|jpg|jpeg|webp)$/i, '')   // remove " S.png" creature suffix
          .replace(/\.(png|jpg|jpeg|webp)$/i, '')        // remove extension
          .replace(/\s*\(DnDavid\)\s*$/i, '')           // remove "(DnDavid)" credit
          .trim(),
        url: `/tokens/${category}/${encodeURIComponent(f)}`,
        filename: f,
      }))
    return NextResponse.json({ images })
  } catch {
    return NextResponse.json({ images: [] })
  }
}
