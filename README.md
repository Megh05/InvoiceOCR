# Invoice OCR Processing Application

A production-ready web application for processing invoice documents using **Mistral OCR** for text extraction and deterministic parsing for structured data conversion. Built with React frontend and Express backend, featuring a complete 5-step pipeline workflow.

## 🚀 Features

- **5-Step Processing Pipeline**: Upload → OCR → Review → Edit → Save
- **Mandatory Mistral OCR Integration**: All processing uses Mistral OCR service
- **Deterministic Rule-Based Parsing**: No LLM fallback, robust field extraction
- **Real-time Confidence Scoring**: Visual indicators for field reliability
- **SQLite Database with Prisma ORM**: Persistent invoice storage
- **Export Capabilities**: JSON and CSV export functionality
- **Comprehensive Error Handling**: Graceful OCR service failure management
- **Docker Support**: Full containerization for easy deployment
- **Test Coverage**: Unit and integration tests for core functionality

## 🏗️ Architecture

