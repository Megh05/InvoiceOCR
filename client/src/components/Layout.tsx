import { Link, useLocation } from "wouter";
import { Receipt, Plus, List, BarChart, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface LayoutProps {
  children: React.ReactNode;
}

interface StatusResponse {
  mistralConfigured: boolean;
  ocrEnabled: boolean;
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

  const isConnected = status?.mistralConfigured && status?.ocrEnabled;

  return (
    <>
      <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
      <span>{isConnected ? 'Mistral OCR Connected' : 'API Key Required'}</span>
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
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Enhanced Sidebar */}
      <div className="w-64 fixed h-full z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 to-indigo-500/10 backdrop-blur-xl"></div>
        <div className="relative bg-white/80 backdrop-blur-sm border-r border-white/40 shadow-2xl h-full">
          <div className="p-6">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                InvoiceOCR
              </h1>
            </div>
          
            <nav className="space-y-3">
              {navItems.map((item) => (
                <Link key={item.href} href={item.href}>
                  <div
                    className={`group flex items-center space-x-3 px-4 py-3 rounded-2xl font-semibold transition-all duration-300 cursor-pointer ${
                      item.active
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg scale-105"
                        : "text-gray-700 hover:bg-white/60 hover:shadow-md hover:scale-102"
                    }`}
                  >
                    <item.icon className={`w-5 h-5 transition-transform duration-300 ${item.active ? 'text-white' : 'group-hover:scale-110'}`} />
                    <span className="text-sm">{item.label}</span>
                  </div>
                </Link>
              ))}
          </nav>
          </div>
        </div>
      </div>

      {/* Enhanced Main Content */}
      <div className="flex-1 ml-64 min-h-screen">
        {/* Enhanced OCR Status Bar */}
        <div className="bg-white/60 backdrop-blur-sm border-b border-white/40 px-6 py-3">
          <div className="flex items-center justify-end">
            <div className="flex items-center space-x-3 text-sm">
              <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-white/40 shadow-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <OCRStatus />
                </div>
              </div>
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
