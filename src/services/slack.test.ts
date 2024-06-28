import type { IncomingWebhookResult } from "@slack/webhook";
import Bottleneck from "bottleneck";
import EventEmitter from "node:events";
import sinon, { SinonSpy } from "sinon";
import { BotEventNames, type TransportConfigurationMissingPayload, type TransportReadyPayload } from "../bot-events";
import { render } from "../utils/notification-template";
import { randomizeAnswerNotification, randomizeProposalNotification } from "../utils/test-mocks";
import { expect, resolveOnEvent } from "../utils/tests-setup";
import { ConfigurableNotifyDeps, TRANSPORT_NAME, configurableInitialize, configurableNotify } from "./slack";

describe("Slack service", () => {
  let emitter: EventEmitter;

  beforeEach(() => (emitter = new EventEmitter()));
  describe("initialize", () => {
    const fn = configurableInitialize;
    it("should emit an event when it was properly initialized", async () => {
      const promise = resolveOnEvent<[TransportReadyPayload]>(BotEventNames.TRANSPORT_READY, emitter);
      fn({
        emitter,
        webhookUrl: "https://hooks.slack.com/services/1234/5678/9abc",
      });
      const { name } = (await promise)[0];
      expect(name).to.equal(TRANSPORT_NAME);
    });

    it("should emit an event when the webhook is missing", async () => {
      const promise = resolveOnEvent<[TransportConfigurationMissingPayload]>(
        BotEventNames.TRANSPORT_CONFIGURATION_MISSING,
        emitter,
      );
      fn({
        emitter,
        webhookUrl: undefined,
      });
      const { name, missing } = (await promise)[0];
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
        notification: randomizeProposalNotification(),
        sendFn: () => Promise.resolve({} as IncomingWebhookResult),
        throttleFn: bottleneck.schedule.bind(bottleneck),
        renderFn: render,
      };
    });

    it("should send nothing when the integration is not configured", async () => {
      depsMock.throttleFn = sinon.spy();
      depsMock.renderFn = sinon.spy();
      depsMock.sendFn = undefined;
      await fn(depsMock);
      expect((depsMock.throttleFn as SinonSpy).called).to.be.false;
      expect((depsMock.renderFn as SinonSpy).called).to.be.false;
    });

    it("should notify a Proposal", async () => {
      depsMock.sendFn = sinon.spy();
      const expectedContent = await render("slack", depsMock.notification);
      await fn(depsMock);
      expect((depsMock.sendFn as SinonSpy).calledOnceWithExactly(expectedContent));
    });

    it("should notify an Answer", async () => {
      depsMock.sendFn = sinon.spy();
      depsMock.notification = randomizeAnswerNotification();
      const expectedContent = await render("slack", depsMock.notification);
      await fn(depsMock);
      expect((depsMock.sendFn as SinonSpy).calledOnceWithExactly(expectedContent));
    });
  });
});
