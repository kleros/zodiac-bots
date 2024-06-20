import { Hash, Hex } from "viem";
import { EventType, Notification, ProposalNotification } from "../notify";
import { Space } from "../types";
import { clone } from "lodash";

export const getRandomHex = (size: number): Hex =>
  (`0x` + [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join(``)) as Hex;

export const getRandomHash = (): Hash => getRandomHex(64);

export const proposalMock: Notification = {
  type: EventType.PROPOSAL_QUESTION_CREATED,
  space: {
    ens: "kleros.eth",
  } as Space,
  event: {
    txHash: "0xA",
    proposalId: "0xB",
    questionId: "0xC",
    blockNumber: 1n,
  },
};

export const randomizeProposalNotification = () => {
  const copy = clone(proposalMock);
  copy.event.txHash = getRandomHash();
  copy.event.proposalId = getRandomHash();
  copy.event.questionId = getRandomHash();

  return copy;
};
