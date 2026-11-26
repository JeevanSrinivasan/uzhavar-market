import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req) {
  try {
    const body = await req.json()
    const { userId, reason, confirmation } = body || {}

    if (!userId || confirmation !== 'Delete my Farmer Account') {
      return NextResponse.json(
        { error: 'Confirmation phrase "Delete my Farmer Account" and userId are required.' },
        { status: 400 }
      )
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      'https://juzoogtqjnpbynmovajs.supabase.co'
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    // If service role key is present in environment, perform administrative deletion
    if (serviceRoleKey) {
      const adminClient = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      // 1. Hide all products
      await adminClient
        .from('products')
        .update({
          status: 'inactive',
          approval_status: 'rejected',
          stock_quantity: 0,
        })
        .eq('farmer_id', userId)

      // 2. Delete or deactivate profile
      const { error: profileErr } = await adminClient
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (profileErr) {
        await adminClient
          .from('profiles')
          .update({
            role: 'deleted',
            is_banned: true,
            full_name: 'Deleted Farmer',
          })
          .eq('id', userId)
      }

      // 3. Admin delete user from auth
      try {
        await adminClient.auth.admin.deleteUser(userId)
      } catch (authDelErr) {
        console.warn('Admin auth user delete note:', authDelErr)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Account deletion processed.',
    })
  } catch (err) {
    console.error('Delete account API error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
