import { Reveal } from "@/components/motion/Reveal";

type Props = {
  eyebrow: string;
  text: string;
  highlight: string;
};

function TextWithHighlight({ text, highlight }: { text: string; highlight: string }) {
  const idx = text.indexOf(highlight);
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <em className="not-italic text-accent-blue">{highlight}</em>
      {text.slice(idx + highlight.length)}
    </>
  );
}

export function MissionPanel({ eyebrow, text, highlight }: Props) {
  return (
    <Reveal>
      <div className="mx-auto max-w-[1180px] rounded-[24px] bg-gradient-to-br from-[#000d1a] to-primary px-6 py-10 md:px-16 md:py-14">
        <div className="mb-3.5 font-sans text-[11px] font-extrabold uppercase tracking-[0.15em] text-accent-blue-light">
          {eyebrow}
        </div>
        <p className="font-display text-[22px] font-extrabold leading-[1.35] text-white md:max-w-[720px] md:text-[28px]">
          <TextWithHighlight text={text} highlight={highlight} />
        </p>
      </div>
    </Reveal>
  );
}
