-- CreateEnum
CREATE TYPE "Role" AS ENUM ('runner', 'member', 'store', 'admin');

-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('pending', 'sent', 'done', 'failed');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "wallet_index" SERIAL NOT NULL,
    "wallet_address" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "runner_profiles" (
    "user_id" TEXT NOT NULL,
    "rank_idx" INTEGER NOT NULL DEFAULT 0,
    "token_balance" INTEGER NOT NULL DEFAULT 0,
    "km_this_week" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "is_member" BOOLEAN NOT NULL DEFAULT false,
    "member_until" TIMESTAMPTZ(3),
    "area" TEXT,
    "punctuality" INTEGER NOT NULL DEFAULT 100,
    "season_badge_idx" INTEGER,
    "skip_week_available" BOOLEAN NOT NULL DEFAULT true,
    "group_ban_until" TIMESTAMPTZ(3),
    "no_show_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "runner_profiles_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "stores" (
    "user_id" TEXT NOT NULL,
    "store_name" TEXT NOT NULL,
    "store_address" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "status" "StoreStatus" NOT NULL DEFAULT 'pending',
    "applied_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_usages" INTEGER NOT NULL DEFAULT 0,
    "total_fees_vnd" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "chain_outbox" (
    "id" TEXT NOT NULL,
    "op" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'pending',
    "tx_hash" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "chain_outbox_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_index_key" ON "users"("wallet_index");

-- CreateIndex
CREATE UNIQUE INDEX "users_wallet_address_key" ON "users"("wallet_address");

-- CreateIndex
CREATE INDEX "chain_outbox_status_created_at_idx" ON "chain_outbox"("status", "created_at");

-- AddForeignKey
ALTER TABLE "runner_profiles" ADD CONSTRAINT "runner_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
