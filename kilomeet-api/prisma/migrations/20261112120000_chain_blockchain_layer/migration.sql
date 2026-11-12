-- DropIndex
DROP INDEX "chain_outbox_status_created_at_idx";

-- AlterTable
ALTER TABLE "chain_outbox" ADD COLUMN     "seq" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "voucher_templates" ALTER COLUMN "chain_token_id" DROP NOT NULL,
ALTER COLUMN "chain_token_id" DROP DEFAULT;
DROP SEQUENCE "voucher_templates_chain_token_id_seq";

-- CreateIndex
CREATE INDEX "chain_outbox_status_seq_idx" ON "chain_outbox"("status", "seq");

