/**
 * Auto-generated syntax reference for the AI assistant.
 * Pulls from actual plugin implementations to stay in sync.
 */

import { calloutTypes } from '@/lib/remark-plugins/callouts'

/**
 * Generates markdown syntax documentation for the AI assistant.
 * This ensures the AI always knows about current supported features.
 */
export function generateSyntaxReference(): string {
  const sections: string[] = []

  // Callouts
  const baseTypes = Object.entries(calloutTypes)
    .filter(([key, value]) => key === value)
    .map(([key]) => key)

  const aliases = Object.entries(calloutTypes)
    .filter(([key, value]) => key !== value)
    .map(([alias, base]) => `${alias} → ${base}`)

  sections.push(`## Callouts (Obsidian-style)

Syntax: \`> [!type] Title\` or \`> [!type]- Title\` (collapsible, closed) or \`> [!type]+ Title\` (collapsible, open)

**Base types:** ${baseTypes.join(', ')}

**Aliases:** ${aliases.join(', ')}

Example:
\`\`\`markdown
> [!tip] Pro Tip
> This is helpful information.

> [!warning]- Click to expand
> Hidden content here.

> [!lernziele] Lernziele
> - Objective 1
> - Objective 2
\`\`\``)

  // Code Editors
  sections.push(`## Interactive Code Editors

Syntax: \`\`\`language editor [options]\`\`\`

**Supported languages:** python, javascript, sql, java, cpp, go, rust, php, html, css, json, yaml, xml

**Options:**
- \`single\` - Hide file tabs for simple examples
- \`id="unique-id"\` - Persistent state across page loads
- \`db="database.db"\` - For SQL: specify database file

Examples:
\`\`\`markdown
\`\`\`python editor
print("Hello, World!")
\`\`\`

\`\`\`sql editor db="netflix.db"
SELECT * FROM movies LIMIT 10;
\`\`\`

\`\`\`javascript editor single
console.log("Simple example");
\`\`\`
\`\`\``)

  // Math
  sections.push(`## Math (KaTeX)

**Inline math:** \`$expression$\`
**Display math:** \`$$expression$$\`

Examples:
- Inline: \`The formula $E = mc^2$ is famous.\`
- Display:
\`\`\`markdown
$$
\\sum_{i=1}^{n} i = \\frac{n(n+1)}{2}
$$
\`\`\``)

  // Images
  sections.push(`## Images

**Basic:** \`![alt text](image.png)\`
**With attributes:** \`![alt text](image.png){width=50%;align=center}\`

**Alignment options:** left, center, right
**Width:** Any CSS value (50%, 200px, etc.)
**Wrap:** \`{wrap=true;align=left}\` for text wrapping

Excalidraw diagrams: Reference \`.excalidraw\` files directly. The system auto-detects light/dark SVG variants.`)

  // Videos
  sections.push(`## Videos (Mux)

Reference video files by name. The system looks up the corresponding \`.json\` metadata file for Mux playback.

\`![Video description](lecture.mp4)\``)

  // Tabs
  sections.push(`## Tabs

Create tabbed content sections:

\`\`\`markdown
:::tabs
::tab[Python]
\`\`\`python
print("Hello")
\`\`\`
::tab[JavaScript]
\`\`\`javascript
console.log("Hello");
\`\`\`
:::
\`\`\``)

  // Quiz
  sections.push(`## Quizzes

Interactive multiple choice:

\`\`\`markdown
:::quiz
What is 2 + 2?
- [ ] 3
- [x] 4
- [ ] 5
:::
\`\`\``)

  return sections.join('\n\n')
}

/**
 * Get a condensed version for token-constrained contexts.
 */
export function getCondensedSyntaxReference(): string {
  const baseTypes = Object.entries(calloutTypes)
    .filter(([key, value]) => key === value)
    .map(([key]) => key)

  return `## Supported Markdown Syntax

**Callouts:** \`> [!type]\` where type is: ${baseTypes.join(', ')}
  - Aliases: lernziele→success, hint→tip, exercise→abstract, etc.
  - Collapsible: \`> [!type]-\` (closed) or \`> [!type]+\` (open)

**Code Editors:** \`\`\`language editor [single] [id="x"] [db="file.db"]\`\`\`
  - Languages: python, javascript, sql, java, cpp, go, rust, etc.

**Math:** \`$inline$\` and \`$$display$$\` (KaTeX)

**Images:** \`![alt](img.png){width=50%;align=center;wrap=true}\`

**Tabs:** \`:::tabs\` with \`::tab[Name]\` sections

**Quiz:** \`:::quiz\` with \`- [ ]\` wrong and \`- [x]\` correct options`
}
