import Link from "next/link";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { AllBrandsGrid } from "@/components/catalog/AllBrandsGrid";
import { getBrandSummaries } from "@/lib/catalog-db";
import { FEATURED_BRANDS } from "@/lib/mock-data";

export default async function BrandsPage() {
  const summaries = await getBrandSummaries(FEATURED_BRANDS);
  const heroImage = summaries.find((s) => s.imageUrl)?.imageUrl;

  return (
    <div className="min-h-screen bg-background">
      <div
        className="relative flex min-h-[180px] flex-col justify-end overflow-hidden px-5 pb-8 pt-11 md:min-h-[280px] md:px-16 md:pb-12 md:pt-[70px]"
        style={{ background: "linear-gradient(145deg, #000d1a 0%, var(--color-primary) 100%)" }}
      >
        {heroImage && (
          <Image
            src={heroImage}
            alt=""
            fill
            className="object-cover object-center opacity-[0.18]"
            priority
          />
        )}
        <div className="relative z-[1] mx-auto w-full md:max-w-[1440px]">
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1.5 font-sans text-[13px] font-semibold text-white/55 transition-colors duration-150 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Home
          </Link>
          <h1 className="mb-1 font-display text-[30px] font-black text-white md:text-[48px]">
            All Brands
          </h1>
          <p className="font-sans text-sm font-medium text-white/50 md:text-base">
            500+ global brands, all delivering to Nigeria
          </p>
        </div>
      </div>

      <AllBrandsGrid summaries={summaries} />
    </div>
  );
}
