import { useQuery } from "@tanstack/react-query";
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  Activity, FileText, DollarSign, Target, TrendingUp, 
  Building2, Calendar, Award, Download, Eye, EyeOff
} from "lucide-react";
import Layout from "@/components/Layout";

interface AnalyticsData {
  total_invoices: number;
  total_amount: number;
  average_amount: number;
  categories: Array<{
    category: string;
    count: number;
    total_amount: number;
    percentage: number;
  }>;
  templates: Array<{
    template_name: string;
    count: number;
    confidence_avg: number;
  }>;
  monthly_trends: Array<{
    month: string;
    count: number;
    amount: number;
  }>;
  top_vendors: Array<{
    vendor_name: string;
    count: number;
    total_amount: number;
  }>;
  recognition_stats: {
    template_recognized: number;
    auto_categorized: number;
    high_confidence: number;
    total_processed: number;
  };
}

export default function Analytics() {
  const [showDetails, setShowDetails] = useState(false);
  const [activeChart, setActiveChart] = useState<'bar' | 'line' | 'area'>('bar');

  const { data: analytics, error, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['/api/analytics'],
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto p-6 space-y-6">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded"></div>
                ))}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="h-96 bg-gray-200 rounded"></div>
                <div className="h-96 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !analytics) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50">
          <div className="max-w-7xl mx-auto p-6">
            <div className="text-center py-12">
              <Activity className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No analytics data</h3>
              <p className="mt-1 text-sm text-gray-500">
                There was a problem loading analytics data.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const categoryData = analytics.categories.map(cat => ({
    name: cat.category,
    value: cat.count,
    amount: cat.total_amount
  }));

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/30 relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(99,102,241,0.05)_0%,transparent_25%)] pointer-events-none"></div>
        <div className="relative max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
          {/* Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-blue-50/40 rounded-2xl blur-xl"></div>
            <div className="relative bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-lg p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-700 rounded-lg shadow-lg">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900">Analytics Dashboard</h1>
                    <p className="text-gray-600 text-sm">
                      {analytics.total_invoices} invoices analyzed
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                    className="border-white/50 bg-white/60 backdrop-blur-sm text-gray-700 hover:bg-white/80 transition-all duration-200"
                  >
                    {showDetails ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                    {showDetails ? 'Hide Details' : 'Show Details'}
                  </Button>
                  
                  <Button variant="outline" size="sm" className="border-white/50 bg-white/60 backdrop-blur-sm text-gray-700 hover:bg-white/80 transition-all duration-200">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                
                <div className="px-3 py-1 bg-gray-100 text-gray-700 text-sm rounded-md border border-gray-200">
                  <span className="w-2 h-2 bg-green-500 rounded-full inline-block mr-2"></span>
                  Live Data
                </div>
              </div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Invoices
                </CardTitle>
                <div className="p-2 bg-gray-100 rounded-lg">
                  <FileText className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {analytics.total_invoices.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500">
                  {analytics.recognition_stats.template_recognized} recognized
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total Amount
                </CardTitle>
                <div className="p-2 bg-gray-100 rounded-lg">
                  <DollarSign className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  ${analytics.total_amount.toLocaleString()}
                </div>
                <p className="text-xs text-gray-500">
                  Avg: ${analytics.average_amount.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Recognition Rate
                </CardTitle>
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Target className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {analytics.recognition_stats.total_processed > 0 
                    ? Math.round((analytics.recognition_stats.template_recognized / analytics.recognition_stats.total_processed) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-gray-500">
                  Template detection
                </p>
              </CardContent>
            </Card>

            <Card className="border border-gray-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Data Quality
                </CardTitle>
                <div className="p-2 bg-gray-100 rounded-lg">
                  <TrendingUp className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {analytics.recognition_stats.total_processed > 0 
                    ? Math.round((analytics.recognition_stats.high_confidence / analytics.recognition_stats.total_processed) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-gray-500">
                  High confidence
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Distribution */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-gray-100 rounded-lg mr-3">
                      <Building2 className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      Category Distribution
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={80}
                      innerRadius={30}
                      fill="#6b7280"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={['#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'][index % 5]}
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [value, "Count"]} 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Legend */}
                <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                  {categoryData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center space-x-2">
                      <div 
                        className="w-2 h-2 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: ['#374151', '#6b7280', '#9ca3af', '#d1d5db', '#e5e7eb'][index % 5] }}
                      />
                      <span className="text-gray-600 text-xs truncate">
                        {entry.name.length > 10 ? entry.name.substring(0, 10) + '...' : entry.name} 
                        <span className="text-gray-500">
                          ({Math.round((entry.value / categoryData.reduce((sum, item) => sum + item.value, 0)) * 100)}%)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Trends */}
            <Card className="border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-2 bg-gray-100 rounded-lg mr-3">
                      <Calendar className="w-4 h-4 text-gray-600" />
                    </div>
                    <span className="text-lg font-semibold text-gray-900">
                      Monthly Trends
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      {(['bar', 'line', 'area'] as const).map((type) => (
                        <Button
                          key={type}
                          size="sm"
                          variant={activeChart === type ? "default" : "ghost"}
                          onClick={() => setActiveChart(type)}
                          className={`px-3 py-1 text-xs ${
                            activeChart === type 
                              ? 'bg-gray-900 text-white' 
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <>
                  {activeChart === 'bar' && (
                    <BarChart data={analytics.monthly_trends.filter(m => m.count > 0)} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 'dataMax + 2']}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="#374151" 
                        name="Invoice Count" 
                        radius={[2, 2, 0, 0]}
                      />
                    </BarChart>
                  )}
                  
                  {activeChart === 'line' && (
                    <LineChart data={analytics.monthly_trends} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 'dataMax + 2']}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#374151" 
                        strokeWidth={2}
                        dot={{ fill: '#374151', strokeWidth: 1, r: 4 }}
                        activeDot={{ r: 6, stroke: '#374151', strokeWidth: 1, fill: 'white' }}
                        connectNulls={false}
                      />
                    </LineChart>
                  )}
                  
                  {activeChart === 'area' && (
                    <AreaChart data={analytics.monthly_trends} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                        domain={[0, 'dataMax + 2']}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '12px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#374151" 
                        fillOpacity={0.2}
                        fill="#374151"
                        strokeWidth={2}
                        connectNulls={false}
                      />
                    </AreaChart>
                  )}
                  </>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Processing Quality */}
          <Card className="border border-gray-200">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-2 bg-gray-100 rounded-lg mr-3">
                    <Award className="w-4 h-4 text-gray-600" />
                  </div>
                  <span className="text-lg font-semibold text-gray-900">
                    Processing Quality
                  </span>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-gray-900">Template Recognition</span>
                    <span className="font-semibold text-gray-900">
                      {analytics.recognition_stats.total_processed > 0 
                        ? Math.round((analytics.recognition_stats.template_recognized / analytics.recognition_stats.total_processed) * 100)
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={analytics.recognition_stats.total_processed > 0 
                      ? (analytics.recognition_stats.template_recognized / analytics.recognition_stats.total_processed) * 100 
                      : 0} 
                    className="h-2"
                  />
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-gray-900">Auto-Categorized</span>
                    <span className="font-semibold text-gray-900">
                      {analytics.recognition_stats.total_processed > 0 
                        ? Math.round((analytics.recognition_stats.auto_categorized / analytics.recognition_stats.total_processed) * 100)
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={analytics.recognition_stats.total_processed > 0 
                      ? (analytics.recognition_stats.auto_categorized / analytics.recognition_stats.total_processed) * 100 
                      : 0} 
                    className="h-2"
                  />
                </div>
                
                <div className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-medium text-gray-900">High Confidence</span>
                    <span className="font-semibold text-gray-900">
                      {analytics.recognition_stats.total_processed > 0 
                        ? Math.round((analytics.recognition_stats.high_confidence / analytics.recognition_stats.total_processed) * 100)
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={analytics.recognition_stats.total_processed > 0 
                      ? (analytics.recognition_stats.high_confidence / analytics.recognition_stats.total_processed) * 100 
                      : 0} 
                    className="h-2"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>
      </div>
    </Layout>
  );
}