/**
 * Check if a promise is in pending state
 *
 * @param The promise to check the state of
 * @returns true if the promise is in pending state, false if resolved or rejected
 *
 * @example
 * const isPending = await isPromisePending(Promise.resolve('success');
 */
export default async function isPromisePending(promise: Promise<unknown>): Promise<boolean> {
  const fallbackValue = {};
  const resolvedValue = await Promise.race([promise, fallbackValue]);
  return resolvedValue === fallbackValue;
}
