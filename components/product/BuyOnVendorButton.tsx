"use client";

import { ExternalLink } from "lucide-react";

type Props = {
  vendorUrl: string;
  vendorName: string;
};

export function BuyOnVendorButton({ vendorUrl, vendorName }: Props) {
  return (
    <a
      href={vendorUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex w-full items-center justify-center gap-2 rounded-button bg-primary px-6 py-4 font-display text-base font-medium text-primary-foreground transition-colors duration-150 hover:bg-primary-hover"
    >
      Buy on {vendorName}
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}
