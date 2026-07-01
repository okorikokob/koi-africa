import { ProductListingPage } from "@/components/catalog/ProductListingPage";
import { getProducts } from "@/lib/catalog-db";
import { CATALOG_PRODUCTS } from "@/lib/mock-data";

export default async function ProductsPage() {
  const products = await getProducts();
  return <ProductListingPage initialProducts={products.length > 0 ? products : CATALOG_PRODUCTS} />;
}
