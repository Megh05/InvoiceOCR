import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { registerRoutes } from '../src/routes.js';

// Mock the Mistral OCR service
jest.mock('../src/services/mistral-ocr.js', () => ({
  mistralOCR: {
    extractText: jest.fn(),
    verifyText: jest.fn(),
  }
}));

import { mistralOCR } from '../src/services/mistral-ocr.js';

describe('API Endpoints', () => {
  let app;
  let server;

  beforeEach(async () => {
    app = express();
    app.use(express.json());
    server = await registerRoutes(app);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('POST /api/parse', () => {
    it('should successfully parse image with Mistral OCR', async () => {
      const mockOCRResponse = {
        text: 'Invoice INV-2024-001\nABC Company\nTotal: $100.00',
        confidence: 0.95,
        request_id: 'test-request-id'
      };

      mistralOCR.extractText.mockResolvedValue(mockOCRResponse);

      const response = await request(app)
        .post('/api/parse')
        .send({
          image_url: 'https://example.com/invoice.jpg'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('parsed');
      expect(response.body).toHaveProperty('confidence');
      expect(response.body).toHaveProperty('raw_ocr_text');
      expect(response.body).toHaveProperty('mistral_ocr_text');
      expect(response.body.fallback_used).toBe(false);
      
      expect(mistralOCR.extractText).toHaveBeenCalledWith('https://example.com/invoice.jpg', undefined);
    });

    it('should handle Mistral OCR failure with 503 error', async () => {
      mistralOCR.extractText.mockRejectedValue(new Error('Mistral OCR service is temporarily unavailable'));

      const response = await request(app)
        .post('/api/parse')
        .send({
          image_base64: 'base64encodedimage'
        });

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('error', 'Mistral OCR unavailable');
      expect(response.body.message).toContain('temporarily unavailable');
    });

    it('should verify OCR text with Mistral OCR', async () => {
      const mockVerificationResponse = {
        mistral_text: 'Invoice INV-2024-001\nABC Company\nTotal: $100.00',
        similarity_score: 0.92,
        request_id: 'test-request-id'
      };

      mistralOCR.verifyText.mockResolvedValue(mockVerificationResponse);

      const response = await request(app)
        .post('/api/parse')
        .send({
          ocr_text: 'Invoice INV-2024-001\nABC Company\nTotal: $100.00'
        });

      expect(response.status).toBe(200);
      expect(response.body.ocr_similarity_score).toBe(0.92);
      expect(mistralOCR.verifyText).toHaveBeenCalledWith('Invoice INV-2024-001\nABC Company\nTotal: $100.00');
    });

    it('should return 400 when no input is provided', async () => {
      const response = await request(app)
        .post('/api/parse')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid request');
    });

    it('should return 400/503 when MISTRAL_API_KEY is missing for OCR text', async () => {
      // Temporarily remove the API key
      const originalKey = process.env.MISTRAL_API_KEY;
      delete process.env.MISTRAL_API_KEY;

      const response = await request(app)
        .post('/api/parse')
        .send({
          ocr_text: 'Some invoice text'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Missing API key');

      // Restore the API key
      process.env.MISTRAL_API_KEY = originalKey;
    });

    it('should handle malformed JSON gracefully', async () => {
      const response = await request(app)
        .post('/api/parse')
        .send('invalid json')
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/invoices', () => {
    it('should create invoice successfully', async () => {
      const invoiceData = {
        invoice_number: 'INV-2024-001',
        invoice_date: '2024-03-15',
        vendor_name: 'ABC Company',
        subtotal: 100.00,
        tax: 8.50,
        total: 108.50,
        raw_ocr_text: 'Raw OCR text',
        mistral_ocr_text: 'Mistral OCR text',
        confidence: 0.95,
        line_items: [
          {
            line_number: 1,
            description: 'Test Product',
            qty: 1,
            unit_price: 100.00,
            amount: 100.00,
            tax: 0.00
          }
        ]
      };

      const response = await request(app)
        .post('/api/invoices')
        .send(invoiceData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('id');
      expect(response.body.invoice_number).toBe('INV-2024-001');
    });

    it('should validate invoice data', async () => {
      const response = await request(app)
        .post('/api/invoices')
        .send({
          // Missing required fields
          invoice_number: 'INV-001'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error', 'Invalid invoice data');
    });
  });

  describe('GET /api/invoices', () => {
    it('should return empty list initially', async () => {
      const response = await request(app)
        .get('/api/invoices');

      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/invoices/:id', () => {
    it('should return 404 for non-existent invoice', async () => {
      const response = await request(app)
        .get('/api/invoices/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Invoice not found');
    });
  });

  describe('PUT /api/invoices/:id', () => {
    it('should return 404 for non-existent invoice', async () => {
      const response = await request(app)
        .put('/api/invoices/non-existent-id')
        .send({
          invoice_number: 'UPDATED-001'
        });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Invoice not found');
    });
  });

  describe('DELETE /api/invoices/:id', () => {
    it('should return 404 for non-existent invoice', async () => {
      const response = await request(app)
        .delete('/api/invoices/non-existent-id');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error', 'Invoice not found');
    });
  });

  describe('Error Handling', () => {
    it('should handle internal server errors', async () => {
      mistralOCR.extractText.mockRejectedValue(new Error('Unexpected error'));

      const response = await request(app)
        .post('/api/parse')
        .send({
          image_url: 'https://example.com/invoice.jpg'
        });

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('error');
    });
  });
});
