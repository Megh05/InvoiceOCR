import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Settings as SettingsIcon, Key, Database, Zap, Shield, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import Layout from "@/components/Layout";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Settings() {
  const [apiKey, setApiKey] = useState("");
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [connectionMessage, setConnectionMessage] = useState("");
  const { toast } = useToast();

  const testConnectionMutation = useMutation({
    mutationFn: async (key: string) => {
      const response = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: key }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Connection test failed');
      }
      return response.json();
    },
    onMutate: () => {
      setConnectionStatus("testing");
      setConnectionMessage("Testing connection...");
    },
    onSuccess: (data) => {
      setConnectionStatus("success");
      setConnectionMessage(data.message || "Connection successful!");
      toast({
        title: "Connection Test Successful",
        description: "Mistral OCR API is working correctly.",
      });
    },
    onError: (error: Error) => {
      setConnectionStatus("error");
      setConnectionMessage(error.message);
      toast({
        title: "Connection Test Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveSettingsMutation = useMutation({
    mutationFn: async (settings: { apiKey: string }) => {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to save settings');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Saved",
        description: "Your configuration has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleTestConnection = () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your Mistral OCR API key first.",
        variant: "destructive",
      });
      return;
    }
    testConnectionMutation.mutate(apiKey);
  };

  const handleSaveSettings = () => {
    if (!apiKey.trim()) {
      toast({
        title: "API Key Required",
        description: "Please enter your Mistral OCR API key first.",
        variant: "destructive",
      });
      return;
    }
    saveSettingsMutation.mutate({ apiKey });
  };

  const getConnectionStatusIcon = () => {
    switch (connectionStatus) {
      case "testing":
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <div className="w-4 h-4 bg-gray-400 rounded-full" />;
    }
  };

  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case "testing":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <Loader2 className="w-2 h-2 animate-spin" />
            Testing...
          </Badge>
        );
      case "success":
        return (
          <Badge variant="secondary" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            Connected
          </Badge>
        );
      case "error":
        return (
          <Badge variant="destructive" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="flex items-center gap-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
            Not tested
          </Badge>
        );
    }
  };

  return (
    <Layout>
      <div className="container mx-auto py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <SettingsIcon className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Settings</h1>
              <p className="text-muted-foreground">Manage your application configuration and preferences</p>
            </div>
          </div>

          <div className="grid gap-6">
            {/* API Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  API Configuration
                </CardTitle>
                <CardDescription>
                  Configure external service integrations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="mistral-api">Mistral OCR API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="mistral-api"
                      type="password" 
                      placeholder="Enter your Mistral OCR API key" 
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1"
                    />
                    {getConnectionStatusBadge()}
                  </div>
                  
                  {connectionMessage && (
                    <div className="flex items-center gap-2 text-sm">
                      {getConnectionStatusIcon()}
                      <span className={connectionStatus === "error" ? "text-red-600" : "text-green-600"}>
                        {connectionMessage}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleTestConnection}
                      disabled={!apiKey.trim() || testConnectionMutation.isPending}
                    >
                      {testConnectionMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Testing...
                        </>
                      ) : (
                        "Test Connection"
                      )}
                    </Button>
                    
                    <Button 
                      size="sm"
                      onClick={handleSaveSettings}
                      disabled={!apiKey.trim() || saveSettingsMutation.isPending}
                    >
                      {saveSettingsMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        "Save API Key"
                      )}
                    </Button>
                  </div>
                  
                  <p className="text-sm text-muted-foreground">
                    Required for OCR text extraction. Keep this secure. Get your API key from{" "}
                    <a 
                      href="https://console.mistral.ai/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Mistral Console
                    </a>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Processing Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Processing Settings
                </CardTitle>
                <CardDescription>
                  Configure invoice processing behavior
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="auto-save">Auto-save processed invoices</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically save invoices after successful processing
                    </p>
                  </div>
                  <Switch id="auto-save" defaultChecked />
                </div>
                
                <Separator />
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="confidence-threshold">High confidence threshold</Label>
                    <p className="text-sm text-muted-foreground">
                      Minimum confidence score for automatic field acceptance
                    </p>
                  </div>
                  <Input 
                    id="confidence-threshold"
                    type="number" 
                    min="0" 
                    max="1" 
                    step="0.1"
                    defaultValue="0.8"
                    className="w-20"
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="fallback-parsing">Enable fallback parsing</Label>
                    <p className="text-sm text-muted-foreground">
                      Use alternative methods when primary OCR fails
                    </p>
                  </div>
                  <Switch id="fallback-parsing" defaultChecked />
                </div>
              </CardContent>
            </Card>

            {/* Data Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Data Management
                </CardTitle>
                <CardDescription>
                  Manage your invoice data and storage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Export All Data</Label>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Export JSON</Button>
                      <Button variant="outline" size="sm">Export CSV</Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Data Cleanup</Label>
                    <Button variant="outline" size="sm" className="text-destructive">
                      Clear All Data
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Security */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security
                </CardTitle>
                <CardDescription>
                  Security and privacy settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="log-requests">Log API requests</Label>
                    <p className="text-sm text-muted-foreground">
                      Keep detailed logs of all API calls for debugging
                    </p>
                  </div>
                  <Switch id="log-requests" defaultChecked />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="data-retention">Data retention (days)</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically delete processed invoices after this period
                    </p>
                  </div>
                  <Input 
                    id="data-retention"
                    type="number" 
                    min="0"
                    defaultValue="365"
                    className="w-24"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Save Settings */}
            <div className="flex justify-end gap-2">
              <Button variant="outline">Reset to Defaults</Button>
              <Button>Save Settings</Button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}