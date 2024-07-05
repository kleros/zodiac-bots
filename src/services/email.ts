import Bottleneck from "bottleneck";
import EventEmitter from "node:events";
import nodemailer, { Transporter } from "nodemailer";
import { BotEventNames } from "../bot-events";
import { Notification } from "../notify";
import { defaultEmitter } from "../utils/emitter";
import { env, parseEmailToEnvByENS, type Env } from "../utils/env";
import { render } from "../utils/notification-template";

export const TRANSPORT_NAME = "email";

const bottleneck = new Bottleneck({
  minTime: 1,
});

let transport: nodemailer.Transporter | undefined;

/**
 * Initializes the Email integration. This should be called once.
 * Emits events for missing configuration or on successful initialization.
 *
 * @example
 * initialize();
 */
export const initialize = () => {
  return configurableInitialize({
    emitter: defaultEmitter,
    env,
    createTransportFn: nodemailer.createTransport.bind(nodemailer),
  });
};

type ConfigurableInitializeDeps = {
  emitter: EventEmitter;
  env: typeof env;
  createTransportFn: typeof nodemailer.createTransport;
};
export const configurableInitialize = (deps: ConfigurableInitializeDeps) => {
  const { emitter, createTransportFn, env } = deps;

  const requiredFields: Array<keyof Env> = [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_FROM",
    "SMTP_TO",
  ];
  const missingFields = requiredFields.filter((varName) => env[varName] === undefined);
  if (missingFields.length > 0) {
    emitter.emit(BotEventNames.TRANSPORT_CONFIGURATION_MISSING, {
      name: TRANSPORT_NAME,
      missing: missingFields,
    });
    return;
  }

  transport = createTransportFn({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASSWORD,
    },
  });

  emitter.emit(BotEventNames.TRANSPORT_READY, { name: TRANSPORT_NAME });
};

/**
 * Given a generic notification, calls the compose function to obtain
 * an email message, then sends it. This operation is rate-limited.
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
    env,
    parseEmailToEnvByENSFn: parseEmailToEnvByENS,
  });
};

export type EmailMessage = {
  subject: string;
  plain: string;
  html: string;
};

export type ConfigurableNotifyDeps = {
  notification: Notification;
  throttleFn: typeof Bottleneck.prototype.schedule;
  sendFn: typeof send;
  renderFn: typeof render;
  env: Env;
  parseEmailToEnvByENSFn: typeof parseEmailToEnvByENS;
};

export const configurableNotify = async (deps: ConfigurableNotifyDeps) => {
  const { notification, env, parseEmailToEnvByENSFn, sendFn, throttleFn, renderFn } = deps;

  const recipients = parseEmailToEnvByENSFn(notification.space.ens, env.SMTP_TO);

  const [subject, plain, html] = await Promise.all([
    renderFn("email", notification, "subject"),
    renderFn("email", notification, "plain"),
    renderFn("email", notification, "html"),
  ]);

  const emailMessage: EmailMessage = { subject, plain, html };

  await throttleFn(() => sendFn(recipients, emailMessage));
};

/**
 * Sends an email message using the configured sender and receipt in the
 * environment variables.
 *
 * @param message - The subject and content to send
 *
 * @example
 *
 * await send({ subject: 'test subject', text: 'test content'});
 */
export const send = (recipients: string[], message: EmailMessage) => {
  return configurableSend({
    recipients,
    message,
    env: env,
    sendFn: transport?.sendMail.bind(transport),
  });
};

export type ConfigurableSendDeps = {
  recipients?: string[];
  message: EmailMessage;
  env: Env;
  sendFn?: Transporter["sendMail"];
};

export const configurableSend = async (deps: ConfigurableSendDeps) => {
  const { recipients = [], message, env, sendFn } = deps;

  if (!sendFn) return;

  await Promise.all(
    recipients.map((recipient) =>
      sendFn({
        from: env.SMTP_FROM,
        to: recipient,
        subject: message.subject,
        text: message.plain,
        html: message.html,
      }),
    ),
  );
};
