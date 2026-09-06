// Normalizes different "patches.json" shapes into the canonical
// array-of-patch-object shape the rest of the app expects:
//   { name, description, use, compatiblePackages, options }
//
// Supported inputs:
//  1. The full jar-generated format produced by patches-json-gen.jar /
//     the revanced-patches CI job: either `{ version, patches: [...] }`
//     or a bare array of those rich patch objects.
//  2. A minimal patch *name list*: a flat JSON array of strings, e.g.
//       ["NewX: Remove ads", "NewX: Custom font", ...]
//     Each entry is optionally prefixed with "<App Name>: <patch name>".
//     Entries sharing a prefix are grouped into the same app card;
//     entries without a recognizable prefix fall under "Unknown".
//     Since this format carries no package/version/description/options
//     metadata, those fields are filled in with safe defaults.
//  3. The newer "API v4" / Morphe-native patches-list.json shape (also seen
//     wrapped in `{ NOTE, version, patches: [...] }`), where each patch has
//     `default` instead of `use`, and `compatiblePackages` is an array of
//     rich objects (packageName/name/description/apkFileType/appIconColor/
//     signatures/targets) instead of a flat `{ packageName: [versions] }`
//     dict -- each target object carries the version string plus extra
//     metadata (versionCodes/isExperimental/minSdk/description) that this
//     app doesn't currently use, so only `packageName` and each target's
//     `version` are kept.

function splitAppPrefix(entry) {
  const idx = entry.indexOf(": ");
  if (idx === -1) return { app: "Unknown", name: entry };
  return { app: entry.slice(0, idx), name: entry.slice(idx + 2) };
}

function fromNameList(list) {
  return list.map((entry) => {
    const { app, name } = splitAppPrefix(entry);
    return {
      name,
      description: "",
      use: true,
      compatiblePackages: { [app]: null },
      options: [],
    };
  });
}

function isV4Patch(patch) {
  // v4 patches have `default` instead of `use`, and never both.
  return (
    patch &&
    typeof patch === "object" &&
    "default" in patch &&
    !("use" in patch)
  );
}

function v4CompatiblePackages(compatiblePackages) {
  if (!Array.isArray(compatiblePackages) || compatiblePackages.length === 0) {
    return null;
  }
  const result = {};
  for (const pkg of compatiblePackages) {
    const versions = Array.isArray(pkg.targets)
      ? pkg.targets.map((t) => t.version).filter((v) => !!v)
      : null;
    result[pkg.packageName] = versions && versions.length > 0 ? versions : null;
  }
  return result;
}

function fromV4Format(list) {
  return list.map((patch) => ({
    name: patch.name,
    description: patch.description || "",
    use: !!patch.default,
    dependencies: patch.dependencies || [],
    compatiblePackages: v4CompatiblePackages(patch.compatiblePackages),
    options: patch.options || [],
  }));
}

export function normalizePatchesData(raw) {
  const list = raw && raw.patches ? raw.patches : raw;
  if (!Array.isArray(list)) return [];
  if (list.length > 0 && typeof list[0] === "string") {
    return fromNameList(list);
  }
  if (list.length > 0 && isV4Patch(list[0])) {
    return fromV4Format(list);
  }
  return list;
}
