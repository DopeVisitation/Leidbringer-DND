// Reads ZIP files directly from the Desktop token packs and uploads to Supabase Storage.
// No need to extract to disk first. Run with: node scripts/upload-from-zips.mjs
// eslint-disable-next-line @typescript-eslint/no-require-imports

import { createClient } from '@supabase/supabase-js'
import { readdir, readFile, stat } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const AdmZip = require('adm-zip')

const SUPABASE_URL = 'https://kpgrgrnrzwsfbygzjwed.supabase.co'
const SERVICE_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtwZ3Jncm5yendzZmJ5Z3pqd2VkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODc5MzUxMiwiZXhwIjoyMDk0MzY5NTEyfQ.Kkec667i1Ftt2JT5sW0gEqtYJXS8ljFLzPqMeOyDook'
const BUCKET       = 'Tokens'

const CREATURE_ZIPS = 'C:\\Users\\plotz\\Desktop\\Tokens\\Creature Token packs'
const ASSET_ZIPS    = 'C:\\Users\\plotz\\Desktop\\Tokens\\Batlle assets Tokens'

const supabase = createClient(SUPABASE_URL, SERVICE_KEY)

function mimeType(filename) {
  const ext = path.extname(filename).toLowerCase()
  if (ext === '.png') return 'image/png'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.webp') return 'image/webp'
  if (ext === '.gif') return 'image/gif'
  return 'application/octet-stream'
}

function cleanName(filename) {
  return path.basename(filename) // strip any subfolder from inside zip
}

// Get already-uploaded files from Supabase (to skip duplicates)
async function getExisting(prefix) {
  const existing = new Set()
  let offset = 0
  while (true) {
    const { data } = await supabase.storage.from(BUCKET).list(prefix, { limit: 1000, offset })
    if (!data || data.length === 0) break
    data.forEach(f => existing.add(f.name))
    if (data.length < 1000) break
    offset += 1000
  }
  return existing
}

async function uploadFromZipFolder(zipFolder, storagePrefix) {
  console.log(`\n📦 Lese ZIPs aus: ${zipFolder}`)
  let zipFiles
  try {
    const entries = await readdir(zipFolder)
    zipFiles = entries.filter(f => f.toLowerCase().endsWith('.zip'))
  } catch {
    console.log(`  ⚠️  Ordner nicht gefunden: ${zipFolder}`)
    return { uploaded: 0, skipped: 0, failed: 0 }
  }
  console.log(`   ${zipFiles.length} ZIP-Dateien gefunden`)

  console.log(`   Lade bereits vorhandene Dateien aus Supabase...`)
  const existing = await getExisting(storagePrefix)
  console.log(`   ${existing.size} bereits vorhanden → werden übersprungen`)

  let uploaded = 0, skipped = 0, failed = 0, total = 0

  for (let z = 0; z < zipFiles.length; z++) {
    const zipPath = path.join(zipFolder, zipFiles[z])
    let zip
    try {
      zip = new AdmZip(zipPath)
    } catch (e) {
      console.log(`\n  ⚠️  ZIP nicht lesbar: ${zipFiles[z]}`)
      continue
    }

    const entries = zip.getEntries().filter(e =>
      !e.isDirectory && /\.(png|jpg|jpeg|webp|gif)$/i.test(e.entryName)
    )
    total += entries.length

    for (const entry of entries) {
      const filename = cleanName(entry.entryName)
      if (existing.has(filename)) { skipped++; continue }

      try {
        const buffer = entry.getData()
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(`${storagePrefix}/${filename}`, buffer, {
            contentType: mimeType(filename),
            upsert: false,
          })

        if (error) {
          if (error.message?.includes('already exists') || error.statusCode === 409) {
            skipped++
            existing.add(filename)
          } else {
            failed++
            if (failed <= 3) console.error(`\n  ✗ ${filename}: ${error.message}`)
          }
        } else {
          uploaded++
          existing.add(filename)
        }
      } catch (err) {
        failed++
        if (failed <= 3) console.error(`\n  ✗ ${filename}: ${err.message}`)
      }

      const done = uploaded + skipped + failed
      if (done % 100 === 0 || done === total) {
        process.stdout.write(`\r  [ZIP ${z+1}/${zipFiles.length}] ${done} verarbeitet — ✓${uploaded} ⏭${skipped} ✗${failed}   `)
      }
    }
  }

  console.log(`\n  ✅ Fertig: ✓${uploaded} hochgeladen, ⏭${skipped} übersprungen, ✗${failed} Fehler`)
  return { uploaded, skipped, failed }
}

async function main() {
  console.log('🚀 ZIP→Supabase Upload — DnD Token Bibliothek')
  console.log(`   Bucket: ${BUCKET}`)

  // Check adm-zip
  try { require.resolve('adm-zip') } catch {
    console.error('❌ adm-zip nicht installiert. Bitte: npm install adm-zip')
    process.exit(1)
  }

  const start = Date.now()

  const creatures = await uploadFromZipFolder(CREATURE_ZIPS, 'creatures')
  const assets    = await uploadFromZipFolder(ASSET_ZIPS,    'assets')

  const elapsed = Math.round((Date.now() - start) / 1000)
  console.log(`\n✅ Gesamt in ${elapsed}s: ${creatures.uploaded + assets.uploaded} neue Dateien hochgeladen`)
}

main().catch(console.error)
