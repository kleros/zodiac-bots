import type { Address, Hash, Hex } from "viem";
import { AnswerNotification, EventType, ProposalNotification, type Notification } from "../notify";
import type { LogNewAnswer, ProposalQuestionCreated } from "../services/reality";
import type { Space } from "../types";

export const getRandomHex = (size: number): Hex =>
  (`0x` + [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join(``)) as Hex;

export const getRandomHash = (): Hash => getRandomHex(64);
export const getRandomAddress = (): Address => getRandomHex(40);

export const randomizeSpace = (): Space => ({
  ens: "kleros.eth",
  startBlock: 100n,
  lastProcessedBlock: 50n,
  moduleAddress: getRandomAddress(),
  oracleAddress: getRandomAddress(),
});

export const randomizeProposalEventField = (): ProposalQuestionCreated => ({
  txHash: getRandomHash(),
  proposalId: getRandomHash(),
  questionId: getRandomHash(),
  blockNumber: 50n,
});

export const randomizeAnswerEventField = (): LogNewAnswer => ({
  questionId: getRandomHash(),
  answer: "0x0000000000000000000000000000000000000000000000000000000000000001",
  bond: 100000000000000000n,
  user: getRandomAddress(),
  ts: 1710928271,
  txHash: getRandomHash(),
  blockNumber: 50n,
});

/**
 * Generates a Proposal notification with randomized values
 */
export const randomizeProposalNotification = (): ProposalNotification => ({
  type: EventType.PROPOSAL_QUESTION_CREATED,
  space: randomizeSpace(),
  event: randomizeProposalEventField(),
});

/**
 * Generates an Answer notification with randomized values
 */
export const randomizeAnswerNotification = (): AnswerNotification => ({
  type: EventType.NEW_ANSWER,
  space: randomizeSpace(),
  event: randomizeAnswerEventField(),
});
