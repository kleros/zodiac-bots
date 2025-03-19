import { ChainIdNotFoundError, resolveChain, getPublicClient } from "./provider";
import { expect } from "../utils/tests-setup";
import { env } from "../utils/env";

const BASE_CHAIN_ID = 8453;

describe("ChainIdNotFoundError", () => {
  it("should include the chainId in the error message", () => {
    const chainId = -1;
    const error = new ChainIdNotFoundError(chainId);
    expect(error.message).to.equal(`Chain with id ${chainId} not found`);
  });
});

describe("resolveChain", () => {
  describe("should return the chain if chainId exists", () => {
    it("for mainnet", () => {
      const resolved = resolveChain(1);
      expect(resolved.name).to.equal("Ethereum");
    });

    it("for base", () => {
      const resolved = resolveChain(BASE_CHAIN_ID);
      expect(resolved.name).to.equal("Base");
    });
  });

  it("should throw ChainIdNotFoundError if chainId does not exist", () => {
    expect(() => resolveChain(-1)).to.throw(ChainIdNotFoundError);
    expect(() => resolveChain(Number.MAX_SAFE_INTEGER)).to.throw(ChainIdNotFoundError);
  });
});

describe("getPublicClient", () => {
  describe("should create a public client using provided rpcUrl and chainId", () => {
    it("for mainnet", () => {
      const rpcUrl = "http://test.com";

      const client = getPublicClient(rpcUrl, 1);

      expect(client.transport.url).to.equal(rpcUrl);
      expect(client.chain.id).to.equal(1);
    });

    it("for base", () => {
      const rpcUrl = "http://test.com";

      const client = getPublicClient(rpcUrl, BASE_CHAIN_ID);

      expect(client.transport.url).to.equal(rpcUrl);
      expect(client.chain.id).to.equal(BASE_CHAIN_ID);
    });
  });

  it("should use the env values when parameters are not provided", () => {
    const client = getPublicClient();

    const { RPC_URL, CHAIN_ID } = env;
    expect(client.transport.url).to.equal(RPC_URL);
    expect(client.chain.id).to.equal(CHAIN_ID);
  });
});
