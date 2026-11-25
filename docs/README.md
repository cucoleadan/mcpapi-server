# MCPAPI documentation

The source of [docs.mcpapi.one](https://docs.mcpapi.one), built with [Starlight](https://starlight.astro.build).

## Edit a page

Pages are MDX files in `src/content/docs/`. The folder path is the URL: `src/content/docs/using/logs.mdx` is `/using/logs/`. Edit one on GitHub, through the **Edit page** link at the bottom of every page, or locally. A push to `main` redeploys the site.

- The sidebar order is in `astro.config.mjs`. Add a new page there.
- Every claim must be true of the product as it is. The connect steps follow the dashboard's own (Connected Agents page); change both together.
- Screenshots live in `src/assets/screenshots/` as `<name>-light.png` and `<name>-dark.png`. Show one with `<Screenshot name="<name>" alt="…" />`: readers see the version that matches their theme.

## Screenshots

```sh
npm run shots                                   # from getmcpapi.com
npm run shots -- --base=http://localhost:8791   # from a local dev server
```

They come from the public site's `/product` pages, which show the real dashboard pages with a made-up workspace, so no sign-in and no real data. It uses the installed Chrome.

## Run locally

```sh
npm ci
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```

## For agents and crawlers

Like getmcpapi.com, the site has a small Worker in front of its files (`worker/index.ts`, run first for every request):

- **Markdown on the same URLs**: a request whose `Accept` ranks `text/markdown` at least as high as `text/html` gets the page's `<main>` as Markdown, converted by Workers AI's `toMarkdown` (free for HTML), an hour in the edge cache. Browsers get HTML. Every HTML page has a `Link: rel="alternate"; type="text/markdown"` header.
- **`/.well-known/api-catalog`** (RFC 9727): the management API, its OpenAPI spec and its docs page. The home page links it, the spec and the docs in `Link` headers.
- **`robots.txt`**: AI crawlers welcome, with `Content-Signal`, and the sitemap (`sitemap-index.xml`, built by Starlight).
- **IndexNow**: the daily cron sends every sitemap URL once after each deploy (key file in `public/`).

Check with `npm run preview` (builds, then `wrangler dev`), then `curl -H "Accept: text/markdown" http://localhost:8787/reference/tools/`. After changing `wrangler.jsonc`, rerun `npx wrangler types worker/worker-configuration.d.ts`.

## Deploy

The site is static files on Cloudflare Workers (`wrangler.jsonc`, Worker `mcpapi-docs` on `docs.mcpapi.one`). The repo is connected in Cloudflare Workers Builds (**root directory** `docs`, build command `npm run build`, deploy command `npx wrangler deploy`), so a push to `main` deploys. `npm run deploy` deploys by hand.
