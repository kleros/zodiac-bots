import hre from "hardhat";
import { getContract } from "viem";
import { realityEthV3_0Abi, realityModuleEthAbi } from "./generated";
import { getSnapshotSpace } from "./snapshot";

export const getContracts = async (snapshotSpaceId: string) => {
  const [walletClient] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  const snapshotSpace = await getSnapshotSpace(snapshotSpaceId);
  const realityModuleAddress = snapshotSpace.plugins.safeSnap.address;
  const realityModule = getContract({
    client: { public: publicClient, wallet: walletClient },
    address: realityModuleAddress,
    abi: realityModuleEthAbi,
  });

  const realityOracleAddress = await realityModule.read.oracle();
  const realityOracle = getContract({
    client: { public: publicClient, wallet: walletClient },
    address: realityOracleAddress,
    abi: realityEthV3_0Abi,
  });
  
  return { realityModule, realityOracle };
};
