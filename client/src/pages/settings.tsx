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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="max-w-6xl mx-auto p-6">
          {/* Enhanced Header */}
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-3xl blur-3xl"></div>
            <div className="relative bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl p-4 shadow-xl">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg">
                  <SettingsIcon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                    Settings
                  </h1>
                  <p className="text-gray-600 text-xs">Manage your application configuration and preferences</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-8">
            {/* Enhanced API Configuration */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-indigo-500/10 rounded-3xl blur-xl"></div>
              <Card className="relative bg-white/90 backdrop-blur-sm border border-white/40 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xs font-medium text-gray-800">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-md">
                      <Key className="h-4 w-4 text-white" />
                    </div>
                    API Configuration
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-600">
                    Configure external service integrations for enhanced functionality
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
            </div>

            {/* Enhanced Processing Settings */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-3xl blur-xl"></div>
              <Card className="relative bg-white/90 backdrop-blur-sm border border-white/40 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xs font-medium text-gray-800">
                    <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg shadow-md">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    Processing Settings
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-600">
                    Configure invoice processing behavior and thresholds
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
            </div>

            {/* Enhanced Data Management */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-teal-500/10 rounded-3xl blur-xl"></div>
              <Card className="relative bg-white/90 backdrop-blur-sm border border-white/40 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xs font-medium text-gray-800">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-teal-600 rounded-lg shadow-md">
                      <Database className="h-4 w-4 text-white" />
                    </div>
                    Data Management
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-600">
                    Manage your invoice data, exports, and storage options
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
            </div>

            {/* Enhanced Security */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-3xl blur-xl"></div>
              <Card className="relative bg-white/90 backdrop-blur-sm border border-white/40 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-3 text-xs font-medium text-gray-800">
                    <div className="p-2 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg shadow-md">
                      <Shield className="h-4 w-4 text-white" />
                    </div>
                    Security
                  </CardTitle>
                  <CardDescription className="text-xs text-gray-600">
                    Security, privacy settings, and data retention controls
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
            </div>

            {/* Enhanced Save Settings */}
            <div className="relative pt-6">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-500/10 to-slate-500/10 rounded-3xl blur-xl"></div>
              <div className="relative bg-white/80 backdrop-blur-sm border border-white/40 rounded-3xl p-6 shadow-lg">
                <div className="flex justify-end gap-4">
                  <Button 
                    variant="outline" 
                    className="bg-white/80 backdrop-blur-sm hover:bg-gray-50 transition-all duration-300 rounded-xl px-6 py-3"
                  >
                    Reset to Defaults
                  </Button>
                  <Button 
                    className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                  >
                    Save Settings
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}