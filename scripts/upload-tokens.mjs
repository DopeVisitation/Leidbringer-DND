// Upload all creature and asset token images to Supabase Storage
// Run with: node scripts/upload-tokens.mjs

import { createClient } from '@supabase/supabase-js'
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')

const SUPABASE_URL = 'https://kpgrgrnrzwsfbygzjwed.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZ3Jncm5yendzZmJ5Z3pqd2VkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc5MzUxMiwiZXhwIjoyMDk0MzY5NTEyfQ.Kkec667i1Ftt2JT5sW0gEqtYJXS8ljFLzPqMeOyDook'
const BUCKET      = 'Tokens'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

function mimeType(filename) {
  const ext = path.extname(filename).toLowerCase()
  switch (ext) {
    case '.png':  return 'image/png'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.webp': return 'image/webp'
    case '.gif':  return 'image/gif'
    default:      return 'application/octet-stream'
  }
}

async function uploadFolder(localFolder, storagePrefix) {
  const files = (await readdir(localFolder))
    .filter(f => /\.(png|jpg|jpeg|webp|gif)$/i.test(f))

  console.log(`\n📁 ${storagePrefix}: ${files.length} Dateien gefunden`)

  let uploaded = 0, skipped = 0, failed = 0

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const localPath = path.join(localFolder, file)
    const storagePath = `${storagePrefix}/${file}`

    try {
      const buffer = await readFile(localPath)
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
          contentType: mimeType(file),
          upsert: false,   // skip already-uploaded files
        })

      if (error) {
        if (error.message?.includes('already exists') || error.statusCode === 409) {
          skipped++
        } else {
          failed++
          if (failed <= 5) console.error(`  ✗ ${file}: ${error.message}`)
        }
      } else {
        uploaded++
      }
    } catch (err) {
      failed++
      if (failed <= 5) console.error(`  ✗ ${file}: ${err.message}`)
    }

    // Progress every 50 files
    if ((i + 1) % 50 === 0 || i === files.length - 1) {
      const pct = Math.round(((i + 1) / files.length) * 100)
      process.stdout.write(`\r  [${pct.toString().padStart(3)}%] ${i+1}/${files.length} — ✓${uploaded} ⏭${skipped} ✗${failed}`)
    }
  }

  console.log(`\n  Fertig: ✓${uploaded} hochgeladen, ⏭${skipped} übersprungen, ✗${failed} Fehler`)
  return { uploaded, skipped, failed }
}

async function main() {
  console.log('🚀 Supabase Storage Upload — DnD Token Bibliothek')
  console.log(`   Bucket: ${BUCKET}`)
  console.log('   Starte Upload...')

  const start = Date.now()

  const creatures = await uploadFolder(
    path.join(ROOT, 'public', 'tokens', 'creatures'),
    'creatures'
  )

  const assets = await uploadFolder(
    path.join(ROOT, 'public', 'tokens', 'assets'),
    'assets'
  )

  // Also upload the smaller maps (under 1.5MB) from the local maps folder
  const mapsDir = path.join(ROOT, 'public', 'tokens', 'maps')
  let mapsResult = { uploaded: 0, skipped: 0, failed: 0 }
  try {
    const { readdir: rd, stat } = await import('fs/promises')
    const mapFiles = await rd(mapsDir)
    const smallMaps = []
    for (const f of mapFiles) {
      if (!/\.(jpg|jpeg|png|webp)$/i.test(f)) continue
      const s = await stat(path.join(mapsDir, f))
      if (s.size < 1500000) smallMaps.push(f)
    }
    console.log(`\n📁 maps (klein, <1.5MB): ${smallMaps.length} Dateien`)
    for (let i = 0; i < smallMaps.length; i++) {
      const file = smallMaps[i]
      const buffer = await readFile(path.join(mapsDir, file))
      const { error } = await supabase.storage.from(BUCKET).upload(`maps/${file}`, buffer, { contentType: mimeType(file), upsert: false })
      if (error?.message?.includes('already exists') || error?.statusCode === 409) mapsResult.skipped++
      else if (error) mapsResult.failed++
      else mapsResult.uploaded++
      if ((i+1) % 10 === 0 || i === smallMaps.length-1)
        process.stdout.write(`\r  [${Math.round((i+1)/smallMaps.length*100)}%] ${i+1}/${smallMaps.length} — ✓${mapsResult.uploaded} ⏭${mapsResult.skipped} ✗${mapsResult.failed}`)
    }
    console.log(`\n  Fertig: ✓${mapsResult.uploaded} hochgeladen, ⏭${mapsResult.skipped} übersprungen, ✗${mapsResult.failed} Fehler`)
  } catch { console.log('\n  Maps-Ordner nicht gefunden, übersprungen') }

  const elapsed = Math.round((Date.now() - start) / 1000)
  const total = creatures.uploaded + assets.uploaded + mapsResult.uploaded

  console.log(`\n✅ Upload abgeschlossen in ${elapsed}s`)
  console.log(`   Gesamt hochgeladen: ${total} Dateien`)
  console.log(`   Creatures: ${creatures.uploaded} | Assets: ${assets.uploaded} | Maps: ${mapsResult.uploaded}`)
}

main().catch(console.error)
