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
  shopMetafields?: Array<{ key: string; value: string; namespace: string }>;
  blogArticles?: Array<{ title: string; contentPreview: string; publishedAt: string }>;
  scrapedMetadata?: {
    title: string;
    metaDescription: string;
    headings: string[];
    ogTags: Record<string, string>;
    hasSchemaOrg: boolean;
    hasOgTags: boolean;
    schemaTypes: string[];
    estimatedProductCount: number;
  };
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
      const shopData = await fetchShopifyApi(
        cleanDomain,
        adminToken,
        "shop.json",
      ) as {
        shop: { name: string; email: string; currency: string };
      };

      const productsData = await fetchShopifyApi(
        cleanDomain,
        adminToken,
        "products.json?limit=250&fields=id,title,body_html,vendor,product_type,tags,variants,images,metafields",
      ) as { products: ShopifyProduct[] };

      // Fetch additional data in parallel — individual failures are non-fatal
      const [policiesResult, metafieldsResult, blogsResult] =
        await Promise.allSettled([
          fetchShopifyApi(cleanDomain, adminToken, "policies.json") as Promise<{
            policies: Array<{
              title: string;
              body: string;
              handle: string;
            }>;
          }>,
          fetchShopifyApi(
            cleanDomain,
            adminToken,
            "metafields.json?limit=50",
          ) as Promise<{
            metafields: Array<{
              key: string;
              value: string;
              namespace: string;
            }>;
          }>,
          (async () => {
            const blogsData = (await fetchShopifyApi(
              cleanDomain,
              adminToken,
              "blogs.json",
            )) as { blogs: Array<{ id: string; title: string; handle: string }> };

            if (!blogsData.blogs || blogsData.blogs.length === 0) return { articles: [] };

            const firstBlog = blogsData.blogs[0];
            if (!firstBlog) return { articles: [] };

            return fetchShopifyApi(
              cleanDomain,
              adminToken,
              `blogs/${firstBlog.id}/articles.json?limit=5&fields=title,body_html,published_at`,
            ) as Promise<{
              articles: Array<{
                title: string;
                body_html: string;
                published_at: string;
              }>;
            }>;
          })(),
        ]);

      const policies =
        policiesResult.status === "fulfilled"
          ? policiesResult.value.policies
          : [];
      const policiesMap = Object.fromEntries(
        policies.map((p) => [p.handle, p.body?.slice(0, 500) || ""]),
      );

      const shopMetafields =
        metafieldsResult.status === "fulfilled"
          ? metafieldsResult.value.metafields
          : [];

      const rawArticles =
        blogsResult.status === "fulfilled" && "articles" in blogsResult.value
          ? (blogsResult.value as { articles: Array<{ title: string; body_html: string; published_at: string }> }).articles
          : [];
      const blogArticles = rawArticles.map((a) => ({
        title: a.title,
        contentPreview: (a.body_html ?? "").replace(/<[^>]+>/g, "").slice(0, 300),
        publishedAt: a.published_at,
      }));

      return {
        name: shopData.shop.name,
        domain: cleanDomain,
        email: shopData.shop.email,
        currency: shopData.shop.currency,
        products: productsData.products,
        productCount: productsData.products.length,
        accessedViaApi: true,
        policies: {
          shipping: policiesMap["shipping-policy"] ?? "",
          returns: policiesMap["refund-policy"] ?? "",
          privacy: policiesMap["privacy-policy"] ?? "",
        },
        shopMetafields,
        blogArticles,
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

  const headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };

  // STEP 1: Try /products.json (works for actual Shopify myshopify.com stores and some custom domains)
  try {
    const productsUrl = `${baseUrl}/products.json?limit=30`;
    const res = await fetch(productsUrl, {
      headers: { ...headers, Accept: "application/json" },
      signal: AbortSignal.timeout(10000),
    });

    if (res.ok) {
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json") || contentType.includes("text/json")) {
        const data = (await res.json()) as { products?: ShopifyProduct[] };
        if (data.products && Array.isArray(data.products) && data.products.length > 0) {
          logger.info({ domain, count: data.products.length }, "Got products via /products.json");
          const storeName = cleanDomain.split(".")[0] ?? cleanDomain;
          return {
            name: storeName.charAt(0).toUpperCase() + storeName.slice(1),
            domain: cleanDomain,
            products: data.products.slice(0, 30),
            productCount: data.products.length,
            accessedViaApi: false,
          };
        }
      }
    }
  } catch (err) {
    logger.info({ domain }, "products.json unavailable, falling back to HTML scrape");
  }

  // STEP 2: HTML scraping for non-standard Shopify and custom domains
  logger.info({ domain }, "Starting full HTML scrape");

  try {
    const res = await fetch(baseUrl, {
      headers,
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    const html = await res.text();
    logger.info({ domain, htmlLength: html.length }, "HTML fetched, parsing");

    // Extract page title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const pageTitle = titleMatch ? titleMatch[1]!.trim() : "";

    // Extract meta description
    const metaDescMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
      ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i);
    const metaDescription = metaDescMatch ? metaDescMatch[1]!.trim() : "";

    // Extract OG tags
    const ogTags: Record<string, string> = {};
    const ogMatches = html.matchAll(/<meta[^>]+property=["'](og:[^"']+)["'][^>]+content=["']([^"']*?)["']/gi);
    for (const match of ogMatches) {
      ogTags[match[1]!] = match[2]!;
    }
    // Also try reversed attribute order
    const ogMatchesRev = html.matchAll(/<meta[^>]+content=["']([^"']*?)["'][^>]+property=["'](og:[^"']+)["']/gi);
    for (const match of ogMatchesRev) {
      if (!ogTags[match[2]!]) ogTags[match[2]!] = match[1]!;
    }

    // Extract schema.org JSON-LD
    const schemaMatches = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
    const schemaBlocks: Array<Record<string, unknown>> = [];
    for (const match of schemaMatches) {
      try {
        const parsed = JSON.parse(match[1]!) as Record<string, unknown>;
        schemaBlocks.push(parsed);
      } catch {
        // skip malformed
      }
    }
    const schemaTypes = schemaBlocks.map((b) => (b["@type"] as string) ?? "unknown");

    // Extract headings (h1, h2, h3) — strip HTML tags
    const headings: string[] = [];
    const headingMatches = html.matchAll(/<h[123][^>]*>([\s\S]*?)<\/h[123]>/gi);
    for (const match of headingMatches) {
      const text = match[1]!.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (text && text.length > 5 && text.length < 200) {
        headings.push(text);
      }
    }
    const topHeadings = headings.slice(0, 15);

    // Extract product-like text blocks from paragraphs / divs
    const productSections: string[] = [];
    const productKeywords = ["product", "price", "$", "buy", "add to cart", "shop", "collection", "item", "sale", "offer"];
    const blockMatches = html.matchAll(/<(?:p|div|section|article)[^>]*>([\s\S]{50,500}?)<\/(?:p|div|section|article)>/gi);
    for (const match of blockMatches) {
      const text = match[1]!.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (text.length > 50 && text.length < 500) {
        const lower = text.toLowerCase();
        if (productKeywords.some((kw) => lower.includes(kw))) {
          productSections.push(text);
        }
      }
      if (productSections.length >= 15) break;
    }

    // Count price signals
    const priceMatches = html.match(/\$[\d,]+\.?\d*/g) ?? [];
    const estimatedProductCount = Math.max(priceMatches.length, productSections.length);

    // Determine store name
    let shopName = ogTags["og:site_name"] ?? "";
    if (!shopName) {
      // Try title: "Store Name | Tagline" or "Store Name - Tagline"
      shopName = pageTitle.split(/[|\-–]/)[0]?.trim() ?? "";
    }
    if (!shopName) {
      const domainParts = cleanDomain.split(".");
      shopName = domainParts[0] ?? cleanDomain;
      shopName = shopName.charAt(0).toUpperCase() + shopName.slice(1);
    }

    // Build store description
    const storeDescription = metaDescription || ogTags["og:description"] || topHeadings[0] || "";

    // Synthesize products from scraped product sections
    const syntheticProducts: ShopifyProduct[] = productSections.map((section, i) => ({
      id: `scraped_${i}`,
      title: topHeadings[i + 1] ?? `Product ${i + 1}`,
      body_html: `<p>${section}</p>`,
      vendor: shopName,
      product_type: "Product",
      tags: "",
      variants: [{ price: "N/A", sku: `sku_${i}`, inventory_quantity: 1 }],
      images: [],
    }));

    const scrapedMetadata = {
      title: pageTitle,
      metaDescription,
      headings: topHeadings,
      ogTags,
      hasSchemaOrg: schemaBlocks.length > 0,
      hasOgTags: Object.keys(ogTags).length > 0,
      schemaTypes,
      estimatedProductCount,
    };

    logger.info(
      {
        domain,
        shopName,
        productSections: productSections.length,
        headings: topHeadings.length,
        schemaBlocks: schemaBlocks.length,
        ogTags: Object.keys(ogTags).length,
        prices: priceMatches.length,
      },
      "HTML scrape complete",
    );

    return {
      name: shopName,
      domain: cleanDomain,
      description: storeDescription,
      products: syntheticProducts,
      productCount: estimatedProductCount,
      accessedViaApi: false,
      scrapedMetadata,
    };
  } catch (err) {
    logger.error({ err, domain }, "HTML scrape failed completely");
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
