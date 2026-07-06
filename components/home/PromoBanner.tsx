import Link from "next/link";
import Image from "next/image";
import { Reveal } from "@/components/motion/Reveal";

export function PromoBanner() {
  return (
    <Reveal>
      <div className="px-5 md:px-16 mt-20">
        <div className="relative mx-auto mb-10 min-h-[220px] overflow-hidden rounded-[22px] md:mb-[72px] md:max-w-[1680px] md:min-h-[360px] md:rounded-[28px]">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(135deg, #001d45 0%, var(--color-primary-hover) 50%, var(--color-primary) 100%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.07) 1px, transparent 1px)",
              backgroundSize: "18px 18px",
            }}
          />
          <div className="absolute bottom-0 right-0 hidden h-full w-[42%] md:block md:w-[48%]">
            <Image src="/assets/bags.jpg" alt="" fill className="object-cover object-top" />
            <div
              className="absolute bottom-0 left-0 top-0 w-[60px]"
              style={{ background: "linear-gradient(to right, transparent, var(--color-primary-hover))" }}
            />
          </div>
          <div className="relative z-[2] flex min-h-[220px] items-end p-6 md:min-h-[360px] md:p-14">
            <div>
              <div className="mb-2 text-[9px] font-extrabold uppercase tracking-[2.5px] text-white/50 md:mb-3 md:text-[11px]">
                ✦ New Season 2026
              </div>
              <div className="mb-4 text-[26px] font-black leading-[1.1] text-white md:mb-[26px] md:text-[46px] md:tracking-[-1px]">
                Global brands.
                <br />
                <em className="not-italic text-accent-blue">Nigerian prices.</em>
              </div>
              <Link
                href="/brands"
                className="inline-block rounded-[10px] bg-surface px-5 py-2.5 text-[13px] font-extrabold text-primary transition-all duration-150 hover:-translate-y-px hover:shadow-lg md:rounded-[13px] md:px-[30px] md:py-3.5 md:text-[15px]"
              >
                Browse All Brands →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
