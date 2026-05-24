/**
 * Build script: reads Netlify env vars and writes js/config.js
 * Run via: node scripts/inject-config.js
 */

const fs   = require('fs');
const path = require('path');

const out = path.join(__dirname, '..', 'js', 'config.js');

const supabaseUrl  = process.env.SUPABASE_URL  || '';
const supabaseKey  = process.env.SUPABASE_ANON_KEY || '';
const adminSecret  = process.env.MP_ADMIN_SECRET || 'markuspro2026';

if (!supabaseUrl || !supabaseKey) {
  console.warn('[inject-config] SUPABASE_URL or SUPABASE_ANON_KEY not set — config.js will be empty.');
}

const content = `/* AUTO-GENERATED — do not edit. Rebuilt on every deploy. */
window.__MP_CONFIG = ${JSON.stringify({ supabaseUrl, supabaseKey, adminSecret })};
`;

fs.writeFileSync(out, content, 'utf8');
console.log('[inject-config] Written', out);
