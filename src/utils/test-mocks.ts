import { EventType, NotifyParams } from "../notify";
import { Space } from "../types";

export const proposalMock: NotifyParams = {
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
