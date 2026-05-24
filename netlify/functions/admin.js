/**
 * Netlify Function: /api/admin/:action
 * All write operations for the admin panel go through here.
 * The Supabase SERVICE KEY (bypasses RLS) lives only in this function.
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL         = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_SECRET         = process.env.MP_ADMIN_SECRET || 'markuspro2026';

function makeClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: { persistSession: false }
  });
}

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(body)
  };
}

exports.handler = async function (event) {
  /* CORS preflight */
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type,x-admin-secret', 'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS' }, body: '' };
  }

  /* Auth check — every request must include the admin secret */
  const secret = event.headers['x-admin-secret'];
  if (secret !== ADMIN_SECRET) return json(401, { error: 'Unauthorized' });

  const path   = (event.path || '').replace(/.*\/admin\/?/, '');
  const method = event.httpMethod;
  const body   = event.body ? JSON.parse(event.body) : {};
  const sb     = makeClient();

  try {
    /* ── Products ─────────────────────────────────────────── */

    if (path === 'products' && method === 'GET') {
      const { data, error } = await sb.from('products').select('*').order('id');
      if (error) throw error;
      return json(200, data);
    }

    if (path === 'products' && method === 'POST') {
      const { data, error } = await sb.from('products').insert(body).select().single();
      if (error) throw error;
      await logAction(sb, 'Product created: ' + body.name);
      return json(200, data);
    }

    if (path.startsWith('products/') && method === 'PUT') {
      const id = path.split('/')[1];
      const { data, error } = await sb.from('products').update(body).eq('id', id).select().single();
      if (error) throw error;
      await logAction(sb, 'Product updated: ' + (body.name || id));
      return json(200, data);
    }

    if (path.startsWith('products/') && method === 'DELETE') {
      const id = path.split('/')[1];
      const { error } = await sb.from('products').delete().eq('id', id);
      if (error) throw error;
      await logAction(sb, 'Product deleted: #' + id);
      return json(200, { ok: true });
    }

    /* ── Orders ───────────────────────────────────────────── */

    if (path === 'orders' && method === 'GET') {
      const { data, error } = await sb.from('orders').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return json(200, data);
    }

    if (path.startsWith('orders/') && method === 'PUT') {
      const id = path.split('/')[1];
      const { data, error } = await sb.from('orders').update(body).eq('id', id).select().single();
      if (error) throw error;
      await logAction(sb, 'Order ' + id + ' → ' + (body.status || 'updated'));
      return json(200, data);
    }

    if (path === 'orders/generate' && method === 'POST') {
      const names    = ['Alex Kim','Maria Santos','Jordan Lee','Sam Park','Priya Nair','Luca Rossi'];
      const statuses = ['pending','confirmed','shipped','delivered','cancelled'];
      const { data: prods } = await sb.from('products').select('id,name,price').limit(8);
      const inserted = [];
      for (let i = 0; i < (body.count || 5); i++) {
        const name  = names[Math.floor(Math.random() * names.length)];
        const email = name.toLowerCase().replace(' ', '.') + Math.floor(Math.random() * 99) + '@example.com';
        const item  = prods[Math.floor(Math.random() * prods.length)];
        const qty   = Math.floor(Math.random() * 3) + 1;
        const order = {
          id:             'MP-' + Math.floor(Math.random() * 90000 + 10000),
          customer_name:  name,
          customer_email: email,
          items:          [{ id: item.id, name: item.name, price: item.price, qty, size: 'M' }],
          total:          item.price * qty,
          status:         statuses[Math.floor(Math.random() * statuses.length)],
          created_at:     new Date(Date.now() - Math.random() * 30 * 864e5).toISOString()
        };
        const { data, error } = await sb.from('orders').insert(order).select().single();
        if (!error) inserted.push(data);
      }
      await logAction(sb, 'Generated ' + inserted.length + ' mock orders');
      return json(200, inserted);
    }

    /* ── Settings ─────────────────────────────────────────── */

    if (path === 'settings' && method === 'GET') {
      const { data, error } = await sb.from('settings').select('*');
      if (error) throw error;
      const map = {};
      (data || []).forEach(function(r) { map[r.key] = r.value; });
      return json(200, map);
    }

    if (path === 'settings' && method === 'PUT') {
      for (const [key, value] of Object.entries(body)) {
        await sb.from('settings').upsert({ key, value, updated_at: new Date().toISOString() });
      }
      return json(200, { ok: true });
    }

    /* ── Admin log ────────────────────────────────────────── */

    if (path === 'log' && method === 'GET') {
      const { data, error } = await sb.from('admin_log').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return json(200, data);
    }

    return json(404, { error: 'Not found: ' + path });

  } catch (err) {
    console.error('[admin fn]', err);
    return json(500, { error: err.message || 'Internal error' });
  }
};

async function logAction(sb, action) {
  await sb.from('admin_log').insert({ action });
}
