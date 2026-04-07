import assert from "node:assert/strict";

async function main() {
  process.env.NODE_ENV = "test";
  process.env.POSTGRES_USER = "test";
  process.env.POSTGRES_DB = "test";
  process.env.POSTGRES_PASSWORD = "test";

  const { getApiLiveness } = await import("../health");
  const response = getApiLiveness();
  assert.equal(response.statusCode, 200);
  assert.equal(response.body.status, "ok");
  assert.equal(response.body.service, "api");
  console.log("API health smoke test passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
