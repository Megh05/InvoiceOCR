import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, ComposedChart
} from "recharts";
import { 
  FileText, TrendingUp, Building2, Calendar, DollarSign, Target, 
  Filter, Download, Zap, Activity, Eye, EyeOff
} from "lucide-react";
import Layout from "@/components/Layout";

interface InvoiceAnalytics {
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

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
const GRADIENT_COLORS = ['#60A5FA', '#34D399', '#FBBF24', '#F87171', '#A78BFA', '#22D3EE', '#A3E635', '#FB923C'];

export default function Analytics() {
  const [activeChart, setActiveChart] = useState<'bar' | 'line' | 'area'>('bar');
  const [showDetails, setShowDetails] = useState(true);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);

  const { data: analytics, isLoading } = useQuery<InvoiceAnalytics>({
    queryKey: ['/api/analytics'],
    refetchInterval: 30000,
  });

  if (isLoading || !analytics) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto p-6 space-y-8">
          {/* Enhanced Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl p-4 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="p-1.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-sm">
                      <Activity className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Invoice Analytics
                      </h1>
                      <p className="text-gray-600 text-sm">Insights and patterns from your processed invoices</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDetails(!showDetails)}
                    className="bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-300"
                  >
                    {showDetails ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
                    {showDetails ? 'Hide Details' : 'Show Details'}
                  </Button>
                  
                  <Button variant="outline" size="sm" className="bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-300">
                    <Download className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                  
                  <Badge variant="outline" className="bg-green-50/80 text-green-700 border-green-200 px-4 py-2 backdrop-blur-sm">
                    <Zap className="w-4 h-4 mr-2" />
                    Live Data
                  </Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card 
              className={`group relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-200/50 hover:border-blue-300/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 rounded-2xl h-28 ${
                hoveredCard === 'invoices' ? 'shadow-lg -translate-y-1' : ''
              }`}
              onMouseEnter={() => setHoveredCard('invoices')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-xs font-medium text-gray-700 group-hover:text-blue-700 transition-colors">
                  Total Invoices
                </CardTitle>
                <div className="p-1.5 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg shadow-sm group-hover:shadow-xl transition-all duration-300">
                  <FileText className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-xl font-bold text-gray-900 mb-1 group-hover:text-blue-700 transition-colors">
                  {analytics.total_invoices.toLocaleString()}
                </div>
                <div className="flex items-center space-x-2">
                  <div className="h-1.5 bg-blue-200 rounded-full flex-1 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-1000"
                      style={{ 
                        width: `${analytics.recognition_stats.total_processed > 0 ? (analytics.recognition_stats.template_recognized / analytics.recognition_stats.total_processed) * 100 : 0}%` 
                      }}
                    />
                  </div>
                  <p className="text-xs text-blue-600">
                    {analytics.recognition_stats.template_recognized} recognized
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card 
              className={`group relative overflow-hidden bg-gradient-to-br from-green-500/10 to-green-600/10 border-green-200/50 hover:border-green-300/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 rounded-2xl h-28 ${
                hoveredCard === 'amount' ? 'shadow-lg -translate-y-1' : ''
              }`}
              onMouseEnter={() => setHoveredCard('amount')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-xs font-medium text-gray-700 group-hover:text-green-700 transition-colors">
                  Total Amount
                </CardTitle>
                <div className="p-1.5 bg-gradient-to-r from-green-500 to-green-600 rounded-lg shadow-sm group-hover:shadow-sm transition-all duration-300">
                  <DollarSign className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-lg font-bold text-gray-900 group-hover:text-green-700 transition-colors">
                  ${analytics.total_amount.toLocaleString()}
                </div>
                <p className="text-xs text-green-600">
                  Avg: ${analytics.average_amount.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            <Card 
              className={`group relative overflow-hidden bg-gradient-to-br from-orange-500/10 to-orange-600/10 border-orange-200/50 hover:border-orange-300/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 rounded-2xl h-28 ${
                hoveredCard === 'recognition' ? 'shadow-lg -translate-y-1' : ''
              }`}
              onMouseEnter={() => setHoveredCard('recognition')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-xs font-medium text-gray-700 group-hover:text-orange-700 transition-colors">
                  Recognition Rate
                </CardTitle>
                <div className="p-1.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow-sm group-hover:shadow-sm transition-all duration-300">
                  <Target className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-lg font-bold text-gray-900 group-hover:text-orange-700 transition-colors">
                  {analytics.recognition_stats.total_processed > 0 
                    ? Math.round((analytics.recognition_stats.template_recognized / analytics.recognition_stats.total_processed) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-orange-600">
                  Template detection
                </p>
              </CardContent>
            </Card>

            <Card 
              className={`group relative overflow-hidden bg-gradient-to-br from-purple-500/10 to-purple-600/10 border-purple-200/50 hover:border-purple-300/80 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 rounded-2xl h-28 ${
                hoveredCard === 'quality' ? 'shadow-lg -translate-y-1' : ''
              }`}
              onMouseEnter={() => setHoveredCard('quality')}
              onMouseLeave={() => setHoveredCard(null)}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
                <CardTitle className="text-xs font-medium text-gray-700 group-hover:text-purple-700 transition-colors">
                  Data Quality
                </CardTitle>
                <div className="p-1.5 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-sm group-hover:shadow-sm transition-all duration-300">
                  <TrendingUp className="h-4 w-4 text-white" />
                </div>
              </CardHeader>
              <CardContent className="relative">
                <div className="text-lg font-bold text-gray-900 group-hover:text-purple-700 transition-colors">
                  {analytics.recognition_stats.total_processed > 0 
                    ? Math.round((analytics.recognition_stats.high_confidence / analytics.recognition_stats.total_processed) * 100)
                    : 0}%
                </div>
                <p className="text-xs text-purple-600">
                  High confidence
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Interactive Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enhanced Category Distribution */}
            <Card className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl h-96">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg mr-3 shadow-sm">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Category Distribution
                    </span>
                  </div>
                  <Badge variant="outline" className="bg-indigo-50/80 text-indigo-700 border-indigo-200">
                    Interactive
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={false}
                      outerRadius={80}
                      innerRadius={30}
                      fill="#8884d8"
                      dataKey="value"
                      animationBegin={0}
                      animationDuration={1500}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={GRADIENT_COLORS[index % GRADIENT_COLORS.length]}
                          className="drop-shadow-sm hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value, name) => [value, "Count"]} 
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        backdropFilter: 'blur(8px)',
                        border: 'none',
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                
                {/* Custom Legend */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  {categoryData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center space-x-2">
                      <div 
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: GRADIENT_COLORS[index % GRADIENT_COLORS.length] }}
                      />
                      <span className="text-gray-600 truncate" title={entry.name}>
                        {entry.name} ({Math.round((entry.value / categoryData.reduce((sum, item) => sum + item.value, 0)) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Monthly Trends with Chart Type Toggle */}
            <Card className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl h-96">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-1.5 bg-gradient-to-r from-blue-500 to-cyan-600 rounded-lg mr-3 shadow-sm">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Monthly Trends
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                      {(['bar', 'line', 'area'] as const).map((type) => (
                        <Button
                          key={type}
                          size="sm"
                          variant={activeChart === type ? "default" : "ghost"}
                          onClick={() => setActiveChart(type)}
                          className={`px-3 py-1 text-xs transition-all duration-300 ${
                            activeChart === type 
                              ? 'bg-blue-500 text-white shadow-md' 
                              : 'hover:bg-white/70'
                          }`}
                        >
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <ResponsiveContainer width="100%" height={240}>
                  <>
                  {activeChart === 'bar' && (
                    <BarChart data={analytics.monthly_trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        height={40}
                      />
                      <YAxis 
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(8px)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                          fontSize: '12px'
                        }}
                      />
                      <Bar 
                        dataKey="count" 
                        fill="url(#blueGradient)" 
                        name="Invoice Count" 
                        radius={[6, 6, 0, 0]}
                        className="drop-shadow-sm"
                      />
                      <defs>
                        <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" />
                          <stop offset="100%" stopColor="#1E40AF" />
                        </linearGradient>
                      </defs>
                    </BarChart>
                  )}
                  
                  {activeChart === 'line' && (
                    <LineChart data={analytics.monthly_trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        height={40}
                      />
                      <YAxis 
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(8px)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                          fontSize: '12px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#3B82F6" 
                        strokeWidth={3}
                        dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: '#3B82F6', strokeWidth: 2, fill: 'white' }}
                      />
                    </LineChart>
                  )}
                  
                  {activeChart === 'area' && (
                    <AreaChart data={analytics.monthly_trends}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="month" 
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        height={40}
                      />
                      <YAxis 
                        stroke="#64748b"
                        fontSize={10}
                        tickLine={false}
                        axisLine={false}
                        width={40}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          backdropFilter: 'blur(8px)',
                          border: 'none',
                          borderRadius: '8px',
                          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                          fontSize: '12px'
                        }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#3B82F6" 
                        fillOpacity={0.3}
                        fill="url(#blueAreaGradient)"
                        strokeWidth={2}
                      />
                      <defs>
                        <linearGradient id="blueAreaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.6} />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  )}
                  </>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Template Recognition Performance */}
          <Card className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl h-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <CardHeader className="relative">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="p-1.5 bg-gradient-to-r from-violet-500 to-pink-600 rounded-lg mr-3 shadow-sm">
                    <Target className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-lg font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Template Recognition Performance
                  </span>
                </div>
                {showDetails && (
                  <Badge variant="outline" className="bg-violet-50/80 text-violet-700 border-violet-200">
                    {analytics.templates.length} Templates
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="relative">
              <div className="space-y-4">
                {analytics.templates.map((template, index) => (
                  <div 
                    key={template.template_name} 
                    className="group/item relative p-4 rounded-2xl bg-gradient-to-r from-white/50 to-white/30 backdrop-blur-sm border border-white/40 hover:border-white/60 transition-all duration-300 hover:shadow-sm"
                  >
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-4 h-4 rounded-full shadow-sm"
                          style={{ backgroundColor: GRADIENT_COLORS[index % GRADIENT_COLORS.length] }}
                        />
                        <Badge 
                          variant="outline" 
                          className="font-semibold text-sm px-3 py-1"
                          style={{ 
                            backgroundColor: `${GRADIENT_COLORS[index % GRADIENT_COLORS.length]}15`,
                            borderColor: GRADIENT_COLORS[index % GRADIENT_COLORS.length],
                            color: GRADIENT_COLORS[index % GRADIENT_COLORS.length]
                          }}
                        >
                          {template.template_name}
                        </Badge>
                        {showDetails && (
                          <span className="text-sm text-gray-600 bg-gray-100/80 px-2 py-1 rounded-lg">
                            {template.count} invoices
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="secondary" 
                          className="font-bold text-sm bg-gray-100/80 text-gray-700"
                        >
                          {Math.round(template.confidence_avg * 100)}%
                        </Badge>
                        {showDetails && (
                          <span className="text-xs text-gray-500">
                            avg confidence
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="relative">
                      <Progress 
                        value={template.confidence_avg * 100} 
                        className="h-3 rounded-full overflow-hidden"
                        style={{
                          background: 'rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <div 
                        className="absolute top-0 left-0 h-full rounded-full transition-all duration-1000 shadow-sm"
                        style={{
                          width: `${template.confidence_avg * 100}%`,
                          background: `linear-gradient(90deg, ${GRADIENT_COLORS[index % GRADIENT_COLORS.length]}, ${GRADIENT_COLORS[(index + 1) % GRADIENT_COLORS.length]})`
                        }}
                      />
                    </div>
                    
                    {template.confidence_avg >= 0.8 && (
                      <div className="absolute -top-1 -right-1 bg-green-500 text-white text-xs px-2 py-1 rounded-full shadow-sm font-semibold">
                        High
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Bottom Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Enhanced Top Vendors */}
            <Card className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl h-96">
              <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-lg mr-3 shadow-sm">
                      <Building2 className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Top Vendors by Volume
                    </span>
                  </div>
                  {showDetails && (
                    <Badge variant="outline" className="bg-emerald-50/80 text-emerald-700 border-emerald-200">
                      Top {Math.min(5, analytics.top_vendors.length)}
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  {analytics.top_vendors.slice(0, 5).map((vendor, index) => (
                    <div 
                      key={vendor.vendor_name} 
                      className="group/item relative p-4 rounded-2xl bg-gradient-to-r from-emerald-50/50 to-teal-50/30 backdrop-blur-sm border border-emerald-100/40 hover:border-emerald-200/60 transition-all duration-300 hover:shadow-sm"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm shadow-sm">
                            {index + 1}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 group-hover/item:text-emerald-700 transition-colors">
                              {vendor.vendor_name}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center space-x-2">
                              <span>{vendor.count} invoices</span>
                              {showDetails && (
                                <div className="w-2 h-2 bg-emerald-400 rounded-full"></div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-lg text-gray-900 group-hover/item:text-emerald-700 transition-colors">
                            ${vendor.total_amount.toLocaleString()}
                          </div>
                          {showDetails && (
                            <div className="text-sm text-gray-500">total amount</div>
                          )}
                        </div>
                      </div>
                      
                      <div className="mt-3">
                        <div className="w-full h-2 bg-emerald-100/50 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full transition-all duration-1000 shadow-sm"
                            style={{ 
                              width: `${Math.min((vendor.total_amount / analytics.top_vendors[0].total_amount) * 100, 100)}%` 
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Processing Statistics */}
            <Card className="group relative overflow-hidden bg-white/80 backdrop-blur-sm border border-white/20 shadow-lg hover:shadow-xl transition-all duration-300 rounded-2xl h-96">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <CardHeader className="relative">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="p-1.5 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg mr-3 shadow-sm">
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-lg font-semibold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Processing Statistics
                    </span>
                  </div>
                  {showDetails && (
                    <Badge variant="outline" className="bg-amber-50/80 text-amber-700 border-amber-200">
                      Live Metrics
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="relative">
                <div className="space-y-4">
                  <div className="group/stat p-4 rounded-2xl bg-gradient-to-r from-blue-50/50 to-indigo-50/30 backdrop-blur-sm border border-blue-100/40 hover:border-blue-200/60 transition-all duration-300">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-blue-600 rounded-full shadow-sm"></div>
                        <span className="font-semibold text-gray-700">Template Recognition</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-blue-100 text-blue-700 font-bold">
                          {analytics.recognition_stats.total_processed > 0 
                            ? Math.round((analytics.recognition_stats.template_recognized / analytics.recognition_stats.total_processed) * 100)
                            : 0}%
                        </Badge>
                        {showDetails && (
                          <span className="text-sm text-gray-500 font-mono">
                            {analytics.recognition_stats.template_recognized}/{analytics.recognition_stats.total_processed}
                          </span>
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={analytics.recognition_stats.total_processed > 0 
                        ? (analytics.recognition_stats.template_recognized / analytics.recognition_stats.total_processed) * 100 
                        : 0} 
                      className="h-3 rounded-full"
                    />
                  </div>
                  
                  <div className="group/stat p-4 rounded-2xl bg-gradient-to-r from-green-50/50 to-emerald-50/30 backdrop-blur-sm border border-green-100/40 hover:border-green-200/60 transition-all duration-300">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-green-600 rounded-full shadow-sm"></div>
                        <span className="font-semibold text-gray-700">Auto-Categorized</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-green-100 text-green-700 font-bold">
                          {analytics.recognition_stats.total_processed > 0 
                            ? Math.round((analytics.recognition_stats.auto_categorized / analytics.recognition_stats.total_processed) * 100)
                            : 0}%
                        </Badge>
                        {showDetails && (
                          <span className="text-sm text-gray-500 font-mono">
                            {analytics.recognition_stats.auto_categorized}/{analytics.recognition_stats.total_processed}
                          </span>
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={analytics.recognition_stats.total_processed > 0 
                        ? (analytics.recognition_stats.auto_categorized / analytics.recognition_stats.total_processed) * 100 
                        : 0} 
                      className="h-3 rounded-full"
                    />
                  </div>
                  
                  <div className="group/stat p-4 rounded-2xl bg-gradient-to-r from-purple-50/50 to-violet-50/30 backdrop-blur-sm border border-purple-100/40 hover:border-purple-200/60 transition-all duration-300">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-purple-600 rounded-full shadow-sm"></div>
                        <span className="font-semibold text-gray-700">High Confidence</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className="bg-purple-100 text-purple-700 font-bold">
                          {analytics.recognition_stats.total_processed > 0 
                            ? Math.round((analytics.recognition_stats.high_confidence / analytics.recognition_stats.total_processed) * 100)
                            : 0}%
                        </Badge>
                        {showDetails && (
                          <span className="text-sm text-gray-500 font-mono">
                            {analytics.recognition_stats.high_confidence}/{analytics.recognition_stats.total_processed}
                          </span>
                        )}
                      </div>
                    </div>
                    <Progress 
                      value={analytics.recognition_stats.total_processed > 0 
                        ? (analytics.recognition_stats.high_confidence / analytics.recognition_stats.total_processed) * 100 
                        : 0} 
                      className="h-3 rounded-full"
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