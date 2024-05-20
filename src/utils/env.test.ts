import { parseSpacesEnv, validateSpaces } from "./env";
import { expect } from "./tests-setup";

describe("Environment variables lib", () => {
  describe("validateSpaces", () => {
    const fn = validateSpaces;

    it("should allow a single space", () => {
      const input = "kleros.eth:1000000";
      expect(fn(input)).to.equal(input);
    });

    it("should allow multiple comma separated spaces", () => {
      const input = "kleros.eth:1000000,kleros2.eth:2000000";
      expect(fn(input)).to.equal(input);
    });

    it("should require at least one space", () => {
      expect(() => fn("")).to.throw();
    });

    it("should fail for malformed inputs", () => {
      expect(() => fn("kleros.eth")).to.throw();
      expect(() => fn(":10000")).to.throw();
      expect(() => fn(":")).to.throw();
      expect(() => fn("kleros.eth:1,")).to.throw();
      expect(() => fn("10000:kleros.eth")).to.throw();
      expect(() => fn("kleros.eth:1,kleros2.eth")).to.throw();
    });
  });

  describe("parseSpacesEnv", () => {
    const fn = parseSpacesEnv;

    it("should correctly parse the spaces format with only entry", () => {
      const result = fn("kleros.eth:3000");
      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.eql({
        ens: "kleros.eth",
        startBlock: 3000n,
      });
    });

    it("should correctly parse the spaces format with multiple entries", () => {
      const result = fn("kleros.eth:3000,kleros2.eth:4000");
      expect(result).to.have.lengthOf(2);
      expect(result).to.have.deep.members([
        {
          ens: "kleros.eth",
          startBlock: 3000n,
        },
        {
          ens: "kleros2.eth",
          startBlock: 4000n,
        },
      ]);
    });
  });
});
