import Bottleneck from "bottleneck";
import EventEmitter from "node:events";
import nodemailer from "nodemailer";
import { BotEventNames, TransportConfigurationMissingPayload, TransportReadyPayload } from "../bot-events";
import { Env, env, parseEmailToEnvByENS } from "../utils/env";
import { render } from "../utils/notification-template";
import { randomizeAnswerNotification, randomizeProposalNotification } from "../utils/test-mocks";
import { expect, getMails, Mail, resolveOnEvent } from "../utils/tests-setup";
import {
  configurableInitialize,
  configurableNotify,
  configurableSend,
  ConfigurableSendDeps,
  EmailMessage,
  notify,
  send,
  TRANSPORT_NAME,
} from "./email";

describe("Email service", () => {
  let emitter: EventEmitter;

  beforeEach(() => (emitter = new EventEmitter()));
  describe("initialize", () => {
    const fn = configurableInitialize;

    it("should emit an event when it is properly initialized", async () => {
      const promise = resolveOnEvent(BotEventNames.TRANSPORT_READY, emitter);
      fn({
        emitter,
        env,
        createTransportFn: nodemailer.createTransport.bind(nodemailer),
      });
      const event = (await promise)[0] as TransportReadyPayload;
      expect(event.name).to.equal(TRANSPORT_NAME);
    });

    describe("should emit an event when a configuration environment variable missing", () => {
      const requiredFields: Array<keyof Env> = [
        "SMTP_HOST",
        "SMTP_PORT",
        "SMTP_USER",
        "SMTP_PASSWORD",
        "SMTP_FROM",
        "SMTP_TO",
        "SMTP_UNSUBSCRIBE_EMAIL",
      ];
      requiredFields.forEach((key) => {
        it(`should emit a missing event when ${String(key)} is missing`, async () => {
          const promise = resolveOnEvent(BotEventNames.TRANSPORT_CONFIGURATION_MISSING, emitter);
          const fakeEnv = { ...env, [key]: undefined };
          fn({
            emitter,
            createTransportFn: nodemailer.createTransport.bind(nodemailer),
            env: fakeEnv,
          });
          const event = (await promise)[0] as TransportConfigurationMissingPayload;
          expect(event.name).to.equal(TRANSPORT_NAME);
          expect(event.missing).to.have.length(1);
          expect(event.missing[0]).to.equal(key);
        });
      });
    });
  });

  describe("notify", () => {
    const fn = notify;

    type ValidateEmailsOpts = {
      previous: Mail[];
      current: Mail[];
      expected: {
        amount?: number;
        recipients: string[];
        subject: string;
        html: string;
        plain: string;
      };
    };
    /**
     * Asserts that the given emails match the expected ones
     */
    const validateEmails = (opts: ValidateEmailsOpts) => {
      const { previous, current, expected } = opts;

      const amount = expected.amount ?? expected.recipients.length;
      expect(current).to.have.lengthOf(previous.length + amount);

      const emails = current.slice(-amount);

      expected.recipients.forEach((recipient) => {
        const email = emails.find((email) => email.to[0].address == recipient);
        expect(email).to.exist;
        expect(email!.from[0].address, "sender address is well configured").to.equal(env.SMTP_FROM);

        expect(email!.subject, "subject matches the rendered template").to.equal(expected.subject);
        expect(email!.text.trim(), "plain content matches the rendered template").to.equal(expected.plain.trim());
        expect(email!.html.trim(), "html content matches the rendered template").to.equal(expected.html.trim());
      });
    };

    it("should corrently notify a Proposal", async () => {
      const previous = await getMails();
      const notification = randomizeProposalNotification();

      await fn(notification);

      // In very rare occasions, the fake SMTP server API has a slight
      // delay to register emails sent in burst
      await new Promise((resolve) => setTimeout(resolve, 50));

      const current = await getMails();

      const recipients = parseEmailToEnvByENS(notification.space.ens, env.SMTP_TO);
      const [subject, plain, html] = await Promise.all([
        render("email", notification, "subject"),
        render("email", notification, "plain"),
        render("email", notification, "html"),
      ]);

      validateEmails({
        previous,
        current,
        expected: {
          recipients,
          subject,
          html,
          plain,
        },
      });
    });

    it("should corrently notify an Answer", async () => {
      const previous = await getMails();
      const notification = randomizeAnswerNotification();

      await fn(notification);

      // In very rare occasions, the fake SMTP server API has a slight
      // delay to register emails sent in burst
      await new Promise((resolve) => setTimeout(resolve, 50));

      const current = await getMails();

      const recipients = parseEmailToEnvByENS(notification.space.ens, env.SMTP_TO);
      const [subject, plain, html] = await Promise.all([
        render("email", notification, "subject"),
        render("email", notification, "plain"),
        render("email", notification, "html"),
      ]);

      validateEmails({
        previous,
        current,
        expected: {
          recipients,
          subject,
          html,
          plain,
        },
      });
    });

    it("should correctly use ens-scoped and global recipients", async () => {
      const bottleneck = new Bottleneck({ minTime: 0 });

      const previous = await getMails();
      const notification = randomizeProposalNotification();
      notification.space.ens = "ens1";

      const env = {
        SMTP_TO: "global@example.com,ens1:ens1@example.com,ens2:ens2@example.com,ens1:ens1@example2.com",
      } as Env;

      await configurableNotify({
        notification,
        sendFn: send,
        renderFn: render,
        env,
        parseEmailToEnvByENSFn: parseEmailToEnvByENS,
        throttleFn: bottleneck.schedule.bind(bottleneck),
      });

      // In very rare occasions, the fake SMTP server API has a slight
      // delay to register emails sent in burst
      await new Promise((resolve) => setTimeout(resolve, 50));

      const current = await getMails();

      const [subject, plain, html] = await Promise.all([
        render("email", notification, "subject"),
        render("email", notification, "plain"),
        render("email", notification, "html"),
      ]);

      validateEmails({
        previous,
        current,
        expected: {
          recipients: ["global@example.com", "ens1@example.com", "ens1@example2.com"],
          subject,
          html,
          plain,
        },
      });
    });
  });

  describe("send", () => {
    const fn = configurableSend;

    it("should avoid sending without raising errors when the client is not configured", async () => {
      const depsMock = {
        sendFn: undefined,
        env: {
          from: "receiver@test.com",
          to: "sender@test.com",
        } as any as Env,
        message: {} as EmailMessage,
      } as ConfigurableSendDeps;

      expect(fn(depsMock)).to.be.fulfilled;
    });
  });
});