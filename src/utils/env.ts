import { bool, cleanEnv, makeValidator, num, str, url, host, port, email } from "envalid";
import type { ParsedSpace } from "../types";
import { Address } from "viem";

/**
 * Validates the SPACES environment variable, which as a `kleros.eth:30000` format, where
 * `kleros.eth` is the ENS of the space and `3000000` is the starting block. Multiple spaces
 * can be present using comma as separator.
 *
 * In addition to the `ens:blockNumber` syntax, there is an optional third parameter to
 * pin the Reality Module address instead of having it automatically resolved using Snapshot.
 * The format looks like`kleros.eth:3000000:0x12345678901234567890123456789012345`.
 *
 * @param input - The SPACES environment variable string
 * @returns the input when it is valid, throws an error otherwise
 *
 * @example
 *
 * validateSpaces("kleros.eth:3000000"); // valid
 * validateSpaces("kleros.eth:3000000,1inch.eth:6000000"); // valid
 * validateSpaces(""); // invalid
 * validateSpaces("kleros.eth"); // invalid
 * validateSpaces("kleros:3000000"); // invalid
 * validateSpaces("kleros.eth,1inch.eth"); // invalid
 * validateSpaces("kleros.eth:3000000,1inch.eth"); // invalid
 * validateSpaces("kleros.eth:1000,1inch.eth:2000:0x1234567890abcdef1234567890abcdef12345678"); // valid
 */
export const validateSpaces = (input: string) => {
  const isValid = /^[\w-]+\.eth:\d+(:0x[a-fA-F0-9]{40})?(,[\w-]+\.eth:\d+(:0x[a-fA-F0-9]{40})?)*$/.test(input);

  if (!isValid) throw new Error("Invalid spaces format");

  return input;
};
const spacesValidator = makeValidator<string>(validateSpaces);

/**
 * Validates the EMAIL_TO environment variable. The EMAIL_TO consist of comma separated entries
 * that follow one of the following formats:
 *  - `foo@bar.com`: A simple email address. It will receive all notifications.
 *  - `example.eth:foo@bar.com`: A ENS-scoped email address. It will only receive notifications
 *  for the given space (`example.eth`).
 *
 * @param input - The EMAIL_TO environment variable string
 * @returns the input when it is valid, throws an error otherwise
 *
 * @example
 *
 * validateEmailTo("foo@bar.com"); // valid
 * validateEmailTo("foo+foo@bar.com"); // valid
 * validateEmailTo("foo@bar.com,bar@foo.com"); // valid
 * validateEmailTo("foo.eth:foo@example.com"); // valid
 * validateEmailTo("foo.eth:foo@example.com,bar.eth:bar@example.com"); // valid
 * validateEmailTo("foo"); // invalid
 * validateEmailTo("foo@"); // invalid
 * validateEmailTo("@foo"); // invalid
 * validateEmailTo("foo@bar.com,"); // invalid
 * validateEmailTo("foo@bar.com,,"); // invalid
 * validateEmailTo("foo.eth:"); // invalid
 */
export const validateEmailTo = (input: string) => {
  // Validate one email address following the validation applied to <input type="email">
  // https://html.spec.whatwg.org/multipage/input.html#email-state-(type=email)
  const oneEmailRegexText =
    "[a-zA-Z0-9\\.!#$%&'*+\\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*";
  // Validates that there is at least one email, optionally followed by more
  // comma separated valid emails
  const ensRegexText = "[\\w-]+\\.eth";
  const emailWithOptionalEnsRegexText = `(${ensRegexText}:)?${oneEmailRegexText}`;

  const completePattern = `^${emailWithOptionalEnsRegexText}(,${emailWithOptionalEnsRegexText})*$`;

  const isValid = new RegExp(completePattern).test(input);
  if (!isValid) throw new Error("Invalid email recipients format");

  return input;
};
const emailToValidator = makeValidator<string>(validateEmailTo);

export const schema = {
  DB_URI: url({
    desc: "Postgres connection string",
    example: "postgresql://user:password@localhost:5432/dbname",
  }),
  DB_DEBUG: bool({
    desc: "Print SQL queries to console",
    example: "false",
    default: false,
  }),
  SPACES: spacesValidator({
    desc: "Spaces to monitor. Spaces should be defined by the ENS and the starting block, with the following format: `kleros.eth:3000000`. Multiple spaces can be present, separated by commas. At least one space is required.",
    example: "kleros.eth:3000000,1inch.eth:6000000",
  }),
  MAINNET_RPC_URL: url({
    desc: "Provider URL for the Ethereum mainnet RPC",
    example: "https://mainnet.infura.io/v3/8238211010344719ad14a89db874158c",
  }),
  SNAPSHOT_GRAPHQL_URL: url({
    desc: "Snapshot GraphQL API endpoint",
    default: "https://hub.snapshot.org/graphql",
    example: "https://hub.snapshot.org/graphql",
  }),
  MAX_BLOCKS_BATCH_SIZE: num({
    desc: "Max number of blocks to process in a single batch",
    example: "200",
    default: 200,
  }),
  BATCH_COOLDOWN: num({
    desc: "Amount of milliseconds to wait to process a new batch after the previous one was processed",
    example: "60000",
    default: 60000,
  }),
  SLACK_WEBHOOK: url({
    desc: "Slack Webhook URL",
    example: "https://hook.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX",
    docs: "https://api.slack.com/messaging/webhooks",
    default: undefined,
  }),
  TELEGRAM_TOKEN: str({
    desc: "Telegram API Token",
    example: "4839574812:AAFD39kkdpWt3ywyRZergyOLMaJhac60qc",
    docs: "https://core.telegram.org/bots#how-do-i-create-a-bot",
    default: undefined,
  }),
  TELEGRAM_CHAT_ID: str({
    desc: "Identifier of the chat to send notifications to",
    example: "-1002037333689",
    docs: "",
    default: undefined,
  }),
  SMTP_HOST: host({
    desc: "Hostname for the SMTP server",
    example: "smtp.gmail.com",
    default: undefined,
  }),
  SMTP_PORT: port({
    desc: "Port for the SMTP server. Defalts to 465",
    example: "465",
    default: 465,
  }),
  SMTP_USER: str({
    desc: "Username for the SMTP server",
    example: "kleros",
    default: undefined,
  }),
  SMTP_PASSWORD: str({
    desc: "Password for the SMTP server",
    example: "hunter2",
    default: undefined,
  }),
  SMTP_FROM: email({
    desc: "Sender email address",
    example: "no-reply@kleros.local",
    default: undefined,
  }),
  SMTP_TO: emailToValidator({
    desc: "Comma separated list of email recipients. It can be a simple email (receive all notifications) or ENS-scoped (receive only notifications for the given ENS) by prefixing the ENS and a colon.",
    example: "alert@kleros.local,example.ens:alerts@example.com",
    default: undefined,
  }),
  SMTP_UNSUBSCRIBE_EMAIL: email({
    desc: "Email to allow users notify about undesired emails",
    example: "unsubscribe@kleros.local",
  }),
  HEARTBEAT_URL: url({
    desc: "URL to request every HEARTBEAT_INTERVAL seconds to indicate that the service is up",
    example: "https://keros.io/api/heartbeat/zodiac",
    default: undefined,
  }),
  HEARTBEAT_INTERVAL: num({
    desc: "Interval in milliseconds to send heartbeats",
    example: "60000",
    default: 60000,
  }),
};

export const env = cleanEnv(process.env, schema);
export type Env = typeof env;

/**
 * Parse the SPACES environment variable into an array of objects
 * with the ENS and the starting block
 *
 * @param spacesEnv - The SPACES environment variable string
 * @returns An array of objects with the ENS and the starting block
 *
 * @example
 * const parsedSpaces = parseSpacesEnv("kleros.eth:3000000,1inch.eth:6000000");
 */
export const parseSpacesEnv = (spacesEnv: string): ParsedSpace[] => {
  return spacesEnv.split(",").map((pair) => {
    const [ens, startingBlock, moduleAddress] = pair.split(":");
    return {
      ens: ens.toLowerCase(),
      startBlock: BigInt(startingBlock),
      moduleAddress: moduleAddress as Address,
    };
  });
};

type PerEnsRecipients = {
  common: string[];
  [ens: string]: string[];
};

/**
 * Parse the EMAIL_TO environment variable into an array of emails.
 *
 * The EMAIL_TO consist of comma separated entries that follow one of the following
 * formats:
 *  - `foo@bar.com`: A simple email address. It will receive all notifications.
 *  - `example.eth:foo@bar.com`: A ENS-scoped email address. It will only receive notifications
 *  for the given space (`example.eth`).
 *
 * @param emailToEnv - The EMAIL_TO environment variable string
 * @returns An array of emails
 *
 * @example
 * const emailTo = parseEmailToEnv("foo@bar.com,bar@foo.com");
 */
export const parseEmailToEnv = (emailToEnv: string | undefined): PerEnsRecipients => {
  const result: PerEnsRecipients = {
    common: [] as string[],
  };

  if (!emailToEnv) return result;

  const entries = emailToEnv.split(",");

  entries.forEach((entry) => {
    // Reversed so the email is always the first part and the ens an optional second
    const [email, ens] = entry.split(":").reverse() as [string] | [string, string];

    const key = ens ? ens : "common";

    if (!result[key]) result[key] = [];
    result[key].push(email);
  });

  return result;
};

/**
 * Parse and filter the EMAIL_TO environment variable into an array of emails relevants to the
 * given ENS. This includes both common (are notified for all ENS changes) and ENS-scoped (are
 * notified only of changes in the given ENS).
 *
 * @params ens - The ENS to filter on
 * @params emailToEnv - The EMAIL_TO environment variable string
 * @returns An array of emails
 *
 * @example
 * const toEnv = "common@example.com,kleros.eth:kleros@example.com,other.eth:other@example.com";
 * const recipients = parseEmailToEnvByENS("kleros.eth", toEnv);
 */
export const parseEmailToEnvByENS = (ens: string, emailToEnv: string | undefined): string[] => {
  const parsed = parseEmailToEnv(emailToEnv);
  const { common } = parsed;
  const ensRecipients = parsed[ens] || [];

  return [...common, ...ensRecipients];
};
