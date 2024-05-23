import Bottleneck from "bottleneck";
import TelegramBot from "node-telegram-bot-api";
import EventEmitter from "node:events";
import { BotEventNames } from "../bot-events";
import { env } from "../utils/env";
import { NotifyParams } from "../notify";
import { composeMessage } from "./slack";

const bottleneck = new Bottleneck({
  // https://core.telegram.org/bots/faq#my-bot-is-hitting-limits-how-do-i-avoid-this
  minTime: 0.034,
});

let client: TelegramBot | undefined;

/**
 * Initializes the Telegram integration. This should be called once.
 * Emits events for missing configuration or on successful initialization.
 *
 * @example
 * initialize();
 */
export const initialize = () => {
  return configurableInitialize({
    emitter: new EventEmitter(),
    token: env.TELEGRAM_TOKEN,
    chatId: env.TELEGRAM_CHAT_ID,
  });
};

type ConfigurableInitializeDeps = {
  emitter: EventEmitter;
  token?: string;
  chatId?: string;
};

export const configurableInitialize = (deps: ConfigurableInitializeDeps) => {
  const { token, chatId, emitter } = deps;

  if (!token || !chatId) {
    emitter.emit(BotEventNames.SLACK_CONFIGURATION_MISSING);
    return;
  }

  client = new TelegramBot(token, { polling: false });
  emitter.emit(BotEventNames.SLACK_STARTED);
};

/**
 * Given a generic notification, calls the compose function to obtain
 * a Telegram message, then sends it. This operation is rate-limited.
 *
 * @param notification - The notification to send
 *
 * @example
 *
 * await notify(notification);
 */
export const notify = (notification: NotifyParams) => {
  return configurableNotify({
    notification,
    sendFn: send,
    throttleFn: bottleneck.schedule.bind(bottleneck),
    composeMessageFn: composeMessage,
  });
};

export type ConfigurableNotifyDeps = {
  notification: NotifyParams;
  throttleFn: typeof Bottleneck.prototype.schedule;
  composeMessageFn: typeof composeMessage;
  sendFn: typeof send;
};
export const configurableNotify = async (deps: ConfigurableNotifyDeps) => {
  const { notification, sendFn, throttleFn, composeMessageFn } = deps;

  await throttleFn(() => sendFn(composeMessageFn(notification)));
};

/**
 * Sends a Telegram message to the configured chatId. Ensures the message
 * is parsed as Markdown.
 *
 * @param message - The message to send
 *
 * @example
 *
 * await send("I am an example message.");
 */
const send = async (message: string) => {
  return configurableSend({
    message,
    chatId: env.TELEGRAM_CHAT_ID,
    botSendFn: client?.sendMessage.bind(client),
  });
};

export type ConfigurableSendDeps = {
  message: string;
  chatId?: string;
  botSendFn?: typeof TelegramBot.prototype.sendMessage;
};
export const configurableSend = async (deps: ConfigurableSendDeps) => {
  const { message, chatId, botSendFn } = deps;

  if (!botSendFn || !chatId) return;

  await botSendFn(chatId, message, { parse_mode: "Markdown" });
};
