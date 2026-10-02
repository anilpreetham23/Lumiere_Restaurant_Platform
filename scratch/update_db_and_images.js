const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Read .env.local
const envPath = path.join(__dirname, "..", ".env.local");
let envText = "";
if (fs.existsSync(envPath)) {
  envText = fs.readFileSync(envPath, "utf8");
}

function getEnv(key) {
  const match = envText.match(new RegExp(`^${key}=(.*)$`, "m"));
  return match ? match[1].trim() : process.env[key];
}

const supabaseUrl = getEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const supabaseServiceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY") || supabaseAnonKey;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase configuration!");
  process.exit(1);
}

// 1. Copy generated images to public/img/menu/
const artifactDir = "C:\\Users\\Dell\\.gemini\\antigravity-ide\\brain\\1ccc38d2-4578-48ce-86b3-ac5a1473ba5e";
const publicMenuDir = path.join(__dirname, "..", "public", "img", "menu");

if (!fs.existsSync(publicMenuDir)) {
  fs.mkdirSync(publicMenuDir, { recursive: true });
}

const filesInArtifact = fs.readdirSync(artifactDir);

const mapping = {
  butter_chicken: "1.jpg",
  paneer_tikka: "2.jpg",
  rogan_josh: "3.jpg",
  indian_biryani: "4.jpg",
  shahi_tukda: "5.jpg",
  dal_makhani: "6.jpg",
};

for (const [key, targetName] of Object.entries(mapping)) {
  const found = filesInArtifact.find((f) => f.startsWith(key) && f.endsWith(".jpg"));
  if (found) {
    const src = path.join(artifactDir, found);
    const dest = path.join(publicMenuDir, targetName);
    fs.copyFileSync(src, dest);
    console.log(`Copied ${found} -> ${targetName}`);
  }
}

// 2. Update Supabase menu_items table
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const newItems = [
  {
    id: "awadhi-biryani",
    title: "Royal Awadhi Mutton Dum Biryani",
    cuisine: "Royal Mughlai",
    price: 480,
    image: "/img/menu/4.jpg",
    short: "Tender lamb, long-grain basmati rice, saffron, kewra & hand-sealed dough dum",
    description: "Tender lamb pieces marinated in artisanal spices, layered with aged royal basmati rice, saffron, and rose water, slow-cooked under a sealed dough crust in authentic Lucknowi style.",
    tags: ["Signature", "Slow-Cooked", "Awadhi Dum"],
    badge: "Signature",
    rating: 4.9,
    reviews: 245,
    prep_minutes: 30,
    sort: 10,
    dietary: ["Non-Vegetarian"],
    spice: 2,
    available: true,
  },
  {
    id: "galouti-kebab",
    title: "Melt-in-Mouth Galouti Kebab",
    cuisine: "Royal Mughlai",
    price: 420,
    image: "/img/menu/1.jpg",
    short: "Finely minced spiced lamb patty, raw papaya tenderizer & saffron sheermal bread",
    description: "A legendary recipe from the royal kitchens of Awadh. Melt-in-mouth lamb kebabs infused with 160 secret spices, served on warm saffron-infused sheermal bread.",
    tags: ["Chef's Special", "Royal Awadh"],
    badge: "Most Loved",
    rating: 4.9,
    reviews: 180,
    prep_minutes: 20,
    sort: 20,
    dietary: ["Non-Vegetarian"],
    spice: 2,
    available: true,
  },
  {
    id: "butter-chicken-lumiere",
    title: "Butter Chicken Grand Lumière",
    cuisine: "North Indian",
    price: 380,
    image: "/img/menu/1.jpg",
    short: "Charcoal-smoked tandoori chicken, velvet vine-ripened tomato gravy & white butter",
    description: "Succulent charcoal-grilled chicken cooked in a rich velvety gravy of vine-ripened tomatoes, cashew paste, kasuri methi, and fresh farm butter.",
    tags: ["North Indian", "Classic"],
    badge: "Bestseller",
    rating: 4.8,
    reviews: 310,
    prep_minutes: 25,
    sort: 30,
    dietary: ["Non-Vegetarian"],
    spice: 1,
    available: true,
  },
  {
    id: "dal-makhani-overnight",
    title: "Signature Overnight Dal Makhani",
    cuisine: "North Indian",
    price: 280,
    image: "/img/menu/6.jpg",
    short: "Whole black urad lentils simmered for 24 hours over charcoal coals with white butter",
    description: "Whole black lentils and kidney beans slow-simmered for 24 hours over gentle charcoal embers, finished with churned white butter and fresh cream.",
    tags: ["Vegetarian", "Comfort"],
    badge: null,
    rating: 4.9,
    reviews: 195,
    prep_minutes: 15,
    sort: 40,
    dietary: ["Vegetarian"],
    spice: 1,
    available: true,
  },
  {
    id: "rogan-josh",
    title: "Kashmiri Mutton Rogan Josh",
    cuisine: "North Indian",
    price: 450,
    image: "/img/menu/3.jpg",
    short: "Slow-braised lamb, Kashmiri red chilli, ratan jot & aromatic saffron gravy",
    description: "Slow-braised tender lamb shoulder in a rich gravy infused with Kashmiri dry red chillies, fennel seeds, ginger, and natural ratan jot extract.",
    tags: ["Kashmiri", "Aromatic"],
    badge: null,
    rating: 4.8,
    reviews: 140,
    prep_minutes: 35,
    sort: 50,
    dietary: ["Non-Vegetarian"],
    spice: 3,
    available: true,
  },
  {
    id: "chettinad-lobster",
    title: "Chettinad Lobster Pepper Fry",
    cuisine: "South Indian",
    price: 680,
    image: "/img/menu/3.jpg",
    short: "Fresh ocean lobster roasted with cracked black pepper, curry leaves & roasted coconut",
    description: "Fresh bay lobster tossed in a fierce, aromatic blend of freshly ground Tellicherry black pepper, star anise, roasted coconut, and crispy curry leaves.",
    tags: ["Seafood", "Spicy", "Chef's Pick"],
    badge: "Chef's Pick",
    rating: 5.0,
    reviews: 95,
    prep_minutes: 25,
    sort: 60,
    dietary: ["Non-Vegetarian", "Seafood"],
    spice: 3,
    available: true,
  },
  {
    id: "malabar-prawn-moilee",
    title: "Malabar Prawn Moilee",
    cuisine: "Coastal Seafood",
    price: 520,
    image: "/img/menu/3.jpg",
    short: "Tiger prawns simmered in light coconut milk, green chilli, turmeric & hot appams",
    description: "Plump tiger prawns gently poached in a creamy, coconut milk curry infused with green chillies, fresh ginger, and turmeric, served alongside lacy rice appams.",
    tags: ["Coastal", "Kerala Special"],
    badge: null,
    rating: 4.8,
    reviews: 112,
    prep_minutes: 20,
    sort: 70,
    dietary: ["Non-Vegetarian", "Seafood"],
    spice: 2,
    available: true,
  },
  {
    id: "goan-fish-curry",
    title: "Traditional Goan Kingfish Curry",
    cuisine: "Coastal Seafood",
    price: 440,
    image: "/img/menu/6.jpg",
    short: "Fresh kingfish slice cooked in spicy coconut-kokum gravy & red rice",
    description: "Catch of the day kingfish simmered in a tangy, fiery Goan spice paste of red chillies, coriander seeds, and tart kokum berries.",
    tags: ["Seafood", "Goan Coastal"],
    badge: null,
    rating: 4.7,
    reviews: 86,
    prep_minutes: 20,
    sort: 80,
    dietary: ["Non-Vegetarian", "Seafood"],
    spice: 2,
    available: true,
  },
  {
    id: "paneer-tikka-angara",
    title: "Paneer Tikka Angara with Truffle Naan",
    cuisine: "Tandoor & Starters",
    price: 340,
    image: "/img/menu/2.jpg",
    short: "Clay oven roasted cottage cheese cubes marinated in yellow chilli, mustard oil & herbs",
    description: "Artisanal malai paneer marinated in yellow chilli paste, hung curd, and mustard oil, charred in a traditional clay oven and served with truffle-brushed garlic naan.",
    tags: ["Vegetarian", "Tandoor"],
    badge: "Popular",
    rating: 4.8,
    reviews: 160,
    prep_minutes: 18,
    sort: 90,
    dietary: ["Vegetarian"],
    spice: 2,
    available: true,
  },
  {
    id: "amritsari-fish-tikka",
    title: "Amritsari Tandoori Fish Tikka",
    cuisine: "Tandoor & Starters",
    price: 390,
    image: "/img/menu/6.jpg",
    short: "Crispy carom-seed (ajwain) spiced fish fillets fried to golden perfection",
    description: "Fresh river fish marinated in gram flour, carom seeds, lime juice, and Punjabi spices, crisp-fried and dusted with tangy chaat masala.",
    tags: ["Crispy", "Punjabi"],
    badge: null,
    rating: 4.7,
    reviews: 78,
    prep_minutes: 15,
    sort: 100,
    dietary: ["Non-Vegetarian", "Seafood"],
    spice: 2,
    available: true,
  },
  {
    id: "shahi-tukda",
    title: "Royal Shahi Tukda & Saffron Rabri",
    cuisine: "Mithai & Desserts",
    price: 220,
    image: "/img/menu/5.jpg",
    short: "Ghee-crisped brioche soaked in cardamom syrup, crowned with saffron rabri & silver leaf",
    description: "Crisp golden fried brioche soaked in fragrant cardamom syrup, smothered with thick saffron rabri, roasted pistachios, almonds, and edible silver vark.",
    tags: ["Sweet", "Royal Dessert"],
    badge: "Classic",
    rating: 4.9,
    reviews: 142,
    prep_minutes: 15,
    sort: 110,
    dietary: ["Vegetarian"],
    spice: 0,
    available: true,
  },
  {
    id: "kesar-phirni",
    title: "Kesar Pista Phirni in Clay Pot",
    cuisine: "Mithai & Desserts",
    price: 190,
    image: "/img/menu/5.jpg",
    short: "Slow-cooked ground rice pudding infused with saffron, cardamom & crushed pistachios",
    description: "Traditional North Indian ground rice pudding simmered with full-cream milk, Kashmiri saffron, cardamom, served chilled in traditional earthen matkas.",
    tags: ["Sweet", "Traditional"],
    badge: null,
    rating: 4.8,
    reviews: 98,
    prep_minutes: 10,
    sort: 120,
    dietary: ["Vegetarian"],
    spice: 0,
    available: true,
  },
];

async function updateDb() {
  console.log("Upserting new Indian menu items to Supabase menu_items table...");
  const { data, error } = await supabase.from("menu_items").upsert(newItems, { onConflict: "id" });
  if (error) {
    console.error("Error upserting to Supabase:", error);
  } else {
    console.log("Successfully updated Supabase menu_items table!");
  }

  // Also check if any old foreign items exist and update them or delete them if needed
  const oldIds = ["coq-au-vin", "boeuf-bourguignon", "risotto-tartufo", "tagliatelle-ragu", "wagyu-nigiri", "black-cod", "paella-valenciana", "gambas-ajillo", "creme-brulee", "tarte-tatin", "dal-makhani"];
  const { error: delErr } = await supabase.from("menu_items").delete().in("id", oldIds);
  if (delErr) {
    console.log("Note on old items cleanup:", delErr.message);
  } else {
    console.log("Cleaned up old foreign menu items from Supabase!");
  }
}

updateDb();
