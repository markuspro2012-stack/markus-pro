/**
 * Netlify Function: /api/admin/:action
 * All admin write operations — uses Supabase REST API directly (no SDK dependency).
 * Requires Node 18+ (native fetch). Service key lives only here.
 */

const SUPABASE_URL  = process.env.SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_SECRET  = process.env.MP_ADMIN_SECRET || 'markuspro2026';

/* ── Supabase REST helper ────────────────────────────────── */

async function sb(method, table, { query = '', body, single = false, prefer } = {}) {
  const headers = {
    'apikey':          SERVICE_KEY,
    'Authorization':   'Bearer ' + SERVICE_KEY,
    'Content-Type':    'application/json'
  };
  if (prefer) {
    headers['Prefer'] = prefer;
  } else if (method !== 'GET' && method !== 'DELETE') {
    headers['Prefer'] = 'return=representation';
  }
  const url = SUPABASE_URL + '/rest/v1/' + table + (query ? '?' + query : '');
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  if (!res.ok) throw new Error('Supabase ' + res.status + ': ' + text);
  if (!text) return single ? null : [];
  const data = JSON.parse(text);
  return single ? (Array.isArray(data) ? data[0] || null : data) : data;
}

async function logAction(action) {
  try { await sb('POST', 'admin_log', { body: { action } }); } catch (_) {}
}

/* ── Response helpers ────────────────────────────────────── */

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type,x-admin-secret',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS'
};

function json(status, body) {
  return { statusCode: status, headers: { 'Content-Type': 'application/json', ...CORS }, body: JSON.stringify(body) };
}

/* ── Handler ─────────────────────────────────────────────── */

exports.handler = async function (event) {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS, body: '' };
  }

  if (event.headers['x-admin-secret'] !== ADMIN_SECRET) {
    return json(401, { error: 'Unauthorized' });
  }

  const path   = (event.path || '').replace(/.*\/admin\/?/, '');
  const method = event.httpMethod;
  const body   = event.body ? JSON.parse(event.body) : {};

  try {
    /* ── Products ─────────────────────────────────────────── */

    if (path === 'products' && method === 'GET') {
      const data = await sb('GET', 'products', { query: 'order=id' });
      return json(200, data);
    }

    if (path === 'products' && method === 'POST') {
      const data = await sb('POST', 'products', { body, single: true });
      await logAction('Product created: ' + (body.name || ''));
      return json(200, data);
    }

    if (path.startsWith('products/') && method === 'PUT') {
      const id   = path.split('/')[1];
      const data = await sb('PATCH', 'products', { query: 'id=eq.' + id, body, single: true });
      await logAction('Product updated: ' + (body.name || id));
      return json(200, data);
    }

    if (path.startsWith('products/') && method === 'DELETE') {
      const id = path.split('/')[1];
      await sb('DELETE', 'products', { query: 'id=eq.' + id });
      await logAction('Product deleted: #' + id);
      return json(200, { ok: true });
    }

    /* ── Orders ───────────────────────────────────────────── */

    if (path === 'orders' && method === 'GET') {
      const data = await sb('GET', 'orders', { query: 'order=created_at.desc' });
      return json(200, data);
    }

    if (path.startsWith('orders/') && path !== 'orders/generate' && method === 'PUT') {
      const id   = path.split('/')[1];
      const data = await sb('PATCH', 'orders', { query: 'id=eq.' + id, body, single: true });
      await logAction('Order ' + id + ' → ' + (body.status || 'updated'));
      return json(200, data);
    }

    if (path === 'orders/generate' && method === 'POST') {
      const prods = await sb('GET', 'products', { query: 'select=id,name,price&limit=8' });
      if (!prods || !prods.length) return json(200, []);

      const names    = ['Alex Kim','Maria Santos','Jordan Lee','Sam Park','Priya Nair','Luca Rossi'];
      const statuses = ['pending','confirmed','shipped','delivered','cancelled'];
      const count    = body.count || 5;
      const inserted = [];

      for (let i = 0; i < count; i++) {
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
        try {
          const saved = await sb('POST', 'orders', { body: order, single: true });
          if (saved) inserted.push(saved);
        } catch (_) {}
      }

      await logAction('Generated ' + inserted.length + ' mock orders');
      return json(200, inserted);
    }

    /* ── Settings ─────────────────────────────────────────── */

    if (path === 'settings' && method === 'GET') {
      const rows = await sb('GET', 'settings', { query: 'select=key,value' });
      const map  = {};
      (rows || []).forEach(function (r) { map[r.key] = r.value; });
      return json(200, map);
    }

    if (path === 'settings' && method === 'PUT') {
      for (const [key, value] of Object.entries(body)) {
        await sb('POST', 'settings', {
          body:   { key, value, updated_at: new Date().toISOString() },
          prefer: 'resolution=merge-duplicates'
        });
      }
      return json(200, { ok: true });
    }

    /* ── Admin log ────────────────────────────────────────── */

    if (path === 'log' && method === 'GET') {
      const data = await sb('GET', 'admin_log', { query: 'order=created_at.desc&limit=50' });
      return json(200, data);
    }

    return json(404, { error: 'Not found: ' + path });

  } catch (err) {
    console.error('[admin fn]', err);
    return json(500, { error: err.message || 'Internal error' });
  }
};
