import hre from "hardhat";
import { getContract, parseEther, parseEventLogs } from "viem";
import { realityEthV3_0Abi, realityModuleEthAbi } from "../src/generated";

export const getContracts = async () => {
  const [walletClient] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();
  const realityModuleAddress = "0xa62D2a75eb39C12e908e9F6BF50f189641692F2E";
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
  return { publicClient, walletClient, realityModule, realityOracle };
};

export const createProposal = async () => {
  const { publicClient, walletClient, realityModule, realityOracle } = await getContracts();
  const proposalId = "0xDeaDBeeFDeaDBeeFDeaDBeeFDeaDBeeFDeaDBeeFDeaDBeeFDeaDBeeFDeaDBeeF";
  const txHashes: `0x${string}`[] = ["0x4242424242424242424242424242424242424242424242424242424242424242"];
  const tx = await realityModule.write.addProposal([proposalId, txHashes], { account: walletClient.account });
  const logs = await publicClient
    .getTransactionReceipt({
      hash: tx,
    })
    .then((receipt) =>
      parseEventLogs({
        abi: realityEthV3_0Abi,
        eventName: "LogNewQuestion",
        logs: receipt.logs,
      }),
    );
  const questionId = logs[0].args.question_id;
  return { realityModule, realityOracle, proposalId, txHashes, questionId };
};

export const submitAnswer = async () => {
  const { publicClient, walletClient, realityModule, realityOracle } = await getContracts();
  const questionId = "0xaabdb8ed2d251ccc6b3f37548024baee31609d25393efac0c3ae07eaabdf1c8a";
  const answer = "0x0000000000000000000000000000000000000000000000000000000000000042";
  const maxPreviousBond = parseEther("3");
  await realityOracle.write.submitAnswer([questionId, answer, maxPreviousBond], {
    account: walletClient.account,
    value: parseEther("1"),
  });
  return { realityModule, realityOracle, questionId, answer, maxPreviousBond };
};
