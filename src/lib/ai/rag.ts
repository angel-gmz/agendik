import dns from "dns/promises";
import net from "net";
import { embed, type EmbeddingModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import * as cheerio from "cheerio";
import { extractText } from "unpdf";
import { prisma } from "../prisma";
import { resolveAiRuntime, type ResolvedAiRuntime } from "./provider";
import { DocumentSourceType, DocumentStatus } from "@prisma/client";

function isPrivateOrReservedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4) return true;
    const [a, b] = parts;
    if (a === 0 || a === 10 || a === 127) return true;
    if (a === 169 && b === 254) return true; // link-local / cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (
      lower === "::1" ||
      lower === "::" ||
      lower.startsWith("fe80:") ||
      lower.startsWith("fc") ||
      lower.startsWith("fd") ||
      lower.startsWith("::ffff:127.") ||
      lower.startsWith("::ffff:10.") ||
      lower.startsWith("::ffff:192.168.") ||
      lower.startsWith("::ffff:169.254.")
    ) {
      return true;
    }
    return false;
  }
  return true;
}

async function assertSafePublicUrl(rawUrl: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("URL inválida");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Solo se permiten URLs http:// o https://");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("URL no permitida por seguridad");
  }

  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      throw new Error("No se permiten direcciones IP privadas o locales");
    }
    return parsed;
  }

  const records = await dns.lookup(hostname, { all: true });
  if (!records.length || records.some((r) => isPrivateOrReservedIp(r.address))) {
    throw new Error("El host resuelve a una dirección privada o no permitida");
  }

  return parsed;
}

function resolveVectorEmbeddingModel(runtime: ResolvedAiRuntime): EmbeddingModel<string> | null {
  if (runtime.isLive && runtime.embeddingModel && runtime.provider === "OPENAI") {
    return runtime.embeddingModel;
  }
  const platformOpenAiKey = process.env.OPENAI_API_KEY?.trim();
  if (platformOpenAiKey) {
    const openai = createOpenAI({ apiKey: platformOpenAiKey });
    return openai.embedding("text-embedding-3-small");
  }
  return null;
}

export function chunkText(text: string, chunkSize = 800, overlap = 120): string[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (!cleaned) return [];
  if (cleaned.length <= chunkSize) return [cleaned];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + chunkSize, cleaned.length);
    if (end < cleaned.length) {
      const lastPeriod = cleaned.lastIndexOf(".", end);
      const lastNewline = cleaned.lastIndexOf("\n", end);
      const splitPoint = Math.max(lastPeriod, lastNewline);
      if (splitPoint > start + chunkSize * 0.5) {
        end = splitPoint + 1;
      }
    }
    const piece = cleaned.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= cleaned.length) break;
    start = Math.max(0, end - overlap);
  }
  return chunks;
}

export async function extractTextFromUrl(url: string): Promise<string> {
  let currentUrl = await assertSafePublicUrl(url);
  let res: Response | null = null;

  for (let redirects = 0; redirects < 4; redirects++) {
    res = await fetch(currentUrl.toString(), {
      headers: { "User-Agent": "AgenteIA-KnowledgeBot/1.0" },
      redirect: "manual",
      signal: AbortSignal.timeout(12000),
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) break;
      currentUrl = await assertSafePublicUrl(new URL(location, currentUrl).toString());
      continue;
    }
    break;
  }

  if (!res || !res.ok) {
    throw new Error(`No se pudo descargar la URL (${res?.status ?? "sin respuesta"})`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);
  $("script, style, nav, footer, noscript, iframe").remove();
  return $("body").text().replace(/\s+/g, " ").trim().slice(0, 50_000);
}

/**
 * Extracts text from PDF buffers using unpdf (handles FlateDecode & modern PDFs),
 * with a lightweight printable-string fallback for malformed files.
 */
export async function extractTextFromPdfBuffer(buffer: Buffer): Promise<string> {
  try {
    const { text } = await extractText(new Uint8Array(buffer), { mergePages: true });
    const cleaned = String(text || "").replace(/\s+/g, " ").trim();
    if (cleaned.length >= 10) {
      return cleaned.slice(0, 50_000);
    }
  } catch {
    // Fallback below if PDF is malformed
  }

  const latin = buffer.toString("latin1");
  const matches = latin.match(/\(([^()\\]{3,})\)/g) || [];
  const extracted = matches
    .map((m) => m.slice(1, -1).replace(/\\n/g, "\n").replace(/\\r/g, " "))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  if (extracted.length > 30) {
    return extracted.slice(0, 50_000);
  }
  return buffer
    .toString("utf8")
    .replace(/[^\x20-\x7E\xA0-\xFF\n]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 50_000);
}

export async function ingestKnowledgeDocument(params: {
  tenantId: string;
  title: string;
  sourceType: DocumentSourceType;
  sourceUrl?: string;
  rawContent: string;
}) {
  const doc = await prisma.knowledgeDocument.create({
    data: {
      tenantId: params.tenantId,
      title: params.title,
      sourceType: params.sourceType,
      sourceUrl: params.sourceUrl,
      rawContent: params.rawContent,
      status: DocumentStatus.PROCESSING,
    },
  });

  try {
    const chunks = chunkText(params.rawContent);
    const agentConfig = await prisma.agentConfig.findUnique({
      where: { tenantId: params.tenantId },
    });
    const runtime = resolveAiRuntime(agentConfig);

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      const createdChunk = await prisma.knowledgeChunk.create({
        data: {
          tenantId: params.tenantId,
          documentId: doc.id,
          chunkIndex: i,
          content,
          metadataJson: { title: params.title, sourceType: params.sourceType },
        },
      });

      // Generate & store pgvector embedding (1536 dims) using tenant or platform OpenAI key
      const embeddingModel = resolveVectorEmbeddingModel(runtime);
      if (embeddingModel) {
        try {
          const { embedding } = await embed({
            model: embeddingModel,
            value: content,
          });
          const vecLiteral = `[${embedding.join(",")}]`;
          await prisma.$executeRawUnsafe(
            `UPDATE "KnowledgeChunk" SET embedding = $1::vector WHERE id = $2`,
            vecLiteral,
            createdChunk.id
          );
        } catch {
          // Non-fatal: lexical fallback still works
        }
      }
    }

    return prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: {
        status: DocumentStatus.READY,
        chunkCount: chunks.length,
      },
    });
  } catch (err) {
    await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: {
        status: DocumentStatus.ERROR,
        errorMessage: err instanceof Error ? err.message : "Error procesando documento",
      },
    });
    throw err;
  }
}

export async function searchTenantKnowledge(
  tenantId: string,
  query: string,
  limit = 5
): Promise<{
  faqs: Array<{ question: string; answer: string; category: string }>;
  chunks: Array<{ content: string; title: string }>;
}> {
  const normalizedQuery = query.toLowerCase();
  const terms = normalizedQuery
    .split(/[^a-záéíóúñ0-9]+/i)
    .filter((w) => w.length >= 3);

  const [allFaqs, agentConfig] = await Promise.all([
    prisma.faqItem.findMany({
      where: { tenantId, isActive: true },
    }),
    prisma.agentConfig.findUnique({ where: { tenantId } }),
  ]);

  // Rank FAQs by keyword match
  const scoredFaqs = allFaqs
    .map((faq) => {
      const hay = `${faq.question} ${faq.answer} ${faq.category}`.toLowerCase();
      const score = terms.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
      return { faq, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => ({
      question: x.faq.question,
      answer: x.faq.answer,
      category: x.faq.category,
    }));

  // Vector search if 1536-dim embedding model is available
  const runtime = resolveAiRuntime(agentConfig);
  const embeddingModel = resolveVectorEmbeddingModel(runtime);
  let chunks: Array<{ content: string; title: string }> = [];

  if (embeddingModel) {
    try {
      const { embedding } = await embed({
        model: embeddingModel,
        value: query,
      });
      const vecLiteral = `[${embedding.join(",")}]`;
      const rows = await prisma.$queryRawUnsafe<
        Array<{ content: string; title: string }>
      >(
        `SELECT kc.content, kd.title
         FROM "KnowledgeChunk" kc
         JOIN "KnowledgeDocument" kd ON kd.id = kc."documentId"
         WHERE kc."tenantId" = $1 AND kc.embedding IS NOT NULL
         ORDER BY kc.embedding <=> $2::vector
         LIMIT $3`,
        tenantId,
        vecLiteral,
        limit
      );
      chunks = rows;
    } catch {
      // Fall through to lexical search
    }
  }

  if (chunks.length === 0) {
    const allChunks = await prisma.knowledgeChunk.findMany({
      where: { tenantId },
      include: { document: { select: { title: true } } },
      take: 40,
    });

    chunks = allChunks
      .map((c) => {
        const hay = `${c.content} ${c.document.title}`.toLowerCase();
        const score = terms.reduce((acc, t) => acc + (hay.includes(t) ? 1 : 0), 0);
        return { content: c.content, title: c.document.title, score };
      })
      .filter((c) => c.score > 0 || terms.length === 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(({ content, title }) => ({ content, title }));
  }

  return { faqs: scoredFaqs, chunks };
}
