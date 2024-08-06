CREATE TABLE IF NOT EXISTS "proposal" (
	"proposal_id" varchar(66) PRIMARY KEY NOT NULL,
	"question_id" varchar(66) NOT NULL,
	"ens" varchar NOT NULL,
	"tx_hash" varchar(66) NOT NULL,
	"happened_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "question_idx" ON "proposal" ("question_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ens_idx" ON "proposal" ("ens");--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "proposal" ADD CONSTRAINT "proposal_ens_space_ens_fk" FOREIGN KEY ("ens") REFERENCES "space"("ens") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
