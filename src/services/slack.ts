import { IncomingWebhook } from "@slack/webhook";
import Bottleneck from "bottleneck";
import EventEmitter from "node:events";
import { BotEventNames } from "../bot-events";
import { EventType, Notification } from "../notify";
import { defaultEmitter } from "../utils/emitter";
import { env } from "../utils/env";

export const TRANSPORT_NAME = "slack";

const bottleneck = new Bottleneck({
  // https://api.slack.com/apis/rate-limits#overview
  minTime: 1000,
});
let webhook: IncomingWebhook | undefined;

/**
 * Initialize the Slack integration. This should be called once.
 * Emits events for missing configuration or on successful initialization.
 *
 * @example
 * initialize();
 */
export const initialize = () => {
  return configurableInitialize({
    emitter: defaultEmitter,
    webhookUrl: env.SLACK_WEBHOOK,
  });
};

type InitializeDeps = {
  emitter: EventEmitter;
  webhookUrl: typeof env.SLACK_WEBHOOK;
};
export const configurableInitialize = (deps: InitializeDeps) => {
  const { webhookUrl, emitter } = deps;
  if (!webhookUrl) {
    emitter.emit(BotEventNames.TRANSPORT_CONFIGURATION_MISSING, {
      name: TRANSPORT_NAME,
      missing: ["SLACK_WEBHOOK"],
    });
    return;
  }

  webhook = new IncomingWebhook(webhookUrl);
  emitter.emit(BotEventNames.TRANSPORT_READY, {
    name: TRANSPORT_NAME,
  });
};

/**
 * Given a generic notification, calls the compose function to obtain
 * a Slack message, then sends it. If Slack is not configured, it does nothing.
 * This operation is rate-limited.
 *
 * @param notification - The notification to send
 *
 * @example
 *
 * await notify(notification);
 */
export const notify = async (notification: Notification) => {
  return configurableNotify({
    notification,
    sendFn: webhook?.send.bind(webhook),
    throttleFn: bottleneck.schedule.bind(bottleneck),
    composeMessageFn: composeMessage,
  });
};

export type ConfigurableNotifyDeps = {
  notification: Notification;
  sendFn?: typeof IncomingWebhook.prototype.send;
  throttleFn: typeof Bottleneck.prototype.schedule;
  composeMessageFn: typeof composeMessage;
};
export const configurableNotify = async (deps: ConfigurableNotifyDeps) => {
  const { sendFn, throttleFn, notification, composeMessageFn } = deps;

  if (!sendFn) return;

  await throttleFn(() => sendFn(composeMessageFn(notification)));
};

/**
 * Compose a message for Slack based on the notification type.
 *
 * @param notification - The notification
 * @returns A message string formatted to be sent via Slack
 *
 * @example
 *
 * const message = composeMessage(notification);
 */
export const composeMessage = (notification: Notification) => {
  const { space, type, event } = notification;
  const { txHash, blockNumber, questionId } = event;

  const commonFields = `Space: \`${space.ens}\` | Transaction: \`${txHash}\` (block \`${blockNumber}\`) | Question: \`${questionId}\``;

  switch (type) {
    case EventType.PROPOSAL_QUESTION_CREATED:
      const { proposalId } = event;
      return `*New proposal found*. ${commonFields} | Proposal: \`${proposalId}\``;
    case EventType.NEW_ANSWER:
      const { bond, user, answer } = event;
      return `*New vote issued*. ${commonFields} | User: \`${user}\` | Bond: \`${bond}\` | Answer: \`${answer}\``;
    default:
      throw new Error(`Unsupported event type: ${type}. Slack composer can't provide a message content`);
  }
};