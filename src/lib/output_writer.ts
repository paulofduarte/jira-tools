import { ensureDir } from "@std/fs";
import { dirname } from "@std/path";

import type { FormatResult } from "./formatters.ts";

/**
 * Writes the formatted result to STDOUT preserving the correct encoding.
 */
export async function writeToStdout(result: FormatResult): Promise<void> {
  if (result.contentType === "binary") {
    const payload = result.payload as Uint8Array;
    await Deno.stdout.write(payload);
    return;
  }

  const text = result.payload as string;
  const encoder = new TextEncoder();
  await Deno.stdout.write(encoder.encode(text));
}

/**
 * Persists the formatted result into the selected file path creating directories when necessary.
 */
export async function writeToFile(
  result: FormatResult,
  filePath: string,
): Promise<void> {
  const directory = dirname(filePath);
  await ensureDir(directory);

  if (result.contentType === "binary") {
    const payload = result.payload as Uint8Array;
    await Deno.writeFile(filePath, payload);
    return;
  }

  const text = result.payload as string;
  await Deno.writeTextFile(filePath, text);
}
