"use client";

import { useState, useMemo } from "react";
import { ProductGallery } from "@/components/product/ProductGallery";
import { ProductInfo } from "@/components/product/ProductInfo";
import type { Product } from "@/types";

type Props = {
  product: Product;
};

export function ProductDetailClient({ product }: Props) {
  const initialImages = useMemo(() => {
    const list = product.colourways?.[0]?.images
      ?? product.allImages
      ?? (product.imageUrl ? [product.imageUrl] : []);
    return list.filter(Boolean);
  }, [product]);

  const [images, setImages] = useState(initialImages);
  const [activeIndex, setActiveIndex] = useState(0);

  function handleColorChange(_colourwayIdentity: string, colorImgs: string[]) {
    if (colorImgs.length === 0) return;
    setImages(colorImgs);
    setActiveIndex(0);
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
