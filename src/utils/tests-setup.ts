import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import type { Address } from "viem";

chai.use(chaiAsPromised);
export const expect = chai.expect;
export { chai };

export const ONEINCH_MODULE_ADDRESS: Address = "0xa62D2a75eb39C12e908e9F6BF50f189641692F2E";
export const ONEINCH_ORACLE_ADDRESS: Address = "0x5b7dD1E86623548AF054A4985F7fc8Ccbb554E2c";
