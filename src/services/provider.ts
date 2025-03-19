import { createPublicClient, http } from "viem";
import type { Chain } from "viem/chains";
import * as chains from "viem/chains";
import { env } from "../utils/env";

/**
 * Error thrown when a chainId is not found in the viem chains registry
 *
 * @example
 * throw new ChainIdNotFound(1);
 */
export class ChainIdNotFoundError extends Error {
  constructor(chainId: number) {
    super(`Chain with id ${chainId} not found`);
  }
}

/**
 * Returns a chain from the viem chains registry based on a chainId
 *
 * @param chainId - The chainId to resolve
 *
 * @returns The chain object from the viem chains registry
 *
 * @example
 * const chain = resolveChain(1);
 */
export const resolveChain = (chainId: number): Chain => {
  const found = Object.values(chains).find((chain) => chain.id === chainId);
  if (!found) throw new ChainIdNotFoundError(chainId);

  return found;
};

/**
 * Returns a viem PublicClient configured with the default RPC provided via environment variables
 *
 * @returns A viem PublicClient
 *
 * @example
 * const publicClient = getPublicClient();
 */
export const getPublicClient = (rpcUrl: string | undefined = env.RPC_URL, chainId = env.CHAIN_ID) => {
  const resolvedChain = resolveChain(chainId);

  return createPublicClient({
    chain: resolvedChain,
    transport: http(rpcUrl),
  });
};
