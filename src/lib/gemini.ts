import type { CategorisationResult } from "../types/finance";
import type { CategorisationInput } from "./categorisation";
import { FALLBACK_CATEGORY, SEED_CATEGORIES } from "../types/finance";

const BUILTIN_CATEGORIES = [...SEED_CATEGORIES, FALLBACK_CATEGORY];

const GEMINI_MODEL = "gemini-2.0-flash";

type GeminiResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
};

export async function categoriseWithGemini(
  input: CategorisationInput,
  apiKey: string,
): Promise<CategorisationResult | null> {
  const trimmedKey = apiKey.trim();
  if (!trimmedKey) return null;

  const categoryList = BUILTIN_CATEGORIES.join(", ");
  const prompt = `Categorise this bank transaction into exactly one category from this list: ${categoryList}.

Return JSON only: {"category":"CategoryName","confidence":0.0-1.0,"explanation":"brief reason"}

Transaction:
- date: ${input.date}
- description: ${input.description}
- amount: ${input.amount}`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(trimmedKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    },
  );

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as GeminiResponse;
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as {
      category?: string;
      confidence?: number;
      explanation?: string;
    };
    const category = parsed.category?.trim();
    if (!category) return null;

    const match = BUILTIN_CATEGORIES.find(
      (c) => c.toLowerCase() === category.toLowerCase(),
    );

    return {
      category: match ?? FALLBACK_CATEGORY,
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.75)),
      method: "gemini",
      explanation: parsed.explanation ?? "Suggested by Gemini AI Assist",
    };
  } catch {
    return null;
  }
}
