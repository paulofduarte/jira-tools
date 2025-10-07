import { VERSION } from "../src/version.ts";

interface NpmEntry {
  integrity: string;
  dependencies?: string[];
}

interface DenoLock {
  version: string;
  specifiers?: Record<string, string>;
  npm?: Record<string, NpmEntry>;
  workspace?: {
    dependencies?: string[];
  };
}

function parsePackageKey(key: string): { name: string; version: string } {
  const atIndex = key.lastIndexOf("@");
  if (atIndex <= 0) {
    throw new Error(`Invalid package key: ${key}`);
  }
  return {
    name: key.slice(0, atIndex),
    version: key.slice(atIndex + 1),
  };
}

function createSpdxId(name: string, version: string): string {
  const sanitizedName = name
    .replace(/[^A-Za-z0-9\-_.]/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  const sanitizedVersion = version
    .replace(/[^A-Za-z0-9\-_.]/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
  return `SPDXRef-${sanitizedName || "Package"}-${sanitizedVersion || "Version"}`;
}

async function getGitOutput(args: string[]): Promise<string | undefined> {
  try {
    const command = new Deno.Command("git", { args });
    const output = await command.output();
    if (output.code !== 0) {
      return undefined;
    }
    return new TextDecoder().decode(output.stdout).trim();
  } catch {
    return undefined;
  }
}

function resolveDependencyKey(
  name: string,
  packageNameMap: Map<string, string[]>,
): string | undefined {
  const matches = packageNameMap.get(name);
  if (!matches || matches.length === 0) {
    return undefined;
  }
  return matches[0];
}

async function main() {
  const args = new Map<string, string>();
  for (let i = 0; i < Deno.args.length; i++) {
    const arg = Deno.args[i];
    if (arg === "--output" && Deno.args[i + 1]) {
      args.set("output", Deno.args[i + 1]);
      i += 1;
    } else if (arg.startsWith("--output=")) {
      args.set("output", arg.slice("--output=".length));
    }
  }

  const outputPath = args.get("output") ?? "sbom.spdx.json";

  const lockRaw = await Deno.readTextFile("deno.lock");
  const lockData = JSON.parse(lockRaw) as DenoLock;
  const npmEntries = lockData.npm ?? {};

  const packages: {
    key: string;
    name: string;
    version: string;
    spdxId: string;
    dependencies: string[];
  }[] = [];

  const packageNameMap = new Map<string, string[]>();
  const packageInfoByKey = new Map<string, {
    name: string;
    version: string;
    spdxId: string;
  }>();

  for (const [key, info] of Object.entries(npmEntries)) {
    const { name, version } = parsePackageKey(key);
    const spdxId = createSpdxId(name, version);
    packages.push({
      key,
      name,
      version,
      spdxId,
      dependencies: info.dependencies ?? [],
    });

    if (!packageNameMap.has(name)) {
      packageNameMap.set(name, []);
    }
    packageNameMap.get(name)!.push(key);
    packageInfoByKey.set(key, { name, version, spdxId });
  }

  const specifiers = lockData.specifiers ?? {};
  const workspaceDependencies = lockData.workspace?.dependencies ?? [];
  const directPackageIds = new Set<string>();

  for (const specifier of workspaceDependencies) {
    if (!specifier.startsWith("npm:")) {
      continue;
    }
    const descriptor = specifier.slice("npm:".length);
    try {
      const { name } = parsePackageKey(descriptor);
      const resolvedVersion = specifiers[specifier];
      if (!resolvedVersion) continue;
      const key = `${name}@${resolvedVersion}`;
      const info = packageInfoByKey.get(key);
      if (info) {
        directPackageIds.add(info.spdxId);
      }
    } catch {
      continue;
    }
  }

  const spdxPackages = packages.map((pkg) => ({
    name: pkg.name,
    SPDXID: pkg.spdxId,
    versionInfo: pkg.version,
    downloadLocation: "NOASSERTION",
    licenseConcluded: "NOASSERTION",
    licenseDeclared: "NOASSERTION",
    supplier: "NOASSERTION",
    originator: "NOASSERTION",
    filesAnalyzed: false,
    externalRefs: [
      {
        referenceCategory: "PACKAGE-MANAGER",
        referenceType: "purl",
        referenceLocator: `pkg:npm/${pkg.name}@${pkg.version}`,
      },
    ],
  }));

  const relationships: Array<{
    spdxElementId: string;
    relationshipType: string;
    relatedSpdxElement: string;
  }> = [];

  const documentDescribes = directPackageIds.size > 0
    ? [...directPackageIds]
    : spdxPackages.map((pkg) => pkg.SPDXID);

  for (const spdxId of documentDescribes) {
    relationships.push({
      spdxElementId: "SPDXRef-DOCUMENT",
      relationshipType: "DESCRIBES",
      relatedSpdxElement: spdxId,
    });
  }

  for (const pkg of packages) {
    if (pkg.dependencies.length === 0) continue;
    const sourceId = packageInfoByKey.get(pkg.key)?.spdxId;
    if (!sourceId) continue;
    for (const dependencyName of pkg.dependencies) {
      const dependencyKey = resolveDependencyKey(dependencyName, packageNameMap);
      if (!dependencyKey) continue;
      const targetInfo = packageInfoByKey.get(dependencyKey);
      if (!targetInfo) continue;
      relationships.push({
        spdxElementId: sourceId,
        relationshipType: "DEPENDS_ON",
        relatedSpdxElement: targetInfo.spdxId,
      });
    }
  }

  const created = new Date().toISOString();
  const sha = Deno.env.get("GITHUB_SHA") ?? await getGitOutput(["rev-parse", "HEAD"]);
  const namespaceBase = Deno.env.get("GITHUB_SERVER_URL") && Deno.env.get("GITHUB_REPOSITORY")
    ? `${Deno.env.get("GITHUB_SERVER_URL")}/${Deno.env.get("GITHUB_REPOSITORY")}`
    : "https://github.com/paulofduarte/jira-tools";
  const documentNamespace = `${namespaceBase}/spdx/${sha ?? created}`;

  const documentName = "jira-tools-sbom";

  const sbom = {
    spdxVersion: "SPDX-2.2",
    dataLicense: "CC0-1.0",
    SPDXID: "SPDXRef-DOCUMENT",
    name: documentName,
    documentNamespace,
    creationInfo: {
      created,
      creators: [
        `tool: jira-tools-sbom-generator@${VERSION}`,
      ],
    },
    packages: spdxPackages,
    relationships,
  };

  await Deno.writeTextFile(outputPath, JSON.stringify(sbom, null, 2));
  console.log(`Generated SPDX SBOM at ${outputPath}`);
}

if (import.meta.main) {
  await main();
}
