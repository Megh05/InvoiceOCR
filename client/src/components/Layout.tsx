import { Link, useLocation } from "wouter";
import { Receipt, Plus, List, BarChart, Settings, Bell, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface LayoutProps {
  children: React.ReactNode;
}

function OCRStatus() {
  const { data: status, isLoading } = useQuery({
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
    { href: "/", icon: Plus, label: "New Invoice", active: location === "/" },
    { href: "/invoices", icon: List, label: "All Invoices", active: location === "/invoices" },
    { href: "/analytics", icon: BarChart, label: "Analytics", active: location === "/analytics" },
    { href: "/settings", icon: Settings, label: "Settings", active: location === "/settings" },
  ];

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200 fixed h-full z-10">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-8">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Receipt className="w-4 h-4 text-white" />
            </div>
            <h1 className="text-xl font-semibold text-gray-900">InvoiceOCR</h1>
          </div>
          
          <nav className="space-y-2">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
                    item.active
                      ? "bg-blue-50 text-blue-700"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </div>
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 ml-64">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">
                {location === "/" && "Process New Invoice"}
                {location === "/invoices" && "All Invoices"}
                {location === "/analytics" && "Analytics"}
                {location === "/settings" && "Settings"}
              </h2>
              <p className="text-gray-600 mt-1">
                {location === "/" && "Upload and extract structured data from invoice documents"}
                {location === "/invoices" && "View and manage all processed invoices"}
                {location === "/analytics" && "View processing analytics and reports"}
                {location === "/settings" && "Configure application settings"}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <OCRStatus />
              </div>
              <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <Bell className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-medium">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
