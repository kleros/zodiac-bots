import { and, eq } from "drizzle-orm";
import type { Hash } from "viem";
import { Notification, TransportName } from "../../notify";
import { getConnection } from "./connection";
import * as schema from "./schema";

/**
 * Register that the notification has already been sent with given transport.
 *
 * @param notification - Notification that was sent
 * @param transportName - Transport that sent the notification
 *
 * @example
 *
 * await insertUsedTransport(notification, "email");
 */
export const insertUsedTransport = async (notification: Notification, transportName: TransportName) => {
  const { db } = getConnection();

  await db.insert(schema.notification).values({
    txHash: notification.event.txHash,
    logIndex: notification.event.logIndex,
    block: notification.event.blockNumber,
    transportName,
  });
};

/**
 * Returns all the transports that have already sent a notification for the given log.
 *
 * The dedup key is the on-chain log identity `(txHash, logIndex)`, not the transaction alone:
 * a single transaction can emit several notifiable events (e.g. a question and its answer), and
 * each must be able to notify independently.
 *
 * @param txHash - Transaction hash of the log
 * @param logIndex - Block-scoped index of the log within the transaction receipt
 * @returns An array of transport names that have sent a notification for that log
 *
 * @example
 *
 * const transportNames = await findUsedTransports("0x...", 43);
 */
export const findUsedTransports = async (txHash: Hash, logIndex: number) => {
  const { db } = getConnection();
  const notificationsSent = await db
    .select({
      transport: schema.notification.transportName,
    })
    .from(schema.notification)
    .where(and(eq(schema.notification.txHash, txHash), eq(schema.notification.logIndex, logIndex)));
  return notificationsSent.map((notification) => notification.transport);
};
