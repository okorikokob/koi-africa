"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Heart, ArrowLeft } from "lucide-react";
import type { Product } from "@/types";

type Props = {
  images: string[];
  title: string;
  activeIndex: number;
  onSelect: (index: number) => void;
  tag?: Product["tag"];
};

function badgeClasses(tag?: Product["tag"]) {
  switch (tag) {
    case "bestseller":
      return "bg-error text-white";
    case "new":
      return "bg-primary text-white";
    default:
      return "";
  }
}

function badgeLabel(tag?: Product["tag"]) {
  switch (tag) {
    case "bestseller":
      return "🔥 Hot";
    case "new":
      return "New";
    default:
      return null;
  }
}

export function ProductGallery({ images = [], title, activeIndex, onSelect, tag }: Props) {
  const router = useRouter();
  const [wished, setWished] = useState(false);
  const safeIndex = Math.max(0, Math.min(activeIndex, Math.max(0, images.length - 1)));
  const activeImage = images[safeIndex] ?? "";
  const showThumbs = images.length > 1;
  const label = badgeLabel(tag);

  const prev = () => onSelect(safeIndex > 0 ? safeIndex - 1 : images.length - 1);
  const next = () => onSelect(safeIndex < images.length - 1 ? safeIndex + 1 : 0);

  return (
    <div className="flex gap-3 lg:sticky lg:top-24">

      {/* Vertical thumbnail strip — hidden on mobile, visible sm+ */}
      {showThumbs && (
        <div className="hidden shrink-0 flex-col gap-2 sm:flex">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={`View image ${i + 1}`}
              className={`relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-xl bg-surface-secondary transition-all duration-150 ${
                i === safeIndex
                  ? "ring-2 ring-primary ring-offset-1"
                  : "ring-1 ring-border hover:ring-text-secondary"
              }`}
            >
              <Image
                src={src}
                alt={`${title} view ${i + 1}`}
                fill
                sizes="72px"
                className="object-contain p-1.5"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main image area */}
      <div className="relative min-w-0 flex-1">
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[24px] bg-surface-secondary">

          {/* Back button — mobile only */}
          <button
            type="button"
            aria-label="Go back"
            onClick={() => router.back()}
            className="absolute left-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 shadow-md backdrop-blur-sm lg:hidden"
          >
            <ArrowLeft className="h-4 w-4 text-text-primary" />
          </button>

          {label && (
            <span
              className={`absolute left-[62px] top-4 z-10 rounded-full px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.5px] lg:left-4 ${badgeClasses(tag)}`}
            >
              {label}
            </span>
          )}

          <button
            type="button"
            aria-label="Add to wishlist"
            onClick={() => setWished((w) => !w)}
            className={`absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 shadow-md backdrop-blur-sm transition-transform active:scale-125 ${
              wished ? "text-error" : "text-text-muted"
            }`}
          >
            <Heart className="h-[18px] w-[18px]" fill={wished ? "currentColor" : "none"} strokeWidth={2} />
          </button>

          {activeImage ? (
            <Image
              src={activeImage}
              alt={title}
              fill
              sizes="(min-width: 1024px) 40vw, 95vw"
              className="object-contain p-6 transition-opacity duration-200"
              priority
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="font-sans text-sm text-text-muted">No image</span>
            </div>
          )}
        </div>

        {/* Prev / Next arrows — bottom-right corner of main image */}
        {showThumbs && (
          <div className="absolute bottom-4 right-4 flex items-center gap-2">
            <button
              type="button"
              onClick={prev}
              aria-label="Previous image"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface shadow-sm transition-colors duration-150 hover:bg-surface-secondary"
            >
              <ChevronLeft className="h-4 w-4 text-text-primary" />
            </button>
            <button
              type="button"
              onClick={next}
              aria-label="Next image"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface shadow-sm transition-colors duration-150 hover:bg-surface-secondary"
            >
              <ChevronRight className="h-4 w-4 text-text-primary" />
            </button>
          </div>
        )}

        {/* Mobile dot indicators */}
        {showThumbs && (
          <div className="mt-3 flex justify-center gap-1.5 sm:hidden">
            {images.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(i)}
                aria-label={`Go to image ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-150 ${
                  i === safeIndex ? "w-4 bg-primary" : "w-1.5 bg-border"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
