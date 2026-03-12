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

**CRITICAL SYNTAX:** The title MUST be on the SAME LINE as \`[!type]\`. Never put the title on a new line.

Syntax: \`> [!type] Title text here\` (title on same line!)
Collapsible: \`> [!type]- Title\` (closed) or \`> [!type]+ Title\` (open)

**Base types:** ${baseTypes.join(', ')}

**Aliases:** ${aliases.join(', ')}

**CORRECT examples:**
\`\`\`markdown
> [!tip] Pro Tip
> This is helpful information.

> [!warning] Wichtiger Hinweis
> Be careful with this.

> [!lernziele] Lernziele
> - Objective 1
> - Objective 2

> [!info]- Click to expand (starts collapsed)
> Hidden content here.
\`\`\`

**WRONG - DO NOT DO THIS:**
\`\`\`markdown
> [!tip]
> **Pro Tip**
> Content here.
\`\`\`
The title "Pro Tip" must be on the \`[!tip]\` line, not below it!`)

  // Code Editors
  sections.push(`## Interactive Code Editors

Syntax: \`\`\`language editor [options]\`\`\`

**Supported languages:** python, javascript, sql, java, cpp, go, rust, php, html, css, json, yaml, xml

**Options:**
- \`single\` - Hide file tabs for simple examples
- \`id="unique-id"\` - Persistent state across page loads
- \`db="database.db"\` - For SQL: specify database file
- \`solution="SELECT ..."\` - For SQL: expected solution query. Enables automatic pass/fail verification after each run. Multi-line solutions use \`\\n\` literals: \`solution="SELECT a, b\\nFROM t"\`

Examples:
\`\`\`markdown
\`\`\`python editor
print("Hello, World!")
\`\`\`

\`\`\`sql editor db="netflix.db"
SELECT * FROM movies LIMIT 10;
\`\`\`

\`\`\`sql editor db="chinook.db" solution="SELECT Name FROM Track"
-- Schreib deine Abfrage hier
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

**Basic markdown:** \`![alt text](image.png)\` — renders centered at full width

**With size/layout control:** Use HTML \`<img>\` tags with \`style\` and \`data-*\` attributes:

\`\`\`html
<img src="image.png" alt="Description" style="width: 50%" />

<img src="image.png" alt="Left-aligned" style="width: 40%" data-align="left" />

<img src="image.png" alt="Floated left with text wrap" style="width: 40%" data-align="left" data-wrap="true" />
\`\`\`

**Attributes:**
- \`style="width: X%"\` — Image width (percentage)
- \`data-align="left|center|right"\` — Alignment (default: center)
- \`data-wrap="true"\` — Float image so text wraps around it
- \`data-invert="dark|light|always"\` — Invert colors (useful for diagrams)
- \`data-saturate="70"\` — Saturation adjustment when inverted

**Do NOT use** the \`{width=;align=}\` attribute syntax — it is not implemented.

Excalidraw diagrams: Reference \`.excalidraw\` files directly. The system auto-detects light/dark SVG variants.`)

  // Videos
  sections.push(`## Videos (Mux)

Reference video files by name. The system looks up the corresponding \`.json\` metadata file for Mux playback.

\`![Video description](lecture.mp4)\``)

  // Tabs
  sections.push(`## Tabs

Create tabbed content using HTML elements (markdown inside tabs is supported):

\`\`\`markdown
<tabs-container data-items='["Python", "JavaScript"]'>
<tab-item>

\`\`\`python
print("Hello")
\`\`\`

</tab-item>
<tab-item>

\`\`\`javascript
console.log("Hello");
\`\`\`

</tab-item>
</tabs-container>
\`\`\`

**IMPORTANT:** Each tab's content goes inside \`<tab-item>\` tags. The \`data-items\` array defines tab labels in order. Leave blank lines around markdown content inside tabs.`)

  // Quiz
  sections.push(`## Quizzes

Interactive multiple choice using \`<Question>\` and \`<Option>\` HTML tags:

\`\`\`markdown
<Question id="q1" type="single">
<Option correct="true">4</Option>
<Option feedback="Too low">3</Option>
<Option feedback="Too high">5</Option>
</Question>
\`\`\`

**Question attributes:**
- \`id="unique-id"\` — Optional, auto-generated if omitted
- \`type="single"\` — Single choice (default)

**Option attributes:**
- \`correct="true"\` — Marks the correct answer
- \`feedback="..."\` — Shown when this wrong option is selected

**Do NOT use** the \`:::quiz\` fence syntax — it is not implemented.`)

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

**Callouts:** \`> [!type] Title on same line\` - CRITICAL: title MUST be on same line as [!type]
  - Types: ${baseTypes.join(', ')}
  - Aliases: lernziele→success, hint→tip, exercise→abstract
  - Collapsible: \`> [!type]-\` (closed) or \`> [!type]+\` (open)
  - WRONG: \`> [!tip]\\n> **Title**\` - NEVER put title on new line!

**Code Editors:** \`\`\`language editor [single] [id="x"] [db="file.db"] [solution="SELECT ..."]\`\`\`
  - Languages: python, javascript, sql, java, cpp, go, rust, etc.
  - \`solution="SELECT ..."\`: SQL only — shows pass/fail after each run. Multi-line: use \`\\n\` literals inside the quotes.

**Math:** \`$inline$\` and \`$$display$$\` (KaTeX)

**Images:** \`![alt](img.png)\` or \`<img src="img.png" alt="alt" style="width: 50%" data-align="left" data-wrap="true" />\`

**Tabs:** HTML syntax only:
  \`<tabs-container data-items='["Tab1", "Tab2"]'><tab-item>Content1</tab-item><tab-item>Content2</tab-item></tabs-container>\`

**Quiz:** \`<Question id="q1" type="single"><Option correct="true">Right</Option><Option feedback="Nope">Wrong</Option></Question>\`
  - Use \`correct="true"\` to mark the correct answer
  - Do NOT use \`:::quiz\` syntax — it is not implemented`
}
