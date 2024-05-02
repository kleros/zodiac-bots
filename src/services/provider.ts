import { createPublicClient, http } from "viem";
import { mainnet } from "viem/chains";

// TODO: Perform env vars validation
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL;

/**
 * Returns a viem PublicClient configured with the default RPC provided via environment variables
 *
 * @returns A viem PublicClient
 *
 * @example
 * const publicClient = getPublicClient();
 */
export const getPublicClient = (rpcUrl: string | undefined = MAINNET_RPC_URL) => {
  return createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl),
  });
};
