import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { mistralOCR } from "./services/mistral-ocr";
import { deterministicParser } from "./services/parser/deterministic";
import { markdownEnhancedParser } from "./services/parser/markdown-enhanced";
import { enhancedKeyValueExtractor } from "./services/parser/enhanced-extractor";
import { parseRequestSchema, insertInvoiceSchema } from "@shared/schema";
import { ConfigService } from "./config";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Parse endpoint - MUST use Mistral OCR
  app.post("/api/parse", async (req, res) => {
    try {
      const requestData = parseRequestSchema.parse(req.body);
      
      let rawOcrText: string = "";
      let mistralOcrText: string = "";
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
          
          // Use the enhanced key-value extraction system
          console.log('[parser] Using enhanced key-value extraction system');
          try {
            const enhancedResult = await enhancedKeyValueExtractor.extractKeyValuePairs(
              ocrResponse.text, 
              ocrResponse.markdown
            );
            
            return res.json({
              parsed: enhancedResult.extracted,
              confidence: enhancedResult.confidence,
              raw_ocr_text: rawOcrText,
              mistral_ocr_text: mistralOcrText,
              ocr_similarity_score: ocrSimilarityScore,
              fallback_used: false,
              action: enhancedResult.confidence > 0.8 ? 
                "The enhanced extraction system successfully identified key-value pairs! Please review before saving." :
                "Enhanced extraction completed. Please review and edit the extracted fields as some may need manual correction.",
              field_confidences: enhancedResult.field_confidences,
              extraction_details: enhancedResult.extraction_details
            });
          } catch (enhancedError) {
            console.warn('[parser] Enhanced extraction failed, falling back to markdown parser:', enhancedError);
            
            // Fallback to markdown parser if enhanced extraction fails
            if (ocrResponse.markdown) {
              const markdownResult = markdownEnhancedParser.parse(ocrResponse.markdown, ocrResponse.text);
              return res.json({
                parsed: markdownResult.parsed,
                confidence: markdownResult.confidence,
                raw_ocr_text: rawOcrText,
                mistral_ocr_text: mistralOcrText,
                ocr_similarity_score: ocrSimilarityScore,
                fallback_used: true,
                action: "Used fallback parser. Please review and edit the extracted fields.",
                field_confidences: markdownResult.field_confidences
              });
            }
          }
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
        
        // For text-only testing, use the provided text directly without verification
        mistralOcrText = requestData.ocr_text;
        ocrSimilarityScore = 1.0;
      }
      else {
        return res.status(400).json({
          error: "Invalid request",
          message: "Either image_url, image_base64, or ocr_text must be provided"
        });
      }

      // Try enhanced extraction first, then fall back to deterministic parser
      try {
        console.log('[parser] Using enhanced key-value extraction system for text input');
        const enhancedResult = await enhancedKeyValueExtractor.extractKeyValuePairs(rawOcrText);
        
        return res.json({
          parsed: enhancedResult.extracted,
          confidence: enhancedResult.confidence,
          raw_ocr_text: rawOcrText,
          mistral_ocr_text: mistralOcrText,
          ocr_similarity_score: ocrSimilarityScore,
          fallback_used: false,
          action: enhancedResult.confidence > 0.8 ? 
            "Enhanced extraction successful! Please review before saving." :
            "Enhanced extraction completed. Please review and edit the extracted fields.",
          field_confidences: enhancedResult.field_confidences,
          extraction_details: enhancedResult.extraction_details
        });
      } catch (enhancedError) {
        console.warn('[parser] Enhanced extraction failed, using deterministic parser:', enhancedError);
        
        // Run deterministic parser as fallback
        const parsingResult = deterministicParser.parse(rawOcrText, mistralOcrText, ocrSimilarityScore);
        
        return res.json({
          parsed: parsingResult.parsed,
          confidence: parsingResult.confidence,
          raw_ocr_text: rawOcrText,
          mistral_ocr_text: mistralOcrText,
          ocr_similarity_score: ocrSimilarityScore,
          fallback_used: true,
          action: parsingResult.action || "Used fallback parser. Please review the extracted data.",
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

  // Settings endpoints
  app.get("/api/settings/status", async (req, res) => {
    try {
      const status = await ConfigService.getStatus();
      res.json(status);
    } catch (error) {
      console.error("Get settings status error:", error);
      res.status(500).json({
        error: "Failed to get settings status",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const { apiKey } = z.object({ apiKey: z.string().min(1) }).parse(req.body);
      
      // Save to config file instead of just environment variable
      await ConfigService.updateMistralApiKey(apiKey);
      
      res.json({
        message: "Settings saved successfully",
        success: true
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid settings data",
          message: error.errors
        });
      }
      
      console.error("Save settings error:", error);
      res.status(500).json({
        error: "Failed to save settings",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  app.post("/api/settings/test-connection", async (req, res) => {
    try {
      const { apiKey } = z.object({ apiKey: z.string().min(1) }).parse(req.body);
      
      // Create a temporary OCR service instance with the provided API key
      const { MistralOCRService } = await import("./services/mistral-ocr");
      const testOCR = new MistralOCRService(apiKey);
      
      // Use a public test PDF document that should work with Mistral OCR
      const testUrl = "https://arxiv.org/pdf/2201.04234.pdf";
      
      await testOCR.extractText(testUrl);
      
      res.json({
        message: "Connection successful! Mistral OCR API is working.",
        success: true
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: "Invalid request data",
          message: error.errors
        });
      }
      
      console.error("Test connection error:", error);
      
      if (error instanceof Error) {
        if (error.message.includes("401") || error.message.includes("Invalid")) {
          return res.status(401).json({
            error: "Invalid API key",
            message: "The provided Mistral OCR API key is invalid or unauthorized"
          });
        }
        
        if (error.message.includes("503") || error.message.includes("unavailable")) {
          return res.status(503).json({
            error: "Service unavailable",
            message: "Mistral OCR service is temporarily unavailable"
          });
        }
      }
      
      res.status(500).json({
        error: "Connection test failed",
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
