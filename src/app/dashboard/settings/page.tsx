import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CustomDomains } from '@/components/dashboard/custom-domains'
import { ProfileSettings } from '@/components/dashboard/profile-settings'
import { PageSettings } from '@/components/dashboard/page-settings'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user) {
    return null
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">
          Settings
        </h1>
        <p className="text-muted-foreground mt-2">
          Manage your account and domain settings
        </p>
      </div>

      <div className="grid gap-6">
        <ProfileSettings />
        
        <PageSettings />

        <Card>
          <CardHeader>
            <CardTitle>Custom Domains</CardTitle>
            <CardDescription>
              Connect your own domain to make your content accessible at your custom URL
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CustomDomains />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
