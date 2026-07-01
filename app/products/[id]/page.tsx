import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { getProductById, getRelatedProductsForTitle } from "@/lib/catalog-db";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { ProductGrid } from "@/components/catalog/ProductGrid";
import { Reveal } from "@/components/motion/Reveal";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;

  const product = await getProductById(id);
  if (!product) notFound();

  const related = await getRelatedProductsForTitle(product.title, product.category, product.id, 4);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1280px] px-4 py-8 md:px-8 md:py-12">

        <nav className="mb-8 flex items-center gap-1.5 font-sans text-sm text-text-muted">
          <Link href="/" className="transition-colors duration-150 hover:text-text-primary">Home</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <Link href="/products" className="transition-colors duration-150 hover:text-text-primary">Products</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="line-clamp-1 text-text-primary">{product.title}</span>
        </nav>

        <ProductDetailClient product={product} />

        {related.length > 0 && (
          <section className="mt-20 md:mt-28">
            <Reveal>
              <div className="mb-8 flex items-end justify-between gap-4">
                <h2 className="font-display text-2xl font-bold text-text-primary md:text-3xl">
                  You might also like
                </h2>
                <Link href="/products" className="font-sans text-sm font-medium text-primary transition-colors duration-150 hover:text-primary-hover">
                  View all
                </Link>
              </div>
            </Reveal>
            <ProductGrid products={related} />
          </section>
        )}
      </div>
    </div>
  );
}
