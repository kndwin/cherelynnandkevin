// Keep API requests on the wedding site's origin so admin session cookies
// remain first-party, including on the Pages preview domain.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    const upstream = new URL("https://server-core-production-4f99.up.railway.app");
    upstream.pathname = url.pathname.slice(4);
    upstream.search = url.search;
    const headers = new Headers(request.headers);
    headers.delete("host");
    const response = await fetch(new Request(upstream, {
      method: request.method,
      headers,
      body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
      redirect: "manual",
    }));
    const outgoing = new Response(response.body, response);
    outgoing.headers.set("cache-control", "no-store");
    return outgoing;
  },
};
