import fs from 'fs/promises';
import path from 'path';

interface AppConfig {
  mistralApiKey?: string;
  ocrEnabled: boolean;
  lastUpdated: string;
}

const CONFIG_FILE = path.join(process.cwd(), '.config.json');

let cachedConfig: AppConfig | null = null;

export class ConfigService {
  private static async loadConfig(): Promise<AppConfig> {
    if (cachedConfig) {
      return cachedConfig;
    }

    try {
      const configData = await fs.readFile(CONFIG_FILE, 'utf-8');
      cachedConfig = JSON.parse(configData);
      return cachedConfig!;
    } catch (error) {
      // File doesn't exist or is invalid - create default config
      const defaultConfig: AppConfig = {
        mistralApiKey: process.env.MISTRAL_API_KEY || undefined,
        ocrEnabled: !!process.env.MISTRAL_API_KEY,
        lastUpdated: new Date().toISOString()
      };
      
      await this.saveConfig(defaultConfig);
      return defaultConfig;
    }
  }

  private static async saveConfig(config: AppConfig): Promise<void> {
    config.lastUpdated = new Date().toISOString();
    await fs.writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
    cachedConfig = config;
  }

  static async getConfig(): Promise<AppConfig> {
    return await this.loadConfig();
  }

  static async updateMistralApiKey(apiKey: string): Promise<AppConfig> {
    const config = await this.loadConfig();
    config.mistralApiKey = apiKey;
    config.ocrEnabled = !!apiKey;
    await this.saveConfig(config);
    return config;
  }

  static async getStatus(): Promise<{ 
    mistralConfigured: boolean; 
    ocrEnabled: boolean; 
    lastUpdated: string;
    connectionStatus?: 'connected' | 'disconnected' | 'testing'
  }> {
    const config = await this.loadConfig();
    const hasApiKey = !!config.mistralApiKey;
    
    let connectionStatus: 'connected' | 'disconnected' | 'testing' | undefined;
    
    // If we have an API key, do a quick connection test
    if (hasApiKey) {
      try {
        connectionStatus = await this.testMistralConnection(config.mistralApiKey!);
      } catch (error) {
        connectionStatus = 'disconnected';
      }
    }
    
    return {
      mistralConfigured: hasApiKey,
      ocrEnabled: config.ocrEnabled,
      lastUpdated: config.lastUpdated,
      connectionStatus
    };
  }

  static async getMistralApiKey(): Promise<string | undefined> {
    const config = await this.loadConfig();
    return config.mistralApiKey;
  }

  private static async testMistralConnection(apiKey: string): Promise<'connected' | 'disconnected'> {
    try {
      // Quick health check with very short timeout
      const response = await fetch('https://api.mistral.ai/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(3000) // 3 second timeout
      });
      
      return response.ok ? 'connected' : 'disconnected';
    } catch (error) {
      console.log('[config] Mistral connection test failed:', error instanceof Error ? error.message : 'Unknown error');
      return 'disconnected';
    }
  }
}