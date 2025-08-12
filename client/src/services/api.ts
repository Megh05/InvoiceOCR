import { apiRequest } from "@/lib/queryClient";
import { ParseRequest, ParseResult, Invoice, CanonicalInvoice } from "@/types/invoice";

export const api = {
  async parseInvoice(request: ParseRequest): Promise<ParseResult> {
    const response = await apiRequest("POST", "/api/parse", request);
    return response.json();
  },

  async saveInvoice(invoice: CanonicalInvoice): Promise<Invoice> {
    const response = await apiRequest("POST", "/api/invoices", invoice);
    return response.json();
  },

  async getInvoices(): Promise<Invoice[]> {
    const response = await apiRequest("GET", "/api/invoices");
    return response.json();
  },

  async getInvoice(id: string): Promise<Invoice> {
    const response = await apiRequest("GET", `/api/invoices/${id}`);
    return response.json();
  },

  async updateInvoice(id: string, invoice: Partial<CanonicalInvoice>): Promise<Invoice> {
    const response = await apiRequest("PUT", `/api/invoices/${id}`, invoice);
    return response.json();
  },

  async deleteInvoice(id: string): Promise<void> {
    await apiRequest("DELETE", `/api/invoices/${id}`);
  },

  async exportJSON(invoice: CanonicalInvoice): Promise<void> {
    const blob = new Blob([JSON.stringify(invoice, null, 2)], { 
      type: "application/json" 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `invoice-${invoice.invoice_number || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  },

  async exportCSV(lineItems: any[]): Promise<void> {
    if (lineItems.length === 0) return;

    const headers = ["Line Number", "SKU", "Description", "Quantity", "Unit Price", "Amount", "Tax"];
    const csvContent = [
      headers.join(","),
      ...lineItems.map(item => [
        item.line_number,
        item.sku || "",
        `"${item.description.replace(/"/g, '""')}"`,
        item.qty,
        item.unit_price.toFixed(2),
        item.amount.toFixed(2),
        item.tax.toFixed(2)
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "invoice-line-items.csv";
    a.click();
    URL.revokeObjectURL(url);
  }
};
