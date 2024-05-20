CREATE TABLE IF NOT EXISTS "space" (
	"ens" varchar PRIMARY KEY NOT NULL,
	"start_block" bigint NOT NULL,
	"last_processed_block" bigint
);
