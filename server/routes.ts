import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { mistralOCR } from "./services/mistral-ocr";
import { deterministicParser } from "./services/parser/deterministic";
import { parseRequestSchema, insertInvoiceSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Parse endpoint - MUST use Mistral OCR
  app.post("/api/parse", async (req, res) => {
    try {
      const requestData = parseRequestSchema.parse(req.body);
      
      let rawOcrText: string;
      let mistralOcrText: string;
      let ocrSimilarityScore = 1.0;

      // Handle image input - MUST call Mistral OCR
      if (requestData.image_url || requestData.image_base64) {
        try {
          const ocrResponse = await mistralOCR.extractText(
            requestData.image_url,
            requestData.image_base64
          );
          rawOcrText = ocrResponse.text;
          mistralOcrText = ocrResponse.text;
        } catch (error) {
          console.error("Mistral OCR failed:", error);
          return res.status(503).json({
            error: "Mistral OCR unavailable",
            message: error instanceof Error ? error.message : "OCR service is temporarily unavailable"
          });
        }
      }
      // Handle OCR text input - still verify with Mistral OCR
      else if (requestData.ocr_text) {
        rawOcrText = requestData.ocr_text;
        
        if (process.env.MISTRAL_API_KEY) {
          try {
            const verificationResponse = await mistralOCR.verifyText(requestData.ocr_text);
            mistralOcrText = verificationResponse.mistral_text;
            ocrSimilarityScore = verificationResponse.similarity_score;
          } catch (error) {
            console.error("Mistral OCR verification failed:", error);
            return res.status(503).json({
              error: "Mistral OCR unavailable for verification",
              message: "Could not verify provided OCR text with Mistral OCR service"
            });
          }
        } else {
          return res.status(400).json({
            error: "Missing API key",
            message: "MISTRAL_API_KEY is required for OCR text verification"
          });
        }
      }

      // Run deterministic parser
      const parsingResult = deterministicParser.parse(rawOcrText, mistralOcrText, ocrSimilarityScore);

      res.json({
        parsed: parsingResult.parsed,
        confidence: parsingResult.confidence,
        raw_ocr_text: rawOcrText,
        mistral_ocr_text: mistralOcrText,
        ocr_similarity_score: ocrSimilarityScore,
        fallback_used: parsingResult.fallback_used,
        action: parsingResult.action,
        field_confidences: parsingResult.field_confidences
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid request",
          message: error.errors
        });
      }
      
      console.error("Parse endpoint error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  // Invoice CRUD endpoints
  app.post("/api/invoices", async (req, res) => {
    try {
      const invoiceData = insertInvoiceSchema.parse(req.body);
      const invoice = await storage.createInvoice(invoiceData);
      
      // Create line items if provided
      if (req.body.line_items && Array.isArray(req.body.line_items)) {
        for (const item of req.body.line_items) {
          await storage.createLineItem({
            ...item,
            invoice_id: invoice.id
          });
        }
      }

      res.status(201).json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid invoice data",
          message: error.errors
        });
      }
      
      console.error("Create invoice error:", error);
      res.status(500).json({
        error: "Failed to create invoice",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  app.get("/api/invoices", async (req, res) => {
    try {
      const invoices = await storage.getInvoices();
      res.json(invoices);
    } catch (error) {
      console.error("Get invoices error:", error);
      res.status(500).json({
        error: "Failed to retrieve invoices",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  app.get("/api/invoices/:id", async (req, res) => {
    try {
      const invoice = await storage.getInvoice(req.params.id);
      if (!invoice) {
        return res.status(404).json({
          error: "Invoice not found",
          message: `Invoice with ID ${req.params.id} does not exist`
        });
      }

      const lineItems = await storage.getLineItemsByInvoiceId(invoice.id);
      res.json({ ...invoice, line_items: lineItems });
    } catch (error) {
      console.error("Get invoice error:", error);
      res.status(500).json({
        error: "Failed to retrieve invoice",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  app.put("/api/invoices/:id", async (req, res) => {
    try {
      const invoiceData = insertInvoiceSchema.partial().parse(req.body);
      const invoice = await storage.updateInvoice(req.params.id, invoiceData);
      
      if (!invoice) {
        return res.status(404).json({
          error: "Invoice not found",
          message: `Invoice with ID ${req.params.id} does not exist`
        });
      }

      res.json(invoice);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid invoice data",
          message: error.errors
        });
      }
      
      console.error("Update invoice error:", error);
      res.status(500).json({
        error: "Failed to update invoice",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  app.delete("/api/invoices/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteInvoice(req.params.id);
      if (!deleted) {
        return res.status(404).json({
          error: "Invoice not found",
          message: `Invoice with ID ${req.params.id} does not exist`
        });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Delete invoice error:", error);
      res.status(500).json({
        error: "Failed to delete invoice",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
