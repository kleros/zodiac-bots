import { LogNewAnswer, LogNewQuestion, ProposalQuestionCreated } from "./services/reality";
import { notify as notifySlack } from "./services/slack";
import { notify as notifyTelegram } from "./services/telegram";
import { notify as notifyEmail } from "./services/email";
import { Space } from "./types";
import { findUsedTransports, insertUsedTransport } from "./services/db/notifications";
import { Proposal } from "./services/db/proposals";

export type TransportName = "telegram" | "slack" | "email";
type TransportFn = (notification: Notification) => Promise<void>;
export const transports: { [key in TransportName]: TransportFn } = {
  telegram: notifyTelegram,
  slack: notifySlack,
  email: notifyEmail,
};
export const transportNames = Object.keys(transports) as TransportName[];

export enum EventType {
  PROPOSAL_QUESTION_CREATED = "proposal-created",
  NEW_ANSWER = "answer-issued",
}

export type ProposalNotificationEvent = ProposalQuestionCreated &
  Pick<Proposal, "snapshotId" | "startedAt" | "timeout" | "finishedAt">;
export type AnswerNotificationEvent = LogNewAnswer & Pick<Proposal, "snapshotId">;

export type ProposalNotification = {
  space: Space;
  type: EventType.PROPOSAL_QUESTION_CREATED;
  event: ProposalNotificationEvent;
};
export type AnswerNotification = {
  space: Space;
  type: EventType.NEW_ANSWER;
  event: AnswerNotificationEvent;
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
