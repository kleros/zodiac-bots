import { bigint, index, integer, pgEnum, pgTable, primaryKey, text, timestamp, varchar } from "drizzle-orm/pg-core";

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
    logIndex: integer("log_index").notNull(),
    block: bigint("block", { mode: "bigint" }).notNull(),
    transportName: transportEnum("transport_name").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.txHash, t.logIndex, t.transportName] }),
  }),
);

export const proposal = pgTable(
  "proposal",
  {
    proposalId: varchar("proposal_id", { length: 66 }).notNull(),
    questionId: varchar("question_id", { length: 66 }).notNull().primaryKey(),
    ens: varchar("ens")
      .references(() => space.ens)
      .notNull(),
    // Attacker controlled and unbounded on chain.
    snapshotId: text("snapshot_id").notNull(),
    startedAt: timestamp("started_at").notNull(),
    // uint32 on chain, which does not fit a Postgres integer. Number mode is safe because the
    // widest value the oracle can emit is far below Number.MAX_SAFE_INTEGER.
    timeout: bigint("timeout", { mode: "number" }).notNull(),
    finishedAt: timestamp("finished_at").notNull(),
    txHash: varchar("tx_hash", { length: 66 }).notNull(),
    happenedAt: timestamp("happened_at").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => ({
    ensIdx: index("ens_idx").on(t.ens),
  }),
);
