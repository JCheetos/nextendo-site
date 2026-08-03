#!/usr/bin/env node
// Extract i18n dictionaries from the legacy assets/js/nx-i18n*.js files into
// messages/<locale>.json, the format next-intl consumes.
//
// We run each file's contents inside a Node VM with a stub for
// `window.NXI18N.addByLang(code, dict)` that captures every (code, dict) pair.

import { readFile, readdir, writeFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const ASSETS_DIR = join(ROOT, 'assets', 'js')
const MESSAGES_DIR = join(ROOT, 'messages')

const SUPPORTED = ['fr', 'en', 'es', 'pt', 'de', 'it', 'ru', 'zh', 'ja', 'ar']

async function main() {
  const entries = await readdir(ASSETS_DIR)
  const files = entries.filter((f) => /^nx-i18n(-pages|-app|-progress)?.*\.js$/.test(f)).sort()

  /** @type {Record<string, Record<string, string>>} */
  const merged = Object.fromEntries(SUPPORTED.map((l) => [l, {}]))

  for (const file of files) {
    const src = await readFile(join(ASSETS_DIR, file), 'utf8')
    /** @type {Array<[string, Record<string, string>]>} */
    const captured = []
    const sandbox = {
      window: {
        NXI18N: {
          addByLang(code, dict) {
            captured.push([code, { ...dict }])
          },
        },
      },
      console,
    }
    vm.createContext(sandbox)
    try {
      vm.runInContext(src, sandbox, { filename: file })
    } catch (err) {
      console.error(`✗ failed to evaluate ${file}:`, err.message)
      process.exitCode = 1
      continue
    }
    for (const [code, dict] of captured) {
      if (!merged[code]) {
        console.warn(`! unknown locale "${code}" in ${file}`)
        continue
      }
      Object.assign(merged[code], dict)
    }
    console.log(`✓ ${file}: ${captured.length} locale block(s)`)
  }

  for (const code of SUPPORTED) {
    const flat = merged[code];
    const nested = unflatten(flat);
    const out = join(MESSAGES_DIR, `${code}.json`);
    await writeFile(out, `${JSON.stringify(nested, null, 2)}\n`, "utf8");
    const count = Object.keys(flat).length;
    console.log(`→ ${code}.json (${count} flat keys → nested)`);
  }
}

/**
 * Convert a flat `{ "a.b.c": "v" }` map into `{ a: { b: { c: "v" } } }`.
 * Leaves keys that don't contain a `.` at the root level.
 */
function unflatten(flat) {
  const out = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let cursor = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const segment = parts[i];
      if (cursor[segment] === undefined || typeof cursor[segment] !== "object") {
        cursor[segment] = {};
      }
      cursor = cursor[segment];
    }
    cursor[parts.at(-1)] = value;
  }
  return out;
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
