// Snapshot ids come in three shapes: 0x + 64 hex (EIP-712 hash, everything since 2021-10-27),
// Qm + 44 base58 (CIDv0, still present in 1inch.eth history) and b + 58 base32 (CIDv1,
// accepted by Snapshot's UI but unobserved). Match on charset, not length: the 2026-08-13
// attack string is exactly 46 characters, the same as a CIDv0.
const SNAPSHOT_PROPOSAL_ID_PATTERN = /^(0x[0-9a-fA-F]{64}|Qm[1-9A-HJ-NP-Za-km-z]{44}|b[a-z2-7]{58})$/;

/** Bound for the proposal id, which the Reality module emits unvalidated and unbounded. */
export const STORED_PROPOSAL_ID_MAX_LENGTH = 200;

/**
 * Reports whether a string is shaped like a Snapshot proposal id. Shape only: a match is not
 * evidence that the proposal exists.
 *
 * @param proposalId - The proposal id as emitted by the Reality module
 * @returns `true` when it matches a known Snapshot id generation
 *
 * @example
 * isSnapshotProposalId("wave3-drain"); // false
 */
export const isSnapshotProposalId = (proposalId: string): boolean => {
  return SNAPSHOT_PROPOSAL_ID_PATTERN.test(proposalId);
};

/**
 * Bounds a proposal id for storage, marking how much was dropped.
 *
 * Truncating can make an invalid id look valid, so never re-validate the stored value.
 *
 * @param proposalId - The proposal id as emitted by the Reality module
 * @returns The id, or its leading characters plus a marker
 *
 * @example
 * truncateForStorage("a".repeat(242)); // "aaa… … [+42 chars]"
 */
export const truncateForStorage = (proposalId: string): string => {
  if (proposalId.length <= STORED_PROPOSAL_ID_MAX_LENGTH) return proposalId;

  const dropped = proposalId.length - STORED_PROPOSAL_ID_MAX_LENGTH;

  return `${proposalId.slice(0, STORED_PROPOSAL_ID_MAX_LENGTH)} … [+${dropped} chars]`;
};
