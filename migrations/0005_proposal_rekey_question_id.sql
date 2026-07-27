DROP INDEX IF EXISTS "question_idx";
--> statement-breakpoint
ALTER TABLE "proposal" DROP CONSTRAINT "proposal_pkey";
--> statement-breakpoint
ALTER TABLE "proposal" ADD CONSTRAINT "proposal_question_id_pk" PRIMARY KEY("question_id");
