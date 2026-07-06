"use client";

import { useState, useMemo } from "react";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import type { Product } from "@/types";

type Props = {
  product: Product;
};

export function ProductDetailClient({ product }: Props) {
  const images = useMemo(() => {
    const list = product.allImages ?? (product.imageUrl ? [product.imageUrl] : []);
    return list.filter(Boolean);
  }, [product]);

  const [activeIndex, setActiveIndex] = useState(0);

  // When a color is selected, jump to that color's first image if available in our image set.
  // colorImageSets may be empty (MCP only returns 1 variant), in which case gallery stays put.
  function handleColorChange(_colorName: string, colorImgs: string[]) {
    if (!colorImgs.length) return;
    // Find the first colorImg that exists in our images list
    for (const img of colorImgs) {
      const norm = (u: string) => u.split("?")[0];
      const idx = images.findIndex((i) => norm(i) === norm(img) || i === img);
      if (idx !== -1) {
        setActiveIndex(idx);
        return;
      }
    }
  }

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12 xl:gap-16">
      <ProductGallery
        images={images}
        title={product.title}
        activeIndex={activeIndex}
        onSelect={setActiveIndex}
        tag={product.tag}
      />
      <ProductInfo
        product={product}
        onColorChange={handleColorChange}
      />
    </div>
  );
}
