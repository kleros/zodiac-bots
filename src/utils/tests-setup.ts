import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import type { Address } from "viem";
import { resolveOnEvent } from "./emitter";
import { env } from "./env";
import * as mocks from "./test-mocks";

chai.use(chaiAsPromised);
export const expect = chai.expect;

type MailAddress = {
  address: string;
  name: string;
};

export type Mail = {
  id: string;
  time: string;
  from: Array<MailAddress>;
  to: Array<MailAddress>;
  subject: string;
  text: string;
  html: string;
};
/**
 * Get the list of all emails from the fake SMTP server
 *
 * @returns The list of all emails
 *
 * @example
 *
 * const mails = await getMails();
 */
export const getMails = async (): Promise<Array<Mail>> => {
  const url = `http://${env.SMTP_HOST}:1080/email`;
  const res = await fetch(url);
  return res.json();
};

export const ONEINCH_MODULE_ADDRESS: Address = "0xa62D2a75eb39C12e908e9F6BF50f189641692F2E";
export const ONEINCH_ORACLE_ADDRESS: Address = "0x5b7dD1E86623548AF054A4985F7fc8Ccbb554E2c";

export { chai, mocks, resolveOnEvent };
