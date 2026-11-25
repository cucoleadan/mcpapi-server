// Documentation screenshots: the dashboard screens from getmcpapi.com's /product pages, which render the real dashboard
// pages with a made-up workspace (no sign-in, no real data). Each lands in src/assets/screenshots as <name>-light.png and
// <name>-dark.png. Run: npm run shots [-- --base=http://localhost:8791] (uses the installed Chrome).
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright-core'

const base = process.argv.find((a) => a.startsWith('--base='))?.slice(7) ?? 'https://getmcpapi.com'
const out = new URL('../src/assets/screenshots/', import.meta.url)

// Screenshot name → /product/<feature>.
const shots: Record<string, string> = {
  overview: 'overview',
  'add-an-api': 'add-an-api',
  connections: 'accounts',
  agents: 'agents',
  team: 'team',
  logs: 'logs',
  prompts: 'prompts',
}

const browser = await chromium.launch({ channel: 'chrome' })
for (const theme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 })
  const { hostname } = new URL(base)
  // The theme, and a cookie choice so the banner stays hidden.
  await context.addCookies([
    { name: 'theme', value: theme, domain: hostname, path: '/' },
    { name: 'consent', value: 'none', domain: hostname, path: '/' },
  ])
  const page = await context.newPage()
  for (const [name, feature] of Object.entries(shots)) {
    await page.goto(`${base}/product/${feature}`, { waitUntil: 'networkidle' })
    // The dashboard screen is the page's one <figure>.
    const screen = page.locator('figure').first()
    await screen.scrollIntoViewIfNeeded()
    // The site fades sections in as they scroll into view; wait until this one is shown and its animation is done.
    await page.waitForFunction(() => document.querySelector('figure')?.closest('[data-reveal]')?.hasAttribute('data-shown') ?? true, null, { timeout: 5000 }).catch(() => {})
    await page.waitForTimeout(800)
    await screen.screenshot({ path: fileURLToPath(new URL(`${name}-${theme}.png`, out)), animations: 'disabled' })
    console.log(`${name}-${theme}.png`)
  }
  await context.close()
}
await browser.close()
