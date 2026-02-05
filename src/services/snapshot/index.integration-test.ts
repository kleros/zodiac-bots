import { ONEINCH_MODULE_ADDRESS, expect } from "../../utils/tests-setup";
import { getRealityModuleAddress, getProposal } from ".";

describe("Snapshot API", () => {
  describe("getRealityModuleAddress", () => {
    const fn = getRealityModuleAddress;
    it("should return the address of the reality module contract (old JSON plugins format)", async () => {
      const address = await fn("1inch.eth");
      expect(address).to.equal(ONEINCH_MODULE_ADDRESS);
    });

    it("should return the address of the reality module contract (new JSON plugins format)", async () => {
      const address = await fn("fast.govplay.eth");
      expect(address).to.equal("0xc0150C90788836f06A4DEdC512F66eFe7CA0C31b");
    });

    it("should return null when the address is not found", async () => {
      const address = await fn("doesntexists");
      expect(address).to.be.null;
    });
  });

  describe("getProposal", () => {
    const fn = getProposal;

    it("it should be able to fetch a proposal given the id", async () => {
      const proposalId = "0x34df659f74123adc1ce9702afb68f2e05ef1d3b62fb0a5a0422a595ab2f4b380";

      const result = await fn(proposalId);
      expect(result?.id).to.equal(proposalId);
      expect(result?.title).to.equal("[1IP-87] Snapshot Pro Subscription");
      expect(result?.network).to.equal("1");

      expect(result?.plugins.safeSnap.safes).to.exist;
      expect(result?.plugins.safeSnap.safes).to.have.lengthOf(1);
      const safe = result!.plugins.safeSnap.safes[0];
      expect(safe.hash).to.equal("0x5b6537f80837b399e22167320964e45c0bd22fd9f2de492057cbaf953e430c61");
      expect(safe.network).to.equal("1");
      expect(safe.realityAddress).to.equal("0xa62D2a75eb39C12e908e9F6BF50f189641692F2E");
      expect(safe.multiSendAddress).to.equal("0x8D29bE29923b68abfDD21e541b9374737B49cdAD");
      expect(safe.txs).to.have.lengthOf(1);

      const safeTx = safe.txs[0];
      expect(safeTx.hash).to.equal("0xf75ab37ff4d43821fc4833a6a3bbe2a042d2f366420240ce3d2460f2c2534f61");
      expect(safeTx.nonce).to.equal(0);
      expect(safeTx.transactions).to.have.lengthOf(2);

      const [transaction1, transaction2] = safeTx.transactions;
      expect(transaction1.to).to.equal("0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48");
      expect(transaction2.to).to.equal("0xe40bfeb5a3014c9b98597088ca71eccdc27ca410");
    });
  });
});
