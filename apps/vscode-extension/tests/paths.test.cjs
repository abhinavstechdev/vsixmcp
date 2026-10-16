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

test("allows paths inside the workspace", () => {
  assert.equal(resolve("/workspace", "src/index.ts"), path.resolve("/workspace/src/index.ts"));
});

test("rejects traversal outside the workspace", () => {
  assert.throws(() => resolve("/workspace", "../outside.txt"));
});

test("rejects absolute paths", () => {
  assert.throws(() => resolve("/workspace", "/etc/passwd"));
});
