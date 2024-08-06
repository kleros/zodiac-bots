import type { Address, Hash, Hex } from "viem";
import { AnswerNotification, EventType, ProposalNotification, ProposalNotificationEvent } from "../notify";
import { InsertableProposal } from "../services/db/proposals";
import type { LogNewAnswer, ProposalQuestionCreated } from "../services/reality";
import type { Space } from "../types";

export const getRandomHex = (size: number): Hex =>
  (`0x` + [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join(``)) as Hex;

export const getRandomHash = (): Hash => getRandomHex(64) as Hash;
export const getRandomAddress = (): Address => getRandomHex(40);

export const randomizeEns = () => `test${Math.floor(Math.random() * 1000000)}.eth`;

export const randomizeSpace = (): Space => ({
  ens: randomizeEns(),
  startBlock: 100n,
  lastProcessedBlock: 50n,
  moduleAddress: getRandomAddress(),
  oracleAddress: getRandomAddress(),
});

export const randomizeProposal = (fields: Partial<InsertableProposal>): InsertableProposal => ({
  ens: randomizeEns(),
  questionId: getRandomHash(),
  proposalId: getRandomHash(),
  txHash: getRandomHash(),
  happenedAt: new Date(),
  snapshotId: getRandomHash(),
  startedAt: new Date(),
  timeout: 5000,
  finishedAt: new Date(Date.now() + 5000 * 1000),
  ...fields,
});

export const randomizeProposalQuestionCreated = (): ProposalQuestionCreated => ({
  txHash: getRandomHash(),
  proposalId: getRandomHash(),
  questionId: getRandomHash(),
  blockNumber: 50n,
  happenedAt: new Date(),
});

export const randomizeProposalNotificationEvent = (): ProposalNotificationEvent => ({
  ...randomizeProposalQuestionCreated(),
  snapshotId: getRandomHash(),
  startedAt: new Date(),
  timeout: 5000,
  finishedAt: new Date(Date.now() + 5000 * 1000),
});

export const randomizeAnswerEventField = (): LogNewAnswer => ({
  questionId: getRandomHash(),
  answer: "0x0000000000000000000000000000000000000000000000000000000000000001",
  bond: 100000000000000000n,
  user: getRandomAddress(),
  txHash: getRandomHash(),
  blockNumber: 50n,
  happenedAt: new Date(),
});

/**
 * Generates a Proposal notification with randomized values
 *
 * @param fields - Fields that has a fixed value and should not be randomized
 */
export const randomizeProposalNotification = (fields?: Partial<ProposalNotification>): ProposalNotification => ({
  type: EventType.PROPOSAL_QUESTION_CREATED,
  space: randomizeSpace(),
  event: randomizeProposalNotificationEvent(),
  ...fields,
});

/**
 * Generates an Answer notification with randomized values
 */
export const randomizeAnswerNotification = (): AnswerNotification => ({
  type: EventType.NEW_ANSWER,
  space: randomizeSpace(),
  event: randomizeAnswerEventField(),
});
