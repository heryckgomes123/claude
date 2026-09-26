CREATE TYPE "public"."category_kind" AS ENUM('CONTENT', 'TOOL');--> statement-breakpoint
CREATE TYPE "public"."content_status" AS ENUM('DRAFT', 'REVIEW', 'PUBLISHED', 'ARCHIVED');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('PROMPT', 'WORKFLOW', 'TOOL', 'REFERENCE', 'TUTORIAL');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');--> statement-breakpoint
CREATE TYPE "public"."history_action" AS ENUM('VIEW', 'COPY', 'VISIT');--> statement-breakpoint
CREATE TYPE "public"."media_type" AS ENUM('IMAGE', 'VIDEO', 'AUDIO', 'TEXT', 'THREE_D');--> statement-breakpoint
CREATE TYPE "public"."membership_source" AS ENUM('MANUAL', 'ACCESS_CODE', 'SIGNUP_DEFAULT', 'EXTERNAL');--> statement-breakpoint
CREATE TYPE "public"."membership_status" AS ENUM('ACTIVE', 'TRIALING', 'PAST_DUE', 'CANCELED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."pricing_status" AS ENUM('FREE', 'FREEMIUM', 'PAID', 'TRIAL', 'UNKNOWN');--> statement-breakpoint
CREATE TYPE "public"."publish_state" AS ENUM('DRAFT', 'PUBLISHED');--> statement-breakpoint
CREATE TYPE "public"."relation_kind" AS ENUM('RELATED', 'COMPATIBLE_TOOL', 'REQUIRED_TOOL', 'OPTIONAL_TOOL');--> statement-breakpoint
CREATE TYPE "public"."update_kind" AS ENUM('NEW_CONTENT', 'FEATURE', 'ANNOUNCEMENT');--> statement-breakpoint
CREATE TYPE "public"."verification_status" AS ENUM('VERIFIED', 'NEEDS_REVIEW', 'OUTDATED');--> statement-breakpoint
CREATE TABLE "access_code" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code_hash" text NOT NULL,
	"code_hint" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"duration_days" integer,
	"max_redemptions" integer DEFAULT 1 NOT NULL,
	"redemption_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"disabled_at" timestamp with time zone,
	"note" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_code_codeHash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
CREATE TABLE "access_code_redemption" (
	"code_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_code_redemption_code_id_user_id_pk" PRIMARY KEY("code_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_rate_limit" (
	"key" text PRIMARY KEY NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "category_kind" DEFAULT 'CONTENT' NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collection_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection_id" uuid NOT NULL,
	"content_id" uuid,
	"user_prompt_id" uuid,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "collection_item_one_target" CHECK (num_nonnulls("collection_item"."content_id", "collection_item"."user_prompt_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "content_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "content_type" NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"cover_image_url" text,
	"category_id" uuid,
	"difficulty" "difficulty",
	"status" "content_status" DEFAULT 'DRAFT' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"required_entitlement" text,
	"search_keywords" text DEFAULT '' NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (
        setweight(to_tsvector('portuguese', intelra_unaccent(coalesce(title, ''))), 'A') ||
        setweight(to_tsvector('portuguese', intelra_unaccent(coalesce(search_keywords, ''))), 'A') ||
        setweight(to_tsvector('portuguese', intelra_unaccent(coalesce(summary, ''))), 'B') ||
        setweight(to_tsvector('portuguese', intelra_unaccent(coalesce(description, ''))), 'C')) STORED,
	"view_count" integer DEFAULT 0 NOT NULL,
	"use_count" integer DEFAULT 0 NOT NULL,
	"favorite_count" integer DEFAULT 0 NOT NULL,
	"published_at" timestamp with time zone,
	"created_by_id" text,
	"updated_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "content_relation" (
	"from_id" uuid NOT NULL,
	"to_id" uuid NOT NULL,
	"kind" "relation_kind" DEFAULT 'RELATED' NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_relation_from_id_to_id_kind_pk" PRIMARY KEY("from_id","to_id","kind"),
	CONSTRAINT "content_relation_no_self" CHECK ("content_relation"."from_id" <> "content_relation"."to_id")
);
--> statement-breakpoint
CREATE TABLE "content_tag" (
	"content_id" uuid NOT NULL,
	"tag_id" uuid NOT NULL,
	CONSTRAINT "content_tag_content_id_tag_id_pk" PRIMARY KEY("content_id","tag_id")
);
--> statement-breakpoint
CREATE TABLE "experiment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"objective" text DEFAULT '' NOT NULL,
	"tool_id" uuid,
	"source_prompt_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experiment_variant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"experiment_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"label" text NOT NULL,
	"prompt" text NOT NULL,
	"parameters" text,
	"observations" text,
	"result" text,
	"result_url" text,
	"score" integer,
	CONSTRAINT "experiment_variant_score_range" CHECK ("experiment_variant"."score" is null or ("experiment_variant"."score" between 0 and 10))
);
--> statement-breakpoint
CREATE TABLE "favorite" (
	"user_id" text NOT NULL,
	"content_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorite_user_id_content_id_pk" PRIMARY KEY("user_id","content_id")
);
--> statement-breakpoint
CREATE TABLE "history_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"content_id" uuid NOT NULL,
	"action" "history_action" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_update" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"kind" "update_kind" DEFAULT 'ANNOUNCEMENT' NOT NULL,
	"content_id" uuid,
	"state" "publish_state" DEFAULT 'DRAFT' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "membership_status" DEFAULT 'ACTIVE' NOT NULL,
	"source" "membership_source" DEFAULT 'MANUAL' NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ends_at" timestamp with time zone,
	"external_ref" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plan_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "plan_entitlement" (
	"plan_id" uuid NOT NULL,
	"key" text NOT NULL,
	CONSTRAINT "plan_entitlement_plan_id_key_pk" PRIMARY KEY("plan_id","key")
);
--> statement-breakpoint
CREATE TABLE "prompt" (
	"content_id" uuid PRIMARY KEY NOT NULL,
	"body" text NOT NULL,
	"negative_prompt" text,
	"media_type" "media_type" DEFAULT 'IMAGE' NOT NULL,
	"aspect_ratio" text,
	"parameters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"recommended_settings" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expected_result" text,
	"tips" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"current_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_variable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_id" uuid NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"placeholder" text,
	"default_value" text,
	"description" text,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "prompt_version" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prompt_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"body" text NOT NULL,
	"negative_prompt" text,
	"parameters" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"changelog" text,
	"created_by_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limit" (
	"id" text PRIMARY KEY NOT NULL,
	"key" text NOT NULL,
	"count" integer NOT NULL,
	"last_request" bigint NOT NULL,
	CONSTRAINT "rate_limit_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "reference" (
	"content_id" uuid PRIMARY KEY NOT NULL,
	"source_name" text,
	"source_url" text,
	"style" text,
	"notes" text,
	"palette" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"aspect_ratio" text
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "tag" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tag_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "tool" (
	"content_id" uuid PRIMARY KEY NOT NULL,
	"website_url" text,
	"logo_url" text,
	"pricing_status" "pricing_status" DEFAULT 'UNKNOWN' NOT NULL,
	"pricing_note" text,
	"primary_use" text,
	"capabilities" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"supported_media" "media_type"[] DEFAULT '{}'::media_type[] NOT NULL,
	"strengths" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"limitations" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"verified_at" timestamp with time zone,
	"verification_status" "verification_status" DEFAULT 'NEEDS_REVIEW' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutorial" (
	"content_id" uuid PRIMARY KEY NOT NULL,
	"objective" text DEFAULT '' NOT NULL,
	"estimated_minutes" integer,
	"prerequisites" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"mistakes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pro_tips" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tutorial_step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tutorial_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"prompt_id" uuid
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" text DEFAULT 'USER' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_role_check" CHECK ("user"."role" in ('USER', 'ADMIN'))
);
--> statement-breakpoint
CREATE TABLE "user_prompt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"negative_prompt" text,
	"notes" text,
	"source_content_id" uuid,
	"builder_state" jsonb,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow" (
	"content_id" uuid PRIMARY KEY NOT NULL,
	"objective" text DEFAULT '' NOT NULL,
	"estimated_minutes" integer,
	"inputs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expected_output" text,
	"alternatives" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"troubleshooting" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_step" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"tool_id" uuid,
	"prompt_id" uuid,
	"settings" text,
	"tip" text
);
--> statement-breakpoint
ALTER TABLE "access_code" ADD CONSTRAINT "access_code_plan_id_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_code" ADD CONSTRAINT "access_code_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_code_redemption" ADD CONSTRAINT "access_code_redemption_code_id_access_code_id_fk" FOREIGN KEY ("code_id") REFERENCES "public"."access_code"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_code_redemption" ADD CONSTRAINT "access_code_redemption_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection" ADD CONSTRAINT "collection_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_item" ADD CONSTRAINT "collection_item_collection_id_collection_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collection"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_item" ADD CONSTRAINT "collection_item_content_id_content_item_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collection_item" ADD CONSTRAINT "collection_item_user_prompt_id_user_prompt_id_fk" FOREIGN KEY ("user_prompt_id") REFERENCES "public"."user_prompt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_item" ADD CONSTRAINT "content_item_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_item" ADD CONSTRAINT "content_item_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_item" ADD CONSTRAINT "content_item_updated_by_id_user_id_fk" FOREIGN KEY ("updated_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_relation" ADD CONSTRAINT "content_relation_from_id_content_item_id_fk" FOREIGN KEY ("from_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_relation" ADD CONSTRAINT "content_relation_to_id_content_item_id_fk" FOREIGN KEY ("to_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_tag" ADD CONSTRAINT "content_tag_content_id_content_item_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "content_tag" ADD CONSTRAINT "content_tag_tag_id_tag_id_fk" FOREIGN KEY ("tag_id") REFERENCES "public"."tag"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment" ADD CONSTRAINT "experiment_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment" ADD CONSTRAINT "experiment_tool_id_content_item_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."content_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment" ADD CONSTRAINT "experiment_source_prompt_id_content_item_id_fk" FOREIGN KEY ("source_prompt_id") REFERENCES "public"."content_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "experiment_variant" ADD CONSTRAINT "experiment_variant_experiment_id_experiment_id_fk" FOREIGN KEY ("experiment_id") REFERENCES "public"."experiment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_content_id_content_item_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history_event" ADD CONSTRAINT "history_event_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "history_event" ADD CONSTRAINT "history_event_content_id_content_item_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_update" ADD CONSTRAINT "lab_update_content_id_content_item_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership" ADD CONSTRAINT "membership_plan_id_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plan_entitlement" ADD CONSTRAINT "plan_entitlement_plan_id_plan_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."plan"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt" ADD CONSTRAINT "prompt_content_id_content_item_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_variable" ADD CONSTRAINT "prompt_variable_prompt_id_prompt_content_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompt"("content_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_version" ADD CONSTRAINT "prompt_version_prompt_id_prompt_content_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompt"("content_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt_version" ADD CONSTRAINT "prompt_version_created_by_id_user_id_fk" FOREIGN KEY ("created_by_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference" ADD CONSTRAINT "reference_content_id_content_item_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool" ADD CONSTRAINT "tool_content_id_content_item_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorial" ADD CONSTRAINT "tutorial_content_id_content_item_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorial_step" ADD CONSTRAINT "tutorial_step_tutorial_id_tutorial_content_id_fk" FOREIGN KEY ("tutorial_id") REFERENCES "public"."tutorial"("content_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tutorial_step" ADD CONSTRAINT "tutorial_step_prompt_id_content_item_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."content_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_prompt" ADD CONSTRAINT "user_prompt_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_prompt" ADD CONSTRAINT "user_prompt_source_content_id_content_item_id_fk" FOREIGN KEY ("source_content_id") REFERENCES "public"."content_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow" ADD CONSTRAINT "workflow_content_id_content_item_id_fk" FOREIGN KEY ("content_id") REFERENCES "public"."content_item"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step" ADD CONSTRAINT "workflow_step_workflow_id_workflow_content_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflow"("content_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step" ADD CONSTRAINT "workflow_step_tool_id_content_item_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."content_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_step" ADD CONSTRAINT "workflow_step_prompt_id_content_item_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."content_item"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "category_kind_slug_uq" ON "category" USING btree ("kind","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_user_name_uq" ON "collection" USING btree ("user_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "collection_item_content_uq" ON "collection_item" USING btree ("collection_id","content_id") WHERE "collection_item"."content_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "collection_item_user_prompt_uq" ON "collection_item" USING btree ("collection_id","user_prompt_id") WHERE "collection_item"."user_prompt_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "content_type_slug_uq" ON "content_item" USING btree ("type","slug");--> statement-breakpoint
CREATE INDEX "content_listing_idx" ON "content_item" USING btree ("type","status","published_at");--> statement-breakpoint
CREATE INDEX "content_category_idx" ON "content_item" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "content_search_idx" ON "content_item" USING gin ("search");--> statement-breakpoint
CREATE INDEX "content_title_trgm_idx" ON "content_item" USING gin (intelra_unaccent("title") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "content_relation_to_idx" ON "content_relation" USING btree ("to_id","kind");--> statement-breakpoint
CREATE INDEX "content_tag_tag_idx" ON "content_tag" USING btree ("tag_id");--> statement-breakpoint
CREATE INDEX "experiment_user_idx" ON "experiment" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE UNIQUE INDEX "experiment_variant_position_uq" ON "experiment_variant" USING btree ("experiment_id","position");--> statement-breakpoint
CREATE INDEX "favorite_user_idx" ON "favorite" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "history_user_idx" ON "history_event" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "history_content_idx" ON "history_event" USING btree ("content_id");--> statement-breakpoint
CREATE INDEX "lab_update_published_idx" ON "lab_update" USING btree ("state","published_at");--> statement-breakpoint
CREATE INDEX "membership_user_idx" ON "membership" USING btree ("user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_variable_uq" ON "prompt_variable" USING btree ("prompt_id","key");--> statement-breakpoint
CREATE UNIQUE INDEX "prompt_version_uq" ON "prompt_version" USING btree ("prompt_id","version");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tutorial_step_position_uq" ON "tutorial_step" USING btree ("tutorial_id","position");--> statement-breakpoint
CREATE INDEX "user_prompt_user_idx" ON "user_prompt" USING btree ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE UNIQUE INDEX "workflow_step_position_uq" ON "workflow_step" USING btree ("workflow_id","position");