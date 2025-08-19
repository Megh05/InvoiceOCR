import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { mistralOCR } from "./services/mistral-ocr";
import { deterministicParser } from "./services/parser/deterministic";
import { markdownEnhancedParser } from "./services/parser/markdown-enhanced";
import { enhancedKeyValueExtractor } from "./services/parser/enhanced-extractor";
import { llmEnhancer } from "./services/llm-enhancer";
import { invoiceValidator } from "./services/validator";
import { parseRequestSchema, insertInvoiceSchema } from "@shared/schema";
import { ConfigService } from "./config";
import { z } from "zod";
import { format, parseISO, startOfMonth, endOfMonth } from "date-fns";

function generateActionMessage(confidence: number, validation: any, usedLLM: boolean, improvements: string[]): string {
  if (confidence > 0.9 && validation.errors.length === 0) {
    return usedLLM ? 
      "LLM enhancement successful! High-confidence extraction completed. Please review before saving." :
      "High-confidence extraction completed! Data looks accurate - please review before saving.";
  } else if (confidence > 0.8) {
    return usedLLM ?
      "LLM enhancement improved accuracy. Please review the extracted fields before saving." :
      "Good extraction quality. Please review the extracted fields before saving.";
  } else {
    const errorCount = validation.errors.length;
    const warningCount = validation.warnings.length;
    return `${usedLLM ? 'LLM-enhanced extraction' : 'Standard extraction'} completed. ${errorCount} validation errors and ${warningCount} warnings found. Please review and correct the extracted data.`;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Analytics endpoint - provide real data from invoices
  app.get("/api/analytics", async (req, res) => {
    try {
      const invoices = await storage.getAllInvoices();
      const lineItems = await storage.getAllLineItems();
      
      // Calculate basic statistics
      const totalInvoices = invoices.length;
      const totalAmount = invoices.reduce((sum, inv) => sum + inv.total, 0);
      const averageAmount = totalInvoices > 0 ? totalAmount / totalInvoices : 0;
      
      // Group by categories (simplified categorization)
      const categories = invoices.reduce((acc, inv) => {
        const category = inv.category || 'Uncategorized';
        if (!acc[category]) {
          acc[category] = { count: 0, total_amount: 0 };
        }
        acc[category].count++;
        acc[category].total_amount += inv.total;
        return acc;
      }, {} as Record<string, { count: number; total_amount: number }>);
      
      const categoryArray = Object.entries(categories).map(([category, data]) => ({
        category,
        count: data.count,
        total_amount: data.total_amount,
        percentage: totalInvoices > 0 ? Math.round((data.count / totalInvoices) * 100) : 0
      }));
      
      // Template analysis
      const templates = invoices.reduce((acc, inv) => {
        const templateName = inv.template_id || 'Unknown Template';
        if (!acc[templateName]) {
          acc[templateName] = { count: 0, confidence_sum: 0 };
        }
        acc[templateName].count++;
        acc[templateName].confidence_sum += inv.confidence;
        return acc;
      }, {} as Record<string, { count: number; confidence_sum: number }>);
      
      const templateArray = Object.entries(templates).map(([template_name, data]) => ({
        template_name,
        count: data.count,
        confidence_avg: data.count > 0 ? data.confidence_sum / data.count : 0
      }));
      
      // Monthly trends (last 6 months)
      const now = new Date();
      const monthlyData: Record<string, { count: number; amount: number }> = {};
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthKey = format(date, 'MMM yyyy');
        monthlyData[monthKey] = { count: 0, amount: 0 };
      }
      
      invoices.forEach(inv => {
        if (inv.created_at) {
          const invDate = new Date(inv.created_at);
          const monthKey = format(invDate, 'MMM yyyy');
          if (monthlyData[monthKey]) {
            monthlyData[monthKey].count++;
            monthlyData[monthKey].amount += inv.total;
          }
        }
      });
      
      const monthlyTrends = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        count: data.count,
        amount: data.amount
      }));
      
      // Top vendors
      const vendors = invoices.reduce((acc, inv) => {
        const vendorName = inv.vendor_name || 'Unknown Vendor';
        if (!acc[vendorName]) {
          acc[vendorName] = { count: 0, total_amount: 0 };
        }
        acc[vendorName].count++;
        acc[vendorName].total_amount += inv.total;
        return acc;
      }, {} as Record<string, { count: number; total_amount: number }>);
      
      const topVendors = Object.entries(vendors)
        .map(([vendor_name, data]) => ({
          vendor_name,
          count: data.count,
          total_amount: data.total_amount
        }))
        .sort((a, b) => b.total_amount - a.total_amount)
        .slice(0, 10);
      
      // Recognition statistics
      const templateRecognized = invoices.filter(inv => inv.template_id && inv.template_id !== 'unknown').length;
      const autoCategorized = invoices.filter(inv => inv.category && inv.category !== 'Uncategorized').length;
      const highConfidence = invoices.filter(inv => inv.confidence >= 0.8).length;
      
      const analytics = {
        total_invoices: totalInvoices,
        total_amount: Math.round(totalAmount * 100) / 100,
        average_amount: Math.round(averageAmount * 100) / 100,
        categories: categoryArray,
        templates: templateArray,
        monthly_trends: monthlyTrends,
        top_vendors: topVendors,
        recognition_stats: {
          template_recognized: templateRecognized,
          auto_categorized: autoCategorized,
          high_confidence: highConfidence,
          total_processed: totalInvoices
        }
      };
      
      res.json(analytics);
    } catch (error) {
      console.error('[analytics] Failed to generate analytics:', error);
      res.status(500).json({ message: 'Failed to generate analytics' });
    }
  });

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
            
            // Step 1: Validate the extracted data
            console.log('[parser] Validating extracted data...');
            const validation = invoiceValidator.validateInvoice(enhancedResult.extracted);
            let adjustedConfidence = invoiceValidator.adjustConfidenceByValidation(
              enhancedResult.confidence, 
              validation
            );
            
            let finalData = enhancedResult.extracted;
            let improvements: string[] = [];
            let usedLLM = false;
            
            // Step 2: Use LLM enhancement if confidence is low or validation fails
            const shouldUseLLM = adjustedConfidence < 0.8 || validation.errors.some(e => e.severity === 'critical');
            
            if (shouldUseLLM) {
              try {
                console.log('[parser] Using LLM enhancement for improved accuracy...');
                const llmResult = await llmEnhancer.enhanceInvoiceData(
                  ocrResponse.text,
                  enhancedResult.extracted,
                  adjustedConfidence
                );
                
                // Validate LLM results
                const llmValidation = invoiceValidator.validateInvoice(llmResult.enhanced);
                const llmConfidence = invoiceValidator.adjustConfidenceByValidation(
                  llmResult.confidence,
                  llmValidation
                );
                
                // Use LLM result if it's better or shows meaningful improvements
                const improvementThreshold = 0.05; // Allow LLM if confidence is within 5% and has improvements
                const hasSignificantImprovements = llmResult.improvements.length > 2;
                
                if (llmConfidence > adjustedConfidence || 
                    (hasSignificantImprovements && Math.abs(llmConfidence - adjustedConfidence) < improvementThreshold)) {
                  finalData = llmResult.enhanced;
                  const oldConfidence = adjustedConfidence;
                  adjustedConfidence = Math.max(llmConfidence, adjustedConfidence * 0.95); // Prevent major degradation
                  improvements = llmResult.improvements;
                  usedLLM = true;
                  console.log(`[parser] LLM enhancement improved confidence from ${oldConfidence.toFixed(2)} to ${adjustedConfidence.toFixed(2)}`);
                } else {
                  console.log(`[parser] LLM enhancement did not improve confidence (${llmConfidence.toFixed(2)} vs ${adjustedConfidence.toFixed(2)}), using original result`);
                }
              } catch (llmError) {
                console.warn('[parser] LLM enhancement failed, using original result:', llmError);
              }
            }
            
            return res.json({
              parsed: finalData,
              confidence: adjustedConfidence,
              raw_ocr_text: rawOcrText,
              mistral_ocr_text: mistralOcrText,
              ocr_similarity_score: ocrSimilarityScore,
              fallback_used: false,
              llm_enhanced: usedLLM,
              action: generateActionMessage(adjustedConfidence, validation, usedLLM, improvements),
              field_confidences: enhancedResult.field_confidences,
              extraction_details: enhancedResult.extraction_details,
              validation_results: validation,
              improvements: improvements
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

      // Try enhanced extraction first with validation and LLM enhancement
      try {
        console.log('[parser] Using enhanced key-value extraction system for text input');
        const enhancedResult = await enhancedKeyValueExtractor.extractKeyValuePairs(rawOcrText);
        
        // Step 1: Validate the extracted data
        console.log('[parser] Validating extracted data...');
        const validation = invoiceValidator.validateInvoice(enhancedResult.extracted);
        let adjustedConfidence = invoiceValidator.adjustConfidenceByValidation(
          enhancedResult.confidence, 
          validation
        );
        
        let finalData = enhancedResult.extracted;
        let improvements: string[] = [];
        let usedLLM = false;
        
        // Step 2: Use LLM enhancement if confidence is low or validation fails
        const shouldUseLLM = adjustedConfidence < 0.8 || validation.errors.some(e => e.severity === 'critical');
        
        if (shouldUseLLM) {
          try {
            console.log('[parser] Using LLM enhancement for improved accuracy...');
            const llmResult = await llmEnhancer.enhanceInvoiceData(
              rawOcrText,
              enhancedResult.extracted,
              adjustedConfidence
            );
            
            // Validate LLM results
            const llmValidation = invoiceValidator.validateInvoice(llmResult.enhanced);
            const llmConfidence = invoiceValidator.adjustConfidenceByValidation(
              llmResult.confidence,
              llmValidation
            );
            
            // Use LLM result if it's better or shows meaningful improvements
            const improvementThreshold = 0.05; // Allow LLM if confidence is within 5% and has improvements
            const hasSignificantImprovements = llmResult.improvements.length > 2;
            
            if (llmConfidence > adjustedConfidence || 
                (hasSignificantImprovements && Math.abs(llmConfidence - adjustedConfidence) < improvementThreshold)) {
              finalData = llmResult.enhanced;
              const oldConfidence = adjustedConfidence;
              adjustedConfidence = Math.max(llmConfidence, adjustedConfidence * 0.95); // Prevent major degradation
              improvements = llmResult.improvements;
              usedLLM = true;
              console.log(`[parser] LLM enhancement improved confidence from ${oldConfidence.toFixed(2)} to ${adjustedConfidence.toFixed(2)}`);
            } else {
              console.log(`[parser] LLM enhancement did not improve confidence (${llmConfidence.toFixed(2)} vs ${adjustedConfidence.toFixed(2)}), using original result`);
            }
          } catch (llmError) {
            console.warn('[parser] LLM enhancement failed, using original result:', llmError);
          }
        }
        
        // Save processed invoice to persistent storage
        try {
          const savedInvoice = await storage.createInvoice({
            invoice_number: finalData.invoice_number,
            invoice_date: finalData.invoice_date,
            vendor_name: finalData.vendor_name,
            vendor_address: finalData.vendor_address,
            bill_to: finalData.bill_to,
            ship_to: finalData.ship_to,
            currency: finalData.currency || 'USD',
            subtotal: finalData.subtotal || 0,
            tax: finalData.tax || 0,
            shipping: finalData.shipping || 0,
            total: finalData.total || 0,
            raw_ocr_text: rawOcrText,
            mistral_ocr_text: mistralOcrText,
            ocr_similarity_score: ocrSimilarityScore,
            confidence: adjustedConfidence
          });

          // Save line items
          if (finalData.line_items && Array.isArray(finalData.line_items)) {
            for (const item of finalData.line_items) {
              await storage.createLineItem({
                invoice_id: savedInvoice.id,
                line_number: item.line_number || 1,
                sku: item.sku,
                description: item.description || '',
                qty: item.qty || 1,
                unit_price: item.unit_price || 0,
                amount: item.amount || 0,
                tax: item.tax || 0
              });
            }
          }

          console.log(`[storage] Saved invoice ${savedInvoice.id} with ${finalData.line_items?.length || 0} line items`);
        } catch (storageError) {
          console.warn('[storage] Failed to save invoice:', storageError);
        }



        return res.json({
          parsed: finalData,
          confidence: adjustedConfidence,
          raw_ocr_text: rawOcrText,
          mistral_ocr_text: mistralOcrText,
          ocr_similarity_score: ocrSimilarityScore,
          fallback_used: false,
          llm_enhanced: usedLLM,
          action: generateActionMessage(adjustedConfidence, validation, usedLLM, improvements),
          field_confidences: enhancedResult.field_confidences,
          extraction_details: enhancedResult.extraction_details,
          validation_results: validation,
          improvements: improvements
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
      }
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
      
      // Temporarily update the config with the provided API key for testing
      await ConfigService.updateMistralApiKey(apiKey);
      
      // Create a temporary OCR service instance
      const { MistralOCRService } = await import("./services/mistral-ocr");
      const testOCR = new MistralOCRService();
      
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
