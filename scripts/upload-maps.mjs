// Upload battle maps to Supabase Storage — smallest first to maximize count
// Run with: node scripts/upload-maps.mjs

import { createClient } from '@supabase/supabase-js'
import { readdir, readFile, stat } from 'fs/promises'
import path from 'path'

const SUPABASE_URL = 'https://kpgrgrnrzwsfbygzjwed.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZ3Jncm5yendzZmJ5Z3pqd2VkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc5MzUxMiwiZXhwIjoyMDk0MzY5NTEyfQ.Kkec667i1Ftt2JT5sW0gEqtYJXS8ljFLzPqMeOyDook'
const BUCKET       = 'Tokens'
const MAPS_DIR     = 'C:\\Users\\plotz\\Desktop\\Tokens\\Battle Maps\\Maps\\Public'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

function mimeType(filename) {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.png')  return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  return 'application/octet-stream'
}

// Supabase Storage rejects filenames with [ ] characters — sanitize storage key
function sanitizeName(filename) {
  return filename.replace(/\[/g, '(').replace(/\]/g, ')')
}

async function getExistingMaps() {
  const existing = new Set()
  let offset = 0
  while (true) {
    const { data } = await supabase.storage.from(BUCKET).list('maps', { limit: 1000, offset })
    if (!data || data.length === 0) break
    data.forEach(f => existing.add(f.name))
    if (data.length < 1000) break
    offset += 1000
  }
  return existing
}

async function getStorageUsedMB() {
  // Rough estimate: list all folders and count
  // We just try to upload and handle errors
  return 0
}

async function main() {
  console.log('🗺️  Battle Maps Upload → Supabase Storage')
  console.log(`   Quelle: ${MAPS_DIR}`)
  console.log(`   Bucket: ${BUCKET}/maps`)

  // Read all map files
  let allFiles
  try {
    const entries = await readdir(MAPS_DIR)
    const withSizes = []
    for (const f of entries) {
      if (!/\.(jpg|jpeg|png|webp)$/i.test(f)) continue
      // Skip Grid/HD/R20 variants (same as original extraction filter)
      if (/\b(Grid|HD|R20)\b/i.test(f)) continue
      const s = await stat(path.join(MAPS_DIR, f))
      withSizes.push({ name: f, size: s.size })
    }
    // Sort smallest first to maximize count before hitting storage limit
    withSizes.sort((a, b) => a.size - b.size)
    allFiles = withSizes
  } catch (e) {
    console.error(`❌ Maps-Ordner nicht gefunden: ${MAPS_DIR}`)
    console.error(e.message)
    process.exit(1)
  }

  console.log(`   ${allFiles.length} Map-Dateien gefunden`)
  const totalMB = allFiles.reduce((s, f) => s + f.size, 0) / 1024 / 1024
  console.log(`   Gesamtgröße: ${totalMB.toFixed(0)} MB`)

  // Check already uploaded
  console.log('   Prüfe bereits hochgeladene Maps...')
  const existing = await getExistingMaps()
  console.log(`   ${existing.size} bereits vorhanden → werden übersprungen`)

  let uploaded = 0, skipped = 0, failed = 0, storageFull = false
  const start = Date.now()

  for (let i = 0; i < allFiles.length; i++) {
    const { name, size } = allFiles[i]

    const storageName = sanitizeName(name)
    if (existing.has(storageName)) { skipped++; continue }

    try {
      const buffer = await readFile(path.join(MAPS_DIR, name))
      const { error } = await supabase.storage
        .from(BUCKET)
        .upload(`maps/${storageName}`, buffer, {
          contentType: mimeType(name),
          upsert: false,
        })

      if (error) {
        if (error.message?.includes('already exists') || error.statusCode === 409) {
          skipped++
          existing.add(storageName)
        } else if (
          error.message?.includes('storage limit') ||
          error.message?.includes('quota') ||
          error.statusCode === 413 ||
          error.statusCode === 507
        ) {
          console.log(`\n⚠️  Speicherlimit erreicht bei Map ${i+1}/${allFiles.length}`)
          storageFull = true
          break
        } else {
          failed++
          if (failed <= 5) console.error(`\n  ✗ ${name}: ${error.message}`)
        }
      } else {
        uploaded++
        existing.add(storageName)
      }
    } catch (err) {
      failed++
      if (failed <= 3) console.error(`\n  ✗ ${name}: ${err.message}`)
    }

    const done = uploaded + skipped + failed
    const pct = Math.round((i + 1) / allFiles.length * 100)
    const uploadedMB = allFiles.slice(0, i + 1).reduce((s, f) => s + f.size, 0) / 1024 / 1024
    process.stdout.write(
      `\r  [${pct.toString().padStart(3)}%] ${i+1}/${allFiles.length} — ✓${uploaded} ⏭${skipped} ✗${failed}  (${uploadedMB.toFixed(0)} MB)   `
    )
  }

  const elapsed = Math.round((Date.now() - start) / 1000)
  console.log(`\n\n✅ Maps-Upload abgeschlossen in ${elapsed}s`)
  console.log(`   ✓ ${uploaded} hochgeladen | ⏭ ${skipped} übersprungen | ✗ ${failed} Fehler`)
  if (storageFull) {
    console.log(`   ℹ️  Supabase Speicherlimit erreicht — restliche Maps nicht hochgeladen`)
    console.log(`   ℹ️  Upgrade auf Supabase Pro (8GB Storage) für alle ${allFiles.length} Maps`)
  }
}

main().catch(console.error)
