// @ts-check
import { defineConfig } from 'astro/config'
import starlight from '@astrojs/starlight'

// https://starlight.astro.build/reference/configuration/
export default defineConfig({
  site: 'https://docs.mcpapi.one',
  integrations: [
    starlight({
      title: 'MCPAPI Docs',
      description: 'Every API your agent needs, through one MCP server and three tools.',
      logo: { light: './src/assets/logo.svg', dark: './src/assets/logo-dark.svg', replacesTitle: true },
      favicon: '/favicon.svg',
      customCss: ['./src/styles/theme.css'],
      social: [
        { icon: 'external', label: 'Open MCPAPI', href: 'https://mcpapi.one' },
        { icon: 'github', label: 'GitHub', href: 'https://github.com/cucoleadan/mcpapi-server' },
      ],
      // GitHub is the CMS: every page links to its Markdown file, and a push to main redeploys.
      editLink: { baseUrl: 'https://github.com/cucoleadan/mcpapi-server/edit/main/docs/' },
      lastUpdated: true,
      sidebar: [
        {
          label: 'Getting started',
          items: [{ label: 'What is MCPAPI?', slug: 'index' }, 'getting-started/first-api', 'getting-started/connect'],
        },
        {
          label: 'Using MCPAPI',
          items: [
            'using/apis-and-mcp-servers',
            'using/connections-and-approvals',
            'using/team-and-access',
            'using/agents-and-keys',
            'using/logs',
            'using/prompts',
          ],
        },
        { label: 'Reference', items: ['reference/tools', 'reference/authentication', 'reference/management-api', 'reference/limits'] },
        { label: 'Account', items: ['account/plans-and-credits'] },
      ],
    }),
  ],
})
