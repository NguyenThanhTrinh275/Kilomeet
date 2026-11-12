-- CreateEnum
CREATE TYPE "QuestType" AS ENUM ('daily', 'weekly');

-- CreateEnum
CREATE TYPE "QuestStatus" AS ENUM ('active', 'completed', 'expired');

-- CreateEnum
CREATE TYPE "OwnedVoucherStatus" AS ENUM ('owned', 'gifted', 'used', 'expired');

-- CreateEnum
CREATE TYPE "RankRange" AS ENUM ('same', 'within1', 'within2', 'any');

-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('open', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "AutoMatchStatus" AS ENUM ('pending', 'matched', 'expired', 'cancelled');

-- AlterTable
ALTER TABLE "runner_profiles" ADD COLUMN     "groups_joined" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "groups_on_time" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "home_lat" DOUBLE PRECISION,
ADD COLUMN     "home_lng" DOUBLE PRECISION,
ADD COLUMN     "km_week_start" TEXT NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE "seasons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" TEXT NOT NULL,
    "end_date" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "ended_at" TIMESTAMPTZ(3),

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_results" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "season_id" TEXT,
    "week_start" TEXT NOT NULL,
    "km" DOUBLE PRECISION NOT NULL,
    "level_idx" INTEGER NOT NULL,
    "rank_before" INTEGER NOT NULL,
    "rank_after" INTEGER NOT NULL,
    "skip_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "distance_km" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "duration_minutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avg_pace" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "route" JSONB NOT NULL DEFAULT '[]',
    "started_at" TIMESTAMPTZ(3) NOT NULL,
    "ended_at" TIMESTAMPTZ(3),
    "passed_store_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "claimed_store_id" TEXT,

    CONSTRAINT "runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" "QuestType" NOT NULL,
    "period_key" TEXT NOT NULL,
    "target_km" DOUBLE PRECISION NOT NULL,
    "progress_km" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reward_tokens" INTEGER NOT NULL,
    "status" "QuestStatus" NOT NULL DEFAULT 'active',
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "completed_at" TIMESTAMPTZ(3),

    CONSTRAINT "quests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "token_ledger" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "ref_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "token_ledger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_templates" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "price_tokens" INTEGER NOT NULL,
    "discount_percent" INTEGER NOT NULL,
    "quest_description" TEXT,
    "quest_discount_percent" INTEGER NOT NULL DEFAULT 0,
    "total_supply" INTEGER NOT NULL,
    "remaining" INTEGER NOT NULL,
    "min_rank_idx" INTEGER NOT NULL DEFAULT 0,
    "area" TEXT,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "image_url" TEXT,
    "chain_token_id" SERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voucher_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_quest_claims" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "claimed_at" TIMESTAMPTZ(3) NOT NULL,
    "used_for_template_id" TEXT,

    CONSTRAINT "voucher_quest_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owned_vouchers" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "buyer_id" TEXT NOT NULL,
    "status" "OwnedVoucherStatus" NOT NULL DEFAULT 'owned',
    "purchased_at" TIMESTAMPTZ(3) NOT NULL,
    "quest_completed_at" TIMESTAMPTZ(3),
    "paid_tokens" INTEGER NOT NULL,
    "discounted" BOOLEAN NOT NULL DEFAULT false,
    "gifted_from" TEXT,
    "used_at" TIMESTAMPTZ(3),
    "qr_code" TEXT NOT NULL,

    CONSTRAINT "owned_vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_usages" (
    "id" TEXT NOT NULL,
    "owned_voucher_id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "used_at" TIMESTAMPTZ(3) NOT NULL,
    "fee_vnd" INTEGER NOT NULL,

    CONSTRAINT "voucher_usages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "season_badges" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "season_id" TEXT NOT NULL,
    "highest_rank_idx" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "season_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "creator_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time_slot" TEXT NOT NULL,
    "starts_at" TIMESTAMPTZ(3) NOT NULL,
    "meeting_name" TEXT NOT NULL,
    "meeting_lat" DOUBLE PRECISION NOT NULL,
    "meeting_lng" DOUBLE PRECISION NOT NULL,
    "distance_km" DOUBLE PRECISION NOT NULL,
    "rank_range" "RankRange" NOT NULL,
    "min_punctuality" INTEGER NOT NULL DEFAULT 0,
    "status" "GroupStatus" NOT NULL DEFAULT 'open',
    "max_members" INTEGER NOT NULL DEFAULT 6,
    "auto_matched" BOOLEAN NOT NULL DEFAULT false,
    "milestone" TEXT NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rank_range" "RankRange" NOT NULL,
    "confirmed" BOOLEAN NOT NULL DEFAULT false,
    "arrived" BOOLEAN NOT NULL DEFAULT false,
    "arrived_at" TIMESTAMPTZ(3),
    "absent" BOOLEAN NOT NULL DEFAULT false,
    "joined_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("group_id","user_id")
);

-- CreateTable
CREATE TABLE "group_locations" (
    "group_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "group_locations_pkey" PRIMARY KEY ("group_id","user_id")
);

-- CreateTable
CREATE TABLE "auto_match_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "time_slots" TEXT[],
    "distance_km" DOUBLE PRECISION NOT NULL,
    "rank_range" "RankRange" NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "status" "AutoMatchStatus" NOT NULL DEFAULT 'pending',
    "group_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "auto_match_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "dedupe_key" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "weekly_results_user_id_week_start_key" ON "weekly_results"("user_id", "week_start");

-- CreateIndex
CREATE INDEX "runs_user_id_started_at_idx" ON "runs"("user_id", "started_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "quests_user_id_type_period_key_key" ON "quests"("user_id", "type", "period_key");

-- CreateIndex
CREATE UNIQUE INDEX "token_ledger_user_id_reason_ref_id_key" ON "token_ledger"("user_id", "reason", "ref_id");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_templates_chain_token_id_key" ON "voucher_templates"("chain_token_id");

-- CreateIndex
CREATE INDEX "voucher_templates_store_id_idx" ON "voucher_templates"("store_id");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_quest_claims_run_id_key" ON "voucher_quest_claims"("run_id");

-- CreateIndex
CREATE INDEX "voucher_quest_claims_user_id_store_id_idx" ON "voucher_quest_claims"("user_id", "store_id");

-- CreateIndex
CREATE UNIQUE INDEX "owned_vouchers_qr_code_key" ON "owned_vouchers"("qr_code");

-- CreateIndex
CREATE INDEX "owned_vouchers_owner_id_idx" ON "owned_vouchers"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_usages_owned_voucher_id_key" ON "voucher_usages"("owned_voucher_id");

-- CreateIndex
CREATE INDEX "voucher_usages_store_id_used_at_idx" ON "voucher_usages"("store_id", "used_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "season_badges_user_id_season_id_key" ON "season_badges"("user_id", "season_id");

-- CreateIndex
CREATE INDEX "groups_status_starts_at_idx" ON "groups"("status", "starts_at");

-- CreateIndex
CREATE INDEX "auto_match_requests_status_date_idx" ON "auto_match_requests"("status", "date");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "notifications_user_id_dedupe_key_key" ON "notifications"("user_id", "dedupe_key");

-- AddForeignKey
ALTER TABLE "weekly_results" ADD CONSTRAINT "weekly_results_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_results" ADD CONSTRAINT "weekly_results_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "runs" ADD CONSTRAINT "runs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quests" ADD CONSTRAINT "quests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "token_ledger" ADD CONSTRAINT "token_ledger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_templates" ADD CONSTRAINT "voucher_templates_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_quest_claims" ADD CONSTRAINT "voucher_quest_claims_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owned_vouchers" ADD CONSTRAINT "owned_vouchers_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "voucher_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owned_vouchers" ADD CONSTRAINT "owned_vouchers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "owned_vouchers" ADD CONSTRAINT "owned_vouchers_buyer_id_fkey" FOREIGN KEY ("buyer_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_usages" ADD CONSTRAINT "voucher_usages_owned_voucher_id_fkey" FOREIGN KEY ("owned_voucher_id") REFERENCES "owned_vouchers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_badges" ADD CONSTRAINT "season_badges_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "season_badges" ADD CONSTRAINT "season_badges_season_id_fkey" FOREIGN KEY ("season_id") REFERENCES "seasons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_creator_id_fkey" FOREIGN KEY ("creator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_locations" ADD CONSTRAINT "group_locations_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_locations" ADD CONSTRAINT "group_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auto_match_requests" ADD CONSTRAINT "auto_match_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
