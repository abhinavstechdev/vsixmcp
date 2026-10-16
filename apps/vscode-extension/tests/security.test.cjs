const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

function resolve(root, relative) {
  if (!relative || path.isAbsolute(relative) || relative.includes("\0")) throw new Error("unsafe");
  const rootPath = path.resolve(root);
  const resolved = path.resolve(rootPath, relative);
  const rel = path.relative(rootPath, resolved);
  if (rel === ".." || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) throw new Error("outside");
  return resolved;
}
function isSensitive(value) {
  const normalized = value.replace(/\\/g, "/").toLowerCase();
  const base = normalized.split("/").pop() || normalized;
  return base === ".env" || base.startsWith(".env.") || base.includes("secret") ||
    base.includes("credential") || base.includes("private_key") || base.endsWith(".pem") ||
    base.endsWith(".key") || normalized.includes("/.ssh/") || normalized.includes("/.aws/");
}

test("workspace resolver accepts child paths", () => {
  assert.equal(resolve("/workspace", "src/main.ts"), path.resolve("/workspace/src/main.ts"));
});
test("workspace resolver rejects traversal", () => {
  assert.throws(() => resolve("/workspace", "../../secrets.txt"));
});
test("workspace resolver rejects absolute path", () => {
  assert.throws(() => resolve("/workspace", "/etc/passwd"));
});
test("workspace resolver rejects empty and null-byte paths", () => {
  assert.throws(() => resolve("/workspace", ""));
  assert.throws(() => resolve("/workspace", "ok\0bad"));
});
test("sensitive path filter rejects env files and key material", () => {
  for (const file of [".env", ".env.production", "api_secret.txt", "id_rsa.pem", "credentials.json", ".ssh/id_key"]) {
    assert.equal(isSensitive(file), true, file);
  }
});
test("sensitive path filter allows ordinary source files", () => {
  for (const file of ["src/index.ts", "README.md", "tests/basic.test.js"]) {
    assert.equal(isSensitive(file), false, file);
  }
});
