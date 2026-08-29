import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(
    new Request("http://localhost/", { headers: { accept: "text/html" } }),
    { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } },
    { waitUntil() {}, passThroughOnException() {} },
  );
}

test("server-renders the finished draft room", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);
  const html = await response.text();
  assert.match(html, /Half Point Draft Room/);
  assert.match(html, /10-team · Pick 10 · Snake/);
  assert.match(html, /Track the room\./);
  assert.match(html, /1\.10 in 9 picks/);
  assert.match(html, /2026 rankings baseline/);
  assert.match(html, /UPSIDE-FIRST/);
  assert.match(html, /Ceiling and availability carry the strongest weight/);
  assert.match(html, /August 29, 2026/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("emits site-specific social metadata", async () => {
  const response = await render();
  const html = await response.text();
  assert.match(html, /<meta property="og:title" content="Half Point Draft Room"/i);
  assert.match(html, /<meta property="og:image" content="http:\/\/localhost(?::3000)?\/og\.png"/i);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image"/i);
});
