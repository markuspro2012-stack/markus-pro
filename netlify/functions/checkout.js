'use strict';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_KEY;

function genOrderId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = 'MP-';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

async function sbInsert(table, row) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify(row)
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

exports.handler = async function (event) {
  const origin = event.headers.origin || event.headers.Origin || '';
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: corsHeaders, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: corsHeaders, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const data = JSON.parse(event.body || '{}');
    const { name, email, phone, address, city, zip, country, items, userId } = data;

    if (!name || !email || !items || !items.length) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    const total   = items.reduce((sum, i) => sum + i.price * i.qty, 0);
    const orderId = genOrderId();

    await sbInsert('orders', {
      id:               orderId,
      user_id:          userId  || null,
      customer_name:    name,
      customer_email:   email,
      customer_phone:   phone   || null,
      shipping_address: address || null,
      shipping_city:    city    || null,
      shipping_zip:     zip     || null,
      shipping_country: country || null,
      items:            items,
      total:            parseFloat(total.toFixed(2)),
      status:           'confirmed'
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ orderId, total: parseFloat(total.toFixed(2)) })
    };
  } catch (err) {
    console.error('[checkout]', err.message);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: err.message || 'Internal server error' })
    };
  }
};
