'use client'

import { BarChart3, Eye, Users, Clock, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface AnalyticsData {
  totalViews: number
  uniqueVisitors: number
  avgTimeOnPage: string
  popularPages: {
    title: string
    views: number
    path: string
  }[]
}

// Mock analytics data - in a real app, this would come from an analytics service
const mockAnalytics: AnalyticsData = {
  totalViews: 1247,
  uniqueVisitors: 892,
  avgTimeOnPage: '3m 24s',
  popularPages: [
    { title: 'What are Variables?', views: 324, path: '/algebra-basics/introduction/what-are-variables' },
    { title: 'Using Variables in Expressions', views: 287, path: '/algebra-basics/introduction/using-variables' },
    { title: 'Basic Linear Equations', views: 198, path: '/algebra-basics/solving-equations/basic-equations' },
  ]
}

export function AnalyticsDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <BarChart3 className="w-6 h-6" />
        <h2 className="text-2xl font-bold">Analytics Overview</h2>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Total Views</p>
                <p className="text-2xl font-bold">
                  {mockAnalytics.totalViews.toLocaleString()}
                </p>
              </div>
              <Eye className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Unique Visitors</p>
                <p className="text-2xl font-bold">
                  {mockAnalytics.uniqueVisitors.toLocaleString()}
                </p>
              </div>
              <Users className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm">Avg. Time on Page</p>
                <p className="text-2xl font-bold">
                  {mockAnalytics.avgTimeOnPage}
                </p>
              </div>
              <Clock className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Pages */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Most Popular Pages
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {mockAnalytics.popularPages.map((page, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-muted rounded">
                <div>
                  <p className="font-medium">{page.title}</p>
                  <p className="text-sm text-muted-foreground">{page.path}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{page.views}</p>
                  <p className="text-sm text-muted-foreground">views</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
