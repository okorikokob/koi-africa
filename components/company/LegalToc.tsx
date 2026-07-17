type Props = {
  items: { href: string; label: string }[];
};

export function LegalToc({ items }: Props) {
  return (
    <nav className="sticky top-24 hidden flex-col md:flex">
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className="border-l-2 border-transparent py-2 pl-3.5 font-sans text-sm font-semibold text-text-secondary transition-colors hover:border-primary hover:text-primary"
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
