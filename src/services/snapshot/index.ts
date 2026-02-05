import type { Address, Hash, Hex } from "viem";
import { env } from "../../utils/env";
import { graphQLFetch } from "../../utils/fetch-graphql";

type AddressPluginStructure = {
  address: Address;
};

type SafePluginStructure = {
  safes: Array<{
    network: String;
    realityAddress: Address;
  }>;
};

type QueryResponse = {
  space: {
    plugins: {
      safeSnap: AddressPluginStructure | SafePluginStructure;
    };
  };
};
/**
 * Get the address of the Reality Module contract for a given space
 *
 * This function supports both the deprecated plugins field format (`address` key directly present)
 * and the new one (`safes` array with the value in the `realityAddress` key)
 *
 * @param spaceId - The ID of the space to get the contract address for
 * @returns The address of the contract
 *
 * @example
 *
 * const address = await getRealityModuleAddress("1inch.eth");
 */
export type GetRealityModuleAddressFn = (spaceId: string, chainId?: number) => Promise<Address | null>;
export const getRealityModuleAddress: GetRealityModuleAddressFn = async (spaceId, chainId = env.CHAIN_ID) => {
  const query = `
    query {
      space(id: "${spaceId}") {
        plugins
      }
    }
  `;
  const { space } = await graphQLFetch<QueryResponse>(env.SNAPSHOT_GRAPHQL_URL, query);

  const safeSnap = space?.plugins?.safeSnap;

  if (!safeSnap) return null;

  if ("address" in safeSnap) return safeSnap.address;

  if ("safes" in safeSnap) {
    const safe = safeSnap.safes.find((safe) => safe.network == String(chainId));
    return safe ? safe.realityAddress : null;
  }

  return null;
};

type ProposalSafeBatchTransactionResponse = {
  to: Address;
  data: string;
  nonce: number;
  value: string;
  operation: "0" | "1";
  type?: string;
  abi?: Array<string>;
};

type ProposalSafeBatchResponse = {
  hash: Hash;
  nonce: number;
  transactions: Array<ProposalSafeBatchTransactionResponse>;
  mainTransaction: ProposalSafeBatchTransactionResponse;
};

type ProposalSafeResponse = {
  txs: Array<ProposalSafeBatchResponse>;
  hash: Hash;
  network: string;
  realityAddress: Address;
  multiSendAddress: Address;
};

type ProposalResponse = {
  proposal: {
    id: Hex;
    title: string;
    network: string;
    plugins: {
      safeSnap: {
        safes: Array<ProposalSafeResponse>;
      };
    };
  };
};

export type SnapshotProposal = ProposalResponse["proposal"];

export const getProposal = async (proposalId: Hex): Promise<SnapshotProposal | null> => {
  const query = `
query {
  proposal(id: "${proposalId}") {
    id
    title
    plugins
    network
  }
}
`;
  const { proposal } = await graphQLFetch<ProposalResponse>(env.SNAPSHOT_GRAPHQL_URL, query);

  return proposal;
};
