import { LogNewAnswer, ProposalQuestionCreated } from "./services/reality";
import { notify as notifySlack } from "./services/slack";
import { notify as notifyTelegram } from "./services/telegram";
import { Space } from "./types";

export enum EventType {
  PROPOSAL_QUESTION_CREATED = "proposal_question_created",
  NEW_ANSWER = "new_answer",
}

export type NotifyParams = { space: Space } & (
  | { type: EventType.PROPOSAL_QUESTION_CREATED; event: ProposalQuestionCreated }
  | { type: EventType.NEW_ANSWER; event: LogNewAnswer }
);
/**
 * Invokes all the transports to notify the event
 */
export const notify = async (notification: NotifyParams) => {
  return Promise.all([notifySlack(notification), notifyTelegram(notification)]);
};
