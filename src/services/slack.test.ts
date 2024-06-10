import { IncomingWebhookResult } from "@slack/webhook";
import Bottleneck from "bottleneck";
import EventEmitter from "node:events";
import sinon, { SinonSpy } from "sinon";
import { BotEventNames } from "../bot-events";
import { NotifyParams } from "../notify";
import { expect, resolveOnEvent, mocks } from "../utils/tests-setup";
import {
  ConfigurableNotifyDeps,
  TRANSPORT_NAME,
  composeMessage,
  configurableInitialize,
  configurableNotify,
} from "./slack";

describe("Slack service", () => {
  let emitter: EventEmitter;

  beforeEach(() => (emitter = new EventEmitter()));
  describe("initialize", () => {
    const fn = configurableInitialize;
    it("should emit an event when it was properly initialized", async () => {
      const promise = resolveOnEvent(BotEventNames.TRANSPORT_READY, emitter);
      fn({
        emitter,
        webhookUrl: "https://hooks.slack.com/services/1234/5678/9abc",
      });
      const { name } = (await promise).pop();
      expect(name).to.equal(TRANSPORT_NAME);
    });

    it("should emit an event when the webhook is missing", async () => {
      const promise = resolveOnEvent(BotEventNames.TRANSPORT_CONFIGURATION_MISSING, emitter);
      fn({
        emitter,
        webhookUrl: undefined,
      });
      const { name, missing } = (await promise).pop();
      expect(name).to.equal(TRANSPORT_NAME);
      expect(missing).to.have.lengthOf(1);
      expect(missing[0]).to.equal("SLACK_WEBHOOK");
    });
  });

  describe("notify", () => {
    const fn = configurableNotify;
    let depsMock: ConfigurableNotifyDeps;

    beforeEach(() => {
      const bottleneck = new Bottleneck({ minTime: null });
      depsMock = {
        notification: mocks.proposalMock,
        sendFn: () => Promise.resolve({} as IncomingWebhookResult),
        throttleFn: bottleneck.schedule.bind(bottleneck),
        composeMessageFn: () => "",
      };
    });

    it("should send nothing when the integration is not configured", async () => {
      depsMock.throttleFn = sinon.spy();
      depsMock.composeMessageFn = sinon.spy();
      depsMock.sendFn = undefined;
      await fn(depsMock);
      expect((depsMock.throttleFn as SinonSpy).called).to.be.false;
      expect((depsMock.composeMessageFn as SinonSpy).called).to.be.false;
    });

    it("should notify when the integration is configured", async () => {
      depsMock.sendFn = sinon.spy();
      const content = "test content";
      depsMock.composeMessageFn = () => content;
      await fn(depsMock);
      expect((depsMock.sendFn as SinonSpy).calledOnceWithExactly(content));
    });
  });

  describe("composeMessage", () => {
    const fn = composeMessage;

    it("should fail when the event type is unexpected", () => {
      const test = () =>
        fn({
          ...mocks.proposalMock,
          type: "unexpected",
        } as any as NotifyParams);
      expect(test).to.throw("unexpected");
    });
  });
});
