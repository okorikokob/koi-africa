import { ProductListingPage } from "@/components/catalog/ProductListingPage";
import { getProducts, getCategoryFacets } from "@/lib/catalog-db";
import { CATALOG_PRODUCTS } from "@/lib/mock-data";

const PAGE_SIZE = 24;

export default async function ProductsPage() {
  const [{ products, total }, categoryOptions] = await Promise.all([
    getProducts({ page: 1, pageSize: PAGE_SIZE }),
    getCategoryFacets(),
  ]);

  const useDb = products.length > 0;

  return (
    <ProductListingPage
      initialProducts={useDb ? products : CATALOG_PRODUCTS}
      initialTotal={useDb ? total : CATALOG_PRODUCTS.length}
      categoryOptions={useDb ? categoryOptions : []}
      pageSize={PAGE_SIZE}
    />
  );
}
