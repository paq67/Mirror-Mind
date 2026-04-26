import { chatCompleteJSON } from "./aiClient";
import type { ShopifyStoreData } from "./shopifyService";

export interface ScoreDimension {
  name: string;
  score: number;
  weight: number;
  explanation: string;
}

export interface Gap {
  category: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  impact: string;
  affectedCount: number;
}

export interface ProductAiScore {
  id: string;
  title: string;
  aiScore: number;
  issues: string[];
}

export interface ScorerResult {
  overallScore: number;
  dimensions: ScoreDimension[];
  gaps: Gap[];
  scoredProducts: ProductAiScore[];
  storeDescription: string;
}

export async function scoreStore(store: ShopifyStoreData): Promise<ScorerResult> {
  const meta = store.scrapedMetadata;

  // Build product summaries from both API data (body_html) and scraped data (body_html may be synthetic)
  const productSummaries = store.products.slice(0, 10).map((p) => {
    const rawDescription = (p.body_html ?? "").replace(/<[^>]+>/g, "").trim();
    return {
      id: String(p.id),
      title: p.title,
      descriptionLength: rawDescription.length,
      descriptionPreview: rawDescription.slice(0, 200),
      hasImages: p.images && p.images.length > 0,
      imageAltTexts: p.images?.filter((i) => i.alt && i.alt.trim()).length ?? 0,
      variants: p.variants?.length ?? 0,
      tags: p.tags || "none",
      vendor: p.vendor,
    };
  });

  // Build a rich context string using ALL scraped metadata
  const scrapedContext = meta
    ? `
Scraped Metadata:
- Page Title: ${meta.title || "missing"}
- Meta Description: ${meta.metaDescription || "missing"}
- Has Open Graph Tags: ${meta.hasOgTags} (${Object.keys(meta.ogTags).join(", ") || "none"})
- Has Schema.org JSON-LD: ${meta.hasSchemaOrg} (types: ${meta.schemaTypes.join(", ") || "none"})
- Top Headings: ${meta.headings.slice(0, 5).join(" | ") || "none"}
- Estimated Product Count from page: ${meta.estimatedProductCount}
OG Tags: ${JSON.stringify(meta.ogTags, null, 2)}
`.trim()
    : "No scraped metadata available.";

  const systemPrompt = `You are an AI representation quality analyst. You evaluate how well online stores are optimized to be discovered and recommended by AI shopping agents like ChatGPT Shopping, Perplexity, and Google Shopping AI.

You analyze stores across these 6 dimensions and assign scores 0-100:
1. Product Descriptions (weight: 0.25) — Are descriptions detailed, benefit-focused, and written for how AI agents parse product intent? Are they rich enough for a language model to understand what the product does?
2. SEO & Discoverability (weight: 0.20) — Are title tags, meta descriptions, and content optimized for AI query matching? Does the page title and meta description clearly convey what the store sells?
3. Trust Signals (weight: 0.20) — Does the store communicate brand credibility, policies, and social proof that an AI agent can read and surface?
4. Review Coverage (weight: 0.15) — Are reviews present and surfaced in schema.org markup where AI agents can read them?
5. Structured Data (weight: 0.10) — Is schema.org JSON-LD present? Are Product, Organization, or WebSite schemas present?
6. Content Freshness (weight: 0.10) — Is the content recent and regularly updated based on available signals?

Be realistic and critical — most stores have significant gaps. Use the full context provided.

Return ONLY a JSON object. No markdown, no extra text.`;

  const userPrompt = `Analyze this store for AI representation quality:

Store Name: ${store.name}
Domain: ${store.domain}
Store Description: ${store.description ?? "not available"}
Total Products Found: ${store.productCount}
Data Source: ${store.accessedViaApi ? "Shopify Admin API" : "Public HTML scrape"}

${scrapedContext}

Product Samples (${productSummaries.length}):
${JSON.stringify(productSummaries, null, 2)}

Return this exact JSON structure:
{
  "storeDescription": "1-2 sentence neutral description of what this store sells",
  "dimensions": [
    {
      "name": "Product Descriptions",
      "score": 0-100,
      "weight": 0.25,
      "explanation": "2-3 sentences explaining the score based on actual data"
    },
    {
      "name": "SEO & Discoverability",
      "score": 0-100,
      "weight": 0.20,
      "explanation": "2-3 sentences referencing the actual title/meta/OG data"
    },
    {
      "name": "Trust Signals",
      "score": 0-100,
      "weight": 0.20,
      "explanation": "2-3 sentences about policies, brand credibility signals found"
    },
    {
      "name": "Review Coverage",
      "score": 0-100,
      "weight": 0.15,
      "explanation": "2-3 sentences about review signals and schema.org Review types"
    },
    {
      "name": "Structured Data",
      "score": 0-100,
      "weight": 0.10,
      "explanation": "2-3 sentences about JSON-LD presence, schema types found"
    },
    {
      "name": "Content Freshness",
      "score": 0-100,
      "weight": 0.10,
      "explanation": "2-3 sentences about recency signals"
    }
  ],
  "productScores": [
    {
      "id": "product_id_string",
      "title": "product title",
      "aiScore": 0-100,
      "issues": ["Specific issue 1", "Specific issue 2"]
    }
  ],
  "gaps": [
    {
      "category": "category name",
      "title": "Short specific gap title",
      "severity": "critical|high|medium|low",
      "impact": "1 sentence describing the AI recommendation impact",
      "affectedCount": number_of_products_or_pages_affected
    }
  ]
}`;

  interface AiScorerResult {
    storeDescription: string;
    dimensions: ScoreDimension[];
    productScores: ProductAiScore[];
    gaps: Gap[];
  }

  const result = await chatCompleteJSON<AiScorerResult>(systemPrompt, userPrompt);

  const overallScore = result.dimensions.reduce(
    (sum, d) => sum + d.score * d.weight,
    0,
  );

  return {
    overallScore: Math.round(overallScore),
    dimensions: result.dimensions,
    gaps: result.gaps,
    scoredProducts: result.productScores ?? [],
    storeDescription: result.storeDescription,
  };
}
