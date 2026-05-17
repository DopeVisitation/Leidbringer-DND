import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  // Verify the caller is a GM
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'gm') return NextResponse.json({ error: 'Nur für GMs.' }, { status: 403 })

  const { userId, newPassword } = await req.json()
  if (!userId || !newPassword || newPassword.length < 6) {
    return NextResponse.json({ error: 'Ungültige Eingabe.' }, { status: 400 })
  }

  // Try both env var names for compatibility
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY
  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Service Role Key nicht konfiguriert (SUPABASE_SERVICE_KEY fehlt in Vercel).' }, { status: 500 })
  }

  const adminClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { error } = await adminClient.auth.admin.updateUserById(userId, { password: newPassword })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
