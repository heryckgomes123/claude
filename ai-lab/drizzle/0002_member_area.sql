-- Área de membros simples: substitui o modelo de conteúdo anterior (planos, coleções,
-- workflows, experimentos...) por prompts, aulas, ferramentas e liberações de acesso por e-mail.
-- As tabelas de autenticação (user, session, account, verification, rate_limit) são mantidas.
DROP TABLE IF EXISTS "plan" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "plan_entitlement" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "membership" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "access_code" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "access_code_redemption" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "category" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "tag" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "content_item" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "prompt" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "prompt_version" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "prompt_variable" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "workflow" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "workflow_step" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "tool" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "reference" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "tutorial" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "tutorial_step" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "content_tag" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "content_relation" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "favorite" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "user_prompt" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "collection" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "collection_item" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "history_event" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "experiment" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "experiment_variant" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "lab_update" CASCADE;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."category_kind";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."content_status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."content_type";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."difficulty";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."history_action";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."media_type";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."membership_source";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."membership_status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."pricing_status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."publish_state";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."relation_kind";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."update_kind";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."verification_status";--> statement-breakpoint
CREATE TABLE "access_grant" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"status" text DEFAULT 'ACTIVE' NOT NULL,
	"source" text DEFAULT 'MANUAL' NOT NULL,
	"external_ref" text,
	"product" text,
	"note" text,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "access_grant_status_check" CHECK ("access_grant"."status" in ('ACTIVE', 'REVOKED')),
	CONSTRAINT "access_grant_source_check" CHECK ("access_grant"."source" in ('MANUAL', 'HOTMART', 'KIWIFY'))
);--> statement-breakpoint
CREATE TABLE "favorite" (
	"user_id" text NOT NULL,
	"prompt_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "favorite_user_id_prompt_id_pk" PRIMARY KEY("user_id","prompt_id")
);--> statement-breakpoint
CREATE TABLE "lesson" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"module" text NOT NULL,
	"title" text NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"video_url" text,
	"content" text DEFAULT '' NOT NULL,
	"material_url" text,
	"duration_min" integer,
	"published" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_slug_unique" UNIQUE("slug")
);--> statement-breakpoint
CREATE TABLE "lesson_progress" (
	"user_id" text NOT NULL,
	"lesson_id" uuid NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lesson_progress_user_id_lesson_id_pk" PRIMARY KEY("user_id","lesson_id")
);--> statement-breakpoint
CREATE TABLE "lesson_prompt" (
	"lesson_id" uuid NOT NULL,
	"prompt_id" uuid NOT NULL,
	CONSTRAINT "lesson_prompt_lesson_id_prompt_id_pk" PRIMARY KEY("lesson_id","prompt_id")
);--> statement-breakpoint
CREATE TABLE "media" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_type" text NOT NULL,
	"size" integer NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "prompt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"category" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"body" text NOT NULL,
	"negative" text,
	"tips" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"tools" text,
	"image_id" uuid,
	"published" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"copy_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "prompt_slug_unique" UNIQUE("slug")
);--> statement-breakpoint
CREATE TABLE "setting" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "tool" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"url" text NOT NULL,
	"how_to" text,
	"published" boolean DEFAULT true NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tool_slug_unique" UNIQUE("slug")
);--> statement-breakpoint
CREATE TABLE "webhook_event" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"event_id" text,
	"event_type" text NOT NULL,
	"email" text,
	"external_ref" text,
	"product" text,
	"outcome" text NOT NULL,
	"detail" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorite" ADD CONSTRAINT "favorite_prompt_id_prompt_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lesson_id_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lesson"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_prompt" ADD CONSTRAINT "lesson_prompt_lesson_id_lesson_id_fk" FOREIGN KEY ("lesson_id") REFERENCES "public"."lesson"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lesson_prompt" ADD CONSTRAINT "lesson_prompt_prompt_id_prompt_id_fk" FOREIGN KEY ("prompt_id") REFERENCES "public"."prompt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prompt" ADD CONSTRAINT "prompt_image_id_media_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."media"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "access_grant_email_idx" ON "access_grant" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "access_grant_source_ref_idx" ON "access_grant" USING btree ("source","external_ref");--> statement-breakpoint
CREATE INDEX "lesson_list_idx" ON "lesson" USING btree ("published","position");--> statement-breakpoint
CREATE INDEX "lesson_prompt_prompt_idx" ON "lesson_prompt" USING btree ("prompt_id");--> statement-breakpoint
CREATE INDEX "prompt_list_idx" ON "prompt" USING btree ("published","category","position");--> statement-breakpoint
CREATE INDEX "tool_list_idx" ON "tool" USING btree ("published","position");--> statement-breakpoint
CREATE INDEX "webhook_event_created_idx" ON "webhook_event" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_event_provider_event_idx" ON "webhook_event" USING btree ("provider","event_id");
