// Run: node scripts/check-numbering.mjs
import assert from "node:assert/strict";
import { insertNumbered, isUniqueViolation, nextNumber } from "../src/lib/numbering.ts";

assert.equal(nextNumber("INV-2026-", []), "INV-2026-001");
assert.equal(nextNumber("INV-2026-", ["INV-2026-003", "INV-2026-001"]), "INV-2026-004");
// Other years, other prefixes and junk never count.
assert.equal(nextNumber("INV-2026-", ["INV-2025-099", "SOW-2026-050", "INV-2026-abc", "INV-2026-"]), "INV-2026-001");
// Past 999 keeps counting instead of wrapping.
assert.equal(nextNumber("SOW-2026-", ["SOW-2026-999"]), "SOW-2026-1000");
assert.equal(isUniqueViolation({ code: "23505" }), true);
assert.equal(isUniqueViolation(new Error("other")), false);
assert.equal(isUniqueViolation(null), false);

// insertNumbered retries after losing a race, and gives up on other errors.
const taken = ["INV-2026-001"];
let calls = 0;
const stored = await insertNumbered("INV-2026-", async () => taken, async (n) => {
  calls++;
  if (calls === 1) { taken.push(n); throw Object.assign(new Error("dupe"), { code: "23505" }); }
});
assert.equal(stored, "INV-2026-003");
await assert.rejects(insertNumbered("INV-2026-", async () => [], async () => { throw new Error("db down"); }), /db down/);
await assert.rejects(insertNumbered("X-", async () => [], async () => { throw { code: "23505" }; }));

console.log("numbering: all checks passed");
