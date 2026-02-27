-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "page_type" TEXT NOT NULL DEFAULT 'static',
    "layout" TEXT,
    "show_in_header" BOOLEAN NOT NULL DEFAULT false,
    "show_in_footer" BOOLEAN NOT NULL DEFAULT false,
    "header_order" INTEGER,
    "footer_order" INTEGER,
    "header_label" TEXT,
    "footer_label" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "meta_title" TEXT,
    "meta_description" TEXT,
    "og_title" TEXT,
    "og_description" TEXT,
    "og_image" TEXT,
    "settings" JSONB,
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_sections" (
    "id" TEXT NOT NULL,
    "section_key" TEXT NOT NULL,
    "section_type" TEXT NOT NULL,
    "title" TEXT,
    "subtitle" TEXT,
    "content" JSONB,
    "page_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "site_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pages_slug_key" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_slug_idx" ON "pages"("slug");

-- CreateIndex
CREATE INDEX "pages_page_type_idx" ON "pages"("page_type");

-- CreateIndex
CREATE INDEX "pages_is_published_is_active_idx" ON "pages"("is_published", "is_active");

-- CreateIndex
CREATE INDEX "site_sections_page_id_display_order_idx" ON "site_sections"("page_id", "display_order");

-- CreateIndex
CREATE INDEX "site_sections_section_type_idx" ON "site_sections"("section_type");

-- AddForeignKey
ALTER TABLE "site_sections" ADD CONSTRAINT "site_sections_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
