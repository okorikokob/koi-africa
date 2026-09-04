const MARKETPLACE_HIGHLIGHTS = [
  "Nike",
  "Verified catalogue",
  "Exact variants",
  "Pay in naira",
  "Secure checkout",
  "Delivery to Nigeria",
  "More brands coming soon",
];

export function Marquee() {
  const track = [...MARKETPLACE_HIGHLIGHTS, ...MARKETPLACE_HIGHLIGHTS];

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
