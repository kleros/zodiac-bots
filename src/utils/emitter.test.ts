import EventEmitter from "node:events";
import { defaultEmitter } from "./emitter";
import { expect } from "./tests-setup";

describe("Emitter", () => {
  describe("defaultEmitter", () => {
    it("should be present and be an instance of EventEmitter", () => {
      expect(defaultEmitter).to.exist;
      expect(defaultEmitter).to.be.instanceof(EventEmitter);
    });
  });
});
