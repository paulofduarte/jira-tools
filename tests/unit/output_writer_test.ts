import { assertEquals } from "@std/assert";
import { stub } from "@std/testing/mock";
import { writeToFile, writeToStdout } from "../../src/lib/output_writer.ts";

const textResult = {
  payload: "hello world",
  fileExtension: "txt",
  mimeType: "text/plain",
  contentType: "text" as const,
};

const binaryResult = {
  payload: new Uint8Array([1, 2, 3]),
  fileExtension: "bin",
  mimeType: "application/octet-stream",
  contentType: "binary" as const,
};

Deno.test("writeToStdout writes text payloads", async () => {
  const writes: Uint8Array[] = [];
  const writeStub = stub(Deno.stdout, "write", (data: Uint8Array) => {
    writes.push(data);
    return Promise.resolve(data.length);
  });

  try {
    await writeToStdout(textResult);
    const decoder = new TextDecoder();
    assertEquals(decoder.decode(writes[0]), "hello world");
  } finally {
    writeStub.restore();
  }
});

Deno.test("writeToStdout writes binary payloads", async () => {
  const writes: Uint8Array[] = [];
  const writeStub = stub(Deno.stdout, "write", (data: Uint8Array) => {
    writes.push(data);
    return Promise.resolve(data.length);
  });

  try {
    await writeToStdout(binaryResult);
    assertEquals(writes[0], binaryResult.payload);
  } finally {
    writeStub.restore();
  }
});

Deno.test("writeToFile persists text and binary payloads", async () => {
  await Deno.mkdir("./tmp/output-writer-tests", { recursive: true });
  const tempDir = await Deno.makeTempDir({ dir: "./tmp/output-writer-tests" });
  const textPath = `${tempDir}/text.txt`;
  const binPath = `${tempDir}/binary.bin`;

  await writeToFile(textResult, textPath);
  await writeToFile(binaryResult, binPath);

  const textContent = await Deno.readTextFile(textPath);
  const binaryContent = await Deno.readFile(binPath);

  assertEquals(textContent, "hello world");
  assertEquals(binaryContent, binaryResult.payload);
});
