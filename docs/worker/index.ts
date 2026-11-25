// The docs site's Worker, in front of the static files in ./dist, with what getmcpapi.com serves agents and crawlers:
// Markdown on the same URLs (Accept: text/markdown), the RFC 9727 API catalog, Link headers, and IndexNow after each deploy.
// Env comes from worker-configuration.d.ts (npx wrangler types worker/worker-configuration.d.ts).

const SITE = 'https://docs.mcpapi.one'
const APP = 'https://mcpapi.one'
// Public by design: search engines check it against public/<key>.txt.
const INDEXNOW_KEY = '8c7e21e089c1a30754d6e06cf9241c36'

// Whether an Accept header asks for Markdown over HTML: text/markdown listed, with a q at least text/html's.
// A browser-like header that only allows Markdown (text/html, text/markdown;q=0.5) gets HTML. (Same as the app's src/site.ts.)
const qOf = (accept: string, type: string) => {
  const part = accept.split(',').find((p) => p.split(';')[0].trim().toLowerCase() === type)
  return part ? Number(/;\s*q=([\d.]+)/.exec(part)?.[1] ?? 1) : 0
}
const prefersMarkdown = (accept: string) => qOf(accept, 'text/markdown') > 0 && qOf(accept, 'text/markdown') >= qOf(accept, 'text/html')
// Pages, not files: no extension in the last segment.
const isPage = (pathname: string) => !/\.[a-z0-9]+$/i.test(pathname)

const edgeCache = () => (caches as unknown as { default: Cache }).default

// The page's HTML, its <main> only, converted by Workers AI's toMarkdown (free for HTML; no model runs). An hour in the
// edge cache per URL; a deploy changes the page and the next hour picks it up.
async function markdownPage(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const key = new URL(request.url)
  key.searchParams.set('_format', 'md')
  const hit = await edgeCache().match(key)
  if (hit) return hit
  const page = await env.ASSETS.fetch(new Request(request.url, { headers: { accept: 'text/html' } }))
  if (!page.ok || !page.headers.get('content-type')?.includes('text/html')) return page
  const out = await env.AI.toMarkdown({ name: 'page.html', blob: new Blob([await page.text()], { type: 'text/html' }) },
    { conversionOptions: { html: { hostname: request.url, cssSelector: 'main' } } })
  if (out.format !== 'markdown') return new Response('Could not convert this page to Markdown.', { status: 500 })
  // Starlight's heading anchors ("Section titled …") are noise in Markdown, and each screenshot is there twice (light
  // and dark): keep the light one.
  const md = out.data.replace(/^\[Section titled .*\]\(#[^)]*\)\n\n?/gm, '').replace(/!\[[^\]]*\]\([^)]*-dark\.[^)]*\)/g, '')
  const res = new Response(md, { headers: {
    'content-type': 'text/markdown; charset=utf-8', 'x-markdown-tokens': String(out.tokens), vary: 'accept', 'cache-control': 'public, max-age=3600',
  } })
  ctx.waitUntil(edgeCache().put(key, res.clone()))
  return res
}

// RFC 9727: the management API, its OpenAPI spec and these docs.
function apiCatalog(method: string) {
  const linkset = { linkset: [{
    anchor: `${APP}/v1`,
    'service-desc': [{ href: `${APP}/v1/openapi.yaml`, type: 'application/yaml' }],
    'service-doc': [{ href: `${SITE}/reference/management-api/`, type: 'text/html' }],
  }] }
  return new Response(method === 'HEAD' ? null : JSON.stringify(linkset), { headers: {
    'content-type': 'application/linkset+json; profile="https://www.rfc-editor.org/info/rfc9727"',
    link: `<${SITE}/.well-known/api-catalog>; rel="api-catalog"`, 'access-control-allow-origin': '*', 'cache-control': 'public, max-age=3600',
  } })
}

// IndexNow (Bing, Yandex, Seznam, Naver; Google doesn't take it): every page in the sitemap, once after each deploy.
// The daily cron sends them when this version was created since the previous run.
async function submitSite(env: Env, since: number) {
  if (Date.parse(env.CF_VERSION_METADATA.timestamp) <= since) return
  const sitemap = await (await env.ASSETS.fetch(`${SITE}/sitemap-0.xml`)).text()
  const urlList = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1])
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(SITE).host, key: INDEXNOW_KEY, urlList }),
  })
  // 200 or 202 is accepted; 403 means the key file isn't served, 422 a URL outside the host.
  console.log(JSON.stringify({ event: 'indexnow', status: res.status, urls: urlList.length }))
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url)
    const read = request.method === 'GET' || request.method === 'HEAD'
    if (pathname === '/.well-known/api-catalog' && read) return apiCatalog(request.method)
    if (request.method === 'GET' && isPage(pathname) && prefersMarkdown(request.headers.get('accept') ?? '')) {
      return markdownPage(request, env, ctx)
    }
    const res = await env.ASSETS.fetch(request)
    if (!res.headers.get('content-type')?.includes('text/html')) return res
    // RFC 8288 Link headers: every page's Markdown is the same URL; the home page also points to the API catalog.
    const page = new Response(res.body, res)
    page.headers.append('vary', 'accept')
    page.headers.append('link', `<${SITE}${pathname}>; rel="alternate"; type="text/markdown"`)
    if (pathname === '/') {
      page.headers.append('link', `</.well-known/api-catalog>; rel="api-catalog", <${APP}/v1/openapi.yaml>; rel="service-desc"; type="application/yaml", `
        + `<${SITE}/reference/management-api/>; rel="service-doc"; type="text/html"`)
    }
    return page
  },
  async scheduled(controller, env, ctx) {
    ctx.waitUntil(submitSite(env, controller.scheduledTime - 86_400_000).catch((e: unknown) =>
      console.error(JSON.stringify({ event: 'indexnow_failed', error: e instanceof Error ? e.message : String(e) }))))
  },
} satisfies ExportedHandler<Env>
