import { HardhatUserConfig } from "hardhat/config";

const config: HardhatUserConfig = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      forking: {
        url: process.env.MAINNET_RPC_URL ?? "bad rpc url",
        enabled: true,
      },
    },
    mainnet: {
      chainId: 1,
      url: process.env.MAINNET_RPC_URL,
    },
  },
};

export default config;
