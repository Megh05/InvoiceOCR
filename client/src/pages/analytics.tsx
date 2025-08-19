import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { FileText, TrendingUp, Building2, Calendar, DollarSign, Target } from "lucide-react";
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

export default function Analytics() {
  const { data: analytics, isLoading } = useQuery<InvoiceAnalytics>({
    queryKey: ['/api/analytics'],
    refetchInterval: 30000, // Refresh every 30 seconds
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
      <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice Analytics</h1>
          <p className="text-gray-600 mt-1">Insights and patterns from your processed invoices</p>
        </div>
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <Calendar className="w-4 h-4 mr-2" />
          Real-time data
        </Badge>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.total_invoices.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {analytics.recognition_stats.template_recognized} template-recognized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${analytics.total_amount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Avg: ${analytics.average_amount.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recognition Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.recognition_stats.total_processed > 0 
                ? Math.round((analytics.recognition_stats.template_recognized / analytics.recognition_stats.total_processed) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Template detection success
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Data Quality</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics.recognition_stats.total_processed > 0 
                ? Math.round((analytics.recognition_stats.high_confidence / analytics.recognition_stats.total_processed) * 100)
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              High confidence extractions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Category Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percentage }) => `${name} (${percentage}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [value, "Count"]} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Monthly Trends */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Monthly Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.monthly_trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3B82F6" name="Invoice Count" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Template Recognition Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="w-5 h-5 mr-2" />
            Template Recognition Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.templates.map((template, index) => (
              <div key={template.template_name} className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline" style={{ backgroundColor: COLORS[index % COLORS.length], color: 'white' }}>
                      {template.template_name}
                    </Badge>
                    <span className="text-sm text-gray-600">{template.count} invoices</span>
                  </div>
                  <Badge variant="secondary">
                    {Math.round(template.confidence_avg * 100)}% avg confidence
                  </Badge>
                </div>
                <Progress value={template.confidence_avg * 100} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Vendors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Building2 className="w-5 h-5 mr-2" />
              Top Vendors by Volume
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {analytics.top_vendors.slice(0, 5).map((vendor, index) => (
                <div key={vendor.vendor_name} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <div className="font-medium">{vendor.vendor_name}</div>
                    <div className="text-sm text-gray-600">{vendor.count} invoices</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${vendor.total_amount.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">total amount</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <FileText className="w-5 h-5 mr-2" />
              Processing Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Template Recognition</span>
                <div className="flex items-center space-x-2">
                  <Progress 
                    value={analytics.recognition_stats.total_processed > 0 
                      ? (analytics.recognition_stats.template_recognized / analytics.recognition_stats.total_processed) * 100 
                      : 0} 
                    className="w-24 h-2" 
                  />
                  <span className="text-sm font-medium">
                    {analytics.recognition_stats.template_recognized}/{analytics.recognition_stats.total_processed}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">Auto-Categorized</span>
                <div className="flex items-center space-x-2">
                  <Progress 
                    value={analytics.recognition_stats.total_processed > 0 
                      ? (analytics.recognition_stats.auto_categorized / analytics.recognition_stats.total_processed) * 100 
                      : 0} 
                    className="w-24 h-2" 
                  />
                  <span className="text-sm font-medium">
                    {analytics.recognition_stats.auto_categorized}/{analytics.recognition_stats.total_processed}
                  </span>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm">High Confidence</span>
                <div className="flex items-center space-x-2">
                  <Progress 
                    value={analytics.recognition_stats.total_processed > 0 
                      ? (analytics.recognition_stats.high_confidence / analytics.recognition_stats.total_processed) * 100 
                      : 0} 
                    className="w-24 h-2" 
                  />
                  <span className="text-sm font-medium">
                    {analytics.recognition_stats.high_confidence}/{analytics.recognition_stats.total_processed}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </Layout>
  );
}