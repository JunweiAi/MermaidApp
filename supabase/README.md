# Supabase setup

1. Create a project at https://supabase.com
2. Copy `.env.local.example` to `.env.local` and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. In Supabase Dashboard → SQL Editor, run the contents of `migrations/20250313000000_init.sql`

Or with Supabase CLI: `supabase db push`
