import Bottleneck from "bottleneck";
import EventEmitter from "node:events";
import nodemailer, { Transporter } from "nodemailer";
import { BotEventNames } from "../bot-events";
import { EventType, NotifyParams } from "../notify";
import { defaultEmitter } from "../utils/emitter";
import { env, parseEmailToEnv, type Env } from "../utils/env";

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
  sendFn: typeof send;
  composeMessageFn: typeof composeMessage;
};

export const configurableNotify = async (deps: ConfigurableNotifyDeps) => {
  const { notification, sendFn, throttleFn, composeMessageFn } = deps;

  await throttleFn(() => sendFn(composeMessageFn(notification)));
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
const send = (message: EmailMessage) => {
  return configurableSend({
    message,
    env: env,
    parseEmailToEnvFn: parseEmailToEnv,
    sendFn: transport?.sendMail.bind(transport),
  });
};

export type ConfigurableSendDeps = {
  message: EmailMessage;
  env: Env;
  parseEmailToEnvFn: typeof parseEmailToEnv;
  sendFn?: Transporter["sendMail"];
};

export const configurableSend = async (deps: ConfigurableSendDeps) => {
  const { message, env, parseEmailToEnvFn, sendFn } = deps;

  if (!sendFn) return;

  const receivers = parseEmailToEnvFn(env.SMTP_TO);

  await Promise.all(
    receivers.map((receiver) =>
      sendFn({
        from: env.SMTP_FROM,
        to: receiver,
        subject: message.subject,
        text: message.text,
      }),
    ),
  );
};

export type EmailMessage = {
  subject: string;
  text: string;
};

/**
 * Depending on the notification type, returns the email subject and
 * content.
 *
 * @param notification - The notification to send
 * @returns The subject and content of the email
 *
 * @example
 *
 * const message = composeMessage(notification);
 */
export const composeMessage = (notification: NotifyParams): EmailMessage => {
  const message = {
    subject: "",
    text: "",
  };

  const { type, event, space } = notification;
  const commonContent = `
  - Transaction: ${event.txHash} (block ${event.blockNumber})
  - Question: ${event.questionId}
  - Space: ${space.ens}`;
  const shortQuestionId = event.questionId.substring(0, 6);
  switch (notification.type) {
    case EventType.PROPOSAL_QUESTION_CREATED:
      message.subject = `New proposal for ${space.ens} (${shortQuestionId})`;
      message.text = `${message.subject}:

${commonContent}
`;
      return message;
    case EventType.NEW_ANSWER:
      message.subject = `Vote issued for ${space.ens} (question ${shortQuestionId})`;
      message.text = `${message.subject}:

${commonContent}
  - Answer: ${notification.event.answer}
  - Bond: ${notification.event.bond}
  - User: ${notification.event.user}
  - Timestamp: ${notification.event.ts}
`;
      return message;
    default:
      throw new Error(`Unsupported event type: ${type}. Email composer can't provide a message content`);
  }
};
