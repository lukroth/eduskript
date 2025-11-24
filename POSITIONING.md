# Positioning & Coordinate Systems in Eduskript

This document explains how positioning and coordinate transformations work in the Eduskript annotation system.

## Overview

The annotation layer uses CSS transforms for zoom and pan. We've taken over pointer events to prevent default pinch zoom, treating the article like a canvas that users can move around and zoom into, while keeping the toolbar floating fixed.

---

## Simplified Architecture

### DOM Structure

```
<div> (root layout, min-h-screen)
├── Sidebar (fixed, left, w-80 or w-16 collapsed)
└── <div> (main content wrapper, lg:ml-80 or lg:ml-16)
    └── <main> (has CSS transform for zoom/pan)
        └── #paper.paper-responsive (responsive width, centered, has all padding)
            ├── Canvas (portaled, position: absolute, inset: 0)
            ├── Preview Banner (optional)
            └── <article class="prose-theme">
                └── Content (markdown)
```

### The Two Key Elements

#### 1. `#paper` - The Canvas Container (RESPONSIVE)

**Purpose:** The paper is both the canvas boundary AND the content container. It's responsive and centered.

**CSS (globals.css):**
```css
.paper-responsive {
  max-width: 1280px;
  width: calc(100vw - var(--sidebar-width, 0px));
  position: relative;
  @apply px-48;  /* Combined padding for canvas boundary + text readability */
}

/* Responsive padding */
@media (max-width: 1280px) { @apply px-32; }
@media (max-width: 1024px) { @apply px-16; }
@media (max-width: 768px)  { @apply px-8; }
```

**Behavior:**
- Responsive width: `calc(100vw - sidebar)` with `max-width: 1280px`
- Centered with `mx-auto`
- Contains all padding (combined canvas boundary + text readability)
- Canvas is portaled directly into it with `position: absolute; inset: 0`

#### 2. `.prose-theme` - Just Content Styling

**Purpose:** Simple text styling, no layout logic.

```css
.prose-theme {
  @apply max-w-none;
  color: hsl(var(--prose-text));
}
```

### Canvas Alignment

The canvas is rendered via React portal directly into `#paper`:

```tsx
{paperElement && createPortal(
  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
    <SimpleCanvas width={paperWidth} height={pageHeight} ... />
  </div>,
  paperElement
)}
```

**Result:**
- Canvas always matches `#paper` bounds exactly
- No offset calculations needed
- Content and canvas left edges always aligned
- When viewport resizes → paper resizes → canvas resizes → strokes redraw

---

## The Main Transform

The `<main>` element has a CSS transform applied:

```typescript
mainRef.current.style.transform = `scale(${zoom}) translate(${panX}px, ${panY}px)`
mainRef.current.style.transformOrigin = 'top center'
```

This transform affects **everything** inside main, including paper and canvas.

## Critical CSS Quirk: Fixed Positioning in Transformed Containers

**Important:** When an element has `position: fixed` inside a parent with CSS transforms, it positions relative to the transformed ancestor, NOT the viewport.

---

## Coordinate Spaces

### 1. Viewport Coordinates
- What you get from mouse events: `e.clientX`, `e.clientY`
- Relative to the browser viewport
- Not affected by CSS transforms

### 2. Screen/Transformed Coordinates
- What `getBoundingClientRect()` returns on transformed elements
- Includes the zoom transform
- If zoom is 1.5x, a 100px element has `rect.width = 150`

### 3. Logical Coordinates
- The "natural" size before transforms
- For canvas: the internal width/height
- For overlays: coordinates divided by zoom

---

## Pan/Zoom Behavior

### Horizontal Panning

Since `#paper` is responsive and centered by CSS:
- At zoom 1.0: Paper fits in viewport, no horizontal pan needed
- At zoom > 1.0: Scaled paper may be wider, allow panning

```typescript
const calculateHorizontalLimit = (newPanX, newZoom) => {
  // If paper fits, keep centered
  if (transformedWidth <= availableWidth) {
    return centeringPanX
  }
  // If paper is wider (zoomed), allow panning
  return clamp(minPanX, maxPanX, newPanX)
}
```

### Vertical Panning
- Page can be taller than viewport
- Constrain so top doesn't go below viewport top
- Constrain so bottom doesn't go above viewport bottom

---

## Summary

The simplified architecture:
1. `#paper` is responsive (not fixed width)
2. `#paper` has all the padding
3. Canvas is portaled into `#paper` with `inset: 0`
4. `.prose-theme` is just styling, no layout logic
5. Centering is handled by CSS (`mx-auto`), not JavaScript
6. JavaScript only handles pan limits when zoomed in

---

## Related Files

- `src/components/annotations/annotation-layer.tsx` - Main zoom/pan transform, canvas portal
- `src/components/annotations/simple-canvas.tsx` - Canvas rendering
- `src/app/globals.css` - `.paper-responsive` class
- `src/app/[domain]/.../page.tsx` - `#paper` element
