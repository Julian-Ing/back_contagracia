-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "user_plus" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "modules" ADD COLUMN     "group" TEXT NOT NULL DEFAULT 'Otros';

-- CreateTable
CREATE TABLE "module_dependencies" (
    "id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "depends_on_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "module_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_posts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT,
    "excerpt" TEXT,
    "featured_image" TEXT,
    "author_id" TEXT,
    "published_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_tags" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT NOT NULL DEFAULT '#8B5CF6',
    "icon" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_post_tags" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_post_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_comments" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "parent_id" TEXT,
    "author_name" TEXT NOT NULL,
    "author_email" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rating" INTEGER,
    "is_approved" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_views" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_analytics" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "views_count" INTEGER NOT NULL DEFAULT 0,
    "unique_views" INTEGER NOT NULL DEFAULT 0,
    "comments_count" INTEGER NOT NULL DEFAULT 0,
    "average_rating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "total_ratings" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_reactions" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "reaction_type" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_bookmarks" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "blog_bookmarks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_reading_sessions" (
    "id" TEXT NOT NULL,
    "post_id" TEXT NOT NULL,
    "visitor_id" TEXT NOT NULL,
    "reading_time_seconds" INTEGER NOT NULL DEFAULT 0,
    "scroll_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "completed_reading" BOOLEAN NOT NULL DEFAULT false,
    "session_start" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "session_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_reading_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blog_tag_analytics" (
    "id" TEXT NOT NULL,
    "tag_id" TEXT NOT NULL,
    "views" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "blog_tag_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "broadcast_notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "action_url" TEXT,
    "sent_to_all" BOOLEAN NOT NULL DEFAULT false,
    "sent_count" INTEGER NOT NULL DEFAULT 0,
    "sent_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broadcast_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_notifications" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "broadcast_id" TEXT,
    "source" TEXT NOT NULL DEFAULT 'admin',
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "action_url" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "module_dependencies_module_id_idx" ON "module_dependencies"("module_id");

-- CreateIndex
CREATE INDEX "module_dependencies_depends_on_id_idx" ON "module_dependencies"("depends_on_id");

-- CreateIndex
CREATE UNIQUE INDEX "module_dependencies_module_id_depends_on_id_key" ON "module_dependencies"("module_id", "depends_on_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_posts_slug_key" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_slug_idx" ON "blog_posts"("slug");

-- CreateIndex
CREATE INDEX "blog_posts_published_at_idx" ON "blog_posts"("published_at");

-- CreateIndex
CREATE INDEX "blog_posts_author_id_idx" ON "blog_posts"("author_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_tags_name_key" ON "blog_tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "blog_tags_slug_key" ON "blog_tags"("slug");

-- CreateIndex
CREATE INDEX "blog_post_tags_post_id_idx" ON "blog_post_tags"("post_id");

-- CreateIndex
CREATE INDEX "blog_post_tags_tag_id_idx" ON "blog_post_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_post_tags_post_id_tag_id_key" ON "blog_post_tags"("post_id", "tag_id");

-- CreateIndex
CREATE INDEX "blog_comments_post_id_idx" ON "blog_comments"("post_id");

-- CreateIndex
CREATE INDEX "blog_comments_parent_id_idx" ON "blog_comments"("parent_id");

-- CreateIndex
CREATE INDEX "blog_views_post_id_idx" ON "blog_views"("post_id");

-- CreateIndex
CREATE INDEX "blog_views_visitor_id_idx" ON "blog_views"("visitor_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_analytics_post_id_key" ON "blog_analytics"("post_id");

-- CreateIndex
CREATE INDEX "blog_reactions_post_id_idx" ON "blog_reactions"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_reactions_post_id_visitor_id_key" ON "blog_reactions"("post_id", "visitor_id");

-- CreateIndex
CREATE INDEX "blog_bookmarks_post_id_idx" ON "blog_bookmarks"("post_id");

-- CreateIndex
CREATE UNIQUE INDEX "blog_bookmarks_post_id_visitor_id_key" ON "blog_bookmarks"("post_id", "visitor_id");

-- CreateIndex
CREATE INDEX "blog_reading_sessions_post_id_idx" ON "blog_reading_sessions"("post_id");

-- CreateIndex
CREATE INDEX "blog_reading_sessions_visitor_id_idx" ON "blog_reading_sessions"("visitor_id");

-- CreateIndex
CREATE INDEX "blog_tag_analytics_tag_id_idx" ON "blog_tag_analytics"("tag_id");

-- CreateIndex
CREATE INDEX "blog_tag_analytics_date_idx" ON "blog_tag_analytics"("date");

-- CreateIndex
CREATE UNIQUE INDEX "blog_tag_analytics_tag_id_date_key" ON "blog_tag_analytics"("tag_id", "date");

-- CreateIndex
CREATE INDEX "broadcast_notifications_type_idx" ON "broadcast_notifications"("type");

-- CreateIndex
CREATE INDEX "broadcast_notifications_created_at_idx" ON "broadcast_notifications"("created_at");

-- CreateIndex
CREATE INDEX "company_notifications_company_id_idx" ON "company_notifications"("company_id");

-- CreateIndex
CREATE INDEX "company_notifications_company_id_is_read_idx" ON "company_notifications"("company_id", "is_read");

-- CreateIndex
CREATE INDEX "company_notifications_broadcast_id_idx" ON "company_notifications"("broadcast_id");

-- CreateIndex
CREATE INDEX "company_notifications_created_at_idx" ON "company_notifications"("created_at");

-- AddForeignKey
ALTER TABLE "module_dependencies" ADD CONSTRAINT "module_dependencies_module_id_fkey" FOREIGN KEY ("module_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "module_dependencies" ADD CONSTRAINT "module_dependencies_depends_on_id_fkey" FOREIGN KEY ("depends_on_id") REFERENCES "modules"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_post_tags" ADD CONSTRAINT "blog_post_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "blog_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_comments" ADD CONSTRAINT "blog_comments_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "blog_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_views" ADD CONSTRAINT "blog_views_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_analytics" ADD CONSTRAINT "blog_analytics_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_reactions" ADD CONSTRAINT "blog_reactions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_bookmarks" ADD CONSTRAINT "blog_bookmarks_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_reading_sessions" ADD CONSTRAINT "blog_reading_sessions_post_id_fkey" FOREIGN KEY ("post_id") REFERENCES "blog_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blog_tag_analytics" ADD CONSTRAINT "blog_tag_analytics_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "blog_tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_notifications" ADD CONSTRAINT "company_notifications_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_notifications" ADD CONSTRAINT "company_notifications_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "broadcast_notifications"("id") ON DELETE SET NULL ON UPDATE CASCADE;
