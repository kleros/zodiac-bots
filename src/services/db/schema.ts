import { bigint, index, pgEnum, pgTable, primaryKey, timestamp, varchar } from "drizzle-orm/pg-core";

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

export const proposal = pgTable(
  "proposal",
  {
    proposalId: varchar("proposal_id", { length: 66 }).notNull().primaryKey(),
    questionId: varchar("question_id", { length: 66 }).notNull(),
    ens: varchar("ens")
      .references(() => space.ens)
      .notNull(),
    txHash: varchar("tx_hash", { length: 66 }).notNull(),
    happenedAt: timestamp("happened_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    questionIdx: index("question_idx").on(t.questionId),
    ensIdx: index("ens_idx").on(t.ens),
  }),
);
