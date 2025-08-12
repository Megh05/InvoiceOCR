import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, Key, Database, Zap, Shield } from "lucide-react";
import Layout from "@/components/Layout";

export default function Settings() {
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
                <div className="space-y-2">
                  <Label htmlFor="mistral-api">Mistral OCR API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input 
                      id="mistral-api"
                      type="password" 
                      placeholder="••••••••••••••••" 
                      className="flex-1"
                    />
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      Connected
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Required for OCR text extraction. Keep this secure.
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