import { ONEINCH_MODULE_ADDRESS, ONEINCH_ORACLE_ADDRESS, expect } from "../../utils/tests-setup";
import {
  configurableGetSpaceAddresses,
  getLogNewAnswer,
  getProposalQuestionsCreated,
  getRealityModuleAddress,
  getRealityOracleAddress,
  getSpaceAddresses,
} from ".";

describe("Reality", () => {
  const fn = getRealityModuleAddress;
  describe("getRealityModuleAddress", () => {
    it("should return the address of the reality module contract", async () => {
      const address = await fn("1inch.eth");
      expect(address).to.equal(ONEINCH_MODULE_ADDRESS);
    });

    it("should return null when the address is not found", async () => {
      const address = await fn("doesntexists");
      expect(address).to.be.null;
    });
  });

  describe("getRealityOracleAddress", () => {
    const fn = getRealityOracleAddress;
    it("should return the address of the reality oracle contract", async () => {
      const address = await fn(ONEINCH_MODULE_ADDRESS);
      expect(address).to.equal(ONEINCH_ORACLE_ADDRESS);
    });
  });

  describe("getSpaceAddresses", () => {
    it("should return both module and oracle contract addresses", async () => {
      const result = await getSpaceAddresses({ spaceId: "1inch.eth" });
      expect(result).to.eql({
        moduleAddress: ONEINCH_MODULE_ADDRESS,
        oracleAddress: ONEINCH_ORACLE_ADDRESS,
      });
    });

    it("should only resolve the oracle when the module is provided", async () => {
      const moduleAddress = "0x6eaB9b5c4Be8F66fC8efb0FdF256FC9143344885";
      const oracleAddress = "0x5b7dD1E86623548AF054A4985F7fc8Ccbb554E2c";
      const result = await getSpaceAddresses({ spaceId: "1inch.eth", moduleAddress });
      expect(result).to.eql({ moduleAddress, oracleAddress });
    });

    it("should fail when the module address can't be resolved", async () => {
      const resolveModule = () => Promise.resolve(null);
      const resolveOracle = () => Promise.resolve(ONEINCH_ORACLE_ADDRESS);
      const promise = configurableGetSpaceAddresses({
        spaceId: "1inch.eth",
        getRealityModuleAddressFn: resolveModule,
        getRealityOracleAddressFn: resolveOracle,
      });
      expect(promise).to.be.rejectedWith("Unable to resolve module contract address for space 1inch.eth");
    });

    it("should fail when the oracle address can't be resolved", async () => {
      const resolveModule = () => Promise.resolve(ONEINCH_MODULE_ADDRESS);
      const resolveOracle = () => Promise.resolve(null);
      const promise = configurableGetSpaceAddresses({
        spaceId: "1inch.eth",
        getRealityModuleAddressFn: resolveModule,
        getRealityOracleAddressFn: resolveOracle,
      });
      expect(promise).to.be.rejectedWith("Unable to resolve oracle contract address for space 1inch.eth");
    });
  });

  describe("getProposalQuestionsCreated", () => {
    const fn = getProposalQuestionsCreated;

    it("should return the ProposalQuestionsCreated events between two blocks", async () => {
      const fromBlock = 19475120n;
      const toBlock = 19475121n;

      const events = await fn({
        realityModuleAddress: ONEINCH_MODULE_ADDRESS,
        fromBlock,
        toBlock,
      });

      expect(events).to.have.lengthOf(1);
      expect(events[0]).to.eql({
        proposalId: "0x791b3d71ea14497d3b8e756479f6f126e08b44351bfab904834c56b1ccf0479a",
        questionId: "0xebf5b601fedfaa5562a03590e9ac8be937cc070a131443af01948a7eda6dfabf",
        txHash: "0x890ddd7826fcd79ff17b54368e8df393959f269847ceeb0fea13cc4b68330d43",
        blockNumber: 19475120n,
      });
    });
  });

  describe("getLogNewAnswer", () => {
    const fn = getLogNewAnswer;

    it("should return the LogNewAnswer events between two blocks", async () => {
      const fromBlock = 19640300n;
      const toBlock = 19640301n;

      const events = await fn({
        realityOracleAddress: ONEINCH_ORACLE_ADDRESS,
        fromBlock,
        toBlock,
      });

      expect(events).to.have.lengthOf(1);
      expect(events[0]).to.eql({
        questionId: "0x8566ba6b1ac945f2b152a20ecc7cb3a87982190190af14cb4fbc85e12eb474e2",
        answer: "0x0000000000000000000000000000000000000000000000000000000000000001",
        user: "0x4D6CAa3E0983fAc7B514D60339EBb538C5A85AAe",
        bond: 10000000n,
        ts: 1712934227,
        txHash: "0x0cc20c32ee428bdb8f16fa1aa22b396ecafa91b61bc2c3350723e4dfefeebff0",
        blockNumber: 19640300n,
      });
    });
  });
});
