import { exists } from "@std/fs/exists.ts";
import { load } from "@dotenv";

/**
 * Loads environment variables from the provided file when available.
 */
export async function loadEnvironment(path = ".env"): Promise<void> {
  if (!(await exists(path))) {
    return;
  }

  await load({ envPath: path, export: true });
}

/**
 * Helper that reads an environment variable trimming the value when present.
 */
export function readEnv(name: string): string | undefined {
  const value = Deno.env.get(name);
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}
