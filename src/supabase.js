import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || 'https://xnekmhtmapkxzcrdzhoh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhuZWttaHRtYXBreHpjcmR6aG9oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzU1NTAsImV4cCI6MjA5NzcxMTU1MH0.YY6pXD3Icr_s5HpCDrE-J9466oZdw9jIVqXuj_RluS8';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const ALLOWED_DOMAIN = 'goldengoose.com';

export function isAllowedEmail(email) {
  const normalized = email?.trim().toLowerCase();
  return normalized?.endsWith('@' + ALLOWED_DOMAIN);
}
