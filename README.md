# AgenteIA — Plataforma Multi-Tenant de Agentes de IA (FAQs + Citas)

Plataforma SaaS multi-tenant con subdominios personalizados para responder dudas frecuentes (FAQs + RAG con `pgvector`) y gestionar el ciclo completo de citas (consultar disponibilidad, agendar, reprogramar y cancelar), con panel de configuración y seguimiento omnicanal.

## Características Principales

- **Multi-Tenant con Subdominios**: Aislamiento por `tenantId`, auto-registro self-serve y soporte de subdominios (`clinica-demo.localhost:3000` en local o `cliente.tudominio.com` en producción).
- **Omnicanal**:
  - Widget Web embebible (`<script src="/widget.js" data-tenant="...">`) y página pública `/chat/[slug]`.
  - Webhook unificado para **WhatsApp Business (Meta Cloud API)**, **Instagram DM** y **Facebook Messenger** en `/api/webhooks/meta/[slug]`.
  - Simulador integrado en el panel para probar mensajes de WhatsApp/IG/Messenger sin cuenta de Meta.
- **Agente IA Multi-Proveedor (OpenAI + Google Gemini)**:
  - API Key central de plataforma con seguimiento mensual de mensajes y tokens por tenant.
  - Soporte **BYOK** (clave propia cifrada AES-256-GCM por tenant).
  - Modo simulador local automático cuando no hay API keys configuradas.
- **Base de Conocimiento Híbrida (FAQs + RAG)**:
  - FAQs estructuradas (Q&A por categoría).
  - Documentos de texto, archivos **PDF/TXT** y extracción de **URLs** indexados con `pgvector`.
- **Agenda y Citas + Google Calendar**:
  - Servicios, duración, precios, horarios semanales y días bloqueados.
  - Sincronización opcional por tenant con **Google Calendar OAuth2** (free/busy + eventos).
- **Panel de Seguimiento**:
  - Inbox omnicanal con traspaso humano (pausar IA / tomar control / devolver a IA).
  - Directorio de contactos/leads, analíticas de resolución IA vs humano y medidor de consumo del plan.
  - Alertas por Email/WhatsApp y endpoint cron de recordatorios (`/api/cron/reminders`).

## Inicio Rápido

1. **Levantar PostgreSQL con `pgvector`**:
   ```bash
   docker compose up -d
   ```

2. **Instalar dependencias y preparar base de datos**:
   ```bash
   npm install
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

3. **Iniciar en desarrollo**:
   ```bash
   npm run dev
   ```

4. **Acceder**:
   - Landing / Login: `http://localhost:3000`
   - Credenciales demo: `admin@agenteia.local` / `admin1234`
   - Chat público demo: `http://localhost:3000/chat/clinica-demo` o `http://clinica-demo.localhost:3000`
   - Panel demo: `http://localhost:3000/dashboard/clinica-demo`
