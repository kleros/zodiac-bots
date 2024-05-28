import { bigint, pgTable, varchar } from "drizzle-orm/pg-core";

export const space = pgTable("space", {
  ens: varchar("ens").primaryKey(),
  startBlock: bigint("start_block", { mode: "bigint" }).notNull(),
  lastProcessedBlock: bigint("last_processed_block", { mode: "bigint" }),
});
