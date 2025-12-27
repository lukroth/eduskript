-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "ext_expires_in" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verificationtokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "hashedPassword" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT,
    "pageSlug" TEXT,
    "pageName" TEXT,
    "pageDescription" TEXT,
    "pageIcon" TEXT,
    "bio" TEXT,
    "title" TEXT,
    "themePreference" TEXT DEFAULT 'system',
    "sidebarBehavior" TEXT DEFAULT 'contextual',
    "typographyPreference" TEXT DEFAULT 'modern',
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "requirePasswordReset" BOOLEAN NOT NULL DEFAULT false,
    "needsProfileCompletion" BOOLEAN NOT NULL DEFAULT false,
    "accountType" TEXT NOT NULL DEFAULT 'teacher',
    "studentPseudonym" TEXT,
    "gdprConsentAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "oauthProvider" TEXT,
    "oauthProviderId" TEXT,
    "billing_plan" TEXT NOT NULL DEFAULT 'free',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collections" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "accentColor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_authors" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'author',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collection_skripts" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT,
    "skriptId" TEXT NOT NULL,
    "userId" TEXT,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collection_skripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skripts" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "slug" TEXT NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "skript_type" TEXT NOT NULL DEFAULT 'normal',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "skripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skript_authors" (
    "id" TEXT NOT NULL,
    "skriptId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'author',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "skript_authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pages" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "page_type" TEXT NOT NULL DEFAULT 'normal',
    "exam_settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "skriptId" TEXT NOT NULL,

    CONSTRAINT "pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_authors" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "permission" TEXT NOT NULL DEFAULT 'author',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_authors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_versions" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "changeLog" TEXT,
    "authorId" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parent_id" TEXT,
    "is_directory" BOOLEAN NOT NULL DEFAULT false,
    "skript_id" TEXT NOT NULL,
    "hash" TEXT,
    "content_type" TEXT,
    "size" BIGINT,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "videos" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'mux',
    "metadata" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "videos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaboration_requests" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "collaboration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "collaborations" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "receiver_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "collaborations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_layouts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "page_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_layout_items" (
    "id" TEXT NOT NULL,
    "page_layout_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_layout_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_page_layouts" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_page_layouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_page_layout_items" (
    "id" TEXT NOT NULL,
    "org_page_layout_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "org_page_layout_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_progress" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "last_viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_submissions" (
    "id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "content_data" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "grade" DOUBLE PRECISION,
    "feedback" TEXT,

    CONSTRAINT "student_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "teacher_id" TEXT NOT NULL,
    "invite_code" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "allow_anonymous" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_memberships" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "identity_consent" BOOLEAN NOT NULL DEFAULT false,
    "consented_at" TIMESTAMP(3),

    CONSTRAINT "class_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pre_authorized_students" (
    "id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "pseudonym" TEXT NOT NULL,
    "added_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pre_authorized_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_unlocks" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "class_id" TEXT,
    "student_id" TEXT,
    "unlocked_by" TEXT NOT NULL,
    "unlocked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_unlocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_data" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "adapter" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "target_type" TEXT,
    "target_id" TEXT,

    CONSTRAINT "user_data_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "front_pages" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT,
    "skript_id" TEXT,
    "organization_id" TEXT,
    "file_skript_id" TEXT,

    CONSTRAINT "front_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "front_page_versions" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "change_log" TEXT,
    "author_id" TEXT NOT NULL,
    "front_page_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "front_page_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "s3_key" TEXT,
    "file_name" TEXT,
    "file_size" BIGINT,
    "result" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "show_icon" BOOLEAN NOT NULL DEFAULT true,
    "icon_url" TEXT,
    "allow_member_pages" BOOLEAN NOT NULL DEFAULT true,
    "allow_teacher_custom_domains" BOOLEAN NOT NULL DEFAULT false,
    "require_email_domain" TEXT,
    "sidebar_behavior" TEXT DEFAULT 'contextual',
    "billing_plan" TEXT NOT NULL DEFAULT 'free',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_domains" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_custom_domains" (
    "id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teacher_custom_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_tokens" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_sessions" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "skript_id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_states" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "class_id" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'closed',
    "opened_at" TIMESTAMP(3),
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "exam_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_submissions" (
    "id" TEXT NOT NULL,
    "page_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DOUBLE PRECISION,
    "graded_by" TEXT,
    "graded_at" TIMESTAMP(3),

    CONSTRAINT "exam_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cross_domain_tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cross_domain_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SkriptVideos" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SkriptVideos_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_providerAccountId_key" ON "accounts"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_sessionToken_key" ON "sessions"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_token_key" ON "verificationtokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verificationtokens_identifier_token_key" ON "verificationtokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_pageSlug_key" ON "users"("pageSlug");

-- CreateIndex
CREATE UNIQUE INDEX "users_studentPseudonym_key" ON "users"("studentPseudonym");

-- CreateIndex
CREATE UNIQUE INDEX "users_oauthProvider_oauthProviderId_key" ON "users"("oauthProvider", "oauthProviderId");

-- CreateIndex
CREATE UNIQUE INDEX "collections_slug_key" ON "collections"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "collection_authors_collectionId_userId_key" ON "collection_authors"("collectionId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "collection_skripts_collectionId_skriptId_key" ON "collection_skripts"("collectionId", "skriptId");

-- CreateIndex
CREATE UNIQUE INDEX "collection_skripts_skriptId_userId_key" ON "collection_skripts"("skriptId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "skripts_slug_key" ON "skripts"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "skript_authors_skriptId_userId_key" ON "skript_authors"("skriptId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "pages_skriptId_slug_key" ON "pages"("skriptId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "page_authors_pageId_userId_key" ON "page_authors"("pageId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "page_versions_pageId_version_key" ON "page_versions"("pageId", "version");

-- CreateIndex
CREATE INDEX "parent_skript_idx" ON "files"("parent_id", "skript_id");

-- CreateIndex
CREATE INDEX "hash_idx" ON "files"("hash");

-- CreateIndex
CREATE UNIQUE INDEX "files_parent_id_name_skript_id_key" ON "files"("parent_id", "name", "skript_id");

-- CreateIndex
CREATE INDEX "videos_filename_idx" ON "videos"("filename");

-- CreateIndex
CREATE UNIQUE INDEX "videos_filename_provider_key" ON "videos"("filename", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "collaboration_requests_requester_id_receiver_id_key" ON "collaboration_requests"("requester_id", "receiver_id");

-- CreateIndex
CREATE UNIQUE INDEX "collaborations_requester_id_receiver_id_key" ON "collaborations"("requester_id", "receiver_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_layouts_user_id_key" ON "page_layouts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_layout_items_page_layout_id_content_id_type_key" ON "page_layout_items"("page_layout_id", "content_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "org_page_layouts_organization_id_key" ON "org_page_layouts"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "org_page_layout_items_org_page_layout_id_content_id_type_key" ON "org_page_layout_items"("org_page_layout_id", "content_id", "type");

-- CreateIndex
CREATE INDEX "student_progress_student_id_idx" ON "student_progress"("student_id");

-- CreateIndex
CREATE INDEX "student_progress_page_id_idx" ON "student_progress"("page_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_progress_student_id_page_id_key" ON "student_progress"("student_id", "page_id");

-- CreateIndex
CREATE INDEX "student_submissions_student_id_idx" ON "student_submissions"("student_id");

-- CreateIndex
CREATE INDEX "student_submissions_page_id_idx" ON "student_submissions"("page_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_submissions_student_id_page_id_key" ON "student_submissions"("student_id", "page_id");

-- CreateIndex
CREATE UNIQUE INDEX "classes_invite_code_key" ON "classes"("invite_code");

-- CreateIndex
CREATE INDEX "classes_teacher_id_idx" ON "classes"("teacher_id");

-- CreateIndex
CREATE INDEX "classes_invite_code_idx" ON "classes"("invite_code");

-- CreateIndex
CREATE INDEX "class_memberships_class_id_idx" ON "class_memberships"("class_id");

-- CreateIndex
CREATE INDEX "class_memberships_student_id_idx" ON "class_memberships"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "class_memberships_class_id_student_id_key" ON "class_memberships"("class_id", "student_id");

-- CreateIndex
CREATE INDEX "pre_authorized_students_pseudonym_idx" ON "pre_authorized_students"("pseudonym");

-- CreateIndex
CREATE INDEX "pre_authorized_students_class_id_idx" ON "pre_authorized_students"("class_id");

-- CreateIndex
CREATE UNIQUE INDEX "pre_authorized_students_class_id_pseudonym_key" ON "pre_authorized_students"("class_id", "pseudonym");

-- CreateIndex
CREATE INDEX "page_unlocks_class_id_idx" ON "page_unlocks"("class_id");

-- CreateIndex
CREATE INDEX "page_unlocks_student_id_idx" ON "page_unlocks"("student_id");

-- CreateIndex
CREATE INDEX "page_unlocks_page_id_idx" ON "page_unlocks"("page_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_unlocks_page_id_class_id_key" ON "page_unlocks"("page_id", "class_id");

-- CreateIndex
CREATE UNIQUE INDEX "page_unlocks_page_id_student_id_key" ON "page_unlocks"("page_id", "student_id");

-- CreateIndex
CREATE INDEX "user_data_user_id_idx" ON "user_data"("user_id");

-- CreateIndex
CREATE INDEX "user_data_user_id_adapter_idx" ON "user_data"("user_id", "adapter");

-- CreateIndex
CREATE INDEX "user_data_updated_at_idx" ON "user_data"("updated_at");

-- CreateIndex
CREATE INDEX "user_data_target_type_target_id_adapter_item_id_idx" ON "user_data"("target_type", "target_id", "adapter", "item_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_data_user_id_adapter_item_id_target_type_target_id_key" ON "user_data"("user_id", "adapter", "item_id", "target_type", "target_id");

-- CreateIndex
CREATE UNIQUE INDEX "front_pages_user_id_key" ON "front_pages"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "front_pages_skript_id_key" ON "front_pages"("skript_id");

-- CreateIndex
CREATE UNIQUE INDEX "front_pages_organization_id_key" ON "front_pages"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "front_pages_file_skript_id_key" ON "front_pages"("file_skript_id");

-- CreateIndex
CREATE UNIQUE INDEX "front_page_versions_front_page_id_version_key" ON "front_page_versions"("front_page_id", "version");

-- CreateIndex
CREATE INDEX "import_jobs_user_id_idx" ON "import_jobs"("user_id");

-- CreateIndex
CREATE INDEX "import_jobs_user_id_status_idx" ON "import_jobs"("user_id", "status");

-- CreateIndex
CREATE INDEX "import_jobs_status_idx" ON "import_jobs"("status");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_slug_key" ON "organizations"("slug");

-- CreateIndex
CREATE INDEX "organization_members_organization_id_idx" ON "organization_members"("organization_id");

-- CreateIndex
CREATE INDEX "organization_members_user_id_idx" ON "organization_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_organization_id_user_id_key" ON "organization_members"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "custom_domains_domain_key" ON "custom_domains"("domain");

-- CreateIndex
CREATE INDEX "custom_domains_domain_idx" ON "custom_domains"("domain");

-- CreateIndex
CREATE INDEX "custom_domains_organization_id_idx" ON "custom_domains"("organization_id");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_custom_domains_domain_key" ON "teacher_custom_domains"("domain");

-- CreateIndex
CREATE INDEX "teacher_custom_domains_domain_idx" ON "teacher_custom_domains"("domain");

-- CreateIndex
CREATE INDEX "teacher_custom_domains_user_id_idx" ON "teacher_custom_domains"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_tokens_token_hash_key" ON "exam_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "exam_tokens_token_hash_idx" ON "exam_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "exam_tokens_user_id_idx" ON "exam_tokens"("user_id");

-- CreateIndex
CREATE INDEX "exam_tokens_page_id_idx" ON "exam_tokens"("page_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_sessions_session_id_key" ON "exam_sessions"("session_id");

-- CreateIndex
CREATE INDEX "exam_sessions_session_id_idx" ON "exam_sessions"("session_id");

-- CreateIndex
CREATE INDEX "exam_sessions_user_id_idx" ON "exam_sessions"("user_id");

-- CreateIndex
CREATE INDEX "exam_sessions_skript_id_idx" ON "exam_sessions"("skript_id");

-- CreateIndex
CREATE INDEX "exam_states_page_id_idx" ON "exam_states"("page_id");

-- CreateIndex
CREATE INDEX "exam_states_class_id_idx" ON "exam_states"("class_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_states_page_id_class_id_key" ON "exam_states"("page_id", "class_id");

-- CreateIndex
CREATE INDEX "exam_submissions_page_id_idx" ON "exam_submissions"("page_id");

-- CreateIndex
CREATE INDEX "exam_submissions_student_id_idx" ON "exam_submissions"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "exam_submissions_page_id_student_id_key" ON "exam_submissions"("page_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "cross_domain_tokens_token_key" ON "cross_domain_tokens"("token");

-- CreateIndex
CREATE INDEX "cross_domain_tokens_token_idx" ON "cross_domain_tokens"("token");

-- CreateIndex
CREATE INDEX "cross_domain_tokens_expires_at_idx" ON "cross_domain_tokens"("expires_at");

-- CreateIndex
CREATE INDEX "_SkriptVideos_B_index" ON "_SkriptVideos"("B");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_authors" ADD CONSTRAINT "collection_authors_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_authors" ADD CONSTRAINT "collection_authors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_skripts" ADD CONSTRAINT "collection_skripts_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_skripts" ADD CONSTRAINT "collection_skripts_skriptId_fkey" FOREIGN KEY ("skriptId") REFERENCES "skripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_skripts" ADD CONSTRAINT "collection_skripts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skript_authors" ADD CONSTRAINT "skript_authors_skriptId_fkey" FOREIGN KEY ("skriptId") REFERENCES "skripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skript_authors" ADD CONSTRAINT "skript_authors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pages" ADD CONSTRAINT "pages_skriptId_fkey" FOREIGN KEY ("skriptId") REFERENCES "skripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_authors" ADD CONSTRAINT "page_authors_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_authors" ADD CONSTRAINT "page_authors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_versions" ADD CONSTRAINT "page_versions_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_skript_id_fkey" FOREIGN KEY ("skript_id") REFERENCES "skripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_requests" ADD CONSTRAINT "collaboration_requests_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaboration_requests" ADD CONSTRAINT "collaboration_requests_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collaborations" ADD CONSTRAINT "collaborations_receiver_id_fkey" FOREIGN KEY ("receiver_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_layouts" ADD CONSTRAINT "page_layouts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_layout_items" ADD CONSTRAINT "page_layout_items_page_layout_id_fkey" FOREIGN KEY ("page_layout_id") REFERENCES "page_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_page_layouts" ADD CONSTRAINT "org_page_layouts_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "org_page_layout_items" ADD CONSTRAINT "org_page_layout_items_org_page_layout_id_fkey" FOREIGN KEY ("org_page_layout_id") REFERENCES "org_page_layouts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_progress" ADD CONSTRAINT "student_progress_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_submissions" ADD CONSTRAINT "student_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_submissions" ADD CONSTRAINT "student_submissions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_memberships" ADD CONSTRAINT "class_memberships_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_memberships" ADD CONSTRAINT "class_memberships_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pre_authorized_students" ADD CONSTRAINT "pre_authorized_students_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_unlocks" ADD CONSTRAINT "page_unlocks_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_unlocks" ADD CONSTRAINT "page_unlocks_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_unlocks" ADD CONSTRAINT "page_unlocks_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_unlocks" ADD CONSTRAINT "page_unlocks_unlocked_by_fkey" FOREIGN KEY ("unlocked_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_data" ADD CONSTRAINT "user_data_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "front_pages" ADD CONSTRAINT "front_pages_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "front_pages" ADD CONSTRAINT "front_pages_skript_id_fkey" FOREIGN KEY ("skript_id") REFERENCES "skripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "front_pages" ADD CONSTRAINT "front_pages_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "front_pages" ADD CONSTRAINT "front_pages_file_skript_id_fkey" FOREIGN KEY ("file_skript_id") REFERENCES "skripts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "front_page_versions" ADD CONSTRAINT "front_page_versions_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "front_page_versions" ADD CONSTRAINT "front_page_versions_front_page_id_fkey" FOREIGN KEY ("front_page_id") REFERENCES "front_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_jobs" ADD CONSTRAINT "import_jobs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_domains" ADD CONSTRAINT "custom_domains_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_custom_domains" ADD CONSTRAINT "teacher_custom_domains_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_tokens" ADD CONSTRAINT "exam_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_tokens" ADD CONSTRAINT "exam_tokens_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_sessions" ADD CONSTRAINT "exam_sessions_skript_id_fkey" FOREIGN KEY ("skript_id") REFERENCES "skripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_states" ADD CONSTRAINT "exam_states_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_states" ADD CONSTRAINT "exam_states_class_id_fkey" FOREIGN KEY ("class_id") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_submissions" ADD CONSTRAINT "exam_submissions_page_id_fkey" FOREIGN KEY ("page_id") REFERENCES "pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_submissions" ADD CONSTRAINT "exam_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_submissions" ADD CONSTRAINT "exam_submissions_graded_by_fkey" FOREIGN KEY ("graded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cross_domain_tokens" ADD CONSTRAINT "cross_domain_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SkriptVideos" ADD CONSTRAINT "_SkriptVideos_A_fkey" FOREIGN KEY ("A") REFERENCES "skripts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SkriptVideos" ADD CONSTRAINT "_SkriptVideos_B_fkey" FOREIGN KEY ("B") REFERENCES "videos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

