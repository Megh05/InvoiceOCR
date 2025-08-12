import { type Invoice, type LineItem, type InsertInvoice, type InsertLineItem } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getInvoice(id: string): Promise<Invoice | undefined>;
  getInvoices(): Promise<Invoice[]>;
  createInvoice(invoice: InsertInvoice): Promise<Invoice>;
  updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<boolean>;
  
  getLineItemsByInvoiceId(invoiceId: string): Promise<LineItem[]>;
  createLineItem(lineItem: InsertLineItem): Promise<LineItem>;
  updateLineItem(id: string, lineItem: Partial<InsertLineItem>): Promise<LineItem | undefined>;
  deleteLineItem(id: string): Promise<boolean>;
  deleteLineItemsByInvoiceId(invoiceId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private invoices: Map<string, Invoice>;
  private lineItems: Map<string, LineItem>;

  constructor() {
    this.invoices = new Map();
    this.lineItems = new Map();
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    return this.invoices.get(id);
  }

  async getInvoices(): Promise<Invoice[]> {
    return Array.from(this.invoices.values()).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const id = randomUUID();
    const now = new Date();
    const invoice: Invoice = { 
      ...insertInvoice, 
      id, 
      created_at: now,
      updated_at: now 
    };
    this.invoices.set(id, invoice);
    return invoice;
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const existing = this.invoices.get(id);
    if (!existing) return undefined;
    
    const updated: Invoice = { 
      ...existing, 
      ...invoice, 
      updated_at: new Date() 
    };
    this.invoices.set(id, updated);
    return updated;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const deleted = this.invoices.delete(id);
    if (deleted) {
      await this.deleteLineItemsByInvoiceId(id);
    }
    return deleted;
  }

  async getLineItemsByInvoiceId(invoiceId: string): Promise<LineItem[]> {
    return Array.from(this.lineItems.values())
      .filter(item => item.invoice_id === invoiceId)
      .sort((a, b) => a.line_number - b.line_number);
  }

  async createLineItem(insertLineItem: InsertLineItem): Promise<LineItem> {
    const id = randomUUID();
    const lineItem: LineItem = { ...insertLineItem, id };
    this.lineItems.set(id, lineItem);
    return lineItem;
  }

  async updateLineItem(id: string, lineItem: Partial<InsertLineItem>): Promise<LineItem | undefined> {
    const existing = this.lineItems.get(id);
    if (!existing) return undefined;
    
    const updated: LineItem = { ...existing, ...lineItem };
    this.lineItems.set(id, updated);
    return updated;
  }

  async deleteLineItem(id: string): Promise<boolean> {
    return this.lineItems.delete(id);
  }

  async deleteLineItemsByInvoiceId(invoiceId: string): Promise<void> {
    for (const [id, item] of this.lineItems.entries()) {
      if (item.invoice_id === invoiceId) {
        this.lineItems.delete(id);
      }
    }
  }
}

export const storage = new MemStorage();
