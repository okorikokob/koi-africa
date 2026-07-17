import { Reveal } from "@/components/motion/Reveal";

type Stat = { n: string; l: string };

export function StatBar({ stats }: { stats: Stat[] }) {
  return (
    <Reveal>
      <div className="mx-auto grid max-w-[1180px] grid-cols-2 gap-5 rounded-[22px] bg-ink px-6 py-8 md:grid-cols-4 md:px-10 md:py-11">
        {stats.map((s) => (
          <div key={s.l} className="text-center">
            <div className="font-display text-[28px] font-black leading-none text-white md:text-[38px]">
              {s.n}
            </div>
            <div className="mt-1.5 font-sans text-[11px] font-semibold text-white/45">{s.l}</div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
