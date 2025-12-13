# Logging System

Debug-style namespaced logging inspired by the `debug` npm package pattern used by Express, Socket.io, etc.

## Overview

The logging system provides zero-overhead logging that can be enabled per-subsystem at runtime. When disabled, log calls have minimal performance impact.

**Location**: `src/lib/logger.ts`

## Usage

```typescript
import { createLogger } from '@/lib/logger'

const log = createLogger('annotations:layer')

// Basic logging (same as debug level)
log('Canvas update', { viewMode, dataLength: 123 })

// Different log levels
log.debug('Debug info')
log.info('Information')
log.warn('Warning message')
log.error('Error occurred', error)  // Always shown, regardless of debug setting
```

## Enabling Logging

### Browser (localStorage)

```javascript
// In browser console:
localStorage.setItem('debug', 'annotations:*')
// Then refresh the page

// Or use the helper functions (exposed on window):
enableDebug('annotations:*')
disableDebug()
```

### Server (Environment Variable)

```bash
# In .env or deployment config:
DEBUG=annotations:*

# Or when running locally:
DEBUG=annotations:* pnpm dev
```

## Pattern Matching

Patterns support glob-style wildcards:

| Pattern | Description |
|---------|-------------|
| `annotations:*` | All annotation logs |
| `userdata:*` | All user data logs |
| `*` | Everything (verbose!) |
| `annotations:layer,userdata:sync` | Specific namespaces only |

## Log Levels

| Level | Behavior |
|-------|----------|
| `log()` / `debug()` | Only shown if namespace is enabled |
| `info()` | Only shown if namespace is enabled |
| `warn()` | Only shown if namespace is enabled |
| `error()` | **Always shown** regardless of debug setting |

## Color Coding

In the browser, each subsystem gets a consistent color based on its base namespace:
- `annotations:layer` and `annotations:toolbar` share the same color (both start with `annotations`)
- Colors cycle through a palette of 10 distinct colors

Server logs use plain text format for compatibility with log aggregators.

## Current Namespaces

| Namespace | Used In | Description |
|-----------|---------|-------------|
| `annotations:layer` | annotation-layer.tsx | Canvas operations, sync, layers |
| `annotations:toolbar` | annotation-toolbar.tsx | Toolbar interactions |
| `userdata:provider` | provider.tsx | User data context, auth |
| `userdata:sync` | sync-engine.ts | Cloud sync operations |

## Adding New Loggers

1. Import and create a logger at the top of your file:
   ```typescript
   import { createLogger } from '@/lib/logger'
   const log = createLogger('myfeature:component')
   ```

2. Use the logger throughout your code:
   ```typescript
   log('Operation started', { param1, param2 })
   log.error('Failed to process', error)
   ```

3. Enable it during development:
   ```javascript
   enableDebug('myfeature:*')
   ```

## Best Practices

- Use hierarchical namespaces: `feature:subfeature` (e.g., `annotations:layer`)
- Log at the start and end of async operations
- Include relevant context as the second argument
- Use `log.error()` for actual errors (it's always shown)
- Don't log sensitive data (passwords, tokens, etc.)
