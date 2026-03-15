# Future Feature: MDX Mode (Opt-in)

## Background

Eduskript previously used MDX for content rendering, which allowed JavaScript expressions and imports directly in markdown. This was removed due to security concerns - MDX allows arbitrary JavaScript execution, making it unsuitable for user-generated content.

The current pipeline uses a safe remark/rehype approach that:
- Parses markdown and raw HTML
- Sanitizes content to block XSS vectors
- Maps HTML elements to React components
- **Does not execute any JavaScript from content**

## Proposed Feature: MDX as Opt-in

For trusted organizations (schools with verified teachers), MDX could be re-enabled as an opt-in feature.

### Use Cases

1. **Advanced interactivity**: Teachers writing custom React components inline
2. **Dynamic content**: Computed values, conditional rendering
3. **Complex widgets**: Components that need JavaScript logic

### Security Model

```
┌─────────────────────────────────────────────────────────────┐
│  Organization Settings                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Content Pipeline                                           │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ● Safe Mode (Default)                               │   │
│  │   Standard markdown with sanitized HTML.            │   │
│  │   No code execution - safe for all content.         │   │
│  │                                                     │   │
│  │ ○ MDX Mode (Advanced)                               │   │
│  │   Full MDX with JavaScript expressions.             │   │
│  │   ⚠️ Only enable if you trust ALL content authors.  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Requirements for Implementation

1. **Database field**: `Organization.contentPipeline` enum (SAFE, MDX)
2. **Dual pipeline**: Both `compileMarkdown()` and `compileMDX()` available
3. **Pipeline selector**: Check org setting when rendering content
4. **Warning modal**: Clear security warning when enabling MDX
5. **Audit logging**: Track who enables/disables MDX mode

### Security Warnings

When MDX is enabled:
- Authors can execute arbitrary JavaScript in viewers' browsers
- Authors can access cookies, session tokens, localStorage
- Authors can make network requests as the viewer
- Compromised author accounts become full XSS vectors

### Syntax Comparison

**Safe mode (current):**
```markdown
<question id="q1" type="multiple" showfeedback="true">
  What is 2+2?
  <answer correct="true">4</answer>
  <answer>5</answer>
</question>
```

**MDX mode (future):**
```mdx
<Question id="q1" type="multiple" showFeedback={true}>
  What is 2+2?
  <Option correct>4</Option>
  <Option>5</Option>
</Question>

{/* Dynamic content possible */}
{Math.random() > 0.5 ? <Hint /> : null}
```

### Implementation Priority

**Low priority** - The safe pipeline covers most use cases. MDX should only be considered if there's strong demand from trusted institutions with specific advanced needs.

### Alternative Approaches

Before implementing MDX, consider these safer alternatives:

1. **More built-in components**: Add commonly-requested features as first-class components
2. **Sandboxed plugins**: Per-org plugin choice via iframe sandboxing
3. **Declarative templates**: Config-based component customization without code execution
