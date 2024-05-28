import { IncomingWebhookResult } from "@slack/webhook";
import Bottleneck from "bottleneck";
import { expect } from "chai";
import EventEmitter from "node:events";
import sinon, { SinonSpy } from "sinon";
import { BotEventNames } from "../bot-events";
import { EventType, NotifyParams } from "../notify";
import { Space } from "../types";
import { ConfigurableNotifyDeps, composeMessage, configurableInitialize, configurableNotify } from "./slack";

const resolveOnEvent = (name: BotEventNames, emitter: EventEmitter) =>
  new Promise((resolve) => {
    emitter.on(name, resolve);
  });

const proposalMock: NotifyParams = {
  type: EventType.PROPOSAL_QUESTION_CREATED,
  space: {
    ens: "kleros.eth",
  } as Space,
  event: {
    txHash: "0xA",
    proposalId: "0xB",
    questionId: "0xC",
    blockNumber: 1n,
  },
};

describe("Slack service", () => {
  const fn = configurableInitialize;
  let emitter: EventEmitter;

  beforeEach(() => (emitter = new EventEmitter()));
  describe("initialize", () => {
    it("should emit an event when the it was properly initialized", () => {
      const promise = resolveOnEvent(BotEventNames.SLACK_STARTED, emitter);
      fn({
        emitter,
        webhookUrl: "https://hooks.slack.com/services/1234/5678/9abc",
      });
      expect(promise).to.be.fulfilled;
    });
    it("should emit an event when the webhook is missing", () => {
      const promise = resolveOnEvent(BotEventNames.SLACK_CONFIGURATION_MISSING, emitter);
      fn({
        emitter,
        webhookUrl: undefined,
      });
      expect(promise).to.be.fulfilled;
    });
  });

  describe("notify", () => {
    const fn = configurableNotify;
    let depsMock: ConfigurableNotifyDeps;

    beforeEach(() => {
      const bottleneck = new Bottleneck({ minTime: null });
      depsMock = {
        notification: proposalMock,
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
          ...proposalMock,
          type: "unexpected",
        } as any as NotifyParams);
      expect(test).to.throw("unexpected");
    });
  });
});
