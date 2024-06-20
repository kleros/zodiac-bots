import { eq } from "drizzle-orm";
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
    block: notification.event.blockNumber,
    transportName,
  });
};

/**
 * Returns all the transports that have already sent a notification with given txHash
 *
 * @param txHash - Transaction hash
 * @returns An array of transport names that have sent a notification
 *
 * @example
 *
 * const transportNames = await findUsedTransports("0x...");
 */
export const findUsedTransports = async (txHash: Hash) => {
  const { db } = getConnection();
  const notificationsSent = await db
    .select({
      transport: schema.notification.transportName,
    })
    .from(schema.notification)
    .where(eq(schema.notification.txHash, txHash));
  return notificationsSent.map((notification) => notification.transport);
};
