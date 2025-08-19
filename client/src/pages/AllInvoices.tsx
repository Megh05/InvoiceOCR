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
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Invoices</h1>
            <p className="text-gray-600">
              {isLoading ? "Loading..." : `${invoices?.length || 0} invoices processed`}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline" 
                  disabled={!invoices || invoices.length === 0}
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

        {/* Summary Cards */}
        {!isLoading && invoices && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{invoices.length}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(invoices.reduce((sum, inv) => sum + inv.total, 0))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Average Amount</CardTitle>
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {formatCurrency(invoices.length > 0 ? invoices.reduce((sum, inv) => sum + inv.total, 0) / invoices.length : 0)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">High Confidence</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round((invoices.filter(inv => inv.confidence >= 0.8).length / invoices.length) * 100)}%
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Invoices List */}
        <div className="space-y-4">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-32"></div>
                        <div className="h-3 bg-gray-200 rounded w-48"></div>
                      </div>
                      <div className="h-6 bg-gray-200 rounded w-16"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : invoices && invoices.length > 0 ? (
            invoices.map((invoice) => (
              <Card key={invoice.id} className="hover:bg-gray-50 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {invoice.invoice_number || `Invoice ${invoice.id.slice(0, 8)}`}
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-600 mt-1">
                            <span className="flex items-center">
                              <Calendar className="mr-1 h-3 w-3" />
                              {formatDate(invoice.invoice_date)}
                            </span>
                            <span className="flex items-center">
                              <Building2 className="mr-1 h-3 w-3" />
                              {invoice.vendor_name || "Unknown Vendor"}
                            </span>
                            <span className="flex items-center">
                              <DollarSign className="mr-1 h-3 w-3" />
                              {formatCurrency(invoice.total, invoice.currency || "USD")}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <Badge className={getConfidenceColor(invoice.confidence)}>
                        {Math.round(invoice.confidence * 100)}% confidence
                      </Badge>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewDetails(invoice.id)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </Button>
                    </div>
                  </div>
                  
                  <Separator className="my-4" />
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-500">Subtotal</span>
                      <p className="mt-1">{formatCurrency(invoice.subtotal, invoice.currency || "USD")}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Tax</span>
                      <p className="mt-1">{formatCurrency(invoice.tax, invoice.currency || "USD")}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Shipping</span>
                      <p className="mt-1">{formatCurrency(invoice.shipping, invoice.currency || "USD")}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-500">Processed</span>
                      <p className="mt-1">{formatDate(invoice.created_at)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No invoices yet</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Start by processing your first invoice document.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}