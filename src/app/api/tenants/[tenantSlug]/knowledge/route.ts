import { NextRequest, NextResponse } from "next/server";
import { AuthError, requireTenantAccess } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  extractTextFromPdfBuffer,
  extractTextFromUrl,
  ingestKnowledgeDocument,
} from "@/lib/ai/rag";
import { DocumentSourceType } from "@prisma/client";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug);

    const [faqs, documents] = await Promise.all([
      prisma.faqItem.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
      }),
      prisma.knowledgeDocument.findMany({
        where: { tenantId: tenant.id },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          sourceType: true,
          sourceUrl: true,
          status: true,
          errorMessage: true,
          chunkCount: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({
      faqs,
      documents,
      maxKnowledgeDocs: tenant.plan.maxKnowledgeDocs,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error cargando conocimiento" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug, ["OWNER", "ADMIN"]);

    const contentType = request.headers.get("content-type") || "";

    // Multipart PDF/TXT upload
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const title = String(formData.get("title") || file?.name || "Documento");
      if (!file) {
        return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
      }

      const docCount = await prisma.knowledgeDocument.count({ where: { tenantId: tenant.id } });
      if (docCount >= tenant.plan.maxKnowledgeDocs) {
        return NextResponse.json(
          { error: `Has alcanzado el límite de ${tenant.plan.maxKnowledgeDocs} documentos de tu plan.` },
          { status: 403 }
        );
      }

      const arrayBuf = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);
      const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
      const rawContent = isPdf
        ? await extractTextFromPdfBuffer(buffer)
        : buffer.toString("utf8").slice(0, 50_000);

      if (!rawContent || rawContent.length < 10) {
        return NextResponse.json(
          { error: "No se pudo extraer texto legible del archivo." },
          { status: 400 }
        );
      }

      const doc = await ingestKnowledgeDocument({
        tenantId: tenant.id,
        title,
        sourceType: isPdf ? DocumentSourceType.PDF : DocumentSourceType.TEXT,
        rawContent,
      });

      return NextResponse.json({ document: doc });
    }

    const body = await request.json();

    // 1. Create FAQ
    if (body.kind === "faq") {
      if (!body.question?.trim() || !body.answer?.trim()) {
        return NextResponse.json({ error: "Pregunta y respuesta son requeridas" }, { status: 400 });
      }
      const faq = await prisma.faqItem.create({
        data: {
          tenantId: tenant.id,
          question: body.question.trim(),
          answer: body.answer.trim(),
          category: body.category?.trim() || "General",
        },
      });
      return NextResponse.json({ faq });
    }

    // 2. Create Document (TEXT or URL)
    const docCount = await prisma.knowledgeDocument.count({ where: { tenantId: tenant.id } });
    if (docCount >= tenant.plan.maxKnowledgeDocs) {
      return NextResponse.json(
        { error: `Has alcanzado el límite de ${tenant.plan.maxKnowledgeDocs} documentos de tu plan.` },
        { status: 403 }
      );
    }

    if (body.kind === "url") {
      if (!body.url?.trim()) {
        return NextResponse.json({ error: "URL requerida" }, { status: 400 });
      }
      const rawContent = await extractTextFromUrl(body.url.trim());
      const doc = await ingestKnowledgeDocument({
        tenantId: tenant.id,
        title: body.title?.trim() || body.url.trim(),
        sourceType: DocumentSourceType.URL,
        sourceUrl: body.url.trim(),
        rawContent,
      });
      return NextResponse.json({ document: doc });
    }

    if (body.kind === "text") {
      if (!body.title?.trim() || !body.content?.trim()) {
        return NextResponse.json({ error: "Título y contenido son requeridos" }, { status: 400 });
      }
      const doc = await ingestKnowledgeDocument({
        tenantId: tenant.id,
        title: body.title.trim(),
        sourceType: DocumentSourceType.TEXT,
        rawContent: body.content.trim(),
      });
      return NextResponse.json({ document: doc });
    }

    return NextResponse.json({ error: "Tipo de recurso inválido" }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error creando recurso" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ tenantSlug: string }> }
) {
  try {
    const { tenantSlug } = await context.params;
    const { tenant } = await requireTenantAccess(tenantSlug, ["OWNER", "ADMIN"]);
    const kind = request.nextUrl.searchParams.get("kind");
    const id = request.nextUrl.searchParams.get("id");

    if (!id || !kind) {
      return NextResponse.json({ error: "Parámetros faltantes" }, { status: 400 });
    }

    if (kind === "faq") {
      await prisma.faqItem.deleteMany({ where: { id, tenantId: tenant.id } });
    } else if (kind === "document") {
      await prisma.knowledgeDocument.deleteMany({ where: { id, tenantId: tenant.id } });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error eliminando recurso" }, { status: 500 });
  }
}
