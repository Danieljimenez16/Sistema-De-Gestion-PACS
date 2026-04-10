const supabase = require('../config/supabase');

const create = (data) =>
  supabase.from('imports').insert(data).select().single();

const update = (id, data) =>
  supabase.from('imports').update(data).eq('id', id).select().single();

const findById = (id) =>
  supabase.from('imports').select('*').eq('id', id).single();

module.exports = { create, update, findById };
