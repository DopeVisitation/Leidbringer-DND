import { NextRequest, NextResponse } from 'next/server'
import { readdir } from 'fs/promises'
import path from 'path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://kpgrgrnrzwsfbygzjwed.supabase.co'
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY ?? ''
const BUCKET       = 'Tokens'

// Returns lists of available token images.
// Priority: Supabase Storage (production) → local filesystem (dev fallback)
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category') ?? 'creatures' // 'creatures' | 'assets' | 'maps'

  const allowed = ['creatures', 'assets', 'maps']
  if (!allowed.includes(category)) {
    return NextResponse.json({ error: 'Invalid category' }, { status: 400 })
  }

  // ── 1. Try Supabase Storage first ──────────────────────────────────────────
  if (SERVICE_KEY) {
    try {
      const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
      const allFiles: { name: string }[] = []
      let offset = 0
      const PAGE = 1000

      // Supabase list() is paginated — fetch all pages
      while (true) {
        const { data, error } = await supabase.storage
          .from(BUCKET)
          .list(category, { limit: PAGE, offset, sortBy: { column: 'name', order: 'asc' } })

        if (error || !data) break
        allFiles.push(...data.filter(f => f.name && /\.(png|jpg|jpeg|webp|gif)$/i.test(f.name)))
        if (data.length < PAGE) break
        offset += PAGE
      }

      if (allFiles.length > 0) {
        const images = allFiles.map(f => ({
          name: f.name
            .replace(/\s+S\.(png|jpg|jpeg|webp)$/i, '')
            .replace(/\.(png|jpg|jpeg|webp|gif)$/i, '')
            .replace(/\s*\(DnDavid\)\s*$/i, '')
            .trim(),
          url: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${category}/${encodeURIComponent(f.name)}`,
          filename: f.name,
        }))
        return NextResponse.json({ images, source: 'supabase' })
      }
    } catch {
      // fall through to local filesystem
    }
  }

  // ── 2. Fallback: local filesystem (dev server) ──────────────────────────────
  try {
    const dir = path.join(process.cwd(), 'public', 'tokens', category)
    const files = await readdir(dir)
    const images = files
      .filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))
      .sort()
      .map(f => ({
        name: f
          .replace(/\s+S\.(png|jpg|jpeg|webp)$/i, '')
          .replace(/\.(png|jpg|jpeg|webp)$/i, '')
          .replace(/\s*\(DnDavid\)\s*$/i, '')
          .trim(),
        url: `/tokens/${category}/${encodeURIComponent(f)}`,
        filename: f,
      }))
    return NextResponse.json({ images, source: 'local' })
  } catch {
    return NextResponse.json({ images: [], source: 'none' })
  }
}
