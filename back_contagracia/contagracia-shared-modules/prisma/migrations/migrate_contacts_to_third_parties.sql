-- ==============================================================================
-- MIGRACION: CRM Contacts -> Third Parties
-- ==============================================================================
-- Este script migra los contactos de crm_contacts a third_parties
-- y actualiza todas las referencias en las tablas CRM
-- ==============================================================================

-- PASO 1: Insertar contactos CRM en third_parties con roles = ['CONTACT']
-- ==============================================================================
INSERT INTO third_parties (id, name, email, phone, roles, is_active, is_administrative, created_at, updated_at)
SELECT
    id,
    full_name as name,
    email,
    phone,
    ARRAY['CONTACT']::"ThirdPartyType"[] as roles,
    is_active,
    false as is_administrative,
    created_at,
    updated_at
FROM crm_contacts
WHERE id NOT IN (SELECT id FROM third_parties)
ON CONFLICT (id) DO NOTHING;

-- PASO 2: Agregar columna third_party_id a crm_leads
-- ==============================================================================
ALTER TABLE crm_leads ADD COLUMN IF NOT EXISTS third_party_id TEXT;

-- Actualizar third_party_id con el contact_id existente
UPDATE crm_leads SET third_party_id = contact_id WHERE third_party_id IS NULL;

-- Agregar FK constraint
ALTER TABLE crm_leads DROP CONSTRAINT IF EXISTS crm_leads_third_party_id_fkey;
ALTER TABLE crm_leads
    ADD CONSTRAINT crm_leads_third_party_id_fkey
    FOREIGN KEY (third_party_id) REFERENCES third_parties(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Crear indice
CREATE INDEX IF NOT EXISTS crm_leads_third_party_id_idx ON crm_leads(third_party_id);

-- PASO 3: Agregar columna third_party_id a crm_opportunities
-- ==============================================================================
ALTER TABLE crm_opportunities ADD COLUMN IF NOT EXISTS third_party_id TEXT;

-- Actualizar third_party_id con el contact_id existente
UPDATE crm_opportunities SET third_party_id = contact_id WHERE third_party_id IS NULL;

-- Agregar FK constraint
ALTER TABLE crm_opportunities DROP CONSTRAINT IF EXISTS crm_opportunities_third_party_id_fkey;
ALTER TABLE crm_opportunities
    ADD CONSTRAINT crm_opportunities_third_party_id_fkey
    FOREIGN KEY (third_party_id) REFERENCES third_parties(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Crear indice
CREATE INDEX IF NOT EXISTS crm_opportunities_third_party_id_idx ON crm_opportunities(third_party_id);

-- PASO 4: Agregar columna third_party_id a crm_activities
-- ==============================================================================
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS third_party_id TEXT;

-- Actualizar third_party_id con el contact_id existente
UPDATE crm_activities SET third_party_id = contact_id WHERE third_party_id IS NULL;

-- Agregar FK constraint
ALTER TABLE crm_activities DROP CONSTRAINT IF EXISTS crm_activities_third_party_id_fkey;
ALTER TABLE crm_activities
    ADD CONSTRAINT crm_activities_third_party_id_fkey
    FOREIGN KEY (third_party_id) REFERENCES third_parties(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Crear indice
CREATE INDEX IF NOT EXISTS crm_activities_third_party_id_idx ON crm_activities(third_party_id);

-- PASO 5: Agregar columna third_party_id a crm_email_sends
-- ==============================================================================
ALTER TABLE crm_email_sends ADD COLUMN IF NOT EXISTS third_party_id TEXT;

-- Actualizar third_party_id con el contact_id existente
UPDATE crm_email_sends SET third_party_id = contact_id WHERE third_party_id IS NULL;

-- Agregar FK constraint
ALTER TABLE crm_email_sends DROP CONSTRAINT IF EXISTS crm_email_sends_third_party_id_fkey;
ALTER TABLE crm_email_sends
    ADD CONSTRAINT crm_email_sends_third_party_id_fkey
    FOREIGN KEY (third_party_id) REFERENCES third_parties(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Crear indice
CREATE INDEX IF NOT EXISTS crm_email_sends_third_party_id_idx ON crm_email_sends(third_party_id);

-- PASO 6: Agregar columna third_party_id a crm_form_submissions
-- ==============================================================================
ALTER TABLE crm_form_submissions ADD COLUMN IF NOT EXISTS third_party_id TEXT;

-- Actualizar third_party_id con el contact_id existente
UPDATE crm_form_submissions SET third_party_id = contact_id WHERE third_party_id IS NULL;

-- Agregar FK constraint
ALTER TABLE crm_form_submissions DROP CONSTRAINT IF EXISTS crm_form_submissions_third_party_id_fkey;
ALTER TABLE crm_form_submissions
    ADD CONSTRAINT crm_form_submissions_third_party_id_fkey
    FOREIGN KEY (third_party_id) REFERENCES third_parties(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Crear indice
CREATE INDEX IF NOT EXISTS crm_form_submissions_third_party_id_idx ON crm_form_submissions(third_party_id);

-- PASO 7: Agregar columna third_party_id a crm_whatsapp_conversations
-- ==============================================================================
ALTER TABLE crm_whatsapp_conversations ADD COLUMN IF NOT EXISTS third_party_id TEXT;

-- Actualizar third_party_id con el contact_id existente
UPDATE crm_whatsapp_conversations SET third_party_id = contact_id WHERE third_party_id IS NULL;

-- Agregar FK constraint
ALTER TABLE crm_whatsapp_conversations DROP CONSTRAINT IF EXISTS crm_whatsapp_conversations_third_party_id_fkey;
ALTER TABLE crm_whatsapp_conversations
    ADD CONSTRAINT crm_whatsapp_conversations_third_party_id_fkey
    FOREIGN KEY (third_party_id) REFERENCES third_parties(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Crear indice
CREATE INDEX IF NOT EXISTS crm_whatsapp_conversations_third_party_id_idx ON crm_whatsapp_conversations(third_party_id);

-- PASO 8: Agregar columna third_party_id a crm_whatsapp_messages
-- ==============================================================================
ALTER TABLE crm_whatsapp_messages ADD COLUMN IF NOT EXISTS third_party_id TEXT;

-- Actualizar third_party_id con el contact_id existente
UPDATE crm_whatsapp_messages SET third_party_id = contact_id WHERE third_party_id IS NULL;

-- Agregar FK constraint
ALTER TABLE crm_whatsapp_messages DROP CONSTRAINT IF EXISTS crm_whatsapp_messages_third_party_id_fkey;
ALTER TABLE crm_whatsapp_messages
    ADD CONSTRAINT crm_whatsapp_messages_third_party_id_fkey
    FOREIGN KEY (third_party_id) REFERENCES third_parties(id) ON UPDATE CASCADE ON DELETE SET NULL;

-- Crear indice
CREATE INDEX IF NOT EXISTS crm_whatsapp_messages_third_party_id_idx ON crm_whatsapp_messages(third_party_id);

-- PASO 9: Agregar columna third_party_id a crm_contact_tag_assignments
-- ==============================================================================
ALTER TABLE crm_contact_tag_assignments ADD COLUMN IF NOT EXISTS third_party_id TEXT;

-- Actualizar third_party_id con el contact_id existente
UPDATE crm_contact_tag_assignments SET third_party_id = contact_id WHERE third_party_id IS NULL;

-- Agregar FK constraint
ALTER TABLE crm_contact_tag_assignments DROP CONSTRAINT IF EXISTS crm_contact_tag_assignments_third_party_id_fkey;
ALTER TABLE crm_contact_tag_assignments
    ADD CONSTRAINT crm_contact_tag_assignments_third_party_id_fkey
    FOREIGN KEY (third_party_id) REFERENCES third_parties(id) ON UPDATE CASCADE ON DELETE CASCADE;

-- Crear indice
CREATE INDEX IF NOT EXISTS crm_contact_tag_assignments_third_party_id_idx ON crm_contact_tag_assignments(third_party_id);

-- PASO 10: Manejar documents.crm_contact_id
-- ==============================================================================
-- Verificar si documents tiene crm_contact_id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'documents' AND column_name = 'crm_contact_id'
    ) THEN
        -- Agregar columna crm_third_party_id si no existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'documents' AND column_name = 'crm_third_party_id'
        ) THEN
            ALTER TABLE documents ADD COLUMN crm_third_party_id TEXT;
        END IF;

        -- Actualizar con el crm_contact_id existente
        UPDATE documents SET crm_third_party_id = crm_contact_id WHERE crm_third_party_id IS NULL;

        -- Agregar FK si no existe
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints
            WHERE constraint_name = 'documents_crm_third_party_id_fkey'
        ) THEN
            ALTER TABLE documents
                ADD CONSTRAINT documents_crm_third_party_id_fkey
                FOREIGN KEY (crm_third_party_id) REFERENCES third_parties(id) ON UPDATE CASCADE ON DELETE SET NULL;
        END IF;
    END IF;
END $$;

-- ==============================================================================
-- PASO 11: Hacer third_party_id NOT NULL donde sea necesario
-- ==============================================================================
-- Solo crm_leads requiere third_party_id obligatorio
ALTER TABLE crm_leads ALTER COLUMN third_party_id SET NOT NULL;

-- ==============================================================================
-- NOTA: Las columnas contact_id se eliminarán cuando se aplique el schema Prisma
-- No las eliminamos aquí para evitar errores si algo falla
-- ==============================================================================

-- Verificar migracion
SELECT
    'third_parties' as tabla,
    COUNT(*) as registros,
    COUNT(CASE WHEN 'CONTACT' = ANY(roles) THEN 1 END) as con_rol_contact
FROM third_parties
UNION ALL
SELECT
    'crm_leads' as tabla,
    COUNT(*) as registros,
    COUNT(third_party_id) as con_third_party_id
FROM crm_leads
UNION ALL
SELECT
    'crm_opportunities' as tabla,
    COUNT(*) as registros,
    COUNT(third_party_id) as con_third_party_id
FROM crm_opportunities;
