import { codeToHtml, BundledLanguage } from 'shiki'

let highlighterPromise: Promise<void> | null = null

// Preload Shiki (call this on app init)
export async function preloadShiki() {
  if (!highlighterPromise) {
    highlighterPromise = Promise.resolve()
  }
  return highlighterPromise
}

export async function highlightCode(
  code: string,
  language: string,
  theme: 'light' | 'dark' = 'light'
): Promise<string> {
  try {
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

    const html = await codeToHtml(code, {
      lang: mappedLang,
      themes: {
        light: 'github-light',
        dark: 'github-dark',
      },
      defaultColor: theme,
      transformers: [
        // Support for line highlighting, additions, deletions, and focus
        {
          name: 'eduskript-transforms',
          line(node, line) {
            // Check for line annotations in comments
            const code = node.children
              .map((child: any) => ('value' in child ? child.value : ''))
              .join('')

            // Highlight: // [!code highlight]
            if (code.includes('[!code highlight]')) {
              this.addClassToHast(node, 'highlighted')
            }
            // Addition: // [!code ++]
            else if (code.includes('[!code ++]')) {
              this.addClassToHast(node, 'diff add')
            }
            // Deletion: // [!code --]
            else if (code.includes('[!code --]')) {
              this.addClassToHast(node, 'diff remove')
            }
            // Focus: // [!code focus]
            else if (code.includes('[!code focus]')) {
              this.addClassToHast(node, 'focused')
            }
          },
        },
      ],
    })

    return html
  } catch (error) {
    console.error('Shiki highlighting error:', error)
    // Fallback to plain code
    return `<pre class="shiki"><code>${escapeHtml(code)}</code></pre>`
  }
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
