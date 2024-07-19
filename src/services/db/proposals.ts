import type { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { eq } from "drizzle-orm";
import { Hash } from "viem";
import { getConnection } from "./connection";
import * as schema from "./schema";

/**
 * Proposal context registered for follow-up events
 */
export type Proposal = InferSelectModel<typeof schema.proposal>;
/**
 * Fields required to insert an proposal
 */
export type InsertableProposal = InferInsertModel<typeof schema.proposal>;

/**
 * Inserts a proposal. Does nothing if the proposal is already recorded.
 *
 * @param proposal - The proposal to insert
 *
 * @example
 * await insertProposal(fields);
 */
export const insertProposal = async (proposal: InsertableProposal) => {
  const { db } = getConnection();

  await db.insert(schema.proposal).values(proposal).onConflictDoNothing();
};

/**
 * Returns the active proposal for a given question id. If none exist, returns null.
 *
 * @param questionId - The question id
 * @returns The active proposal or null
 *
 * @example
 * const proposal = await findProposalByQuestionId(questionId);
 */
export const findProposalByQuestionId = async (questionId: Hash): Promise<Proposal | null> => {
  const { db } = getConnection();

  const results = await db.select().from(schema.proposal).where(eq(schema.proposal.questionId, questionId));

  if (results.length === 0) return null;

  return results[0];
};

/**
 * Removes an active proposal by its question id.
 *
 * @param questionId - The question id
 *
 * @example
 * await removeProposalByQuestionId(questionId);
 */
export const removeProposalByQuestionId = async (questionId: Hash) => {
  const { db } = getConnection();

  await db.delete(schema.proposal).where(eq(schema.proposal.questionId, questionId));
};