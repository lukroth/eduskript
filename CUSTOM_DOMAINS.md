# Custom Domains Setup Guide

This guide explains how to set up custom domains for your Eduskript webpage.

## Overview

Custom domains allow users to access their content via their own domain name instead of the default subdomain. For example:

- **Default**: `cleversubdomain.eduskript.org/clevertopic/cleverchapter/cleverpage`
- **Custom Domain**: `teachingmaterials.io/clevertopic/cleverchapter/cleverpage`

## Architecture

### 1. Database Schema

The `CustomDomain` model stores domain mappings:

```prisma
model CustomDomain {
  id        String   @id @default(cuid())
  domain    String   @unique
  userId    String
  isActive  Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@map("custom_domains")
}
```

### 2. API Endpoints

#### `/api/user/custom-domains` (Protected)
- **GET**: List user's custom domains
- **POST**: Add a new custom domain

#### `/api/user/custom-domains/[id]` (Protected)
- **GET**: Get specific domain details
- **PATCH**: Update domain (activate/deactivate)
- **DELETE**: Remove domain

#### `/api/public/resolve-domain` (Public)
- **GET**: Resolve custom domain to subdomain
- Used by client-side routing logic

### 3. Client-Side Resolution

The `CustomDomainHandler` component:
1. Detects if the current hostname is a custom domain
2. Calls the resolution API
3. Redirects to the correct internal path if needed

## Setup Process

### For Users

1. **Add Custom Domain**
   - Go to Dashboard → Settings → Domains
   - Enter your domain (e.g., `teachingmaterials.io`)
   - Click "Add Domain"

2. **Configure DNS**
   - Add a CNAME record in your domain registrar:
     ```
     Type: CNAME
     Name: teachingmaterials.io (or @)
     Value: eduskript.org
     TTL: 300
     ```

3. **Activate Domain**
   - Wait for DNS propagation (up to 24 hours)
   - Return to the Domains settings
   - Toggle the domain to "Active"

4. **Test**
   - Visit your custom domain
   - Your content should load automatically

### For Platform Administrators

#### Environment Variables

```env
# Target for CNAME records
CUSTOM_DOMAIN_TARGET=eduskript.org
```

#### SSL Certificates

For production deployment, you'll need to handle SSL certificates for custom domains. This depends on your hosting platform:

**Vercel**: Automatic SSL for custom domains
**CloudFlare**: Use CloudFlare proxy for SSL
**Manual**: Use Let's Encrypt with wildcard certificates

#### DNS Verification (Optional)

You can implement DNS verification to automatically activate domains:

```typescript
// Example DNS verification function
async function verifyDNS(domain: string): Promise<boolean> {
  try {
    const dns = require('dns').promises
    const records = await dns.resolveCname(domain)
    return records.includes(process.env.CUSTOM_DOMAIN_TARGET)
  } catch {
    return false
  }
}
```

## Technical Implementation

### 1. Domain Resolution Flow

```mermaid
graph TD
    A[User visits custom domain] --> B[CustomDomainHandler detects hostname]
    B --> C[Check if hostname is custom domain]
    C --> D[Call /api/public/resolve-domain]
    D --> E{Domain found?}
    E -->|Yes| F[Get mapped subdomain]
    E -->|No| G[Continue normal routing]
    F --> H[Redirect to /{subdomain}/path]
    H --> I[Content loads with custom domain URL]
```

### 2. URL Structure

- **Custom Domain**: `teachingmaterials.io/topic/chapter/page`
- **Internal Path**: `/cleversubdomain/topic/chapter/page`
- **Database Lookup**: `teachingmaterials.io` → `cleversubdomain`

### 3. Navigation Handling

The breadcrumb and navigation components automatically adapt:
- On custom domains: Show relative URLs (`/topic/chapter`)
- On subdomains: Show full URLs (`/subdomain/topic/chapter`)

## Testing

### Local Testing

1. **Add test domain to database**:
   ```javascript
   // In Prisma Studio or test script
   await prisma.customDomain.create({
     data: {
       domain: 'teachingmaterials.io',
       userId: 'user-id',
       isActive: true
     }
   })
   ```

2. **Test API endpoint**:
   ```bash
   curl "http://localhost:3000/api/public/resolve-domain?domain=teachingmaterials.io"
   # Should return: {"isCustomDomain":true,"subdomain":"cleversubdomain","redirectPath":"/cleversubdomain"}
   ```

3. **Test client resolution**:
   - Modify your `/etc/hosts` file:
     ```
     127.0.0.1 teachingmaterials.io
     ```
   - Visit `http://teachingmaterials.io:3000`
   - Should redirect to content

## Troubleshooting

### Common Issues

1. **Domain not resolving**
   - Check DNS propagation: `dig teachingmaterials.io`
   - Verify CNAME points to correct target
   - Ensure domain is marked as active in database

2. **SSL certificate errors**
   - Check hosting platform SSL configuration
   - Verify domain is added to SSL certificate
   - Consider using CloudFlare proxy

3. **Infinite redirects**
   - Check CustomDomainHandler logic
   - Verify API endpoint returns correct data
   - Check for conflicting middleware rules

### Debug Commands

```bash
# Check domain resolution
curl "http://localhost:3000/api/public/resolve-domain?domain=teachingmaterials.io"

# Check DNS
dig teachingmaterials.io CNAME

# Test with custom host header
curl -H "Host: teachingmaterials.io" http://localhost:3000/topic/chapter/page
```

## Security Considerations

1. **Domain Verification**: Implement DNS verification before activation
2. **Rate Limiting**: Limit domain addition to prevent abuse
3. **Validation**: Strict domain format validation
4. **Ownership**: Ensure users can only add domains they control

## Production Deployment

### CleverCloud

1. **Environment Variables**:
   ```env
   CUSTOM_DOMAIN_TARGET=your-app.cleverapps.io
   ```

2. **DNS Configuration**:
   - Users point their CNAME to your CleverCloud app domain
   - CleverCloud handles SSL automatically for verified domains

### Vercel

1. **Add domains to project**:
   ```bash
   vercel domains add teachingmaterials.io
   ```

2. **Automatic SSL**: Vercel handles SSL certificates automatically

### Other Platforms

Consult your hosting platform's documentation for custom domain and SSL setup. 