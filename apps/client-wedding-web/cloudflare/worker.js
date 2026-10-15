// Keep API requests on the wedding site's origin so admin session cookies
// remain first-party on the custom domain and workers.dev preview.
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname !== "/api" && !url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request);
    const upstream = new URL("https://server-core-production-4f99.up.railway.app");
    upstream.pathname = url.pathname.slice(4) || "/";
    upstream.search = url.search;
    const forwarded = new Request(new Request(upstream, request), { redirect: "manual" });
    forwarded.headers.delete("host");
    const response = await fetch(forwarded);
    const outgoing = new Response(response.body, response);
    outgoing.headers.set("cache-control", "no-store");
    return outgoing;
  },
};
