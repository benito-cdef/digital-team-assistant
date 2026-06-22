import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = 'https://xnekmhtmapkxzcrdzhoh.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuZWttaHRtYXBreHpjcmR6aG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzU1NTAsImV4cCI6MjA5NzcxMTU1MH0.YY6pXD3Icr_s5HpCDrE-J9466oZdw9jIVqXuj_RluS8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

export const ALLOWED_DOMAIN = 'goldengoose.com';

export function isAllowedEmail(email) {
  return email?.toLowerCase().endsWith('@' + ALLOWED_DOMAIN);
}
