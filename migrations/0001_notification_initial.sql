DO $$ BEGIN
 CREATE TYPE "transport_name" AS ENUM('telegram', 'slack', 'email');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification" (
	"tx_hash" varchar(66) NOT NULL,
	"block" bigint NOT NULL,
	"transport_name" "transport_name" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notification_tx_hash_transport_name_pk" PRIMARY KEY("tx_hash","transport_name")
);
