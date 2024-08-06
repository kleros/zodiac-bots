ALTER TABLE "proposal" ADD COLUMN "snapshot_id" varchar(66) NOT NULL;--> statement-breakpoint
ALTER TABLE "proposal" ADD COLUMN "started_at" timestamp NOT NULL;--> statement-breakpoint
ALTER TABLE "proposal" ADD COLUMN "timeout" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "proposal" ADD COLUMN "finished_at" timestamp NOT NULL;