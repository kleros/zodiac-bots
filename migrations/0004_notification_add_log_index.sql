ALTER TABLE "notification" ADD COLUMN "log_index" integer NOT NULL DEFAULT 0;
--> statement-breakpoint
ALTER TABLE "notification" ALTER COLUMN "log_index" DROP DEFAULT;
--> statement-breakpoint
ALTER TABLE "notification" DROP CONSTRAINT "notification_tx_hash_transport_name_pk";
--> statement-breakpoint
ALTER TABLE "notification" ADD CONSTRAINT "notification_tx_hash_log_index_transport_name_pk" PRIMARY KEY("tx_hash","log_index","transport_name");
