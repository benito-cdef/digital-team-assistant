import { supabase } from '../supabase.js';

const ALLOWED_DOMAIN = 'goldengoose.com';

function normalizeEmail(email) {
  return email?.trim().toLowerCase() || '';
}

function assertCorporateEmail(email) {
  if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
    throw new Error(`Usa un indirizzo @${ALLOWED_DOMAIN}`);
  }
}

export async function getCurrentUserProfile() {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('auth_user_id', authData.user.id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getAllUsers() {
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function updateUserRole(email, role) {
  const normalized = normalizeEmail(email);
  const { error } = await supabase.from('users').update({ role }).eq('email', normalized);
  if (error) throw error;
}
export async function upsertUser(email, role, createdBy) {
  const normalized = normalizeEmail(email);
  assertCorporateEmail(normalized);

  // Crea prima il profilo: se il secondo passaggio fallisce l'utente non ottiene accesso.
  const { error: profileError } = await supabase
    .from('users')
    .upsert({ email: normalized, role, created_by: createdBy }, { onConflict: 'email' });
  if (profileError) throw profileError;

  const { error: allowlistError } = await supabase
    .from('tester_allowlist')
    .upsert({ email: normalized, active: true, added_by: createdBy }, { onConflict: 'email' });
  if (allowlistError) throw allowlistError;
}
export async function deleteUser(email) {
  const normalized = normalizeEmail(email);

  // Revoca prima l'accesso. Anche se la cancellazione del profilo fallisce,
  // le policy RLS negano immediatamente ogni operazione.
  const { error: allowlistError } = await supabase
    .from('tester_allowlist')
    .update({ active: false })
    .eq('email', normalized);
  if (allowlistError) throw allowlistError;

  const { error: profileError } = await supabase.from('users').delete().eq('email', normalized);
  if (profileError) throw profileError;
}
export async function logPlanChange({ weekNumber, year, fieldPath, oldValue, newValue, changedBy }) {
  const { error } = await supabase.from('plan_changes').insert({
    week_number: weekNumber, year, field_path: fieldPath,
    old_value: oldValue ?? null, new_value: newValue ?? null, changed_by: changedBy,
  });
  if (error) console.error('Audit log error:', error);
}
export async function getPlanChanges(year, weekNumber) {
  let q = supabase.from('plan_changes').select('*').eq('year', year).order('changed_at', { ascending: false });
  if (weekNumber != null) q = q.eq('week_number', weekNumber);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
