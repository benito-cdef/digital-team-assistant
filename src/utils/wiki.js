import { supabase } from '../supabase.js';

export async function getWikiEntries(section) {
  let q = supabase.from('docs_wiki').select('*').order('created_at', { ascending: true });
  if (section) q = q.eq('section', section);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

export async function createWikiEntry({ section, title, content, status, priority, createdBy }) {
  const { data, error } = await supabase.from('docs_wiki')
    .insert({ section, title, content, status: status || null, priority: priority || null, created_by: createdBy })
    .select().single();
  if (error) throw error;
  return data;
}

export async function updateWikiEntry(id, { title, content, status, priority, updatedBy }) {
  const { data, error } = await supabase.from('docs_wiki')
    .update({ title, content, status: status || null, priority: priority || null, updated_by: updatedBy, updated_at: new Date().toISOString() })
    .eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteWikiEntry(id) {
  const { error } = await supabase.from('docs_wiki').delete().eq('id', id);
  if (error) throw error;
}
