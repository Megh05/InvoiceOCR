# Invoice OCR Processing Application

## Overview

This is a production-ready web application designed for processing invoice documents through a 5-step pipeline: Upload → OCR → Review → Edit → Save. The application uses Mistral OCR for text extraction and deterministic parsing (no LLM fallback) for structured data conversion. Built with a React frontend and Express backend, it provides real-time confidence scoring, persistent storage, and comprehensive export capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

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
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **API Design**: RESTful endpoints with consistent error handling and response formats
- **Validation**: Zod schemas shared between frontend and backend
- **File Processing**: Deterministic rule-based parser for invoice field extraction
- **Architecture Pattern**: Service layer pattern with controllers, services, and models separation

### Database Design
- **ORM**: Drizzle with PostgreSQL dialect for robust data persistence
- **Schema**: Two main tables - `invoices` and `line_items` with proper foreign key relationships
- **Invoice Fields**: Comprehensive invoice data including vendor info, dates, amounts, and OCR metadata
- **Confidence Tracking**: Stores confidence scores and similarity metrics for data quality assessment

### Processing Pipeline
- **Step 1 (Upload)**: Multi-input support - file upload, image URL, or direct OCR text input
- **Step 2 (OCR)**: Mandatory Mistral OCR integration for all text extraction
- **Step 3 (Review)**: User verification of extracted text with edit capabilities
- **Step 4 (Edit)**: Form-based editing of structured invoice data with confidence indicators
- **Step 5 (Save)**: Database persistence with export options (JSON/CSV)

### Data Flow
- **Input Processing**: Handles multiple input types (file, URL, text) with consistent processing
- **OCR Integration**: Always calls Mistral OCR API, even for text-only inputs (verification mode)
- **Deterministic Parsing**: Rule-based extraction using regex patterns and fuzzy matching
- **Confidence Scoring**: Field-level confidence tracking with visual indicators
- **Validation**: Multi-layer validation from input to database with shared schemas

## External Dependencies

### Core Services
- **Mistral OCR API**: Primary OCR service for text extraction (requires `MISTRAL_API_KEY`)
- **PostgreSQL Database**: Data persistence layer (configured via `DATABASE_URL`)
- **Neon Database**: Serverless PostgreSQL provider (@neondatabase/serverless)

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