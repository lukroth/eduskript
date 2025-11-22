# Eduskript - Modern Education Platform

A comprehensive, multi-tenant education platform built with Next.js, TypeScript, Prisma, and NextAuth. Eduskript allows teachers to create and manage educational content using markdown with advanced features like versioning, LaTeX math, and syntax highlighting.

## Quick Start

Get started in under 2 minutes:

```bash
# Clone the repository
git clone https://github.com/marcchehab/eduskript.git
cd eduskript

# Install dependencies
pnpm install

# Setup development environment (auto-configures PostgreSQL + Next.js with unique ports)
pnpm setup

# Start the development server
pnpm dev
```

The setup script will:
- ✅ Find available ports for PostgreSQL (5432-5532) and Next.js (3000-3100)
- ✅ Create `.env.local` with worktree-specific configuration
- ✅ Start PostgreSQL in Docker with a unique container name
- ✅ Run database migrations
- ✅ Seed the admin user (`eduadmin@eduskript.org` / `letseducate`)

**Worktree Support**: Each worktree gets unique ports automatically - run multiple feature branches simultaneously without conflicts!

## Recent Updates (2025-11-22)

### ✅ Worktree-Safe Development Setup
- **Automatic port detection** - No more port collision issues when running multiple worktrees
- **One-command setup** - `pnpm setup` handles everything: PostgreSQL, migrations, seeding
- **Unique containers** - Each worktree gets its own PostgreSQL container and volume
- **Developer-friendly** - Clear output, helpful error messages, idempotent script

### ✅ Simplified Routing Architecture
- **Removed subdomain routing** - Simplified to path-based routing only (`eduskript.org/username/...`)
- **Database migration** - Renamed `User.subdomain` → `User.username`
- **Removed custom domain support** - Cleaner architecture focused on core functionality
- **Updated 56+ files** - Complete migration across database, API, UI, tests, and documentation

### ✅ Enhanced Seed Data
- **User-friendly seeding** - No longer creates dummy users, only content for current user
- **Auto-refresh** - Content library automatically refreshes after seeding (no manual page reload)
- **Simplified workflow** - New users can quickly get started with example algebra content

## MVP

- [x] persistent file hosting
- [x] ~~subdomain routing~~ Replaced with username-based path routing (`eduskript.org/username/...`)
   - [x] change structure vocabulary to the following: a user has a "webpage" that they can describe in their settings (change that). on this webpage, they have several "collections" (current called "scripts", so rename that) that have "skripts" which contain "pages".
   - [x] ~~custom domain support~~ Removed in favor of simpler path-based routing
- [x] username-based routing fully implemented
- [ ] sign up for teachers using email verification
- [ ] transfer old components

## Preference
- [ ] student/class handling
   - [ ] crypto logic
   - [ ] sign up invite
   - [ ] data service
- [ ] infrastructure for paid components
