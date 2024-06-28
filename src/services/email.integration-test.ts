import EventEmitter from "node:events";
import nodemailer from "nodemailer";
import { BotEventNames, TransportConfigurationMissingPayload, TransportReadyPayload } from "../bot-events";
import { Env, env, parseEmailToEnv } from "../utils/env";
import { render } from "../utils/notification-template";
import { randomizeAnswerNotification, randomizeProposalNotification } from "../utils/test-mocks";
import { expect, getMails, Mail, resolveOnEvent } from "../utils/tests-setup";
import {
  ConfigurableSendDeps,
  EmailMessage,
  TRANSPORT_NAME,
  configurableInitialize,
  configurableSend,
  notify,
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

    it("should corrently notify a Proposal", async () => {
      const previous = await getMails();
      const notification = randomizeProposalNotification();

      await fn(notification);

      // In very rare occasions, the fake SMTP server API has a slight
      // delay to register emails sent in burst
      await new Promise((resolve) => setTimeout(resolve, 50));

      const current = await getMails();

      const receivers = parseEmailToEnv(env.SMTP_TO);
      expect(current).to.have.lengthOf(previous.length + receivers.length);

      const emails = current.slice(-receivers.length);

      const [expectedSubject, expectedPlain, expectedHTML] = await Promise.all([
        render("email", notification, "subject"),
        render("email", notification, "plain"),
        render("email", notification, "html"),
      ]);

      receivers.forEach((receiver) => {
        const email = emails.find((email) => email.to[0].address == receiver);
        expect(email).to.exist;
        expect(email!.from[0].address, "sender address is well configured").to.equal(env.SMTP_FROM);

        expect(email!.subject, "subject matches the rendered template").to.equal(expectedSubject);
        expect(email!.text.trim(), "plain content matches the rendered template").to.equal(expectedPlain.trim());
        expect(email!.html.trim(), "html content matches the rendered template").to.equal(expectedHTML.trim());
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

      const receivers = parseEmailToEnv(env.SMTP_TO);
      expect(current).to.have.lengthOf(previous.length + receivers.length);

      const emails = current.slice(-receivers.length);

      const [expectedSubject, expectedPlain, expectedHTML] = await Promise.all([
        render("email", notification, "subject"),
        render("email", notification, "plain"),
        render("email", notification, "html"),
      ]);

      receivers.forEach((receiver) => {
        const email = emails.find((email) => email.to[0].address == receiver);
        expect(email).to.exist;
        expect(email!.from[0].address, "sender address is well configured").to.equal(env.SMTP_FROM);

        expect(email!.subject, "subject matches the rendered template").to.equal(expectedSubject);
        expect(email!.text.trim(), "plain content matches the rendered template").to.equal(expectedPlain.trim());
        expect(email!.html.trim(), "html content matches the rendered template").to.equal(expectedHTML.trim());
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
