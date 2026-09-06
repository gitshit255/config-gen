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

export function normalizePatchesData(raw) {
  const list = raw && raw.patches ? raw.patches : raw;
  if (!Array.isArray(list)) return [];
  if (list.length > 0 && typeof list[0] === "string") {
    return fromNameList(list);
  }
  return list;
}
