import Bottleneck from "bottleneck";
import TelegramBot from "node-telegram-bot-api";
import EventEmitter from "node:events";
import { BotEventNames } from "../bot-events";
import { Notification, TransportName } from "../notify";
import { defaultEmitter } from "../utils/emitter";
import { Env, env } from "../utils/env";
import { render } from "../utils/notification-template";

export const TRANSPORT_NAME: TransportName = "telegram";

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
    emitter: defaultEmitter,
    env,
    token: env.TELEGRAM_TOKEN,
    chatId: env.TELEGRAM_CHAT_ID,
  });
};

type ConfigurableInitializeDeps = {
  emitter: EventEmitter;
  token?: string;
  chatId?: string;
  env: Env;
};

export const configurableInitialize = (deps: ConfigurableInitializeDeps) => {
  const { env, emitter } = deps;

  const requiredEnv: Array<keyof Env> = ["TELEGRAM_TOKEN", "TELEGRAM_CHAT_ID"];
  const missing = requiredEnv.filter((key) => !env[key]);

  if (missing.length > 0) {
    emitter.emit(BotEventNames.TRANSPORT_CONFIGURATION_MISSING, {
      name: TRANSPORT_NAME,
      missing,
    });
    return;
  }

  client = new TelegramBot(env.TELEGRAM_TOKEN!, { polling: false });
  emitter.emit(BotEventNames.TRANSPORT_READY, {
    name: TRANSPORT_NAME,
  });
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
export const notify = (notification: Notification) => {
  return configurableNotify({
    notification,
    sendFn: send,
    throttleFn: bottleneck.schedule.bind(bottleneck),
    renderFn: render,
  });
};

export type ConfigurableNotifyDeps = {
  notification: Notification;
  throttleFn: typeof Bottleneck.prototype.schedule;
  renderFn: typeof render;
  sendFn: typeof send;
};
export const configurableNotify = async (deps: ConfigurableNotifyDeps) => {
  const { notification, sendFn, throttleFn, renderFn } = deps;

  const message = await renderFn(TRANSPORT_NAME, notification);

  await throttleFn(() => sendFn(message));
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