import { supabase } from '../supabase.js';

export async function getOrCreateUser(email) {
  const { data, error } = await supabase.from('users').select('*').eq('email', email).maybeSingle();
  if (error) throw error;
  if (data) {
    await supabase.from('users').update({ last_login: new Date().toISOString() }).eq('email', email);
    return data;
  }
  const { data: newUser, error: insertErr } = await supabase
    .from('users').insert({ email, role: 'user', created_by: 'self-register' }).select().single();
  if (insertErr) throw insertErr;
  return newUser;
}
export async function getAllUsers() {
  const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}
export async function updateUserRole(email, role) {
  const { error } = await supabase.from('users').update({ role }).eq('email', email);
  if (error) throw error;
}
export async function upsertUser(email, role, createdBy) {
  const { error } = await supabase.from('users').upsert({ email, role, created_by: createdBy }, { onConflict: 'email' });
  if (error) throw error;
}
export async function deleteUser(email) {
  const { error } = await supabase.from('users').delete().eq('email', email);
  if (error) throw error;
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
