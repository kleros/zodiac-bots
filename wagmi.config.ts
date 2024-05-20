import { defineConfig } from "@wagmi/cli";
import { etherscan } from "@wagmi/cli/plugins";
import { mainnet } from "viem/chains";

export default defineConfig({
  out: "src/generated.ts",
  plugins: [
    etherscan({
      apiKey: process.env.ETHERSCAN_API_KEY!,
      chainId: mainnet.id,
      contracts: [
        {
          name: "RealityModuleETH",
          address: {
            [mainnet.id]: "0x72d453a685c27580acDFcF495830EB16B7E165f8", // master copy
          },
        },
        {
          name: "RealityETH_v3_0",
          address: {
            [mainnet.id]: "0x5b7dD1E86623548AF054A4985F7fc8Ccbb554E2c", // https://github.com/RealityETH/reality-eth-monorepo/blob/main/packages/contracts/chains/deployments/1/ETH/RealityETH-3.0.json
          },
        },
      ],
    }),
  ],
});
