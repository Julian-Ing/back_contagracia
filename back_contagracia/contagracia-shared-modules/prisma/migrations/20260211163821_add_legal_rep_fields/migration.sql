-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "legal_rep_email" TEXT,
ADD COLUMN     "legal_rep_phone" TEXT,
ADD COLUMN     "legal_rep_signature_url" TEXT;

-- CreateTable
CREATE TABLE "ai_configurations" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "active_provider" TEXT NOT NULL DEFAULT 'gemini',
    "gemini_model" TEXT NOT NULL DEFAULT 'gemini-2.5-flash',
    "openai_model" TEXT NOT NULL DEFAULT 'gpt-4o',
    "anthropic_model" TEXT NOT NULL DEFAULT 'claude-sonnet-4-5',
    "assistant_name" TEXT NOT NULL DEFAULT 'Asistente Contagracia',
    "assistant_role" TEXT NOT NULL DEFAULT 'Asistente contable especializado',
    "greeting" TEXT NOT NULL DEFAULT '¡Hola! Soy tu asistente contable. ¿En qué puedo ayudarte?',
    "avatar_emoji" TEXT NOT NULL DEFAULT '🤖',
    "tone" TEXT NOT NULL DEFAULT 'professional',
    "detail_level" TEXT NOT NULL DEFAULT 'balanced',
    "use_emojis" BOOLEAN NOT NULL DEFAULT true,
    "proactive_suggestions" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_configurations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ai_configurations_company_id_key" ON "ai_configurations"("company_id");
