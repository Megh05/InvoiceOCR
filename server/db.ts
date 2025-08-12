// Database configuration disabled - using in-memory storage (MemStorage)
// This file is kept for compatibility but all database operations
// are handled through the storage interface in storage.ts

import * as schema from "@shared/schema";

// Mock exports for compatibility
export const pool = null;
export const db = null;

console.log("[db] Using in-memory storage instead of PostgreSQL database");
