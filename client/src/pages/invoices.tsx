import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { api } from "@/services/api";
// Invoice type will be inferred from the API response
import { Eye, Trash2, Download, Search, FileText, Activity, Filter } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Invoices() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: invoices = [], isLoading, error } = useQuery<any[]>({
    queryKey: ["/api/invoices"],
  });

  const deleteMutation = useMutation({
    mutationFn: api.deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({
        title: "Success",
        description: "Invoice deleted successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const filteredInvoices = invoices.filter((invoice: any) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      invoice.invoice_number?.toLowerCase().includes(term) ||
      invoice.vendor_name?.toLowerCase().includes(term) ||
      invoice.id.toLowerCase().includes(term)
    );
  });

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 0.85) {
      return <Badge className="confidence-high">High ({Math.round(confidence * 100)}%)</Badge>;
    } else if (confidence >= 0.6) {
      return <Badge className="confidence-medium">Medium ({Math.round(confidence * 100)}%)</Badge>;
    } else {
      return <Badge className="confidence-low">Low ({Math.round(confidence * 100)}%)</Badge>;
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Are you sure you want to delete this invoice?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleExportJSON = async (invoice: any) => {
    await api.exportJSON({
      invoice_number: invoice.invoice_number,
      invoice_date: invoice.invoice_date,
      vendor_name: invoice.vendor_name,
      vendor_address: invoice.vendor_address,
      bill_to: invoice.bill_to,
      ship_to: invoice.ship_to,
      currency: invoice.currency,
      subtotal: invoice.subtotal,
      tax: invoice.tax,
      shipping: invoice.shipping,
      total: invoice.total,
      line_items: invoice.line_items || [],
    });
  };

  if (error) {
    return (
      <Layout>
        <div className="text-center py-8">
          <p className="text-red-600">Error loading invoices: {error.message}</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-7xl mx-auto p-6 space-y-8">
          {/* Enhanced Header */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl p-8 shadow-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                    <FileText className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                      Invoice Library
                    </h1>
                    <p className="text-gray-600 text-lg">
                      {filteredInvoices.length} of {invoices.length} invoices processed
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-300"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-white/80 backdrop-blur-sm hover:bg-white transition-all duration-300"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export All
                  </Button>
                  
                  <Badge variant="outline" className="bg-green-50/80 text-green-700 border-green-200 px-4 py-2 backdrop-blur-sm">
                    <Activity className="w-4 h-4 mr-2" />
                    Live Data
                  </Badge>
                </div>
              </div>
              
              {/* Enhanced Search */}
              <div className="mt-6">
                <div className="relative max-w-lg">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-2xl blur-xl"></div>
                  <div className="relative bg-white/80 backdrop-blur-sm rounded-2xl border border-white/40 shadow-lg">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <Input
                      placeholder="Search by invoice number, vendor, or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 pr-4 py-3 bg-transparent border-none text-lg font-medium placeholder:text-gray-400 focus:ring-0 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Enhanced Invoices Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="relative group animate-pulse">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-200/20 to-gray-300/20 rounded-3xl blur-2xl"></div>
                  <div className="relative bg-white/80 backdrop-blur-sm border border-white/40 rounded-3xl p-6 shadow-lg">
                    <div className="space-y-4">
                      <div className="h-6 bg-gray-200/70 rounded-lg w-3/4"></div>
                      <div className="h-4 bg-gray-200/50 rounded w-1/2"></div>
                      <div className="space-y-2 pt-4">
                        <div className="h-3 bg-gray-200/50 rounded"></div>
                        <div className="h-3 bg-gray-200/50 rounded w-2/3"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-16">
              <div className="relative max-w-md mx-auto">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-3xl blur-3xl"></div>
                <div className="relative bg-white/80 backdrop-blur-sm border border-white/40 rounded-3xl p-12 shadow-xl">
                  <div className="w-20 h-20 mx-auto mb-6 p-4 bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl">
                    <Search className="w-full h-full text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
                    {searchTerm ? "No invoices found" : "No invoices yet"}
                  </h3>
                  <p className="text-gray-600 text-lg mb-6">
                    {searchTerm 
                      ? "Try adjusting your search terms"
                      : "Start by processing your first invoice"
                    }
                  </p>
                  {!searchTerm && (
                    <Button 
                      onClick={() => window.location.href = "/"}
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      Process Invoice
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredInvoices.map((invoice: any) => (
                <div key={invoice.id} className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <Card className="relative bg-white/90 backdrop-blur-sm border border-white/40 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 group-hover:scale-[1.02] overflow-hidden">
                    {/* Confidence Indicator Bar */}
                    <div className={`absolute top-0 left-0 right-0 h-1 ${
                      (invoice.confidence || 0) >= 0.85 
                        ? 'bg-gradient-to-r from-green-400 to-green-600' 
                        : (invoice.confidence || 0) >= 0.6 
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' 
                          : 'bg-gradient-to-r from-red-400 to-red-600'
                    }`}></div>
                    
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-md">
                              <FileText className="w-5 h-5 text-white" />
                            </div>
                            <CardTitle className="text-xl font-bold text-gray-800 line-clamp-1">
                              {invoice.invoice_number || `Invoice ${invoice.id.slice(-8)}`}
                            </CardTitle>
                          </div>
                          <p className="text-gray-600 font-medium text-lg">
                            {invoice.vendor_name || "Unknown Vendor"}
                          </p>
                        </div>
                        <div className="ml-3">
                          {getConfidenceBadge(invoice.confidence)}
                        </div>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="group/item">
                          <p className="text-gray-500 text-sm font-medium mb-1">Date</p>
                          <p className="font-semibold text-gray-800 text-lg">
                            {invoice.invoice_date || "Not specified"}
                          </p>
                        </div>
                        <div className="group/item">
                          <p className="text-gray-500 text-sm font-medium mb-1">Total</p>
                          <p className="font-bold text-2xl bg-gradient-to-r from-green-600 to-green-700 bg-clip-text text-transparent">
                            {invoice.currency || "$"}{(invoice.total || 0).toFixed(2)}
                          </p>
                        </div>
                        <div className="group/item">
                          <p className="text-gray-500 text-sm font-medium mb-1">Created</p>
                          <p className="font-medium text-gray-700">
                            {new Date(invoice.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="group/item">
                          <p className="text-gray-500 text-sm font-medium mb-1">Items</p>
                          <p className="font-semibold text-gray-800 text-lg">
                            {invoice.line_items?.length || 0}
                          </p>
                        </div>
                      </div>

                      <div className="flex space-x-3 pt-4 border-t border-gray-100">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1 bg-white/80 backdrop-blur-sm hover:bg-blue-50 hover:border-blue-300 transition-all duration-300 rounded-xl"
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleExportJSON(invoice)}
                          className="bg-white/80 backdrop-blur-sm hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-all duration-300 rounded-xl"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleDelete(invoice.id)}
                          className="bg-white/80 backdrop-blur-sm hover:bg-red-50 hover:border-red-300 text-red-600 hover:text-red-700 transition-all duration-300 rounded-xl"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
