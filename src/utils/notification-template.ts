import { join, normalize } from "node:path";
import ejs from "ejs";
import type { TransportName, Notification, EventType } from "../notify";
import { formatAnswer, formatWei } from "./format";
import { getRealityQuestionLink, getSnapshotProposalLink } from "./links";
import { env } from "./env";

const BASE_TEMPLATES_PATH = normalize(join(__dirname, "../../templates"));
const unsubscribeEmail = env.SMTP_UNSUBSCRIBE_EMAIL;

/**
 * Given a transport name and type of event, returns the relative path for the template under
 * the `templates` directory. It has an optional `variant` parameter to append a suffix.
 *
 * @param transport The transport name.
 * @param eventType The type of event, contained in the `type` field of a `Notification`.
 * @param variant An optional string to append to the path.
 * @returns An string with the relative path to the template.
 *
 * @example
 *
 * // Returns 'telegram/answer-issued.ejs'
 * const path = getTemplateFilePath('telegram', EventType.ANSWER_ISSUED);
 * // Returns 'email/answer-issued-subject.ejs'
 * const path = getTemplateFilePath('email', EventType.ANSWER_ISSUED, 'subject');
 */
export const getTemplateFilePath = (transport: TransportName, eventType: EventType, variant?: string): string => {
  let filename = `${transport}/${eventType}`;
  if (variant) filename += `-${variant}`;

  return `${filename}.ejs`;
};

/**
 * Given a transport name and a notification, returns the rendered template. It has an optional
 * `variant` parameter to select a template variant.
 *
 * @param transport The transport name.
 * @param notification The notification.
 * @param variant The template variant.
 * @returns The rendered template.
 *
 * @example
 * const subject = await render('email', EventType.ANSWER_ISSUED, 'html');
 */
export const render = (transport: TransportName, notification: Notification, variant?: string): Promise<string> => {
  const path = join(BASE_TEMPLATES_PATH, getTemplateFilePath(transport, notification.type, variant));

  const context = {
    notification,
    formatWei,
    formatAnswer,
    getRealityQuestionLink,
    getSnapshotProposalLink,
    unsubscribeEmail,
  };

  return ejs.renderFile(path, context, {
    cache: true,
    async: false,
    root: BASE_TEMPLATES_PATH,
  });
};
