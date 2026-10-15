import assert from "node:assert/strict";
import { test } from "node:test";
import worker from "./worker.js";

test("non-API requests use the static asset binding", async () => {
  const request = new Request("https://cherelynnandkevin.com/admin/guests");
  const response = new Response("app shell");
  assert.equal(await worker.fetch(request, { ASSETS: { fetch: (incoming) => {
    assert.equal(incoming, request);
    return response;
  } } }), response);
});

test("API proxy preserves methods, queries, cookies, bodies and response headers", async (t) => {
  t.mock.method(globalThis, "fetch", async (request) => {
    assert.equal(request.url, "https://server-core-production-4f99.up.railway.app/admin/session?next=guests");
    assert.equal(request.method, "POST");
    assert.equal(request.redirect, "manual");
    assert.equal(request.headers.get("host"), null);
    assert.equal(request.headers.get("cookie"), "session=existing");
    assert.equal(request.headers.get("content-type"), "application/json");
    assert.equal(await request.text(), '{"password":"test-only"}');
    return new Response(null, { status: 302, headers: {
      "set-cookie": "session=new; HttpOnly; Secure; SameSite=Lax; Path=/",
      location: "/admin/guests",
      "cache-control": "public, max-age=3600",
    } });
  });
  const response = await worker.fetch(new Request("https://cherelynnandkevin.com/api/admin/session?next=guests", {
    method: "POST",
    headers: { host: "cherelynnandkevin.com", cookie: "session=existing", "content-type": "application/json" },
    body: '{"password":"test-only"}',
  }), {});
  assert.equal(response.status, 302);
  assert.equal(response.headers.get("location"), "/admin/guests");
  assert.match(response.headers.get("set-cookie"), /session=new; HttpOnly; Secure/);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("API failures and bare API paths do not fall back to the SPA", async (t) => {
  t.mock.method(globalThis, "fetch", async (request) => {
    assert.equal(request.url, "https://server-core-production-4f99.up.railway.app/");
    return new Response('{"error":"not found"}', { status: 404, headers: { "content-type": "application/json" } });
  });
  const response = await worker.fetch(new Request("https://cherelynnandkevin.com/api"), {});
  assert.equal(response.status, 404);
  assert.equal(await response.text(), '{"error":"not found"}');
});
