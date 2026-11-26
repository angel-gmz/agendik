import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { AiProvider, AgentConfig } from "@prisma/client";
import { decryptSecret } from "../crypto";
import type { LanguageModelV1, EmbeddingModel } from "ai";

export interface ResolvedAiRuntime {
  provider: AiProvider;
  modelName: string;
  apiKey: string;
  languageModel: LanguageModelV1 | null;
  embeddingModel: EmbeddingModel<string> | null;
  isLive: boolean;
  usingByok: boolean;
}

export function resolveAiRuntime(config: AgentConfig | null): ResolvedAiRuntime {
  const provider: AiProvider = config?.provider ?? AiProvider.OPENAI;
  const byokKey = decryptSecret(config?.byokApiKeyEncrypted);

  if (provider === AiProvider.GOOGLE) {
    const apiKey = byokKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
    const modelName = config?.model || process.env.DEFAULT_GOOGLE_MODEL || "gemini-3.1-flash-lite";
    if (!apiKey) {
      return {
        provider,
        modelName,
        apiKey: "",
        languageModel: null,
        embeddingModel: null,
        isLive: false,
        usingByok: false,
      };
    }
    const google = createGoogleGenerativeAI({ apiKey });
    return {
      provider,
      modelName,
      apiKey,
      languageModel: google(modelName),
      embeddingModel: google.textEmbeddingModel("text-embedding-004"),
      isLive: true,
      usingByok: Boolean(byokKey),
    };
  }

  // Default: OPENAI
  const apiKey = byokKey || process.env.OPENAI_API_KEY || "";
  const modelName = config?.model || process.env.DEFAULT_OPENAI_MODEL || "gpt-4o-mini";
  if (!apiKey) {
    return {
      provider: AiProvider.OPENAI,
      modelName,
      apiKey: "",
      languageModel: null,
      embeddingModel: null,
      isLive: false,
      usingByok: false,
    };
  }
  const openai = createOpenAI({ apiKey });
  return {
    provider: AiProvider.OPENAI,
    modelName,
    apiKey,
    languageModel: openai(modelName),
    embeddingModel: openai.embedding("text-embedding-3-small"),
    isLive: true,
    usingByok: Boolean(byokKey),
  };
}
