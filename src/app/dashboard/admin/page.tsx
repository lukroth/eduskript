'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Tabs } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Pencil, Trash2, RotateCw } from 'lucide-react'

interface OAuthAccount {
  id: string
  provider: string
  providerAccountId: string
}

interface User {
  id: string
  email: string
  name: string
  subdomain: string
  title: string | null
  isAdmin: boolean
  requirePasswordReset: boolean
  emailVerified: Date | null
  createdAt: Date
  updatedAt: Date
  accounts: OAuthAccount[]
}

export default function AdminPanelPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [seeding, setSeeding] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    subdomain: '',
    title: '',
    password: '',
    isAdmin: false,
    requirePasswordReset: true,
  })

  const [resetPasswordData, setResetPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
    requirePasswordReset: true,
  })

  // Check if user is admin
  useEffect(() => {
    if (session && !session.user.isAdmin) {
      router.push('/dashboard')
    }
  }, [session, router])

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/users')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch users')
      }

      setUsers(data.users)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user.isAdmin) {
      fetchUsers()
    }
  }, [session])

  // Create user
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      setSuccess('User created successfully')
      setShowCreateDialog(false)
      setFormData({
        email: '',
        name: '',
        subdomain: '',
        title: '',
        password: '',
        isAdmin: false,
        requirePasswordReset: true,
      })
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  // Update user
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          name: formData.name,
          subdomain: formData.subdomain,
          title: formData.title || null,
          isAdmin: formData.isAdmin,
          requirePasswordReset: formData.requirePasswordReset,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user')
      }

      setSuccess('User updated successfully')
      setShowEditDialog(false)
      setSelectedUser(null)
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  // Delete user
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }

    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user')
      }

      setSuccess('User deleted successfully')
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  // Reset password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    setError('')
    setSuccess('')

    if (resetPasswordData.newPassword !== resetPasswordData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (resetPasswordData.newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: resetPasswordData.newPassword,
          requirePasswordReset: resetPasswordData.requirePasswordReset,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reset password')
      }

      setSuccess('Password reset successfully')
      setShowResetPasswordDialog(false)
      setSelectedUser(null)
      setResetPasswordData({
        newPassword: '',
        confirmPassword: '',
        requirePasswordReset: true,
      })
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  // Seed example data
  const handleSeedData = async () => {
    if (!confirm('This will create example users, collections, and content. Continue?')) {
      return
    }

    setSeeding(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/admin/seed-example-data', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to seed data')
      }

      setSuccess(`Example data seeded successfully! Created ${data.data.skripts} skripts with ${data.data.pages} pages.`)
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setSeeding(false)
    }
  }

  // Unlink OAuth account
  const handleUnlinkOAuth = async (userId: string, accountId: string, provider: string) => {
    if (!confirm(`Are you sure you want to unlink the ${provider} account?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}/oauth/${accountId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unlink OAuth account')
      }

      setSuccess(data.message)
      fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  // Open edit dialog
  const openEditDialog = (user: User) => {
    setSelectedUser(user)
    setFormData({
      email: user.email,
      name: user.name,
      subdomain: user.subdomain,
      title: user.title || '',
      password: '',
      isAdmin: user.isAdmin,
      requirePasswordReset: user.requirePasswordReset,
    })
    setShowEditDialog(true)
  }

  // Open reset password dialog
  const openResetPasswordDialog = (user: User) => {
    setSelectedUser(user)
    setResetPasswordData({
      newPassword: '',
      confirmPassword: '',
      requirePasswordReset: true,
    })
    setShowResetPasswordDialog(true)
  }

  if (!session?.user.isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Access denied. Admin privileges required.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <div className="flex gap-2">
          <Button onClick={handleSeedData} disabled={seeding} variant="outline">
            {seeding ? 'Seeding...' : 'Insert Example Data'}
          </Button>
          <Button onClick={() => setShowCreateDialog(true)}>
            Create User
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600">
          {success}
        </div>
      )}

      <Card className="p-6">
        <h2 className="mb-4 text-xl font-semibold">Users</h2>
        {loading ? (
          <p>Loading users...</p>
        ) : (
          <div className="space-y-4">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between border-b pb-4 last:border-0"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{user.name}</h3>
                    {user.isAdmin && <Badge variant="outline">Admin</Badge>}
                    {user.requirePasswordReset && <Badge variant="outline">Password Reset Required</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <p className="text-sm text-muted-foreground">
                    Subdomain: {user.subdomain}
                    {user.title && ` • ${user.title}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {user.accounts && user.accounts.length > 0 && (
                    <div className="flex gap-1">
                      {user.accounts.map((account) => {
                        const providerName = account.provider === 'azure-ad' ? 'Microsoft' :
                                            account.provider === 'github' ? 'GitHub' :
                                            account.provider === 'google' ? 'Google' : account.provider
                        return (
                          <button
                            key={account.id}
                            onClick={() => handleUnlinkOAuth(user.id, account.id, providerName)}
                            className="group relative cursor-pointer"
                            title={`${providerName} (${account.providerAccountId})\nClick to unlink`}
                          >
                            {account.provider === 'azure-ad' && (
                              <svg className="w-5 h-5 hover:opacity-70 transition-opacity" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M0 0h10.87v10.87H0z" fill="#f25022"/>
                                <path d="M12.13 0H23v10.87H12.13z" fill="#00a4ef"/>
                                <path d="M0 12.13h10.87V23H0z" fill="#7fba00"/>
                                <path d="M12.13 12.13H23V23H12.13z" fill="#ffb900"/>
                              </svg>
                            )}
                            {account.provider === 'github' && (
                              <svg className="w-5 h-5 hover:opacity-70 transition-opacity" fill="currentColor" viewBox="0 0 24 24">
                                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                              </svg>
                            )}
                            {account.provider === 'google' && (
                              <svg className="w-5 h-5 hover:opacity-70 transition-opacity" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                              </svg>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => openEditDialog(user)}
                      variant="ghost"
                      size="icon"
                      title="Edit user"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => openResetPasswordDialog(user)}
                      variant="ghost"
                      size="icon"
                      title="Reset password"
                    >
                      <RotateCw className="h-4 w-4" />
                    </Button>
                    <Button
                      onClick={() => handleDeleteUser(user.id)}
                      variant="ghost"
                      size="icon"
                      disabled={user.id === session?.user.id}
                      title="Delete user"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-md">
          <h2 className="mb-4 text-xl font-semibold">Create User</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <Label htmlFor="create-email">Email</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="create-name">Name</Label>
                <Input
                  id="create-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="create-subdomain">Subdomain</Label>
                <Input
                  id="create-subdomain"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="create-title">Title (optional)</Label>
                <Input
                  id="create-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="create-password">Password</Label>
                <Input
                  id="create-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  minLength={8}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="create-isAdmin"
                  checked={formData.isAdmin}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isAdmin: checked as boolean })
                  }
                />
                <Label htmlFor="create-isAdmin">Admin user</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="create-requirePasswordReset"
                  checked={formData.requirePasswordReset}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, requirePasswordReset: checked as boolean })
                  }
                />
                <Label htmlFor="create-requirePasswordReset">Require password reset on first login</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create User</Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md">
          <h2 className="mb-4 text-xl font-semibold">Edit User</h2>
            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-subdomain">Subdomain</Label>
                <Input
                  id="edit-subdomain"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                  required
                />
              </div>
              <div>
                <Label htmlFor="edit-title">Title (optional)</Label>
                <Input
                  id="edit-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-isAdmin"
                  checked={formData.isAdmin}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isAdmin: checked as boolean })
                  }
                />
                <Label htmlFor="edit-isAdmin">Admin user</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="edit-requirePasswordReset"
                  checked={formData.requirePasswordReset}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, requirePasswordReset: checked as boolean })
                  }
                />
                <Label htmlFor="edit-requirePasswordReset">Require password reset on next login</Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update User</Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
        <DialogContent className="max-w-md">
          <h2 className="mb-4 text-xl font-semibold">Reset Password</h2>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div>
                <Label htmlFor="reset-newPassword">New Password</Label>
                <Input
                  id="reset-newPassword"
                  type="password"
                  value={resetPasswordData.newPassword}
                  onChange={(e) =>
                    setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })
                  }
                  required
                  minLength={8}
                />
              </div>
              <div>
                <Label htmlFor="reset-confirmPassword">Confirm Password</Label>
                <Input
                  id="reset-confirmPassword"
                  type="password"
                  value={resetPasswordData.confirmPassword}
                  onChange={(e) =>
                    setResetPasswordData({ ...resetPasswordData, confirmPassword: e.target.value })
                  }
                  required
                  minLength={8}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="reset-requirePasswordReset"
                  checked={resetPasswordData.requirePasswordReset}
                  onCheckedChange={(checked) =>
                    setResetPasswordData({
                      ...resetPasswordData,
                      requirePasswordReset: checked as boolean,
                    })
                  }
                />
                <Label htmlFor="reset-requirePasswordReset">
                  Require user to change password on next login
                </Label>
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowResetPasswordDialog(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Reset Password</Button>
              </div>
            </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
