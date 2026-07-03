const BRANDS = [
  "Nike",
  "Zara",
  "Gucci",
  "Sephora",
  "Apple",
  "Adidas",
  "Louis Vuitton",
  "Fenty Beauty",
  "Dyson",
  "Charlotte Tilbury",
  "New Balance",
  "H&M",
  "Hermès",
  "Levi's",
];

export function Marquee() {
  const track = [...BRANDS, ...BRANDS];

  return (
    <div className="overflow-hidden bg-primary py-3.5 md:py-[18px]">
      <div className="flex w-max animate-marquee whitespace-nowrap">
        {track.map((brand, i) => (
          <span
            key={`${brand}-${i}`}
            className="inline-flex items-center gap-4 px-4 text-xs font-bold uppercase tracking-[2px] text-white/85 md:text-[13px]"
          >
            {brand}
            <span className="text-lg leading-none text-white/30">·</span>
          </span>
        ))}
      </div>
    </div>
  );
}
