import Bottleneck from "bottleneck";
import TelegramBot from "node-telegram-bot-api";
import EventEmitter from "node:events";
import sinon, { SinonSpy } from "sinon";
import { BotEventNames, TransportConfigurationMissingPayload, TransportReadyPayload } from "../bot-events";
import { expect, mocks, resolveOnEvent } from "../utils/tests-setup";
import {
  ConfigurableSendDeps,
  TRANSPORT_NAME,
  configurableInitialize,
  configurableNotify,
  configurableSend,
} from "./telegram";
import { Env } from "../utils/env";

describe("Telegram service", () => {
  let emitter: EventEmitter;

  beforeEach(() => (emitter = new EventEmitter()));
  describe("initialize", () => {
    const fn = configurableInitialize;
    const env = {
      TELEGRAM_TOKEN: "test-token",
      TELEGRAM_CHAT_ID: "test-chat-id",
    } as Env;
    it("should emit an event when the was properly initialized", async () => {
      const promise = resolveOnEvent<[TransportReadyPayload]>(BotEventNames.TRANSPORT_READY, emitter);
      fn({
        emitter,
        env,
      });
      const { name } = (await promise)[0];
      expect(name).to.equal(TRANSPORT_NAME);
    });

    ["TELEGRAM_TOKEN", "TELEGRAM_CHAT_ID"].forEach((key) => {
      it(`should emit a misconfiguration event if the ${key} is missing`, async () => {
        const promise = resolveOnEvent<[TransportConfigurationMissingPayload]>(
          BotEventNames.TRANSPORT_CONFIGURATION_MISSING,
          emitter,
        );
        fn({
          emitter,
          env: {
            ...env,
            [key]: undefined,
          },
        });
        const { name, missing } = (await promise)[0];
        expect(name).to.equal(TRANSPORT_NAME);
        expect(missing).to.have.lengthOf(1);
        expect(missing[0]).to.equal(key);
      });
    });
  });

  describe("notify", () => {
    const fn = configurableNotify;

    it("should notify when the integration is configured", async () => {
      const bottleneck = new Bottleneck({ minTime: null });
      const depsMock = {
        notification: mocks.proposalMock,
        sendFn: sinon.spy(),
        throttleFn: bottleneck.schedule.bind(bottleneck),
        composeMessageFn: () => "",
      };

      const content = "test content";
      depsMock.composeMessageFn = () => content;
      await fn(depsMock);
      expect((depsMock.sendFn as SinonSpy).calledOnceWithExactly(content));
    });
  });

  describe("send", () => {
    const fn = configurableSend;

    let depsMock: ConfigurableSendDeps;

    type BotSendFn = typeof TelegramBot.prototype.sendMessage;
    beforeEach(() => {
      depsMock = {
        message: "test message",
        botSendFn: sinon.spy() as BotSendFn,
        chatId: "test-chat-id",
      };
    });

    it("should send the message with markdown configuration enabled", async () => {
      await fn(depsMock);
      const spy = depsMock.botSendFn as SinonSpy;
      expect(spy.calledOnce).to.be.true;
      const call = spy.getCall(0);
      expect(call.args[0]).to.equal(depsMock.chatId);
      expect(call.args[1]).to.equal(depsMock.message);
      expect(call.args[2].parse_mode).to.equal("Markdown");
    });

    it("should avoid sending a message when the channel is not configured", async () => {
      depsMock.chatId = undefined;

      await fn(depsMock);
      expect((depsMock.botSendFn as SinonSpy).called).to.be.false;
    });

    it("should avoid sending a message without raising errors when the client is not configured", async () => {
      depsMock.botSendFn = undefined;
      depsMock.chatId = undefined;

      expect(fn(depsMock)).to.be.fulfilled;
    });
  });
});
