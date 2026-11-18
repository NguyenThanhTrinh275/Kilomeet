-- CreateEnum
CREATE TYPE "StoreFeeKind" AS ENUM ('topup', 'hold', 'charge', 'release');

-- AlterTable
ALTER TABLE "owned_vouchers" ADD COLUMN     "fee_held_vnd" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "stores" ADD COLUMN     "fee_balance_vnd" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "fee_held_vnd" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "store_fee_entries" (
    "id" TEXT NOT NULL,
    "store_id" TEXT NOT NULL,
    "kind" "StoreFeeKind" NOT NULL,
    "amount_vnd" INTEGER NOT NULL,
    "balance_delta" INTEGER NOT NULL,
    "held_delta" INTEGER NOT NULL,
    "ref" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "store_fee_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_fee_entries_ref_key" ON "store_fee_entries"("ref");

-- CreateIndex
CREATE INDEX "store_fee_entries_store_id_created_at_idx" ON "store_fee_entries"("store_id", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "store_fee_entries" ADD CONSTRAINT "store_fee_entries_store_id_fkey" FOREIGN KEY ("store_id") REFERENCES "stores"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
