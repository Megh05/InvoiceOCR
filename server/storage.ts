import { type Invoice, type LineItem, type InsertInvoice, type InsertLineItem } from "@shared/schema";
import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

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

export class FileStorage implements IStorage {
  private invoicesPath: string;
  private lineItemsPath: string;
  private dataDir: string;

  constructor() {
    this.dataDir = path.join(process.cwd(), 'data');
    this.invoicesPath = path.join(this.dataDir, 'invoices.json');
    this.lineItemsPath = path.join(this.dataDir, 'line_items.json');
    this.ensureDataDirectory();
  }

  private async ensureDataDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create data directory:', error);
    }
  }

  private async loadInvoices(): Promise<Map<string, Invoice>> {
    try {
      const data = await fs.readFile(this.invoicesPath, 'utf-8');
      const invoices = JSON.parse(data) as Invoice[];
      return new Map(invoices.map(invoice => [invoice.id, invoice]));
    } catch (error) {
      // File doesn't exist or is empty, return empty map
      return new Map();
    }
  }

  private async saveInvoices(invoices: Map<string, Invoice>): Promise<void> {
    const invoiceArray = Array.from(invoices.values());
    await fs.writeFile(this.invoicesPath, JSON.stringify(invoiceArray, null, 2));
  }

  private async loadLineItems(): Promise<Map<string, LineItem>> {
    try {
      const data = await fs.readFile(this.lineItemsPath, 'utf-8');
      const lineItems = JSON.parse(data) as LineItem[];
      return new Map(lineItems.map(item => [item.id, item]));
    } catch (error) {
      // File doesn't exist or is empty, return empty map
      return new Map();
    }
  }

  private async saveLineItems(lineItems: Map<string, LineItem>): Promise<void> {
    const lineItemArray = Array.from(lineItems.values());
    await fs.writeFile(this.lineItemsPath, JSON.stringify(lineItemArray, null, 2));
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const invoices = await this.loadInvoices();
    return invoices.get(id);
  }

  async getInvoices(): Promise<Invoice[]> {
    const invoices = await this.loadInvoices();
    return Array.from(invoices.values()).sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async createInvoice(insertInvoice: InsertInvoice): Promise<Invoice> {
    const invoices = await this.loadInvoices();
    const id = randomUUID();
    const now = new Date();
    const invoice: Invoice = { 
      id, 
      invoice_number: insertInvoice.invoice_number || null,
      invoice_date: insertInvoice.invoice_date || null,
      vendor_name: insertInvoice.vendor_name || null,
      vendor_address: insertInvoice.vendor_address || null,
      bill_to: insertInvoice.bill_to || null,
      ship_to: insertInvoice.ship_to || null,
      currency: insertInvoice.currency || null,
      subtotal: insertInvoice.subtotal || 0,
      tax: insertInvoice.tax || 0,
      shipping: insertInvoice.shipping || 0,
      total: insertInvoice.total || 0,
      raw_ocr_text: insertInvoice.raw_ocr_text,
      mistral_ocr_text: insertInvoice.mistral_ocr_text,
      ocr_similarity_score: insertInvoice.ocr_similarity_score || 0,
      confidence: insertInvoice.confidence || 0,
      created_at: now,
      updated_at: now 
    };
    invoices.set(id, invoice);
    await this.saveInvoices(invoices);
    return invoice;
  }

  async updateInvoice(id: string, invoice: Partial<InsertInvoice>): Promise<Invoice | undefined> {
    const invoices = await this.loadInvoices();
    const existing = invoices.get(id);
    if (!existing) return undefined;
    
    const updated: Invoice = { 
      ...existing, 
      ...invoice, 
      updated_at: new Date() 
    };
    invoices.set(id, updated);
    await this.saveInvoices(invoices);
    return updated;
  }

  async deleteInvoice(id: string): Promise<boolean> {
    const invoices = await this.loadInvoices();
    const deleted = invoices.delete(id);
    if (deleted) {
      await this.saveInvoices(invoices);
      await this.deleteLineItemsByInvoiceId(id);
    }
    return deleted;
  }

  async getLineItemsByInvoiceId(invoiceId: string): Promise<LineItem[]> {
    const lineItems = await this.loadLineItems();
    return Array.from(lineItems.values())
      .filter(item => item.invoice_id === invoiceId)
      .sort((a, b) => a.line_number - b.line_number);
  }

  async createLineItem(insertLineItem: InsertLineItem): Promise<LineItem> {
    const lineItems = await this.loadLineItems();
    const id = randomUUID();
    const lineItem: LineItem = {
      id,
      invoice_id: insertLineItem.invoice_id,
      line_number: insertLineItem.line_number,
      sku: insertLineItem.sku || null,
      description: insertLineItem.description,
      qty: insertLineItem.qty || 1,
      unit_price: insertLineItem.unit_price || 0,
      amount: insertLineItem.amount || 0,
      tax: insertLineItem.tax || 0,
    };
    lineItems.set(id, lineItem);
    await this.saveLineItems(lineItems);
    return lineItem;
  }

  async updateLineItem(id: string, lineItem: Partial<InsertLineItem>): Promise<LineItem | undefined> {
    const lineItems = await this.loadLineItems();
    const existing = lineItems.get(id);
    if (!existing) return undefined;
    
    const updated: LineItem = { ...existing, ...lineItem };
    lineItems.set(id, updated);
    await this.saveLineItems(lineItems);
    return updated;
  }

  async deleteLineItem(id: string): Promise<boolean> {
    const lineItems = await this.loadLineItems();
    const deleted = lineItems.delete(id);
    if (deleted) {
      await this.saveLineItems(lineItems);
    }
    return deleted;
  }

  async deleteLineItemsByInvoiceId(invoiceId: string): Promise<void> {
    const lineItems = await this.loadLineItems();
    const items = Array.from(lineItems.entries());
    let hasChanges = false;
    
    for (const [id, item] of items) {
      if (item.invoice_id === invoiceId) {
        lineItems.delete(id);
        hasChanges = true;
      }
    }
    
    if (hasChanges) {
      await this.saveLineItems(lineItems);
    }
  }
}

export const storage = new FileStorage();
