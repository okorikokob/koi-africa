import type { ReactNode } from "react";

type Props = {
  title: string;
  children?: ReactNode;
};

export function AdminTopbar({ title, children }: Props) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between gap-5 border-b border-border bg-background/85 px-9 py-4.5 backdrop-blur-md">
      <h1 className="font-display text-xl font-black tracking-tight text-text-primary">
        {title}
      </h1>
      {children}
    </div>
  );
}
