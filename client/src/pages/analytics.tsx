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
  Building2, Calendar, Award, Download, Eye, EyeOff, BarChart3,
  Users, Zap, Clock, CheckCircle
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Loading Header */}
            <div className="mb-8">
              <div className="h-8 bg-gradient-to-r from-slate-200 to-slate-300 rounded-lg w-64 mb-2 animate-pulse"></div>
              <div className="h-4 bg-slate-200 rounded w-40 animate-pulse"></div>
            </div>
            
            {/* Loading Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 animate-pulse">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-4 bg-slate-200 rounded w-24"></div>
                    <div className="h-10 w-10 bg-slate-200 rounded-xl"></div>
                  </div>
                  <div className="h-8 bg-slate-300 rounded w-20 mb-2"></div>
                  <div className="h-3 bg-slate-200 rounded w-16"></div>
                </div>
              ))}
            </div>
            
            {/* Loading Charts */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
              <div className="xl:col-span-2">
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 animate-pulse">
                  <div className="h-6 bg-slate-200 rounded w-48 mb-6"></div>
                  <div className="h-80 bg-slate-100 rounded-xl"></div>
                </div>
              </div>
              <div>
                <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 border border-white/50 animate-pulse">
                  <div className="h-6 bg-slate-200 rounded w-40 mb-6"></div>
                  <div className="h-80 bg-slate-100 rounded-xl"></div>
                </div>
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 flex items-center justify-center">
          <div className="text-center py-12">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Activity className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Analytics</h3>
            <p className="text-gray-600 max-w-md mx-auto">
              There was an issue retrieving your analytics data. Please try refreshing the page or contact support.
            </p>
            <Button className="mt-4" onClick={() => window.location.reload()}>
              Refresh Page
            </Button>
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

  const pieColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:20px_20px] pointer-events-none"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Dashboard Header */}
          <div className="mb-8">
            <div className="bg-white/70 backdrop-blur-md rounded-2xl border border-white/50 shadow-xl p-6 lg:p-8">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl shadow-lg ring-4 ring-blue-100">
                    <BarChart3 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
                      Analytics Dashboard
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        <span>Live Data</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        <span>{analytics.total_invoices} invoices processed</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4" />
                        <span>Last updated: Now</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                    className="bg-white/60 border-white/50 backdrop-blur-sm hover:bg-white/80 transition-all"
                  >
                    {showDetails ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                    {showDetails ? 'Hide Details' : 'Show Details'}
                  </Button>
                  
                  <Button 
                    variant="default" 
                    size="sm"
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Report
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Key Performance Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Invoices */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl p-6 hover:bg-white/90 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium text-gray-600">Total Invoices</div>
                  <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl">
                    <FileText className="w-4 h-4 text-blue-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {analytics.total_invoices.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    {analytics.recognition_stats.template_recognized} recognized
                  </p>
                </div>
              </div>
            </div>

            {/* Total Amount */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl p-6 hover:bg-white/90 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium text-gray-600">Total Amount</div>
                  <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-200 rounded-xl">
                    <DollarSign className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    ${analytics.total_amount.toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Avg: ${analytics.average_amount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Recognition Rate */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl p-6 hover:bg-white/90 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium text-gray-600">Recognition Rate</div>
                  <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-200 rounded-xl">
                    <Target className="w-4 h-4 text-amber-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {analytics.recognition_stats.total_processed > 0 
                      ? Math.round((analytics.recognition_stats.template_recognized / analytics.recognition_stats.total_processed) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-gray-500">
                    Template detection
                  </p>
                </div>
              </div>
            </div>

            {/* Data Quality */}
            <div className="group relative">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-300"></div>
              <div className="relative bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl p-6 hover:bg-white/90 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm font-medium text-gray-600">Data Quality</div>
                  <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-200 rounded-xl">
                    <CheckCircle className="w-4 h-4 text-purple-600" />
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-2xl font-bold text-gray-900 mb-1">
                    {analytics.recognition_stats.total_processed > 0 
                      ? Math.round((analytics.recognition_stats.high_confidence / analytics.recognition_stats.total_processed) * 100)
                      : 0}%
                  </p>
                  <p className="text-xs text-gray-500">
                    High confidence
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Monthly Trends */}
            <div>
              <div className="bg-white/80 backdrop-blur-md border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="p-6 lg:p-8">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-gradient-to-br from-teal-100 to-cyan-200 rounded-xl">
                        <Calendar className="w-5 h-5 text-teal-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-semibold text-gray-900">Monthly Trends</h2>
                        <p className="text-xs text-gray-500">Invoice processing over time</p>
                      </div>
                    </div>
                    <div className="flex bg-gray-100/80 backdrop-blur-sm rounded-xl p-1 border border-gray-200/50">
                      {(['bar', 'line', 'area'] as const).map((type) => (
                        <Button
                          key={type}
                          size="sm"
                          variant="ghost"
                          onClick={() => setActiveChart(type)}
                          className={`px-4 py-2 text-xs font-medium transition-all ${
                            activeChart === type 
                              ? 'bg-white shadow-sm text-gray-900 border border-gray-200' 
                              : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      {activeChart === 'bar' && (
                        <BarChart data={analytics.monthly_trends.filter(m => m.count > 0)} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                          <XAxis 
                            dataKey="month" 
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 'dataMax + 2']}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: 'none',
                              borderRadius: '12px',
                              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                              fontSize: '13px'
                            }}
                          />
                          <Bar 
                            dataKey="count" 
                            fill="url(#barGradient)"
                            name="Invoices" 
                            radius={[4, 4, 0, 0]}
                          />
                          <defs>
                            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3B82F6" />
                              <stop offset="100%" stopColor="#1E40AF" />
                            </linearGradient>
                          </defs>
                        </BarChart>
                      )}
                      
                      {activeChart === 'line' && (
                        <LineChart data={analytics.monthly_trends} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                          <XAxis 
                            dataKey="month" 
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 'dataMax + 2']}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: 'none',
                              borderRadius: '12px',
                              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                              fontSize: '13px'
                            }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#3B82F6" 
                            strokeWidth={3}
                            dot={{ fill: '#3B82F6', strokeWidth: 2, r: 5 }}
                            activeDot={{ r: 7, stroke: '#3B82F6', strokeWidth: 2, fill: 'white' }}
                          />
                        </LineChart>
                      )}
                      
                      {activeChart === 'area' && (
                        <AreaChart data={analytics.monthly_trends} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.6} />
                          <XAxis 
                            dataKey="month" 
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                          />
                          <YAxis 
                            stroke="#64748b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 'dataMax + 2']}
                          />
                          <Tooltip 
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              border: 'none',
                              borderRadius: '12px',
                              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                              fontSize: '13px'
                            }}
                          />
                          <Area 
                            type="monotone" 
                            dataKey="count" 
                            stroke="#3B82F6" 
                            fill="url(#areaGradient)"
                            strokeWidth={3}
                          />
                          <defs>
                            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            {/* Category Distribution */}
            <div>
              <div className="bg-white/80 backdrop-blur-md border border-white/50 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 h-full">
                <div className="p-6 lg:p-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="p-2.5 bg-gradient-to-br from-indigo-100 to-blue-200 rounded-xl">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Categories</h2>
                      <p className="text-xs text-gray-500">Distribution overview</p>
                    </div>
                  </div>
                  
                  <div className="h-64 mb-6">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={false}
                          outerRadius={90}
                          innerRadius={35}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {categoryData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={pieColors[index % pieColors.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [value, "Invoices"]}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.95)',
                            border: 'none',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.1)',
                            fontSize: '13px'
                          }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend */}
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {categoryData.slice(0, 5).map((entry, index) => (
                      <div key={entry.name} className="flex items-center justify-between py-1">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: pieColors[index % pieColors.length] }}
                          />
                          <span className="text-sm text-gray-700 font-medium truncate">
                            {entry.name}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {entry.value} ({Math.round((entry.value / categoryData.reduce((sum, item) => sum + item.value, 0)) * 100)}%)
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Processing Quality Metrics */}
          <div className="bg-white/80 backdrop-blur-md border border-white/50 rounded-2xl shadow-xl">
            <div className="p-6 lg:p-8">
              <div className="flex items-center gap-3 mb-8">
                <div className="p-2.5 bg-gradient-to-br from-emerald-100 to-green-200 rounded-xl">
                  <Award className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Processing Quality Metrics</h2>
                  <p className="text-xs text-gray-500">OCR and automation performance indicators</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Template Recognition */}
                <div className="group bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm text-gray-900">Template Recognition</h3>
                    <div className="text-lg font-bold text-blue-600">
                      {analytics.recognition_stats.total_processed > 0 
                        ? Math.round((analytics.recognition_stats.template_recognized / analytics.recognition_stats.total_processed) * 100)
                        : 0}%
                    </div>
                  </div>
                  <Progress 
                    value={analytics.recognition_stats.total_processed > 0 
                      ? (analytics.recognition_stats.template_recognized / analytics.recognition_stats.total_processed) * 100 
                      : 0} 
                    className="h-2 bg-blue-100"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    {analytics.recognition_stats.template_recognized} / {analytics.recognition_stats.total_processed} processed
                  </p>
                </div>

                {/* Auto-Categorized */}
                <div className="group bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm text-gray-900">Auto-Categorized</h3>
                    <div className="text-lg font-bold text-green-600">
                      {analytics.recognition_stats.total_processed > 0 
                        ? Math.round((analytics.recognition_stats.auto_categorized / analytics.recognition_stats.total_processed) * 100)
                        : 0}%
                    </div>
                  </div>
                  <Progress 
                    value={analytics.recognition_stats.total_processed > 0 
                      ? (analytics.recognition_stats.auto_categorized / analytics.recognition_stats.total_processed) * 100 
                      : 0} 
                    className="h-2 bg-green-100"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    {analytics.recognition_stats.auto_categorized} / {analytics.recognition_stats.total_processed} automated
                  </p>
                </div>

                {/* High Confidence */}
                <div className="group bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-100 hover:shadow-lg transition-all duration-300">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-sm text-gray-900">High Confidence</h3>
                    <div className="text-lg font-bold text-purple-600">
                      {analytics.recognition_stats.total_processed > 0 
                        ? Math.round((analytics.recognition_stats.high_confidence / analytics.recognition_stats.total_processed) * 100)
                        : 0}%
                    </div>
                  </div>
                  <Progress 
                    value={analytics.recognition_stats.total_processed > 0 
                      ? (analytics.recognition_stats.high_confidence / analytics.recognition_stats.total_processed) * 100 
                      : 0} 
                    className="h-2 bg-purple-100"
                  />
                  <p className="text-xs text-gray-600 mt-2">
                    {analytics.recognition_stats.high_confidence} / {analytics.recognition_stats.total_processed} high quality
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}