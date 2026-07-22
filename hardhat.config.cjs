// CommonJS config used only by the dockerized hardhat fork node (Dockerfile.hardhat-container).
// Kept as plain JS so the fork container needs no ts-node/TypeScript toolchain.
/** @type {import('hardhat/config').HardhatUserConfig} */
module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      forking: {
        url: process.env.RPC_URL ?? "bad rpc url",
        enabled: true,
      },
    },
    mainnet: {
      chainId: 1,
      url: process.env.RPC_URL,
    },
  },
};
