import EventEmitter from "events";
import { expect } from "./tests-setup";
import { defaultEmitter } from "./emitter";

describe("Emitter", () => {
  describe("defaultEmitter", () => {
    it("should be present and be an instance of EventEmitter", () => {
      expect(defaultEmitter).to.exist;
      expect(defaultEmitter).to.be.instanceof(EventEmitter);
    });
  });
});
