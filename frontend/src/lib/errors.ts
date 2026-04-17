export function describeError(err: unknown, fallback = "Something went wrong."): string {
  if (err instanceof Error) return err.message;
  return fallback;
}
