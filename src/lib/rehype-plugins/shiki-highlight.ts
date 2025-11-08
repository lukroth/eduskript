import { visit } from 'unist-util-visit'
import { codeToHtml, BundledLanguage } from 'shiki'

interface ShikiOptions {
  theme?: 'light' | 'dark'
}

/**
 * Rehype plugin to highlight code blocks with Shiki
 * Supports transforms: highlight, add, remove, focus
 */
export function rehypeShikiHighlight(options: ShikiOptions = {}) {
  const { theme = 'light' } = options

  return async function transformer(tree: any) {
    const nodesToHighlight: Array<{ node: any; code: string; lang: string }> = []

    // Collect all code blocks
    visit(tree, 'element', (node: any) => {
      if (node.tagName !== 'pre') return

      const codeElement = node.children?.find(
        (child: any) => child.tagName === 'code'
      )

      if (!codeElement) return

      // Extract language from className
      const className = codeElement.properties?.className || []
      const langClass = className.find((cls: string) =>
        cls.startsWith('language-')
      )

      if (!langClass) return

      const lang = langClass.replace('language-', '')
      const code = extractText(codeElement)

      nodesToHighlight.push({ node, code, lang })
    })

    // Highlight all code blocks
    await Promise.all(
      nodesToHighlight.map(async ({ node, code, lang }) => {
        try {
          const html = await highlightWithShiki(code, lang, theme)

          // Replace the pre node with a div that will render the HTML
          node.tagName = 'div'
          node.properties = {
            ...node.properties,
            'data-language': lang,
            'data-highlighted': 'true',
            'data-shiki-html': html, // Store the HTML in a data attribute
            'data-raw-code': code, // Store the raw code for copy functionality
          }
          // Remove children since we'll render from data-shiki-html
          node.children = []
        } catch (error) {
          console.error(`Failed to highlight ${lang}:`, error)
          // Keep original code block on error
        }
      })
    )
  }
}

async function highlightWithShiki(
  code: string,
  language: string,
  theme: 'light' | 'dark'
): Promise<string> {
  // Map common language aliases
  const langMap: Record<string, BundledLanguage> = {
    js: 'javascript',
    ts: 'typescript',
    py: 'python',
    rb: 'ruby',
    sh: 'bash',
    yml: 'yaml',
  }

  const mappedLang = (langMap[language] || language) as BundledLanguage

  try {
    const html = await codeToHtml(code, {
      lang: mappedLang,
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: theme,
      transformers: [
        {
          name: 'eduskript-line-transforms',
          line(node, line) {
            // Extract text content from line
            const lineText = node.children
              .map((child: any) => ('value' in child ? child.value : ''))
              .join('')

            // Line highlighting: // [!code highlight]
            if (lineText.includes('[!code highlight]')) {
              node.properties = node.properties || {}
              node.properties.class = `${node.properties.class || ''} line-highlight`.trim()
            }
            // Line addition: // [!code ++]
            else if (lineText.includes('[!code ++]')) {
              node.properties = node.properties || {}
              node.properties.class = `${node.properties.class || ''} line-diff line-add`.trim()
            }
            // Line deletion: // [!code --]
            else if (lineText.includes('[!code --]')) {
              node.properties = node.properties || {}
              node.properties.class = `${node.properties.class || ''} line-diff line-remove`.trim()
            }
            // Line focus: // [!code focus]
            else if (lineText.includes('[!code focus]')) {
              node.properties = node.properties || {}
              node.properties.class = `${node.properties.class || ''} line-focus`.trim()
            }
          },
        },
      ],
    })

    return html
  } catch (error) {
    // Fallback for unsupported languages
    return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`
  }
}

function extractText(node: any): string {
  if (node.type === 'text') {
    return node.value
  }
  if (node.children) {
    return node.children.map(extractText).join('')
  }
  return ''
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, (m) => map[m])
}
