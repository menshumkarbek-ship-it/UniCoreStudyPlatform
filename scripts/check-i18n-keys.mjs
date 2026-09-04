import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const dictionaryDirectory = new URL("../src/i18n/dictionaries/", import.meta.url);
const locales = ["en", "ru", "ky"];
const sourceOfTruth = "en";

function flattenKeys(value, prefix = "") {
  if (Array.isArray(value)) return [prefix];
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([key, nested]) => flattenKeys(nested, prefix ? `${prefix}.${key}` : key));
  }
  return [prefix];
}

function loadDictionary(locale) {
  const filePath = fileURLToPath(new URL(`${locale}.json`, dictionaryDirectory));
  return JSON.parse(readFileSync(filePath, "utf8"));
}

const dictionaries = Object.fromEntries(locales.map((locale) => [locale, loadDictionary(locale)]));
const keySets = Object.fromEntries(locales.map((locale) => [locale, new Set(flattenKeys(dictionaries[locale]))]));

const truthKeys = keySets[sourceOfTruth];
let hasMismatch = false;

for (const locale of locales) {
  if (locale === sourceOfTruth) continue;
  const localeKeys = keySets[locale];
  const missing = [...truthKeys].filter((key) => !localeKeys.has(key));
  const extra = [...localeKeys].filter((key) => !truthKeys.has(key));

  if (missing.length > 0 || extra.length > 0) {
    hasMismatch = true;
    console.error(`\nMismatch between en.json and ${locale}.json:`);
    if (missing.length > 0) {
      console.error(`  Missing in ${locale}.json (present in en.json):`);
      for (const key of missing) console.error(`    - ${key}`);
    }
    if (extra.length > 0) {
      console.error(`  Extra in ${locale}.json (not present in en.json):`);
      for (const key of extra) console.error(`    - ${key}`);
    }
  }
}

if (hasMismatch) {
  console.error("\ni18n key check failed. en.json is the source of truth; fix the dictionaries above.");
  process.exit(1);
}

console.log(`i18n key check passed for locales: ${locales.join(", ")}.`);
