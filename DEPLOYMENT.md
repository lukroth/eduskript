# Eduscript Deployment on CleverCloud

This guide explains how to deploy the Eduscript platform on CleverCloud with pnpm support.

## Prerequisites

1. CleverCloud account
2. Git repository connected to CleverCloud
3. PostgreSQL addon created on CleverCloud

## Environment Variables

Set these environment variables in your CleverCloud console:

### pnpm Configuration
```bash
CC_NODE_BUILD_TOOL="custom"
CC_PRE_BUILD_HOOK="npm install -g pnpm"
CC_CUSTOM_BUILD_TOOL="pnpm install && pnpm build"
CC_RUN_COMMAND="pnpm start"
```

### Node.js Configuration
```bash
NODE_ENV="production"
CC_NODE_DEV_DEPENDENCIES="ignore"
```

### Database Configuration
```bash
DATABASE_URL="postgresql://username:password@host:port/database"
```
(Use the connection string from your PostgreSQL addon)

### NextAuth Configuration
```bash
NEXTAUTH_SECRET="your-super-secret-production-key"
NEXTAUTH_URL="https://app_your-app-id.cleverapps.io"
```

### File Upload Configuration
```bash
UPLOAD_DIR="./public/uploads"
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES="jpg,jpeg,png,gif,webp,svg,pdf,doc,docx,txt,md,zip,mp4,mp3,wav"
```

## Deployment Steps

1. **Connect your GitHub repository** to CleverCloud
2. **Create a PostgreSQL addon** and note the connection details
3. **Set the environment variables** listed above in the CleverCloud console
4. **Deploy by pushing to main branch** - CleverCloud will automatically:
   - Install pnpm globally
   - Run `pnpm install`
   - Run `pnpm build`
   - Apply database schema with `pnpm run db:push`
   - Start the application with `pnpm start`

## Local Development

For local development, use the PostgreSQL database:

```bash
# Install dependencies
pnpm install

# Push database schema
pnpm run db:push

# Start development server
pnpm dev
```

## Multi-tenant Domain Management

The platform supports custom domains for teachers through the CleverCloud API. Teachers can add custom domains through the dashboard, which will be automatically configured.

## File Structure

```
eduscript/
├── src/                    # Next.js application source
├── prisma/                 # Database schema and migrations
├── clevercloud/           # CleverCloud configuration
│   └── node.json          # CleverCloud runtime configuration
├── .env                   # Local environment variables
├── .env.clevercloud       # CleverCloud environment template
└── package.json           # Dependencies and scripts
```

## Troubleshooting

### Build Issues
- Check that all environment variables are set in CleverCloud console
- Verify pnpm configuration variables are correct
- Check build logs in CleverCloud console

### Database Issues
- Ensure DATABASE_URL is correct and accessible
- Check PostgreSQL addon status
- Verify database schema is applied with `pnpm run db:push`

### Domain Issues
- Verify custom domains are properly configured in CleverCloud
- Check DNS settings for custom domains
- Ensure SSL certificates are valid
