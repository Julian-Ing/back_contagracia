-- Activar extensión pg_trgm para búsqueda fuzzy
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Crear índices GIN para búsqueda fuzzy en modules (IF NOT EXISTS porque ya existen)
CREATE INDEX IF NOT EXISTS idx_modules_module_name_trgm ON "modules" USING GIN (module_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_modules_module_key_trgm ON "modules" USING GIN (module_key gin_trgm_ops);

-- CreateTable
CREATE TABLE "SiteSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);
