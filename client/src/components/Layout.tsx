import { Link, useLocation } from "wouter";
import { Receipt, Plus, List, BarChart, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface LayoutProps {
  children: React.ReactNode;
}

interface StatusResponse {
  mistralConfigured: boolean;
  ocrEnabled: boolean;
  lastUpdated: string;
  connectionStatus?: 'connected' | 'disconnected' | 'testing';
}

function OCRStatus() {
  const { data: status, isLoading } = useQuery<StatusResponse>({
    queryKey: ['/api/settings/status'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <>
        <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
        <span>Checking...</span>
      </>
    );
  }

  // Use the actual connection status if available, fallback to old logic
  const connectionStatus = status?.connectionStatus;
  const isConfigured = status?.mistralConfigured && status?.ocrEnabled;
  
  let statusColor = 'bg-gray-400';
  let statusText = 'Unknown';
  
  if (!isConfigured) {
    statusColor = 'bg-red-400';
    statusText = 'API Key Required';
  } else if (connectionStatus === 'testing') {
    statusColor = 'bg-yellow-400 animate-pulse';
    statusText = 'Testing Connection...';
  } else if (connectionStatus === 'connected') {
    statusColor = 'bg-green-400';
    statusText = 'Mistral OCR Connected';
  } else if (connectionStatus === 'disconnected') {
    statusColor = 'bg-red-400';
    statusText = 'Connection Failed';
  } else {
    // Fallback to old logic if connectionStatus not available
    statusColor = isConfigured ? 'bg-green-400' : 'bg-red-400';
    statusText = isConfigured ? 'Mistral OCR Connected' : 'API Key Required';
  }

  return (
    <>
      <div className={`w-2 h-2 rounded-full ${statusColor}`}></div>
      <span>{statusText}</span>
    </>
  );
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: Plus, label: "Process Invoice", active: location === "/" },
    { href: "/invoices", icon: List, label: "All Invoices", active: location === "/invoices" },
    { href: "/analytics", icon: BarChart, label: "Analytics", active: location === "/analytics" },
    { href: "/settings", icon: Settings, label: "Settings", active: location === "/settings" },
  ];

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/20">
      {/* Sidebar */}
      <div className="w-64 fixed h-full z-10">
        <div className="bg-white/80 backdrop-blur-xl border-r border-white/50 h-full shadow-xl">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-purple-700 rounded-lg shadow-lg">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900">
                InvoiceOCR
              </h1>
            </div>
          
            <nav className="space-y-1">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      item.active
                        ? "bg-gray-900 text-white"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </div>
                </Link>
              ))}
          </nav>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64 min-h-screen">
        {/* Status Bar */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-end">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <OCRStatus />
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="relative">
          {children}
        </main>
      </div>
    </div>
  );
}
