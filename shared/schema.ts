import { pgTable, text, varchar, real, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const invoices = pgTable("invoices", {
  id: varchar("id").primaryKey().default(`gen_random_uuid()`),
  invoice_number: text("invoice_number"),
  invoice_date: text("invoice_date"), // YYYY-MM-DD format
  vendor_name: text("vendor_name"),
  vendor_address: text("vendor_address"),
  bill_to: text("bill_to"),
  ship_to: text("ship_to"),
  currency: text("currency"),
  subtotal: real("subtotal").notNull().default(0),
  tax: real("tax").notNull().default(0),
  shipping: real("shipping").notNull().default(0),
  total: real("total").notNull().default(0),
  raw_ocr_text: text("raw_ocr_text").notNull(),
  mistral_ocr_text: text("mistral_ocr_text").notNull(),
  ocr_similarity_score: real("ocr_similarity_score").default(0),
  confidence: real("confidence").notNull().default(0),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export const line_items = pgTable("line_items", {
  id: varchar("id").primaryKey().default(`gen_random_uuid()`),
  invoice_id: varchar("invoice_id").notNull().references(() => invoices.id, { onDelete: "cascade" }),
  line_number: integer("line_number").notNull(),
  sku: text("sku"),
  description: text("description").notNull(),
  qty: integer("qty").notNull().default(1),
  unit_price: real("unit_price").notNull().default(0),
  amount: real("amount").notNull().default(0),
  tax: real("tax").notNull().default(0),
});

export const insertInvoiceSchema = createInsertSchema(invoices).omit({
  id: true,
  created_at: true,
  updated_at: true,
});

export const insertLineItemSchema = createInsertSchema(line_items).omit({
  id: true,
});

export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoices.$inferSelect;
export type InsertLineItem = z.infer<typeof insertLineItemSchema>;
export type LineItem = typeof line_items.$inferSelect;

// Parse request schema
export const parseRequestSchema = z.object({
  image_url: z.string().url().optional(),
  image_base64: z.string().optional(),
  ocr_text: z.string().optional(),
}).refine(
  (data) => data.image_url || data.image_base64 || data.ocr_text,
  "At least one of image_url, image_base64, or ocr_text must be provided"
);

export type ParseRequest = z.infer<typeof parseRequestSchema>;

// Canonical invoice schema for parsing
export const canonicalInvoiceSchema = z.object({
  invoice_number: z.string().optional(),
  invoice_date: z.string().optional(), // YYYY-MM-DD format
  vendor_name: z.string().optional(),
  vendor_address: z.string().optional(),
  bill_to: z.string().optional(),
  ship_to: z.string().optional(),
  currency: z.string().optional(),
  subtotal: z.number().default(0),
  tax: z.number().default(0),
  shipping: z.number().default(0),
  total: z.number().default(0),
  line_items: z.array(z.object({
    line_number: z.number(),
    sku: z.string().optional(),
    description: z.string(),
    qty: z.number().default(1),
    unit_price: z.number().default(0),
    amount: z.number().default(0),
    tax: z.number().default(0),
  })).default([]),
  raw_ocr_text: z.string(),
  mistral_ocr_text: z.string(),
  ocr_similarity_score: z.number().default(0),
  template_id: z.string().optional(),
  category: z.string().optional(),
});

export type CanonicalInvoice = z.infer<typeof canonicalInvoiceSchema>;
