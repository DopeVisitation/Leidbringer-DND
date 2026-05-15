'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Image as ImageIcon, Upload, Trash2, X, Clipboard, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/hooks/useAuth'

interface GalleryImage {
  id: string
  user_id: string
  image_url: string
  storage_path: string | null
  caption: string | null
  created_at: string
  user?: { username: string } | null
}

const GALLERY_BUCKET = 'gallery'

export default function GalleryPage() {
  const supabase = createClient()
  const { user, isGM } = useAuth()
  const [images, setImages] = useState<GalleryImage[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadCaption, setUploadCaption] = useState('')
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState<GalleryImage | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadImages = useCallback(async () => {
    const { data } = await supabase
      .from('gallery_images')
      .select('*, user:profiles(username)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) setImages(data as GalleryImage[])
  }, [supabase])

  useEffect(() => {
    loadImages()
    const ch = supabase.channel('gallery_images_v9')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_images' }, loadImages)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [loadImages, supabase])

  const uploadFile = useCallback(async (file: File, caption: string) => {
    if (!user) return
    setUploading(true); setError('')
    try {
      // Eindeutiger Storage-Pfad
      const ext = (file.name.split('.').pop() || file.type.split('/').pop() || 'png').toLowerCase()
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
      const { error: upErr } = await supabase.storage
        .from(GALLERY_BUCKET)
        .upload(path, file, { contentType: file.type || 'image/png', upsert: false })
      if (upErr) throw upErr

      const { data: pub } = supabase.storage.from(GALLERY_BUCKET).getPublicUrl(path)
      const publicUrl = pub.publicUrl

      const { error: insErr } = await supabase.from('gallery_images').insert({
        user_id: user.id,
        image_url: publicUrl,
        storage_path: path,
        caption: caption.trim() || null,
      })
      if (insErr) throw insErr

      setUploadCaption('')
    } catch (e: any) {
      console.error(e)
      setError(e?.message ?? 'Upload fehlgeschlagen')
    } finally {
      setUploading(false)
    }
  }, [user, supabase])

  // Paste-Handler — fängt Clipboard-Bilder global
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (!user || uploading) return
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile()
          if (file) {
            e.preventDefault()
            uploadFile(file, uploadCaption)
            return
          }
        }
      }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [user, uploading, uploadCaption, uploadFile])

  const onFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    Array.from(files).forEach((f) => uploadFile(f, uploadCaption))
  }

  const deleteImage = async (img: GalleryImage) => {
    if (!confirm('Bild löschen?')) return
    if (img.storage_path) {
      await supabase.storage.from(GALLERY_BUCKET).remove([img.storage_path])
    }
    await supabase.from('gallery_images').delete().eq('id', img.id)
    setLightbox(null)
  }

  if (!user) return null

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <ImageIcon className="w-6 h-6 text-amber-400" />
        <h1 className="text-xl font-bold text-zinc-100">Bilder</h1>
        <span className="text-xs text-zinc-500 ml-1">{images.length} im Log</span>
      </div>

      {/* Upload-Bereich */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault(); setDragOver(false)
          onFiles(e.dataTransfer.files)
        }}
        className={`bg-zinc-900 border-2 border-dashed rounded-xl p-6 text-center space-y-3 transition-colors ${
          dragOver ? 'border-amber-500 bg-amber-900/10' : 'border-zinc-700'
        }`}
      >
        <div className="flex items-center justify-center gap-2 text-zinc-300">
          <Upload className="w-5 h-5" />
          <p className="text-sm font-medium">Bild hochladen</p>
        </div>
        <p className="text-xs text-zinc-500">
          Drag &amp; Drop, <button type="button" onClick={() => fileInputRef.current?.click()} className="text-amber-400 underline hover:text-amber-300">Datei auswählen</button>, oder einfach{' '}
          <span className="inline-flex items-center gap-1 text-amber-400"><Clipboard className="w-3 h-3" /> Strg + V</span> um aus der Zwischenablage einzufügen.
        </p>
        <input
          ref={fileInputRef}
          type="file" accept="image/*" multiple hidden
          onChange={(e) => onFiles(e.target.files)}
        />
        <input
          type="text"
          placeholder="Optionale Bildunterschrift…"
          value={uploadCaption}
          onChange={(e) => setUploadCaption(e.target.value)}
          className="w-full max-w-md mx-auto block bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-amber-500"
        />
        {uploading && (
          <div className="flex items-center justify-center gap-2 text-amber-300 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" /> Lädt hoch…
          </div>
        )}
        {error && (
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded px-3 py-1.5 inline-block">{error}</p>
        )}
      </div>

      {/* Galerie */}
      {images.length === 0 ? (
        <div className="text-center text-zinc-600 text-sm py-12 border border-dashed border-zinc-800 rounded-xl">
          Noch keine Bilder im Log.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {images.map((img) => (
            <button
              key={img.id}
              onClick={() => setLightbox(img)}
              className="group relative bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden hover:border-amber-500/60 transition-colors text-left"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.image_url}
                alt={img.caption ?? ''}
                className="w-full aspect-square object-cover bg-zinc-950"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
                <p className="text-[11px] text-zinc-200 truncate">{img.caption ?? '—'}</p>
                <p className="text-[10px] text-zinc-400">
                  {img.user?.username ?? '?'} · {new Date(img.created_at).toLocaleDateString('de')}
                </p>
              </div>
              {(isGM || img.user_id === user.id) && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteImage(img) }}
                  className="absolute top-1.5 right-1.5 p-1 rounded bg-red-900/60 hover:bg-red-900 text-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Löschen"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-5xl max-h-[90vh] flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox.image_url}
              alt={lightbox.caption ?? ''}
              className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
            />
            <div className="text-center text-zinc-300 text-sm">
              {lightbox.caption && <p className="mb-1">{lightbox.caption}</p>}
              <p className="text-xs text-zinc-500">
                {lightbox.user?.username ?? '?'} · {new Date(lightbox.created_at).toLocaleString('de')}
              </p>
            </div>
            {(isGM || lightbox.user_id === user.id) && (
              <button
                onClick={() => deleteImage(lightbox)}
                className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-900/60 border border-red-700/40 text-red-300 text-xs font-medium"
              >
                <Trash2 className="w-3.5 h-3.5" /> Bild löschen
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
