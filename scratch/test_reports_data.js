const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const vars = {};
env.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) vars[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const client = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY || vars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function test() {
  const { data: orders, error } = await client.from('session_orders').select('*');
  console.log('Orders count:', orders ? orders.length : 0);
  console.log('Error:', error);
  if (orders && orders.length > 0) {
    console.log('Sample order:', orders[0]);
  }
}

test();
