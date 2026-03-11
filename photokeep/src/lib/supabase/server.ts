import { PostgrestClient } from '@supabase/postgrest-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseAdmin = new PostgrestClient(`${supabaseUrl}/rest/v1`, {
  headers: {
    apikey: supabaseServiceKey,
    Authorization: `Bearer ${supabaseServiceKey}`,
  },
});
