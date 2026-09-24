import { expect } from "chai";
import { isSnapshotProposalId, STORED_PROPOSAL_ID_MAX_LENGTH, truncateForStorage } from "./snapshot-proposal-id";

const HEX_ID = "0xb4c8c69b55a442948a7d66b42ac418ae22cad057fee7fbcb0c27a8768bfd3541";
const CID_V0_ID = "QmTwFAbf6PPKt11tBVXwiDMk2QY4hP41Mi4hfJzNqE9GYL";
const CID_V1_ID = "bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi";

// Proposal ids taken from real questions filed against the monitored modules.
const EMPTY_ID = "";
const SLUG_ID = "wave3-drain";
const PREFIXED_SLUG_ID = "proposal-bf1a-26039048";
const SENTENCE_ID = "Migration to a New Onchain Governance Platform";
const LONG_SENTENCE_ID =
  "To avoid any risks associated with the safe module, funds will be transferred to a safe address controlled by the owner for security purposes.";

describe("Snapshot proposal id", () => {
  describe("isSnapshotProposalId()", () => {
    const accepted: [string, string][] = [
      ["an EIP-712 hash id, the generation in use since 2021-10-27", HEX_ID],
      ["an EIP-712 hash id written in upper case", HEX_ID.toUpperCase().replace("0X", "0x")],
      ["an IPFS CIDv0 id, the generation 1inch.eth used until 2021-10-27", CID_V0_ID],
      ["an IPFS CIDv1 id, accepted by Snapshot's own interface", CID_V1_ID],
    ];

    accepted.forEach(([description, proposalId]) => {
      it(`should accept ${description}`, () => {
        expect(isSnapshotProposalId(proposalId)).to.equal(true);
      });
    });

    const rejected: [string, string][] = [
      ["an empty id, as used by the 2026-07-21 question", EMPTY_ID],
      ["a short slug, as used by the 2026-09-14 question", SLUG_ID],
      ["a proposal-like slug, as used by the 2026-09-23 Shutter question", PREFIXED_SLUG_ID],
      ["a sentence exactly as long as a CIDv0, as used by the 2026-08-13 question", SENTENCE_ID],
      ["a long sentence, as used by the 2026-09-23 1inch question", LONG_SENTENCE_ID],
      ["a hash id followed by extra text", `${HEX_ID} and some more text`],
      ["a hash id with an embedded question separator", `${HEX_ID}␟junk`],
      ["a hash id one character too short", HEX_ID.slice(0, -1)],
      ["a hash id one character too long", `${HEX_ID}0`],
      ["a hash id containing a non hexadecimal character", `${HEX_ID.slice(0, -1)}z`],
      ["a CIDv0 id containing a character base58 excludes", `${CID_V0_ID.slice(0, -1)}0`],
      ["a value that only shares the length of a hash id", "x".repeat(HEX_ID.length)],
    ];

    rejected.forEach(([description, proposalId]) => {
      it(`should reject ${description}`, () => {
        expect(isSnapshotProposalId(proposalId)).to.equal(false);
      });
    });

    it("should reject a value that only becomes well formed once truncated", () => {
      const forged = `${HEX_ID} this text pushes the id past the stored length`;

      expect(isSnapshotProposalId(forged)).to.equal(false);
      expect(isSnapshotProposalId(forged.slice(0, HEX_ID.length))).to.equal(true);
    });
  });

  describe("truncateForStorage()", () => {
    it("should return a short id unchanged", () => {
      expect(truncateForStorage(SLUG_ID)).to.equal(SLUG_ID);
    });

    it("should return every real world proposal id unchanged", () => {
      [HEX_ID, CID_V0_ID, CID_V1_ID, EMPTY_ID, SENTENCE_ID, LONG_SENTENCE_ID].forEach((proposalId) => {
        expect(truncateForStorage(proposalId)).to.equal(proposalId);
      });
    });

    it("should return an id of exactly the maximum length unchanged", () => {
      const proposalId = "a".repeat(STORED_PROPOSAL_ID_MAX_LENGTH);

      expect(truncateForStorage(proposalId)).to.equal(proposalId);
    });

    it("should mark how many characters were dropped from a longer id", () => {
      const proposalId = "a".repeat(STORED_PROPOSAL_ID_MAX_LENGTH + 42);

      expect(truncateForStorage(proposalId)).to.equal(`${"a".repeat(STORED_PROPOSAL_ID_MAX_LENGTH)} … [+42 chars]`);
    });

    it("should keep the leading characters of a truncated id readable", () => {
      const proposalId = `${LONG_SENTENCE_ID} ${"padding ".repeat(30)}`;

      expect(truncateForStorage(proposalId)).to.contain(LONG_SENTENCE_ID);
    });
  });
});
