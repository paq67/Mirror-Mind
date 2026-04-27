import { chatCompleteJSON } from "./aiClient";
import type { ShopifyStoreData } from "./shopifyService";

export interface PersonaResult {
  score: number;
  perceptionSummary: string;
  strengths: string[];
  weaknesses: string[];
  recommendationLikelihood: "High" | "Medium" | "Low";
  wouldRecommend: boolean;
}

export interface PersonaResults {
  dealHunter: PersonaResult;
  trustVerifier: PersonaResult;
  lifestyleMatcher: PersonaResult;
}

const PERSONA_PROMPTS = {
  dealHunter: `You are a "Deal Hunter" AI shopping agent. You help users find the best value for money.
You prioritize: clear pricing, promotional signals, comparison-friendly specs, shipping cost transparency, discount clarity.
You are skeptical of stores that don't clearly communicate value proposition.
Score this store 0-100 for how likely you'd recommend it to a deal-seeking shopper.`,

  trustVerifier: `You are a "Trust Verifier" AI shopping agent. You help users find reliable, trustworthy stores.
You prioritize: customer reviews, return/refund policies, brand credibility signals, secure checkout indicators, contact info.
You refuse to recommend stores without clear trust signals.
Score this store 0-100 for trustworthiness and credibility.`,

  lifestyleMatcher: `You are a "Lifestyle Matcher" AI shopping agent. You match products to user identity and lifestyle.
You prioritize: brand story, aesthetic coherence, product descriptions that speak to values and lifestyle, social proof.
You need to understand the "why" behind a product, not just the "what".
Score this store 0-100 for lifestyle alignment and brand clarity.`,
};

async function runPersona(
  personaKey: keyof typeof PERSONA_PROMPTS,
  systemPrompt: string,
  store: ShopifyStoreData,
): Promise<PersonaResult> {
  const meta = store.scrapedMetadata;
  const productSample = store.products.slice(0, 5).map((p) => ({
    title: p.title,
    description: (p.body_html ?? "").replace(/<[^>]+>/g, "").slice(0, 200).trim(),
    hasImages: (p.images?.length ?? 0) > 0,
  }));

  const storeContext = `Store: ${store.name} (${store.domain})
Description: ${store.description ?? "Not available"}
Products found: ${store.productCount}
${meta ? `Title: ${meta.title}
Meta description: ${meta.metaDescription}
Has schema.org: ${meta.hasSchemaOrg} (${meta.schemaTypes.join(", ") || "none"})
Has OG tags: ${meta.hasOgTags}
Top headings: ${meta.headings.slice(0, 3).join(" | ") || "none"}` : ""}
Product samples: ${JSON.stringify(productSample, null, 2)}`;

  const userPrompt = `${storeContext}

Return this exact JSON (no markdown):
{
  "score": 0-100,
  "perceptionSummary": "2-3 sentences describing how you as this persona perceive this store — be specific and honest",
  "strengths": ["1 specific strength", "1 specific strength"],
  "weaknesses": ["1 specific weakness", "1 specific weakness"],
  "recommendationLikelihood": "High|Medium|Low",
  "wouldRecommend": true|false
}`;

  try {
    const result = await chatCompleteJSON<PersonaResult>(systemPrompt, userPrompt, 0.4);

    // Sanity checks
    const score = typeof result.score === "number" && result.score >= 0 && result.score <= 100
      ? Math.round(result.score)
      : 50;

    const strengths = Array.isArray(result.strengths) && result.strengths.length > 0
      ? result.strengths.slice(0, 2)
      : ["Store has basic product information available"];

    const weaknesses = Array.isArray(result.weaknesses) && result.weaknesses.length > 0
      ? result.weaknesses.slice(0, 2)
      : ["Insufficient trust signals for confident recommendation"];

    const likelihood = ["High", "Medium", "Low"].includes(result.recommendationLikelihood)
      ? result.recommendationLikelihood as "High" | "Medium" | "Low"
      : score >= 70 ? "High" : score >= 45 ? "Medium" : "Low";

    return {
      score,
      perceptionSummary: result.perceptionSummary?.slice(0, 300) ?? "Analysis unavailable.",
      strengths,
      weaknesses,
      recommendationLikelihood: likelihood,
      wouldRecommend: typeof result.wouldRecommend === "boolean" ? result.wouldRecommend : score >= 55,
    };
  } catch (err) {
    return {
      score: 50,
      perceptionSummary: "Persona analysis unavailable — store data was insufficient.",
      strengths: ["Store is publicly accessible"],
      weaknesses: ["Insufficient data for confident evaluation"],
      recommendationLikelihood: "Low",
      wouldRecommend: false,
    };
  }
}

export async function simulatePersonas(store: ShopifyStoreData): Promise<PersonaResults> {
  const [dealHunter, trustVerifier, lifestyleMatcher] = await Promise.all([
    runPersona("dealHunter", PERSONA_PROMPTS.dealHunter, store),
    runPersona("trustVerifier", PERSONA_PROMPTS.trustVerifier, store),
    runPersona("lifestyleMatcher", PERSONA_PROMPTS.lifestyleMatcher, store),
  ]);

  return { dealHunter, trustVerifier, lifestyleMatcher };
}
