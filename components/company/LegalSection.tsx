type Props = {
  id: string;
  number: number;
  title: string;
  children: React.ReactNode;
};

export function LegalSection({ id, number, title, children }: Props) {
  return (
    <section id={id} className="border-b border-border py-6 last:border-none">
      <h2 className="mb-2.5 flex items-center font-display text-[15px] font-bold text-text-primary">
        <span className="mr-2.5 flex h-6.5 w-6.5 shrink-0 items-center justify-center rounded-lg bg-primary-soft font-sans text-xs font-extrabold text-primary">
          {number}
        </span>
        {title}
      </h2>
      <div className="flex flex-col gap-2 pl-9 font-sans text-[13.5px] leading-[1.7] text-text-secondary">
        {children}
      </div>
    </section>
  );
}
