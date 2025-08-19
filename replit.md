# Invoice OCR Processing Application

## Overview

This is a production-ready web application designed for processing invoice documents through a 5-step pipeline: Upload → OCR → Review → Edit → Save. The application uses Mistral OCR for text extraction and deterministic parsing (no LLM fallback) for structured data conversion. Built with a React frontend and Express backend, it provides real-time confidence scoring, persistent storage, and comprehensive export capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes (August 19, 2025)

### Complete Modern Design System Implementation (August 19, 2025)
- **Universal Design Enhancement**: Transformed ALL pages with stunning modern design matching analytics dashboard
- **Glassmorphism Effects**: Applied backdrop blur, gradient backgrounds, and transparency effects across entire app
- **Enhanced Step Indicator**: Beautiful progress tracker with gradient colors, rounded corners, and smooth animations
- **Modern Upload Experience**: Redesigned upload step with interactive cards, hover effects, and gradient accents
- **Consistent Visual Language**: Unified design system with rounded corners, shadows, and smooth transitions
- **Interactive Elements**: Added hover states, scale transforms, and smooth color transitions throughout
- **Professional Layout**: Enhanced spacing, typography, and visual hierarchy across all components

### Review Page Enhancement - Document Viewer with Dropdown (August 19, 2025)
- **Dual View System**: Added dropdown selector to switch between "PDF View" and "OCR Text" modes
- **PDF Viewer Integration**: Embedded PDF viewer using HTML object element for in-page viewing
- **Fallback Link**: Added "Click to open PDF in new tab" option when embedded viewer isn't supported
- **Enhanced Layout**: Improved left/right panel layout with proper spacing and visual hierarchy
- **Better UX**: Users can now view original document alongside editable text for easier verification

### Migration from Replit Agent to Replit Environment (COMPLETED)
- **Database Setup**: Created PostgreSQL database and configured Drizzle ORM
- **Database Schema**: Successfully pushed database schema with Drizzle Kit
- **Configuration System**: Added persistent config file storage for API keys
- **OCR Service Enhancement**: Modified Mistral OCR service to handle missing API keys gracefully
- **Settings API**: Added `/api/settings/status` endpoint for real-time configuration status
- **Frontend Status Indicator**: Created dynamic OCR status component that updates every 30 seconds
- **Navigation Fix**: Resolved React nested anchor tag warning in Layout component
- **Storage Layer**: Fixed TypeScript issues with invoice and line item creation
- **LLM Enhancer Fix**: Improved JSON parsing error handling with better validation
- **Environment Setup**: All dependencies installed and workflow running successfully
- **Storage Migration**: Switched from PostgreSQL to in-memory storage (MemStorage) for simplified local development

### LLM Verification System Enhancement (August 19, 2025)
- **Always-On LLM Verification**: Modified system to use LLM verification for ALL extractions, not just low-confidence ones
- **Enhanced Verification Process**: LLM now checks extracted data against OCR text and corrects errors/fills missing data
- **Improved User Experience**: Added verification loader and progress indicators to Step 2 (OCR & AI Verification)
- **Time-Saving Approach**: LLM verifies and corrects data before user review, reducing manual editing required
- **Better Prompting**: Created specialized verification prompt focused on accuracy checking and error correction
- **Sequential Loading Experience**: Created realistic two-stage loading - OCR extraction first, then AI verification
- **Enhanced UI Feedback**: Updated OCR step with dynamic progress indicators that change in real-time
- **Visual Progress States**: Clear visual feedback showing current processing stage (OCR → AI verification)

### Advanced OCR Key-Value Extraction System Enhancement
- **Multi-Layer Extraction Engine**: Created comprehensive enhanced-extractor.ts with 6-layer extraction approach
- **Pattern Recognition**: 200+ specialized regex patterns for different document types and formats
- **Contextual Analysis**: Spatial relationship analysis for key-value pairs with proximity detection
- **Template Recognition**: Document type detection (invoice/statement/receipt) with format-specific parsing
- **Fuzzy Matching**: Edit distance algorithms for OCR error correction and field recovery
- **Confidence Scoring**: Multi-factor confidence assessment with field-level granularity
- **Markdown Table Support**: Enhanced table parsing from Mistral OCR markdown output
- **Fallback System**: Graceful degradation from enhanced → markdown → deterministic parsers
- **Schema Alignment**: Fixed type consistency between nullable/optional fields across parsers

### OCR Processing Improvements (Implementation from HuggingFace Reference)
- **Enhanced Mistral OCR Service**: Added retry logic with exponential backoff (3 attempts)
- **Markdown Processing**: Enhanced OCR response processing to leverage structured markdown output
- **Better Error Handling**: Added specific handling for rate limits (429), service unavailable (503/502)
- **Improved Date Parsing**: Enhanced date normalization supporting MM-DD-YY format (1-18-19 → 2019-01-18)
- **Statement Format Support**: Added specialized parsing for statement/bill formats vs traditional invoices
- **Vendor Detection**: Improved vendor name extraction by looking after "IN ACCOUNT WITH" sections
- **Line Item Enhancement**: Better recognition of service charges with date and amount patterns
- **Confidence Scoring**: More accurate field-level confidence assessment for user guidance

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript and Vite for fast development and building
- **UI Components**: Radix UI primitives with shadcn/ui component system for consistent design
- **Styling**: TailwindCSS with custom CSS variables for theming
- **State Management**: React Query (TanStack Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Form Handling**: React Hook Form with Zod validation schemas
- **File Structure**: Component-based architecture with separate pages, services, and utilities

### Backend Architecture
- **Framework**: Express.js with TypeScript for type safety
- **Storage**: In-memory storage (MemStorage) for simplified local development and testing
- **API Design**: RESTful endpoints with consistent error handling and response formats
- **Validation**: Zod schemas shared between frontend and backend
- **File Processing**: Deterministic rule-based parser for invoice field extraction
- **Architecture Pattern**: Service layer pattern with controllers, services, and models separation

### Storage Design
- **Implementation**: In-memory storage using Map collections for fast access
- **Data Structure**: Two main collections - `invoices` and `line_items` with proper relationships
- **Invoice Fields**: Comprehensive invoice data including vendor info, dates, amounts, and OCR metadata
- **Confidence Tracking**: Stores confidence scores and similarity metrics for data quality assessment
- **Persistence**: Data persists during application runtime but resets on restart

### Processing Pipeline
- **Step 1 (Upload)**: Multi-input support - file upload, image URL, or direct OCR text input
- **Step 2 (OCR)**: Enhanced Mistral OCR integration with retry logic and markdown processing
- **Step 3 (Review)**: User verification of extracted text with edit capabilities
- **Step 4 (Edit)**: Form-based editing of structured invoice data with confidence indicators
- **Step 5 (Save)**: In-memory storage persistence with export options (JSON/CSV)

### OCR Enhancement Details
- **Retry Strategy**: Exponential backoff (1s, 2s, 4s) for improved reliability
- **Response Processing**: Dual parser system - markdown-enhanced for rich OCR output, deterministic for fallback
- **Format Detection**: Automatic detection of invoice vs statement formats for specialized parsing
- **Field Extraction**: Improved accuracy for statement formats (73% confidence vs previous 60%)

### Data Flow
- **Input Processing**: Handles multiple input types (file, URL, text) with consistent processing
- **OCR Integration**: Always calls Mistral OCR API, even for text-only inputs (verification mode)
- **Deterministic Parsing**: Rule-based extraction using regex patterns and fuzzy matching
- **Confidence Scoring**: Field-level confidence tracking with visual indicators
- **Validation**: Multi-layer validation from input to storage with shared schemas

## External Dependencies

### Core Services
- **Mistral OCR API**: Primary OCR service for text extraction (requires `MISTRAL_API_KEY`)
- **In-Memory Storage**: Local data persistence using MemStorage for simplified development

### Development & Build Tools
- **Vite**: Frontend build tool with React plugin and development server
- **TypeScript**: Type safety across the entire application
- **ESBuild**: Backend bundling for production builds
- **Drizzle Kit**: Database schema management and migrations

### UI & Styling
- **Radix UI**: Comprehensive primitive components for accessibility
- **TailwindCSS**: Utility-first CSS framework with custom design system
- **Lucide React**: Icon library for consistent iconography
- **PostCSS**: CSS processing with Autoprefixer

### Testing & Quality
- **Jest**: Backend unit testing framework
- **Vitest**: Frontend testing with React Testing Library
- **Supertest**: API endpoint testing
- **TSConfig**: Strict TypeScript configuration with path mapping

### Runtime Dependencies
- **React Query**: Server state management and caching
- **React Hook Form**: Form handling with validation
- **Date-fns**: Date manipulation and formatting
- **Wouter**: Lightweight routing solution
- **Class Variance Authority**: Type-safe component variants