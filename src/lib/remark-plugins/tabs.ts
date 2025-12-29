import type { Root } from 'mdast'

/**
 * Remark plugin for tabs (placeholder)
 *
 * This plugin is a placeholder for potential future markdown tabs syntax.
 * Currently, users write tabs directly as HTML:
 *
 * ```html
 * <tabs-container data-items='["Tab 1", "Tab 2"]'>
 * <tab-item>
 *
 * Content for tab 1
 *
 * </tab-item>
 * <tab-item>
 *
 * Content for tab 2
 *
 * </tab-item>
 * </tabs-container>
 * ```
 *
 * This HTML is parsed by rehype-raw and mapped to React components
 * via the markdown-components factory.
 *
 * Future: Could implement a markdown-native tabs syntax like:
 * ```tabs
 * Tab 1 | Tab 2
 * ---
 * Content 1
 * ===
 * Content 2
 * ```
 */
export function remarkTabs() {
  return function transformer(_tree: Root) {
    // No-op: tabs are now written as raw HTML and handled by rehype-raw
    // This plugin is kept as a placeholder for future markdown tabs syntax
  }
}
