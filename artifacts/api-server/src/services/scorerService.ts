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
  confidence: number;
  confidenceExplanation: string;
  dimensions: ScoreDimension[];
  gaps: Gap[];
  scoredProducts: ProductAiScore[];
  storeDescription: string;
}

function calcConfidence(store: ShopifyStoreData): { confidence: number; explanation: string } {
  let confidence = 100;
  const missing: string[] = [];

  if (store.products.length === 0) {
    confidence -= 35;
    missing.push("no products found");
  } else if (store.products.length < 3) {
    confidence -= 15;
    missing.push("very few products");
  }

  const meta = store.scrapedMetadata;
  if (!meta?.hasSchemaOrg) {
    confidence -= 15;
    missing.push("no structured data");
  }

  if (!meta?.metaDescription) {
    confidence -= 10;
    missing.push("no meta description");
  }

  if (!store.description && (!meta?.title || meta.title.length < 10)) {
    confidence -= 10;
    missing.push("weak store identity signals");
  }

  if (!store.accessedViaApi) {
    confidence -= 5; // Slight penalty for scrape-only
  }

  const clamped = Math.max(40, Math.min(100, confidence));

  let explanation: string;
  if (clamped >= 80) {
    explanation = "High confidence — complete store data available via API or rich public data.";
  } else if (clamped >= 60) {
    explanation = `Medium confidence — analysis based on public data; ${missing.slice(0, 2).join(", ")}. Add admin token for higher accuracy.`;
  } else {
    explanation = `Lower confidence — limited public data (${missing.slice(0, 2).join(", ")}). For a full analysis, provide a Shopify Admin API token.`;
  }

  return { confidence: clamped, explanation };
}

export async function scoreStore(store: ShopifyStoreData): Promise<ScorerResult> {
  const meta = store.scrapedMetadata;
  const { confidence, explanation: confidenceExplanation } = calcConfidence(store);

  const productSummaries = store.products.slice(0, 10).map((p) => {
    const rawDescription = (p.body_html ?? "").replace(/<[^>]+>/g, "").trim();
    return {
      id: String(p.id),
      title: p.title,
      descriptionLength: rawDescription.length,
      descriptionPreview: rawDescription.slice(0, 200),
      hasImages: (p.images?.length ?? 0) > 0,
      imageAltTexts: p.images?.filter((i) => i.alt && i.alt.trim()).length ?? 0,
      variants: p.variants?.length ?? 0,
      tags: p.tags || "none",
      vendor: p.vendor,
    };
  });

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

Score across these 6 dimensions (0-100). Be realistic and critical — most stores have significant gaps. Use all context provided.

1. Product Descriptions (weight: 0.25) — Detailed, benefit-focused, rich enough for LLMs to parse product intent?
2. SEO & Discoverability (weight: 0.20) — Title tags, meta descriptions, content optimized for AI query matching?
3. Trust Signals (weight: 0.20) — Brand credibility, policies, social proof readable by AI agents?
4. Review Coverage (weight: 0.15) — Reviews present in schema.org markup where AI can read them?
5. Structured Data (weight: 0.10) — Schema.org JSON-LD present? Product, Organization, WebSite schemas?
6. Content Freshness (weight: 0.10) — Content recent and regularly updated?

Return ONLY a JSON object. No markdown, no extra text.`;

  const userPrompt = `Analyze this store for AI representation quality:

Store Name: ${store.name}
Domain: ${store.domain}
Store Description: ${store.description ?? "not available"}
Total Products Found: ${store.productCount}
Data Source: ${store.accessedViaApi ? "Shopify Admin API" : "Public HTML scrape"}
Analysis Confidence: ${confidence}% (${confidenceExplanation})

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
      "explanation": "2-3 sentences based on actual data. Reference specific findings."
    },
    {
      "name": "SEO & Discoverability",
      "score": 0-100,
      "weight": 0.20,
      "explanation": "Reference actual title/meta/OG values found."
    },
    {
      "name": "Trust Signals",
      "score": 0-100,
      "weight": 0.20,
      "explanation": "Reference specific policies, brand signals, or their absence."
    },
    {
      "name": "Review Coverage",
      "score": 0-100,
      "weight": 0.15,
      "explanation": "Reference schema.org Review types or their absence."
    },
    {
      "name": "Structured Data",
      "score": 0-100,
      "weight": 0.10,
      "explanation": "Reference JSON-LD schema types found or missing."
    },
    {
      "name": "Content Freshness",
      "score": 0-100,
      "weight": 0.10,
      "explanation": "Reference recency signals."
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

  // Limit gaps to top 7
  const rankedGaps = (result.gaps ?? []).slice(0, 7);

  return {
    overallScore: Math.round(overallScore),
    confidence,
    confidenceExplanation,
    dimensions: result.dimensions,
    gaps: rankedGaps,
    scoredProducts: result.productScores ?? [],
    storeDescription: result.storeDescription,
  };
}
