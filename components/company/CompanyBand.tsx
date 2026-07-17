import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";

type Props = {
  watermark: string;
  eyebrow?: string;
  statusPill?: string;
  title: string;
  highlight: string;
  subtitle: string;
};

// Splits the title on the highlighted phrase so it can be rendered with the
// stroked-accent treatment used across KOI's dark sections.
function TitleWithHighlight({ title, highlight }: { title: string; highlight: string }) {
  const idx = title.indexOf(highlight);
  if (idx === -1) return <>{title}</>;
  return (
    <>
      {title.slice(0, idx)}
      <em
        className="not-italic"
        style={{ color: "transparent", WebkitTextStroke: "1.5px #5BA3FF" }}
      >
        {highlight}
      </em>
      {title.slice(idx + highlight.length)}
    </>
  );
}

export function CompanyBand({ watermark, eyebrow, statusPill, title, highlight, subtitle }: Props) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#001f4d] to-primary px-5 py-14 md:px-16 md:py-24">
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-8px] top-1/2 -translate-y-1/2 select-none font-display text-[160px] font-black leading-none text-white/[0.06] md:right-[2%] md:text-[300px]"
      >
        {watermark}
      </div>
      <div className="relative z-10 mx-auto max-w-[1440px]">
        <Reveal>
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1.5 font-sans text-sm font-semibold text-white/55 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={2} />
            Home
          </Link>
          {statusPill ? (
            <div className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 font-sans text-[11px] font-extrabold tracking-[0.02em] text-[#FFD98A]">
              {statusPill}
            </div>
          ) : (
            <div className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/[0.18] bg-white/10 px-3.5 py-1.5 font-sans text-[11px] font-extrabold uppercase tracking-[0.15em] text-accent-blue-light">
              {eyebrow}
            </div>
          )}
          <h1 className="max-w-[560px] font-display text-[32px] font-black leading-[1.08] tracking-[-0.5px] text-white md:max-w-[720px] md:text-[52px]">
            <TitleWithHighlight title={title} highlight={highlight} />
          </h1>
          <p className="mt-3 max-w-[440px] font-sans text-sm leading-[1.6] text-white/60 md:max-w-[520px] md:text-base">
            {subtitle}
          </p>
        </Reveal>
      </div>
    </div>
  );
}
