import { useState } from "react";
import { Button } from "@/components/ui/button";
import { WizardState, CanonicalInvoice } from "@/types/invoice";
import { Database, Download, Eye, Plus, RotateCcw, Loader2, CheckCircle } from "lucide-react";
import { api } from "@/services/api";

interface SaveStepProps {
  state: WizardState;
  onSave: () => void;
  onExportJSON: () => void;
  onExportCSV: () => void;
  onViewInvoice: () => void;
  onProcessAnother: () => void;
  onPrevious: () => void;
  onStartOver: () => void;
}

export default function SaveStep({
  state,
  onSave,
  onExportJSON,
  onExportCSV,
  onViewInvoice,
  onProcessAnother,
  onPrevious,
  onStartOver
}: SaveStepProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave();
      setSaveSuccess(true);
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportJSON = async () => {
    if (state.editedInvoice) {
      await api.exportJSON(state.editedInvoice);
    }
  };

  const handleExportCSV = async () => {
    if (state.editedInvoice?.line_items) {
      await api.exportCSV(state.editedInvoice.line_items);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Step 5: Save & Export</h3>
          <p className="text-gray-600">Finalize your invoice and choose export options</p>
        </div>

        {/* Success State */}
        {saveSuccess && state.savedInvoice && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-green-900">Invoice Saved Successfully!</h4>
                <p className="text-sm text-green-700">
                  Invoice ID: <span className="font-mono">{state.savedInvoice.id}</span>
                </p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button onClick={onViewInvoice} className="bg-green-500 hover:bg-green-600">
                <Eye className="w-4 h-4 mr-2" />
                View Invoice
              </Button>
              <Button variant="outline" onClick={onProcessAnother} className="border-green-300 text-green-700 hover:bg-green-50">
                <Plus className="w-4 h-4 mr-2" />
                Process Another
              </Button>
            </div>
          </div>
        )}

        {/* Processing State */}
        {isSaving && (
          <div className="text-center py-8 mb-6">
            <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p className="text-gray-600">Saving invoice to database...</p>
          </div>
        )}

        {/* Save/Export Options */}
        {!saveSuccess && !isSaving && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Save to Database */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <Database className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Save to Database</h4>
                  <p className="text-sm text-gray-600">Store in SQLite for future access</p>
                </div>
              </div>
              <Button className="w-full" onClick={handleSave} disabled={isSaving}>
                <Database className="w-4 h-4 mr-2" />
                Save Invoice
              </Button>
            </div>

            {/* Export Options */}
            <div className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <Download className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Export Options</h4>
                  <p className="text-sm text-gray-600">Download in various formats</p>
                </div>
              </div>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleExportJSON}
                  disabled={!state.editedInvoice}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download JSON
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full" 
                  onClick={handleExportCSV}
                  disabled={!state.editedInvoice?.line_items?.length}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!saveSuccess && (
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={onPrevious} disabled={isSaving}>
              Previous
            </Button>
            <Button variant="outline" onClick={onStartOver} disabled={isSaving}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Start Over
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
