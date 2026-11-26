export interface GeminiToolDeclaration {
  name: string;
  description: string;
  parameters: {
    type: "OBJECT";
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
}

export interface GeminiToolLoopResult {
  text: string;
  tokensInput: number;
  tokensOutput: number;
}

/**
 * Native Gemini v1beta REST tool-calling loop that preserves raw model parts
 * (including Gemini 3.x `thoughtSignature` on functionCall parts) across turns.
 */
export async function runGeminiToolLoop(params: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  temperature: number;
  tools: GeminiToolDeclaration[];
  executeTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  maxSteps?: number;
}): Promise<GeminiToolLoopResult> {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    params.model
  )}:generateContent?key=${encodeURIComponent(params.apiKey)}`;

  const contents: Array<{ role: string; parts: Array<Record<string, unknown>> }> =
    params.history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  let tokensInput = 0;
  let tokensOutput = 0;
  const maxSteps = params.maxSteps ?? 5;

  for (let step = 0; step < maxSteps; step++) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: params.systemPrompt }],
        },
        contents,
        tools: [
          {
            functionDeclarations: params.tools,
          },
        ],
        generationConfig: {
          temperature: params.temperature,
        },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      let errMsg = `Gemini API error (${res.status})`;
      try {
        const parsed = JSON.parse(errText);
        if (parsed?.error?.message) errMsg = parsed.error.message;
      } catch {
        // Keep raw
      }
      throw new Error(errMsg);
    }

    const data = (await res.json()) as {
      candidates?: Array<{
        content?: { role?: string; parts?: Array<Record<string, unknown>> };
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
      };
    };

    tokensInput += data.usageMetadata?.promptTokenCount ?? 0;
    tokensOutput += data.usageMetadata?.candidatesTokenCount ?? 0;

    const modelContent = data.candidates?.[0]?.content;
    const parts = modelContent?.parts ?? [];

    const functionCalls = parts.filter((p) => Boolean(p.functionCall));
    if (functionCalls.length === 0) {
      const text = parts
        .filter((p) => typeof p.text === "string")
        .map((p) => String(p.text))
        .join("\n")
        .trim();
      return { text, tokensInput, tokensOutput };
    }

    // Append raw model content untouched so thoughtSignature is preserved!
    contents.push({
      role: "model",
      parts,
    });

    const responseParts: Array<Record<string, unknown>> = [];
    for (const part of functionCalls) {
      const fc = part.functionCall as { name: string; args?: Record<string, unknown> };
      const toolResult = await params.executeTool(fc.name, fc.args ?? {});
      responseParts.push({
        functionResponse: {
          name: fc.name,
          response: {
            result: toolResult,
          },
        },
      });
    }

    contents.push({
      role: "user",
      parts: responseParts,
    });
  }

  return {
    text: "He procesado tu solicitud. ¿Hay algo más en lo que pueda ayudarte?",
    tokensInput,
    tokensOutput,
  };
}
