import { LogNewAnswer, ProposalQuestionCreated } from "./services/reality";
import { notify as notifySlack } from "./services/slack";
import { notify as notifyTelegram } from "./services/telegram";
import { notify as notifyEmail } from "./services/email";
import { Space } from "./types";
import { findUsedTransports, insertUsedTransport } from "./services/db/notifications";

export type TransportName = "telegram" | "slack" | "email";
type TransportFn = (notification: Notification) => Promise<void>;
export const transports: { [key in TransportName]: TransportFn } = {
  telegram: notifyTelegram,
  slack: notifySlack,
  email: notifyEmail,
};
export const transportNames = Object.keys(transports) as TransportName[];

export enum EventType {
  PROPOSAL_QUESTION_CREATED = "proposal_question_created",
  NEW_ANSWER = "new_answer",
}
export type ProposalNotification = {
  space: Space;
  type: EventType.PROPOSAL_QUESTION_CREATED;
  event: ProposalQuestionCreated;
};
export type AnswerNotification = {
  space: Space;
  type: EventType.NEW_ANSWER;
  event: LogNewAnswer;
};
export type Notification = ProposalNotification | AnswerNotification;

/**
 * Sends the notification via all the transports, skipping any transport that may have already processed it.
 *
 * @param notification - The notification to send
 *
 * @example
 *
 * await notify(notification)
 */
export const notify = async (notification: Notification) => {
  await configurableNotify({
    notification,
    transports,
    findUsedTransportsFn: findUsedTransports,
    insertUsedTransportFn: insertUsedTransport,
  });
};

type ConfigurableNotifyDeps = {
  notification: Notification;
  transports: typeof transports;
  findUsedTransportsFn: typeof findUsedTransports;
  insertUsedTransportFn: typeof insertUsedTransport;
};
export const configurableNotify = async (deps: ConfigurableNotifyDeps) => {
  const { notification, transports, findUsedTransportsFn, insertUsedTransportFn } = deps;
  const usedTransports = await findUsedTransportsFn(notification.event.txHash);
  const pendingTransports = transportNames.filter((name) => !usedTransports.includes(name));

  await Promise.all(
    pendingTransports.map(async (transportName) => {
      const notify = transports[transportName];
      await notify(notification);
      await insertUsedTransportFn(notification, transportName);
    }),
  );
};
