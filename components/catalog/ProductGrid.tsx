import { StaggerGrid, StaggerItem } from "@/components/motion/StaggerGrid";
import { ProductCard } from "@/components/catalog/ProductCard";
import type { Product } from "@/types";

type Props = {
  products: Product[];
};

export function ProductGrid({ products }: Props) {
  return (
    <StaggerGrid className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
      {products.map((product) => (
        <StaggerItem key={product.id}>
          <ProductCard product={product} />
        </StaggerItem>
      ))}
    </StaggerGrid>
  );
}
