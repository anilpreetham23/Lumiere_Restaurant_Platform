const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const vars = {};
env.split('\n').forEach(line => {
  const [k, ...v] = line.split('=');
  if (k && v.length) vars[k.trim()] = v.join('=').trim().replace(/^["']|["']$/g, '');
});

const { createClient } = require('@supabase/supabase-js');
const client = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY || vars.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function seedOrders() {
  const restId = "00000000-0000-0000-0000-000000000001";
  
  // Get menu items
  const { data: menu } = await client.from('menu_items').select('*').eq('restaurant_id', restId);
  if (!menu || menu.length === 0) {
    console.log('No menu items found to seed orders.');
    return;
  }

  console.log(`Found ${menu.length} menu items.`);

  const sampleCustomers = [
    { name: "Rohan Sharma", phone: "+91 98765 43210" },
    { name: "Ananya Deshmukh", phone: "+91 98234 56789" },
    { name: "Vikramaditya Roy", phone: "+91 99123 45678" },
    { name: "Siddharth Malhotra", phone: "+91 97890 12345" },
    { name: "Priya Patel", phone: "+91 98111 22233" },
    { name: "Lord Harrington", phone: "+44 20 7946 0912" },
    { name: "Elena Rostova", phone: "+44 20 7946 0888" },
  ];

  const sources = ["dine_in", "dine_in", "takeaway", "swiggy", "zomato", "delivery"];
  const statuses = ["served", "served", "served", "served", "served", "ready"];

  // Helper to generate date ISO string
  const dates = [
    // Today (Sept 28, 2026)
    "2026-09-28T12:30:00.000Z",
    "2026-09-28T13:15:00.000Z",
    "2026-09-28T13:45:00.000Z",
    "2026-09-28T14:10:00.000Z",
    
    // Yesterday (Sept 27, 2026)
    "2026-09-27T18:00:00.000Z",
    "2026-09-27T19:30:00.000Z",
    "2026-09-27T20:45:00.000Z",

    // This Week (Sept 22 - Sept 26, 2026)
    "2026-09-26T13:00:00.000Z",
    "2026-09-25T19:00:00.000Z",
    "2026-09-24T20:00:00.000Z",
    "2026-09-23T12:45:00.000Z",

    // Earlier This Month (Sept 02 - Sept 20, 2026)
    "2026-09-18T19:30:00.000Z",
    "2026-09-15T20:15:00.000Z",
    "2026-09-12T13:30:00.000Z",
    "2026-09-08T19:00:00.000Z",
    "2026-09-03T20:30:00.000Z",

    // Past Month (August 2026)
    "2026-08-28T19:00:00.000Z",
    "2026-08-24T20:15:00.000Z",
    "2026-08-20T13:00:00.000Z",
    "2026-08-15T19:45:00.000Z",
    "2026-08-10T20:30:00.000Z",
    "2026-08-05T12:30:00.000Z",
  ];

  const orderRows = [];
  let orderNum = 1001;

  for (let i = 0; i < dates.length; i++) {
    const dt = dates[i];
    const cust = sampleCustomers[i % sampleCustomers.length];
    const src = sources[i % sources.length];
    const st = statuses[i % statuses.length];

    // Pick 2-4 items for each order
    const item1 = menu[i % menu.length];
    const item2 = menu[(i + 3) % menu.length];
    const item3 = menu[(i + 7) % menu.length];

    // Give higher quantities to Rayalaseema Chicken Curry and Risotto al Tartufo on Today and This Month to ensure clear bestsellers!
    const isToday = dt.startsWith("2026-09-28");
    const qty1 = isToday && item1.title.includes("Rayalaseema") ? 5 : (i % 3) + 1;
    const qty2 = isToday ? 2 : (i % 2) + 1;
    const qty3 = 1;

    const itemsArr = [
      {
        menu_item_id: item1.id,
        title: item1.title,
        name: item1.title,
        price: Number(item1.price),
        quantity: qty1,
        qty: qty1,
      },
      {
        menu_item_id: item2.id,
        title: item2.title,
        name: item2.title,
        price: Number(item2.price),
        quantity: qty2,
        qty: qty2,
      },
    ];

    if (i % 2 === 0) {
      itemsArr.push({
        menu_item_id: item3.id,
        title: item3.title,
        name: item3.title,
        price: Number(item3.price),
        quantity: qty3,
        qty: qty3,
      });
    }

    const subtotal = itemsArr.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const tax = Math.round(subtotal * 0.05);
    const total = subtotal + tax;

    orderRows.push({
      restaurant_id: restId,
      order_number: orderNum++,
      source: src,
      status: st,
      customer_name: cust.name,
      phone: cust.phone,
      items: itemsArr,
      subtotal: subtotal,
      tax: tax,
      total: total,
      amount: total,
      created_at: dt,
      updated_at: dt,
    });
  }

  const { data: inserted, error: err } = await client.from('session_orders').insert(orderRows).select();
  if (err) {
    console.error('Error inserting seed orders:', err);
  } else {
    console.log(`Successfully seeded ${inserted.length} realistic orders across Today, Yesterday, This Week, This Month, and Past Month!`);
  }
}

seedOrders();
