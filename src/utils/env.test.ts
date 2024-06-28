import { parseEmailToEnv, parseSpacesEnv, validateEmailTo, validateSpaces } from "./env";
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
      const parsedSpace = result[0];
      expect(parsedSpace.ens).to.equal("kleros.eth");
      expect(parsedSpace.startBlock).to.equal(3000n);
      expect(parsedSpace.moduleAddress).to.be.undefined;
    });

    it("should correctly parse the spaces format with multiple entries", () => {
      const result = fn("kleros.eth:3000,kleros2.eth:4000");
      expect(result).to.have.lengthOf(2);
      expect(result).to.have.deep.members([
        {
          ens: "kleros.eth",
          startBlock: 3000n,
          moduleAddress: undefined,
        },
        {
          ens: "kleros2.eth",
          startBlock: 4000n,
          moduleAddress: undefined,
        },
      ]);
    });

    it("should correctly parse an space with module address provided", () => {
      const result = fn("kleros.eth:3000:0x1234567890abcdef1234567890abcdef12345678");
      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.eql({
        ens: "kleros.eth",
        startBlock: 3000n,
        moduleAddress: "0x1234567890abcdef1234567890abcdef12345678",
      });
    });
  });

  describe("validateEmailTo", () => {
    const fn = validateEmailTo;

    it("should allow a single email", () => {
      const input = "test@test.com";
      expect(fn(input)).to.equal(input);
    });

    it("should allow multiple comma separated emails", () => {
      const input = "test1@test.com,test2@test.org,test4@test.net";
      expect(fn(input)).to.equal(input);
    });

    it("should allow valid but unfrequent emails", () => {
      const input = "test+email@test.com,user@127.0.0.1,user@great.museum";
      expect(fn(input)).to.equal(input);
    });

    it("should require at least one space", () => {
      expect(() => fn("")).to.throw();
    });

    it("should fail for malformed inputs", () => {
      expect(() => fn(",,")).to.throw();
      expect(() => fn("test@test.com,")).to.throw();
      expect(() => fn("test@test.com,,")).to.throw();
      expect(() => fn(",test@test.com")).to.throw();
      expect(() => fn("test")).to.throw();
      expect(() => fn("@test")).to.throw();
      expect(() => fn("@test.")).to.throw();
      expect(() => fn("@test.com")).to.throw();
      expect(() => fn("test@")).to.throw();
    });
  });

  describe("parseEmailToEnv", () => {
    const fn = parseEmailToEnv;

    it("should correctly parse the to format with only entry", () => {
      const address = "receiver1@server.com";
      const result = fn(address);
      expect(result).to.have.lengthOf(1);
      expect(result[0]).to.eql(address);
    });

    it("should correctly parse the to format with multiple entries", () => {
      const emails = ["receiver1@server.com", "receiver2@server.com"];
      const result = fn(emails.join(","));
      expect(result).to.have.lengthOf(2);
      expect(result).to.have.deep.members(emails);
    });
  });
});