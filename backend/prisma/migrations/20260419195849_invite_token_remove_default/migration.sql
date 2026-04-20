-- AlterTable: remove uuid default from invite token, switch to app-generated crypto-random tokens
ALTER TABLE "invites" ALTER COLUMN "token" DROP DEFAULT,
ALTER COLUMN "token" SET DATA TYPE TEXT;
