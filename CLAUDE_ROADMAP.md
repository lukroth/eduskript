# Permission Management UX & Marketplace Roadmap

## 🚀 Phase 1: Enhanced Permission UX (After Reorder Fix)

### 1. Access Management Dashboard for Collections
- [x] **Collection-level permission overview** showing who has access to what
- [x] **Clean up the old permission matrix** we no longer use it and went for a simpler UI
- [x] **Individual skript permission settings** use the same interface as collections
- [x] **Edge case**: when removing access to a skript or collection, the removed user will still see them in their page builder but without title. we should instead display a placeholder that says "Your access was revoked. This content can no longer be displayed on your page." on the user's page, we should then no longer display that script or collection!

## 🏪 Phase 2: Marketplace Foundation

### Extended Permission Model
Customers are basically a viewer with a different name and symbol.

```
Current: editor | viewer
Future:  editor | viewer | customer
```

Editors can mark their skripts or collections as "for sale" and set a price, or give them for free.

We'll need to implement a new feature for viewers and customers to be able to create a copy of the skript or collection they have access to that they can edit. We'll then need a cyclical tracking of whether the original has been updated / edited and a mechanism to offer users who copied it a diff-editor to compare changes and merge updates.

We'll integrate a payment provider that handles transactions for purchased content.

We'll need a license agreement that clearly states the uploader must have the right to sell their content.

## 🔒 Security Model: No-Access-By-Default + Ownership Transfer

**Key Principle**: Being a "collaborator" only establishes a relationship - it does NOT grant content access.

**Permission Structure**:
- Junction tables manage permissions: `CollectionAuthor`, `SkriptAuthor`, `PageAuthor`
- `permission = "author"` = edit rights (can modify content)
- `permission = "viewer"` = view rights (read-only access)

**Drag-and-Drop Permission Model**:
- **"Ownership Transfer"** approach (like Google Drive/Dropbox)
- Moving requires edit permissions on BOTH source AND target
- Users automatically get edit rights on moved content if they don't have them
- View-only content cannot be dragged (prevents content theft)

**Access Flow**:
1. Teachers become "collaborators" (partnership established)
2. Content owners explicitly share specific collections/skripts
3. Collaborators can only see content they've been given access to
4. When moving content, automatic permission granting ensures proper ownership
5. Default permission for new content: `none` (no access)

**Benefits**:
- ✅ Privacy by default
- ✅ Granular control over content sharing
- ✅ Secure content movement with automatic permission management
- ✅ Clear audit trail of what's been shared and moved
- ✅ Scalable for marketplace (customers only see purchased content)

## 📝 Implementation Priority

1. **Immediate**: Build access management dashboard for existing collaborators
2. **Next**: Add bulk permission assignment tools
3. **Then**: Create marketplace foundation (customer relationships)
4. **Future**: Advanced analytics and revenue sharing

---
*Last updated: 2025-08-30*
*Current Status: Page builder and dashboard UX are complete and production-ready. Ready for Phase 1 permission UX enhancements and collaboration dashboard features.*