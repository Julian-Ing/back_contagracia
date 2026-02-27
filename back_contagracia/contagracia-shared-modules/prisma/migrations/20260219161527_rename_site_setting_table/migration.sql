-- Eliminar tabla con nombre incorrecto si existe
DROP TABLE IF EXISTS "SiteSetting";

-- Crear tabla con nombre correcto si no existe
CREATE TABLE IF NOT EXISTS "site_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("key")
);
