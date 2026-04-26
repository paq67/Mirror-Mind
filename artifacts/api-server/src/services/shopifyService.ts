import { logger } from "../lib/logger";

export interface ShopifyProduct {
  id: string;
  title: string;
  body_html: string;
  vendor: string;
  product_type: string;
  tags: string;
  variants: Array<{
    price: string;
    sku: string;
    inventory_quantity: number;
  }>;
  images: Array<{ src: string; alt: string | null }>;
  metafields?: Array<{ key: string; value: string; namespace: string }>;
}

export interface ShopifyStoreData {
  name: string;
  domain: string;
  email?: string;
  description?: string;
  products: ShopifyProduct[];
  productCount: number;
  currency?: string;
  policies?: {
    shipping?: string;
    returns?: string;
    privacy?: string;
  };
  accessedViaApi: boolean;
}

async function fetchShopifyApi(
  domain: string,
  token: string,
  endpoint: string,
): Promise<unknown> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const url = `https://${cleanDomain}/admin/api/2024-01/${endpoint}`;

  const response = await fetch(url, {
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Shopify API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

export async function fetchStoreData(
  domain: string,
  adminToken?: string,
): Promise<ShopifyStoreData> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");

  if (adminToken) {
    try {
      const [shopData, productsData] = await Promise.all([
        fetchShopifyApi(cleanDomain, adminToken, "shop.json") as Promise<{
          shop: { name: string; email: string; currency: string };
        }>,
        fetchShopifyApi(
          cleanDomain,
          adminToken,
          "products.json?limit=50&fields=id,title,body_html,vendor,product_type,tags,variants,images",
        ) as Promise<{ products: ShopifyProduct[] }>,
      ]);

      return {
        name: shopData.shop.name,
        domain: cleanDomain,
        email: shopData.shop.email,
        currency: shopData.shop.currency,
        products: productsData.products,
        productCount: productsData.products.length,
        accessedViaApi: true,
      };
    } catch (err) {
      logger.warn({ err, domain }, "Shopify API access failed, falling back to scraping");
    }
  }

  return scrapeStorefront(cleanDomain);
}

async function scrapeStorefront(domain: string): Promise<ShopifyStoreData> {
  const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const baseUrl = `https://${cleanDomain}`;

  try {
    const productsJsonUrl = `${baseUrl}/products.json?limit=30`;
    const response = await fetch(productsJsonUrl, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      throw new Error(`Could not access store at ${cleanDomain}`);
    }

    const data = (await response.json()) as { products: ShopifyProduct[] };
    const storeName = cleanDomain.split(".")[0] ?? cleanDomain;

    return {
      name: storeName.charAt(0).toUpperCase() + storeName.slice(1),
      domain: cleanDomain,
      products: data.products.slice(0, 30),
      productCount: data.products.length,
      accessedViaApi: false,
    };
  } catch (err) {
    logger.warn({ err, domain }, "Could not scrape store, using domain only");
    const storeName = cleanDomain.split(".")[0] ?? cleanDomain;
    return {
      name: storeName.charAt(0).toUpperCase() + storeName.slice(1),
      domain: cleanDomain,
      products: [],
      productCount: 0,
      accessedViaApi: false,
    };
  }
}
