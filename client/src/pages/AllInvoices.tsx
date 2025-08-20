import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, DollarSign, FileText, Building2, Eye, Download, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format } from "date-fns";
import Layout from "@/components/Layout";

interface Invoice {
  id: string;
  invoice_number: string | null;
  invoice_date: string | null;
  vendor_name: string | null;
  vendor_address: string | null;
  bill_to: string | null;
  currency: string | null;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  confidence: number;
  created_at: string;
  updated_at: string;
}

interface LineItem {
  id: string;
  invoice_id: string;
  line_number: number;
  sku: string | null;
  description: string;
  qty: number;
  unit_price: number;
  amount: number;
  tax: number;
}

export default function AllInvoices() {
  const { data: invoices, isLoading, error } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });

  const formatCurrency = (amount: number, currency: string = "USD") => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch {
      return dateString;
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "bg-green-100 text-green-800";
    if (confidence >= 0.7) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const handleViewDetails = (invoiceId: string) => {
    window.location.href = `/invoices/${invoiceId}`;
  };

  const handleExport = (invoiceId: string, format: 'json' | 'csv' | 'pdf') => {
    const exportUrl = `/api/invoices/${invoiceId}/export/${format}`;
    const downloadLink = document.createElement('a');
    downloadLink.href = exportUrl;
    downloadLink.download = `invoice-${invoiceId}.${format === 'pdf' ? 'html' : format}`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  const handleExportCSV = () => {
    if (!invoices || invoices.length === 0) return;

    const headers = [
      "Invoice Number",
      "Date", 
      "Vendor",
      "Total Amount",
      "Currency",
      "Confidence",
      "Created At"
    ];

    const csvContent = [
      headers.join(","),
      ...invoices.map(invoice => [
        `"${invoice.invoice_number || ''}"`,
        `"${formatDate(invoice.invoice_date)}"`,
        `"${invoice.vendor_name || ''}"`,
        invoice.total,
        `"${invoice.currency || 'USD'}"`,
        Math.round(invoice.confidence * 100),
        `"${formatDate(invoice.created_at)}"`
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoices-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    if (!invoices || invoices.length === 0) return;

    const jsonData = {
      exported_at: new Date().toISOString(),
      total_invoices: invoices.length,
      invoices: invoices.map(invoice => ({
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        invoice_date: invoice.invoice_date,
        vendor_name: invoice.vendor_name,
        vendor_address: invoice.vendor_address,
        bill_to: invoice.bill_to,
        currency: invoice.currency,
        subtotal: invoice.subtotal,
        tax: invoice.tax,
        shipping: invoice.shipping,
        total: invoice.total,
        confidence: invoice.confidence,
        created_at: invoice.created_at
      }))
    };

    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `invoices-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPDF = () => {
    if (!invoices || invoices.length === 0) return;

    // Create a printable HTML page
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice Report - ${new Date().toLocaleDateString()}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
          .summary { background: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0; }
          .invoice-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .invoice-table th, .invoice-table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          .invoice-table th { background-color: #f2f2f2; font-weight: bold; }
          .invoice-table tr:nth-child(even) { background-color: #f9f9f9; }
          .confidence { padding: 2px 6px; border-radius: 3px; font-size: 12px; }
          .confidence.high { background-color: #dcfce7; color: #166534; }
          .confidence.medium { background-color: #fef3c7; color: #92400e; }
          .confidence.low { background-color: #fee2e2; color: #991b1b; }
          @media print { body { margin: 0; } }
        </style>
      </head>
      <body>
        <h1>Invoice Report</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        
        <div class="summary">
          <h3>Summary</h3>
          <p><strong>Total Invoices:</strong> ${invoices.length}</p>
          <p><strong>Total Amount:</strong> ${formatCurrency(invoices.reduce((sum, inv) => sum + inv.total, 0))}</p>
          <p><strong>Average Amount:</strong> ${formatCurrency(invoices.length > 0 ? invoices.reduce((sum, inv) => sum + inv.total, 0) / invoices.length : 0)}</p>
          <p><strong>High Confidence Rate:</strong> ${Math.round((invoices.filter(inv => inv.confidence >= 0.8).length / invoices.length) * 100)}%</p>
        </div>
        
        <table class="invoice-table">
          <thead>
            <tr>
              <th>Invoice #</th>
              <th>Date</th>
              <th>Vendor</th>
              <th>Total</th>
              <th>Currency</th>
              <th>Confidence</th>
              <th>Processed</th>
            </tr>
          </thead>
          <tbody>
            ${invoices.map(invoice => {
              const confidenceClass = invoice.confidence >= 0.9 ? 'high' : invoice.confidence >= 0.7 ? 'medium' : 'low';
              return `
                <tr>
                  <td>${invoice.invoice_number || invoice.id.slice(0, 8)}</td>
                  <td>${formatDate(invoice.invoice_date)}</td>
                  <td>${invoice.vendor_name || 'Unknown'}</td>
                  <td>${formatCurrency(invoice.total, invoice.currency || 'USD')}</td>
                  <td>${invoice.currency || 'USD'}</td>
                  <td><span class="confidence ${confidenceClass}">${Math.round(invoice.confidence * 100)}%</span></td>
                  <td>${formatDate(invoice.created_at)}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      printWindow.print();
      printWindow.close();
    };
  };

  if (error) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-6">
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading invoices</h3>
            <p className="mt-1 text-sm text-gray-500">
              There was a problem loading your invoices. Please try again.
            </p>
          </div>
        </div>
      </Layout>
    );
  }

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
                    <FileText className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-semibold text-gray-900">All Invoices</h1>
                    <p className="text-gray-600 text-sm">
                      {isLoading ? "Loading..." : `${invoices?.length || 0} invoices processed`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="outline" 
                        disabled={!invoices || invoices.length === 0}
                        className="border-white/50 bg-white/60 backdrop-blur-sm text-gray-700 hover:bg-white/80 transition-all duration-200 shadow-sm"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export
                        <ChevronDown className="ml-2 h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={handleExportCSV}>
                      <FileText className="mr-2 h-4 w-4" />
                      Export as CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportJSON}>
                      <FileText className="mr-2 h-4 w-4" />
                      Export as JSON
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportPDF}>
                      <FileText className="mr-2 h-4 w-4" />
                      Export as PDF
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          {!isLoading && invoices && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-600/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-sm border border-white/40 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Invoices</CardTitle>
                    <div className="p-2 bg-gradient-to-br from-blue-100 to-purple-100 rounded-lg">
                      <FileText className="h-4 w-4 text-blue-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 mb-1">{invoices.length}</div>
                    <p className="text-xs text-gray-500">Total processed</p>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-600/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-sm border border-white/40 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Total Amount</CardTitle>
                    <div className="p-2 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg">
                      <DollarSign className="h-4 w-4 text-green-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {formatCurrency(invoices.reduce((sum, inv) => sum + inv.total, 0))}
                    </div>
                    <p className="text-xs text-gray-500">Combined value</p>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-orange-600/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-sm border border-white/40 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">Average Amount</CardTitle>
                    <div className="p-2 bg-gradient-to-br from-amber-100 to-orange-100 rounded-lg">
                      <Building2 className="h-4 w-4 text-amber-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {formatCurrency(invoices.length > 0 ? invoices.reduce((sum, inv) => sum + inv.total, 0) / invoices.length : 0)}
                    </div>
                    <p className="text-xs text-gray-500">Average amount</p>
                  </CardContent>
                </Card>
              </div>

              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-600/10 rounded-2xl blur-xl"></div>
                <Card className="relative bg-white/70 backdrop-blur-sm border border-white/40 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-gray-600">High Confidence</CardTitle>
                    <div className="p-2 bg-gradient-to-br from-purple-100 to-pink-100 rounded-lg">
                      <Calendar className="h-4 w-4 text-purple-600" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {Math.round((invoices.filter(inv => inv.confidence >= 0.8).length / invoices.length) * 100)}%
                    </div>
                    <p className="text-xs text-gray-500">Quality score</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

        {/* Invoices Grid */}
        <div className="space-y-6">
          {isLoading ? (
            // Loading skeleton
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-200/50 to-gray-300/50 rounded-2xl blur-xl"></div>
                  <Card className="relative bg-white/70 backdrop-blur-sm border border-white/40 rounded-2xl shadow-lg animate-pulse h-80">
                    <CardContent className="p-4 space-y-3">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      <div className="h-16 bg-gray-200 rounded"></div>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded w-full"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                      <div className="h-8 bg-gray-200 rounded w-full"></div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          ) : invoices && invoices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {invoices.map((invoice, index) => {
                const gradientColors = [
                  'from-blue-500/10 to-purple-600/10',
                  'from-green-500/10 to-emerald-600/10',
                  'from-amber-500/10 to-orange-600/10',
                  'from-purple-500/10 to-pink-600/10',
                  'from-indigo-500/10 to-blue-600/10',
                  'from-rose-500/10 to-red-600/10',
                ];
                const gradientColor = gradientColors[index % gradientColors.length];
                
                return (
                  <div key={invoice.id} className="relative group">
                    <div className={`absolute inset-0 bg-gradient-to-br ${gradientColor} rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300`}></div>
                    <Card className="relative bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] h-80">
                      <CardContent className="p-4 h-full flex flex-col">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm text-gray-900 truncate">
                              {invoice.invoice_number || `Invoice ${invoice.id.slice(0, 8)}`}
                            </h3>
                            <p className="text-xs text-gray-600 mt-1 truncate">
                              {invoice.vendor_name || "Unknown Vendor"}
                            </p>
                          </div>
                          <Badge className={`text-xs ${getConfidenceColor(invoice.confidence)}`}>
                            {Math.round(invoice.confidence * 100)}%
                          </Badge>
                        </div>

                        {/* Amount Display */}
                        <div className="bg-gray-50/50 rounded-lg p-3 mb-3">
                          <div className="text-center">
                            <div className="text-lg font-bold text-gray-900">
                              {formatCurrency(invoice.total, invoice.currency || "USD")}
                            </div>
                            <div className="text-xs text-gray-500">
                              {formatDate(invoice.invoice_date)}
                            </div>
                          </div>
                        </div>

                        {/* Invoice Details */}
                        <div className="flex-1 space-y-1.5 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-500 truncate">Subtotal:</span>
                            <span className="font-medium text-gray-700 text-right min-w-0">
                              {formatCurrency(invoice.subtotal, invoice.currency || "USD")}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 truncate">Tax:</span>
                            <span className="font-medium text-gray-700 text-right min-w-0">
                              {formatCurrency(invoice.tax, invoice.currency || "USD")}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 truncate">Processed:</span>
                            <span className="font-medium text-gray-700 text-right text-[10px] min-w-0">
                              {formatDate(invoice.created_at)}
                            </span>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-4 space-y-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(invoice.id)}
                            data-testid={`button-view-${invoice.id}`}
                            className="w-full text-xs h-8 border-gray-200 hover:bg-gray-50"
                          >
                            <Eye className="mr-1 h-3 w-3" />
                            View Details
                          </Button>
                          
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                data-testid={`button-export-${invoice.id}`}
                                className="w-full text-xs h-8 border-gray-200 hover:bg-gray-50"
                              >
                                <Download className="mr-1 h-3 w-3" />
                                Export
                                <ChevronDown className="ml-1 h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => handleExport(invoice.id, 'json')}
                                data-testid={`export-json-${invoice.id}`}
                              >
                                <FileText className="w-3 h-3 mr-2" />
                                JSON
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleExport(invoice.id, 'csv')}
                                data-testid={`export-csv-${invoice.id}`}
                              >
                                <FileText className="w-3 h-3 mr-2" />
                                CSV
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleExport(invoice.id, 'pdf')}
                                data-testid={`export-pdf-${invoice.id}`}
                              >
                                <FileText className="w-3 h-3 mr-2" />
                                PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-gray-500/10 to-slate-500/10 rounded-2xl blur-xl"></div>
              <Card className="relative bg-white/80 backdrop-blur-sm border border-white/50 rounded-2xl shadow-lg">
                <CardContent className="p-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices yet</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Start by processing your first invoice document.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
        </div>
      </div>
    </Layout>
  );
}