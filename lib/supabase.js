import { createClient } from '@supabase/supabase-js'

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://juzoogtqjnpbynmovajs.supabase.co'

const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'sb_publishable_ZX-hrbEYL0siddfU3vokOQ_cKV9qQ3c'

export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
)
