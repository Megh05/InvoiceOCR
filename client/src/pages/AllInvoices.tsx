import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, DollarSign, FileText, Building2, Eye, Download } from "lucide-react";
import { format } from "date-fns";

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

  const handleViewDetails = async (invoiceId: string) => {
    try {
      const response = await fetch(`/api/invoices/${invoiceId}`);
      const invoiceData = await response.json();
      
      // Create a new window to display invoice details
      const detailWindow = window.open('', '_blank', 'width=800,height=600');
      if (detailWindow) {
        detailWindow.document.write(`
          <!DOCTYPE html>
          <html>
          <head>
            <title>Invoice Details - ${invoiceData.invoice_number || invoiceData.id}</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; line-height: 1.6; }
              .header { border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
              .section { margin-bottom: 20px; }
              .line-items { width: 100%; border-collapse: collapse; margin-top: 10px; }
              .line-items th, .line-items td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              .line-items th { background-color: #f2f2f2; }
              .totals { text-align: right; margin-top: 20px; }
              .confidence { padding: 4px 8px; border-radius: 4px; font-size: 12px; }
              .confidence.high { background-color: #dcfce7; color: #166534; }
              .confidence.medium { background-color: #fef3c7; color: #92400e; }
              .confidence.low { background-color: #fee2e2; color: #991b1b; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>Invoice Details</h1>
              <p><strong>Invoice Number:</strong> ${invoiceData.invoice_number || 'N/A'}</p>
              <p><strong>Date:</strong> ${formatDate(invoiceData.invoice_date)}</p>
              <p><strong>Confidence:</strong> 
                <span class="confidence ${invoiceData.confidence >= 0.9 ? 'high' : invoiceData.confidence >= 0.7 ? 'medium' : 'low'}">
                  ${Math.round(invoiceData.confidence * 100)}%
                </span>
              </p>
            </div>
            
            <div class="section">
              <h3>Vendor Information</h3>
              <p><strong>Name:</strong> ${invoiceData.vendor_name || 'N/A'}</p>
              <p><strong>Address:</strong> ${invoiceData.vendor_address || 'N/A'}</p>
            </div>
            
            <div class="section">
              <h3>Bill To</h3>
              <p>${invoiceData.bill_to || 'N/A'}</p>
            </div>
            
            ${invoiceData.line_items && invoiceData.line_items.length > 0 ? `
            <div class="section">
              <h3>Line Items</h3>
              <table class="line-items">
                <thead>
                  <tr>
                    <th>Description</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoiceData.line_items.map((item: LineItem) => `
                    <tr>
                      <td>${item.description}</td>
                      <td>${item.qty}</td>
                      <td>${formatCurrency(item.unit_price, invoiceData.currency)}</td>
                      <td>${formatCurrency(item.amount, invoiceData.currency)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
            ` : ''}
            
            <div class="totals">
              <p><strong>Subtotal:</strong> ${formatCurrency(invoiceData.subtotal, invoiceData.currency)}</p>
              <p><strong>Tax:</strong> ${formatCurrency(invoiceData.tax, invoiceData.currency)}</p>
              <p><strong>Shipping:</strong> ${formatCurrency(invoiceData.shipping, invoiceData.currency)}</p>
              <p style="font-size: 18px; font-weight: bold;"><strong>Total:</strong> ${formatCurrency(invoiceData.total, invoiceData.currency)}</p>
            </div>
            
            <div class="section">
              <h3>Processing Information</h3>
              <p><strong>Processed:</strong> ${formatDate(invoiceData.created_at)}</p>
              <p><strong>Last Updated:</strong> ${formatDate(invoiceData.updated_at)}</p>
            </div>
          </body>
          </html>
        `);
        detailWindow.document.close();
      }
    } catch (error) {
      console.error('Failed to load invoice details:', error);
      alert('Failed to load invoice details');
    }
  };

  const handleDownloadJSON = (invoice: Invoice) => {
    const dataStr = JSON.stringify(invoice, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `invoice-${invoice.invoice_number || invoice.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">All Invoices</h1>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">All Invoices</h1>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <p className="text-red-600">Failed to load invoices. Please try again later.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!invoices || invoices.length === 0) {
    return (
      <div className="container mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">All Invoices</h1>
        <Card>
          <CardContent className="pt-6 text-center">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
            <p className="text-gray-500">Process some documents to see them here.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">All Invoices</h1>
        <Badge variant="secondary" className="text-sm">
          {invoices.length} {invoices.length === 1 ? 'invoice' : 'invoices'}
        </Badge>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {invoices.map((invoice) => (
          <Card key={invoice.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {invoice.invoice_number || `Invoice ${invoice.id.slice(0, 8)}`}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-1 mt-1">
                    <Calendar className="h-4 w-4" />
                    {formatDate(invoice.invoice_date)}
                  </CardDescription>
                </div>
                <Badge className={getConfidenceColor(invoice.confidence)}>
                  {Math.round(invoice.confidence * 100)}%
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                <span className="text-sm font-medium">
                  {invoice.vendor_name || "Unknown Vendor"}
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-gray-500" />
                <span className="text-lg font-bold text-green-600">
                  {formatCurrency(invoice.total, invoice.currency || "USD")}
                </span>
              </div>
              
              <Separator />
              
              <div className="text-xs text-gray-500">
                <p>Processed: {formatDate(invoice.created_at)}</p>
              </div>
              
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewDetails(invoice.id)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownloadJSON(invoice)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}