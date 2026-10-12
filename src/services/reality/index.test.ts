import { expect } from "chai";
import { parseRealityQuestion } from ".";

const SEPARATOR = "␟";
const TRANSACTIONS_HASH = "cfdc5dc4b3b0e4b2e0c5a1d6f8a9b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8ab43";
const PROPOSAL_ID = "0xb4c8c69b55a442948a7d66b42ac418ae22cad057fee7fbcb0c27a8768bfd3541";

describe("Reality question parsing", () => {
  describe("parseRealityQuestion()", () => {
    it("should read the fields of a question built by the Reality module", () => {
      const parsed = parseRealityQuestion(`${PROPOSAL_ID}${SEPARATOR}${TRANSACTIONS_HASH}`);

      expect(parsed.proposalId).to.equal(PROPOSAL_ID);
      expect(parsed.safeHash).to.equal(`0x${TRANSACTIONS_HASH}`);
    });

    it("should keep a proposal id that hides a separator whole", () => {
      // A left split would return just the leading hash, which is a real proposal id.
      const hidden = `${PROPOSAL_ID}${SEPARATOR}junk`;

      const parsed = parseRealityQuestion(`${hidden}${SEPARATOR}${TRANSACTIONS_HASH}`);

      expect(parsed.proposalId).to.equal(hidden);
      expect(parsed.safeHash).to.equal(`0x${TRANSACTIONS_HASH}`);
    });

    it("should report no safe hash when the question has no separator", () => {
      const parsed = parseRealityQuestion(PROPOSAL_ID);

      expect(parsed.proposalId).to.equal(PROPOSAL_ID);
      expect(parsed.safeHash).to.equal(null);
    });

    it("should report no safe hash when the last field is not a transactions hash", () => {
      const parsed = parseRealityQuestion(`${PROPOSAL_ID}${SEPARATOR}not-a-hash`);

      expect(parsed.safeHash).to.equal(null);
    });

    it("should report no safe hash when the last field is not the length of a transactions hash", () => {
      const parsed = parseRealityQuestion(`${PROPOSAL_ID}${SEPARATOR}${TRANSACTIONS_HASH.slice(0, -1)}`);

      expect(parsed.safeHash).to.equal(null);
    });

    it("should report no safe hash when the last field is not lower case, which the module never emits", () => {
      const parsed = parseRealityQuestion(`${PROPOSAL_ID}${SEPARATOR}${TRANSACTIONS_HASH.toUpperCase()}`);

      expect(parsed.safeHash).to.equal(null);
    });

    it("should return the whole question as the proposal id when the shape is unexpected", () => {
      const rawQuestion = `${PROPOSAL_ID}${SEPARATOR}not-a-hash`;

      expect(parseRealityQuestion(rawQuestion).proposalId).to.equal(rawQuestion);
    });

    it("should read an empty proposal id", () => {
      const parsed = parseRealityQuestion(`${SEPARATOR}${TRANSACTIONS_HASH}`);

      expect(parsed.proposalId).to.equal("");
      expect(parsed.safeHash).to.equal(`0x${TRANSACTIONS_HASH}`);
    });
  });
});
