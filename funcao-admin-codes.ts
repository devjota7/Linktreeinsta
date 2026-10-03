import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const j = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const gen = () => { const a = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', r = crypto.getRandomValues(new Uint8Array(10)); return Array.from(r, x => a[x % a.length]).join('') }
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const tok = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  const { data: u } = await sb.auth.getUser(tok)
  if (!u?.user) return j({ erro: 'Não autenticado' }, 401)
  const { data: adm } = await sb.from('admins').select('user_id').eq('user_id', u.user.id).maybeSingle()
  if (!adm) return j({ erro: 'Sem permissão' }, 403)
  const b = await req.json()
  if (b.acao === 'criar') {
    const nome = String(b.username || '').toLowerCase().replace(/[^a-z0-9_.-]/g, '').slice(0, 24)
    if (nome.length < 3) return j({ erro: 'Usuário precisa de 3+ letras ou números' }, 400)
    const dias = Math.min(365, Math.max(1, Number(b.dias) || 7)), codigo = gen()
    const { data, error } = await sb.auth.admin.createUser({ email: `${nome}@clientes.devjota.app`, password: codigo, email_confirm: true })
    if (error) return j({ erro: error.message.includes('already') ? 'Esse usuário já existe' : error.message }, 400)
    const r = await sb.from('codes').insert({ user_id: data.user.id, username: nome, dias })
    if (r.error) return j({ erro: r.error.message }, 400)
    return j({ username: nome, codigo, dias })
  }
  if (b.acao === 'apagar') { const { error } = await sb.auth.admin.deleteUser(String(b.user_id)); return error ? j({ erro: error.message }, 400) : j({ ok: 1 }) }
  return j({ erro: 'Ação inválida' }, 400)
})
