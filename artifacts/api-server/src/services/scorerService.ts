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

const DIMENSION_WEIGHTS = {
  "Product Descriptions": 0.25,
  "SEO & Discoverability": 0.2,
  "Trust Signals": 0.2,
  "Review Coverage": 0.15,
  "Structured Data": 0.1,
  "Content Freshness": 0.1,
};

export async function scoreStore(store: ShopifyStoreData): Promise<ScorerResult> {
  const productSummaries = store.products.slice(0, 10).map((p) => ({
    id: String(p.id),
    title: p.title,
    descriptionLength: (p.body_html ?? "").replace(/<[^>]+>/g, "").length,
    hasImages: p.images && p.images.length > 0,
    imageAltTexts: p.images?.map((i) => i.alt).filter(Boolean).length ?? 0,
    variants: p.variants?.length ?? 0,
    tags: p.tags,
    vendor: p.vendor,
  }));

  const systemPrompt = `You are an AI representation quality analyst. You evaluate how well Shopify stores are represented to AI shopping agents like ChatGPT Shopping, Perplexity, and Google Shopping AI.

You analyze stores across these dimensions and assign scores 0-100:
1. Product Descriptions (weight: 0.25) - Are descriptions detailed, benefit-focused, and written for how AI agents parse product intent?
2. SEO & Discoverability (weight: 0.20) - Are tags, titles, and metadata optimized for AI query matching?
3. Trust Signals (weight: 0.20) - Does the store communicate brand credibility, policies, and social proof?
4. Review Coverage (weight: 0.15) - Are reviews present and sufficient for AI recommendation confidence?
5. Structured Data (weight: 0.10) - Is product data structured (variants, SKUs, specs) for machine parsing?
6. Content Freshness (weight: 0.10) - Is the content recent and regularly updated?

Return ONLY a JSON object with this exact structure. No markdown, no extra text.`;

  const userPrompt = `Analyze this Shopify store for AI representation quality:

Store Name: ${store.name}
Domain: ${store.domain}
Total Products: ${store.productCount}
Has API Access: ${store.accessedViaApi}

Product Sample (${productSummaries.length} products):
${JSON.stringify(productSummaries, null, 2)}

Return this exact JSON structure:
{
  "storeDescription": "1-2 sentence neutral description of what this store sells",
  "dimensions": [
    {
      "name": "Product Descriptions",
      "score": 0-100,
      "weight": 0.25,
      "explanation": "2-3 sentences explaining the score"
    },
    {
      "name": "SEO & Discoverability",
      "score": 0-100,
      "weight": 0.20,
      "explanation": "..."
    },
    {
      "name": "Trust Signals",
      "score": 0-100,
      "weight": 0.20,
      "explanation": "..."
    },
    {
      "name": "Review Coverage",
      "score": 0-100,
      "weight": 0.15,
      "explanation": "..."
    },
    {
      "name": "Structured Data",
      "score": 0-100,
      "weight": 0.10,
      "explanation": "..."
    },
    {
      "name": "Content Freshness",
      "score": 0-100,
      "weight": 0.10,
      "explanation": "..."
    }
  ],
  "productScores": [
    {
      "id": "product_id_string",
      "title": "product title",
      "aiScore": 0-100,
      "issues": ["Issue 1", "Issue 2"]
    }
  ],
  "gaps": [
    {
      "category": "category name",
      "title": "Short gap title",
      "severity": "critical|high|medium|low",
      "impact": "1 sentence describing the AI recommendation impact",
      "affectedCount": number_of_products_affected
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
    scoredProducts: result.productScores,
    storeDescription: result.storeDescription,
  };
}
