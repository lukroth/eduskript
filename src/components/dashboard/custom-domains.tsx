'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Trash2, Plus, ExternalLink, Copy, Check } from 'lucide-react'

interface CustomDomain {
  id: string
  domain: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface DNSInstructions {
  type: string
  name: string
  value: string
  ttl: number
}

export function CustomDomains() {
  const [domains, setDomains] = useState<CustomDomain[]>([])
  const [newDomain, setNewDomain] = useState('')
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [dnsInstructions, setDnsInstructions] = useState<DNSInstructions | null>(null)
  const [copiedValue, setCopiedValue] = useState('')

  useEffect(() => {
    fetchDomains()
  }, [])

  const fetchDomains = async () => {
    try {
      const response = await fetch('/api/user/custom-domains')
      const data = await response.json()
      
      if (response.ok) {
        setDomains(data.domains)
      } else {
        setError(data.error || 'Failed to fetch domains')
      }
    } catch {
      setError('Failed to fetch domains')
    } finally {
      setLoading(false)
    }
  }

  const addDomain = async () => {
    if (!newDomain.trim()) return

    setAdding(true)
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/user/custom-domains', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ domain: newDomain.trim() }),
      })

      const data = await response.json()

      if (response.ok) {
        setSuccess(data.message)
        setNewDomain('')
        setDnsInstructions(data.dnsInstructions)
        await fetchDomains()
      } else {
        setError(data.error || 'Failed to add domain')
      }
    } catch {
      setError('Failed to add domain')
    } finally {
      setAdding(false)
    }
  }

  const toggleDomain = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/user/custom-domains/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive }),
      })

      if (response.ok) {
        await fetchDomains()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to update domain')
      }
    } catch {
      setError('Failed to update domain')
    }
  }

  const deleteDomain = async (id: string) => {
    if (!confirm('Are you sure you want to delete this domain?')) return

    try {
      const response = await fetch(`/api/user/custom-domains/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchDomains()
      } else {
        const data = await response.json()
        setError(data.error || 'Failed to delete domain')
      }
    } catch {
      setError('Failed to delete domain')
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedValue(text)
      setTimeout(() => setCopiedValue(''), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded animate-pulse"></div>
        <div className="h-32 bg-gray-200 rounded animate-pulse"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {/* Add New Domain */}
      <div className="p-4 border border-border rounded-lg bg-muted/30">
        <h3 className="text-lg font-semibold mb-4">Add Custom Domain</h3>
        <div className="flex gap-3">
          <Input
            type="text"
            placeholder="teachingmaterials.io"
            value={newDomain}
            onChange={(e) => setNewDomain(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addDomain()}
            className="flex-1"
          />
          <Button onClick={addDomain} disabled={adding || !newDomain.trim()}>
            {adding ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Add Domain
          </Button>
        </div>
      </div>

      {/* DNS Instructions */}
      {dnsInstructions && (
        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50">
          <h3 className="text-lg font-semibold mb-4 text-blue-900">DNS Configuration Required</h3>
          <p className="text-blue-800 mb-4">
            To activate your custom domain, add the following DNS record to your domain registrar:
          </p>
          <div className="bg-white p-4 rounded border space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-medium">Record Type:</span>
              <code className="bg-gray-100 px-2 py-1 rounded">{dnsInstructions.type}</code>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Name:</span>
              <div className="flex items-center gap-2">
                <code className="bg-gray-100 px-2 py-1 rounded">{dnsInstructions.name}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(dnsInstructions.name)}
                  className="h-6 w-6 p-0"
                >
                  {copiedValue === dnsInstructions.name ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">Value:</span>
              <div className="flex items-center gap-2">
                <code className="bg-gray-100 px-2 py-1 rounded">{dnsInstructions.value}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(dnsInstructions.value)}
                  className="h-6 w-6 p-0"
                >
                  {copiedValue === dnsInstructions.value ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium">TTL:</span>
              <code className="bg-gray-100 px-2 py-1 rounded">{dnsInstructions.ttl}</code>
            </div>
          </div>
          <p className="text-sm text-blue-700 mt-4">
            After adding the DNS record, it may take up to 24 hours for changes to propagate. 
            You can then activate your domain below.
          </p>
        </div>
      )}

      {/* Domain List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Your Domains</h3>
        {domains.length === 0 ? (
          <div className="p-6 border border-border rounded-lg text-center text-muted-foreground bg-muted/30">
            No custom domains added yet. Add your first domain above.
          </div>
        ) : (
          domains.map((domain) => (
            <div key={domain.id} className="p-4 border border-border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{domain.domain}</h4>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => window.open(`https://${domain.domain}`, '_blank')}
                        className="h-6 w-6 p-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Added {new Date(domain.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {domain.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <Switch
                      checked={domain.isActive}
                      onCheckedChange={(checked) => toggleDomain(domain.id, checked)}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteDomain(domain.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
} 