import EventEmitter from "node:events";
import { defaultEmitter, resolveOnEvent } from "./emitter";
import { expect } from "./tests-setup";
import { BotEventNames } from "../bot-events";
import isPromisePending from "./is-promise-pending";

describe("Emitter", () => {
  describe("defaultEmitter", () => {
    it("should be present and be an instance of EventEmitter", () => {
      expect(defaultEmitter).to.exist;
      expect(defaultEmitter).to.be.instanceof(EventEmitter);
    });
  });

  describe("resolveOnEvent", () => {
    const fn = resolveOnEvent;
    it("should resolve when the event happens", async () => {
      const emitter = new EventEmitter();
      const name = BotEventNames.STARTED;

      const promise = fn(name, emitter);
      emitter.emit(name);

      return expect(promise).to.eventually.fulfilled;
    });

    it("should remain pending if the event never happens", async () => {
      const emitter = new EventEmitter();
      const name = BotEventNames.STARTED;

      const promise = fn(name, emitter);

      const isPending = await isPromisePending(promise);
      expect(isPending).to.be.true;
    });
  });
});