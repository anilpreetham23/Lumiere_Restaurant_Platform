export type Dish = {
  id: string;
  title: string;
  cuisine: "North Indian" | "South Indian" | "Royal Mughlai" | "Coastal Seafood" | "Tandoor & Starters" | "Mithai & Desserts";
  price: number; // INR
  image: string;
  short: string;
  description: string;
  tags: string[];
  badge?: string;
  rating: number;
  reviews: number;
};

export const CUISINES = [
  "All",
  "North Indian",
  "South Indian",
  "Royal Mughlai",
  "Coastal Seafood",
  "Tandoor & Starters",
  "Mithai & Desserts",
] as const;

export const MENU: Dish[] = [
  {
    id: "awadhi-biryani",
    title: "Royal Awadhi Mutton Dum Biryani",
    cuisine: "Royal Mughlai",
    price: 480,
    image: "/img/menu/4.jpg",
    short: "Tender tender lamb, long-grain basmati rice, saffron, kewra & hand-sealed dough dum",
    description:
      "Tender lamb pieces marinated in artisanal spices, layered with aged royal basmati rice, saffron, and rose water, slow-cooked under a sealed dough crust in authentic Lucknowi style.",
    tags: ["Signature", "Slow-Cooked", "Awadhi Dum"],
    badge: "Signature",
    rating: 4.9,
    reviews: 245,
  },
  {
    id: "galouti-kebab",
    title: "Melt-in-Mouth Galouti Kebab",
    cuisine: "Royal Mughlai",
    price: 420,
    image: "/img/menu/1.jpg",
    short: "Finely minced spiced lamb patty, raw papaya tenderizer & saffron sheermal bread",
    description:
      "A legendary recipe from the royal kitchens of Awadh. Melt-in-mouth lamb kebabs infused with 160 secret spices, served on warm saffron-infused sheermal bread.",
    tags: ["Chef's Special", "Royal Awadh"],
    badge: "Most Loved",
    rating: 4.9,
    reviews: 180,
  },
  {
    id: "butter-chicken-lumiere",
    title: "Butter Chicken Grand Lumière",
    cuisine: "North Indian",
    price: 380,
    image: "/img/menu/1.jpg",
    short: "Charcoal-smoked tandoori chicken, velvet vine-ripened tomato gravy & white butter",
    description:
      "Succulent charcoal-grilled chicken cooked in a rich velvety gravy of vine-ripened tomatoes, cashew paste, kasuri methi, and fresh farm butter.",
    tags: ["North Indian", "Classic"],
    badge: "Bestseller",
    rating: 4.8,
    reviews: 310,
  },
  {
    id: "dal-makhani-overnight",
    title: "Signature Overnight Dal Makhani",
    cuisine: "North Indian",
    price: 280,
    image: "/img/menu/4.jpg",
    short: "Whole black urad lentils simmered for 24 hours over charcoal coals with white butter",
    description:
      "Whole black lentils and kidney beans slow-simmered for 24 hours over gentle charcoal embers, finished with churned white butter and fresh cream.",
    tags: ["Vegetarian", "Comfort"],
    rating: 4.9,
    reviews: 195,
  },
  {
    id: "rogan-josh",
    title: "Kashmiri Mutton Rogan Josh",
    cuisine: "North Indian",
    price: 450,
    image: "/img/menu/4.jpg",
    short: "Slow-braised lamb, Kashmiri red chilli, ratan jot & aromatic saffron gravy",
    description:
      "Slow-braised tender lamb shoulder in a rich gravy infused with Kashmiri dry red chillies, fennel seeds, ginger, and natural ratan jot extract.",
    tags: ["Kashmiri", "Aromatic"],
    rating: 4.8,
    reviews: 140,
  },
  {
    id: "chettinad-lobster",
    title: "Chettinad Lobster Pepper Fry",
    cuisine: "South Indian",
    price: 680,
    image: "/img/menu/3.jpg",
    short: "Fresh ocean lobster roasted with cracked black pepper, curry leaves & roasted coconut",
    description:
      "Fresh bay lobster tossed in a fierce, aromatic blend of freshly ground Tellicherry black pepper, star anise, roasted coconut, and crispy curry leaves.",
    tags: ["Seafood", "Spicy", "Chef's Pick"],
    badge: "Chef's Pick",
    rating: 5.0,
    reviews: 95,
  },
  {
    id: "malabar-prawn-moilee",
    title: "Malabar Prawn Moilee",
    cuisine: "Coastal Seafood",
    price: 520,
    image: "/img/menu/3.jpg",
    short: "Tiger prawns simmered in light coconut milk, green chilli, turmeric & hot appams",
    description:
      "Plump tiger prawns gently poached in a creamy, coconut milk curry infused with green chillies, fresh ginger, and turmeric, served alongside lacy rice appams.",
    tags: ["Coastal", "Kerala Special"],
    rating: 4.8,
    reviews: 112,
  },
  {
    id: "goan-fish-curry",
    title: "Traditional Goan Kingfish Curry",
    cuisine: "Coastal Seafood",
    price: 440,
    image: "/img/menu/6.jpg",
    short: "Fresh kingfish slice cooked in spicy coconut-kokum gravy & red rice",
    description:
      "Catch of the day kingfish simmered in a tangy, fiery Goan spice paste of red chillies, coriander seeds, and tart kokum berries.",
    tags: ["Seafood", "Goan Coastal"],
    rating: 4.7,
    reviews: 86,
  },
  {
    id: "paneer-tikka-angara",
    title: "Paneer Tikka Angara with Truffle Naan",
    cuisine: "Tandoor & Starters",
    price: 340,
    image: "/img/menu/2.jpg",
    short: "Clay oven roasted cottage cheese cubes marinated in yellow chilli, mustard oil & herbs",
    description:
      "Artisanal malai paneer marinated in yellow chilli paste, hung curd, and mustard oil, charred in a traditional clay oven and served with truffle-brushed garlic naan.",
    tags: ["Vegetarian", "Tandoor"],
    badge: "Popular",
    rating: 4.8,
    reviews: 160,
  },
  {
    id: "amritsari-fish-tikka",
    title: "Amritsari Tandoori Fish Tikka",
    cuisine: "Tandoor & Starters",
    price: 390,
    image: "/img/menu/6.jpg",
    short: "Crispy carom-seed (ajwain) spiced fish fillets fried to golden perfection",
    description:
      "Fresh river fish marinated in gram flour, carom seeds, lime juice, and Punjabi spices, crisp-fried and dusted with tangy chaat masala.",
    tags: ["Crispy", "Punjabi"],
    rating: 4.7,
    reviews: 78,
  },
  {
    id: "shahi-tukda",
    title: "Royal Shahi Tukda & Saffron Rabri",
    cuisine: "Mithai & Desserts",
    price: 220,
    image: "/img/menu/5.jpg",
    short: "Ghee-crisped brioche soaked in cardamom syrup, crowned with saffron rabri & silver leaf",
    description:
      "Crisp golden fried brioche soaked in fragrant cardamom syrup, smothered with thick saffron rabri, roasted pistachios, almonds, and edible silver vark.",
    tags: ["Sweet", "Royal Dessert"],
    badge: "Classic",
    rating: 4.9,
    reviews: 142,
  },
  {
    id: "kesar-phirni",
    title: "Kesar Pista Phirni in Clay Pot",
    cuisine: "Mithai & Desserts",
    price: 190,
    image: "/img/menu/5.jpg",
    short: "Slow-cooked ground rice pudding infused with saffron, cardamom & crushed pistachios",
    description:
      "Traditional North Indian ground rice pudding simmered with full-cream milk, Kashmiri saffron, cardamom, served chilled in traditional earthen matkas.",
    tags: ["Sweet", "Traditional"],
    rating: 4.8,
    reviews: 98,
  },
];

export const money = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: n % 1 === 0 ? 0 : 2,
  }).format(n);

