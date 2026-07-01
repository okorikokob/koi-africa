import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { HOME_CATEGORY_TILES } from "@/lib/mock-data";
import { StaggerGrid, StaggerItem } from "@/components/motion/StaggerGrid";

export function CategoryTiles() {
  return (
    <section className="mx-auto max-w-[1280px] px-4 py-12 md:px-8 md:py-16">
      <StaggerGrid className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {HOME_CATEGORY_TILES.map((category) => (
          <StaggerItem key={category.slug}>
            <Link
              href={`/categories/${category.slug}`}
              className="group relative block aspect-[3/4] overflow-hidden rounded-card shadow-sm transition-shadow duration-250 hover:shadow-md"
            >
              <Image
                src={category.imageUrl}
                alt={category.name}
                fill
                sizes="(min-width: 768px) 25vw, 50vw"
                className="object-cover transition-transform duration-250 group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-text-primary/80 via-text-primary/10 to-transparent" />
              <div className="absolute bottom-0 left-0 flex flex-col gap-1 p-4">
                <p className="font-display text-lg font-bold text-primary-foreground md:text-xl">
                  {category.name}
                </p>
                <span className="inline-flex items-center gap-1 font-sans text-sm font-medium text-primary-foreground/90">
                  Shop Now
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          </StaggerItem>
        ))}
      </StaggerGrid>
    </section>
  );
}
