import type { ReactNode } from "react";
import { Reveal } from "@/components/motion/Reveal";

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

export function CtaBanner({ title, subtitle, children }: Props) {
  return (
    <Reveal>
      <div className="mx-auto max-w-[1180px] rounded-[22px] bg-ink px-6 py-9 text-center md:px-14 md:py-14">
        <div className="font-display text-2xl font-black text-white md:text-[30px]">{title}</div>
        <p className="mx-auto mt-2 max-w-[400px] font-sans text-[13.5px] leading-[1.55] text-white/50">
          {subtitle}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">{children}</div>
      </div>
    </Reveal>
  );
}
