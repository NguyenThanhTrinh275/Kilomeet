-- AlterTable
ALTER TABLE "chain_outbox" ADD COLUMN     "ref" TEXT;

-- CreateIndex
CREATE INDEX "chain_outbox_ref_idx" ON "chain_outbox"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_quest_claims_user_id_used_for_template_id_key" ON "voucher_quest_claims"("user_id", "used_for_template_id");

