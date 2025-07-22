import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { DomainSettings } from '@/components/dashboard/domain-settings'
import { ProfileSettings } from '@/components/dashboard/profile-settings'

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

        <Card>
          <CardHeader>
            <CardTitle>Account Statistics</CardTitle>
            <CardDescription>
              Overview of your content and usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              Account statistics will be displayed here
            </div>
          </CardContent>
        </Card>
      </div>

      <DomainSettings />
    </div>
  )
}
