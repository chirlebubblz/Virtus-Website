// Run: node scripts/check-numbering.mjs
import assert from "node:assert/strict";
import { isUniqueViolation, nextNumber } from "../src/lib/numbering.ts";

assert.equal(nextNumber("INV-2026-", []), "INV-2026-001");
assert.equal(nextNumber("INV-2026-", ["INV-2026-003", "INV-2026-001"]), "INV-2026-004");
// Other years, other prefixes and junk never count.
assert.equal(nextNumber("INV-2026-", ["INV-2025-099", "SOW-2026-050", "INV-2026-abc", "INV-2026-"]), "INV-2026-001");
// Past 999 keeps counting instead of wrapping.
assert.equal(nextNumber("SOW-2026-", ["SOW-2026-999"]), "SOW-2026-1000");
assert.equal(isUniqueViolation({ code: "23505" }), true);
assert.equal(isUniqueViolation(new Error("other")), false);
assert.equal(isUniqueViolation(null), false);

console.log("numbering: all checks passed");
