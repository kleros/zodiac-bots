import { bigint, pgEnum, pgTable, primaryKey, timestamp, unique, varchar } from "drizzle-orm/pg-core";

export const space = pgTable("space", {
  ens: varchar("ens").primaryKey(),
  startBlock: bigint("start_block", { mode: "bigint" }).notNull(),
  lastProcessedBlock: bigint("last_processed_block", { mode: "bigint" }),
});

export const transportEnum = pgEnum("transport_name", ["telegram", "slack", "email"]);

export const notification = pgTable(
  "notification",
  {
    txHash: varchar("tx_hash", { length: 66 }).notNull(),
    block: bigint("block", { mode: "bigint" }).notNull(),
    transportName: transportEnum("transport_name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.txHash, t.transportName] }),
  }),
);
