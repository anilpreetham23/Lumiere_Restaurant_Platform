const ITEMS = [
  "Royal Awadhi Biryanis",
  "North Indian Tandoor",
  "Chettinad Coastal Seafood",
  "Mughlai Kebabs & Kormas",
  "Artisanal Indian Mithai",
  "Kashmiri Saffron Flavours",
  "Crafted Botanical Coolers",
];

export default function Marquee() {
  const row = [...ITEMS, ...ITEMS];
  return (
    <div className="bg-wine text-white/90 py-4 overflow-hidden">
      <div className="marquee-track">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-3 font-serif text-lg whitespace-nowrap">
            {t} <span className="text-gold">&#10022;</span>
          </span>
        ))}
      </div>
    </div>
  );
}
