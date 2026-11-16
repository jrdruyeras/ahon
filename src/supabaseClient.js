import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://fcvckktgljllyrjyizfr.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_iL-BQgQzqd74A39JtLtNA_JPCVB...' // Put your full actual publishable key here inside the quotes

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)