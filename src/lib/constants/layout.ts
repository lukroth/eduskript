/**
 * Layout constants for consistent sizing across the application
 */

export const LAYOUT = {
  // Sidebar widths (in pixels)
  SIDEBAR_WIDTH_EXPANDED: 320, // w-80 = 20rem = 320px
  SIDEBAR_WIDTH_COLLAPSED: 64,  // w-16 = 4rem = 64px

  // Breakpoints (matching Tailwind defaults)
  BREAKPOINT_LG: 1024, // lg: breakpoint where sidebar becomes always visible
} as const
