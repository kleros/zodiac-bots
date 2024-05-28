import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import type { Address } from "viem";
import { BotEventNames } from "../bot-events";
import EventEmitter from "node:events";
import * as mocks from "./test-mocks";
import { env } from "./env";

chai.use(chaiAsPromised);
export const expect = chai.expect;

/**
 * Helps tests to validate emitted events and payloads
 *
 * @param name The name of the event
 * @param emitter The emitter that should emit the event
 *
 * @returns A promise that resolves to an array of event arguments
 *
 * @example
 *
 * const emitter = new EventEmitter();
 * const promise = resolveOnEvent("my-event", emitter);
 * emitter.emit("my-event", "content")
 * const payload = await promise; // payload is "content"
 */
export const resolveOnEvent = (name: BotEventNames, emitter: EventEmitter): Promise<Array<any>> =>
  new Promise((resolve) => {
    emitter.on(name, (...args) => {
      resolve(args);
    });
  });

type MailAddress = {
  address: string;
  name: string;
};

type Mail = {
  id: string;
  time: string;
  from: Array<MailAddress>;
  to: Array<MailAddress>;
  subject: string;
  text: string;
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

export { chai, mocks };
