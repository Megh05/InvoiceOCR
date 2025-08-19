import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="w-full max-w-lg mx-4">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/20 to-orange-500/20 rounded-3xl blur-3xl"></div>
          <Card className="relative bg-white/90 backdrop-blur-sm border border-white/40 rounded-3xl shadow-xl">
            <CardContent className="p-12 text-center">
              <div className="mb-8">
                <div className="w-20 h-20 mx-auto mb-6 p-4 bg-gradient-to-r from-red-100 to-orange-100 rounded-2xl">
                  <AlertCircle className="w-full h-full text-red-500" />
                </div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-3">
                  404 - Page Not Found
                </h1>
                <p className="text-gray-600 text-lg">
                  The page you're looking for doesn't exist or has been moved.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => window.history.back()}
                  variant="outline"
                  className="bg-white/80 backdrop-blur-sm hover:bg-gray-50 transition-all duration-300 rounded-xl px-6 py-3"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Go Back
                </Button>
                <Button 
                  onClick={() => window.location.href = "/"}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
