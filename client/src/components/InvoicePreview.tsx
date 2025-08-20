import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CanonicalInvoice, LineItem, FieldConfidence, TemplateMatch } from "@/types/invoice";
import { FileText, Edit3, Eye, Copy, Plus, Trash2, File } from "lucide-react";
import TemplateDisplay from "./TemplateDisplay";

interface InvoicePreviewProps {
  invoice: CanonicalInvoice;
  fieldConfidences?: FieldConfidence[];
  onInvoiceChange: (invoice: CanonicalInvoice) => void;
  rawOcrText?: string;
  editable?: boolean;
  templateMatch?: TemplateMatch;
  imageFile?: File | null;
  imageUrl?: string;
  inputType?: 'file' | 'url' | 'text' | null;
}

export default function InvoicePreview({
  invoice,
  fieldConfidences = [],
  onInvoiceChange,
  rawOcrText,
  editable = true,
  templateMatch,
  imageFile,
  imageUrl,
  inputType
}: InvoicePreviewProps) {
  const [isEditing, setIsEditing] = useState(editable);
  const [viewMode, setViewMode] = useState<'ocr' | 'document'>('ocr');

  const getFieldConfidence = (fieldName: string): FieldConfidence | undefined => {
    return fieldConfidences.find(fc => fc.field === fieldName);
  };

  const getConfidenceBadge = (fieldName: string) => {
    const fieldConf = getFieldConfidence(fieldName);
    if (!fieldConf) return null;

    if (fieldConf.confidence >= 0.85) {
      return <Badge variant="secondary" className="ml-2 text-xs bg-green-100 text-green-800">High ({Math.round(fieldConf.confidence * 100)}%)</Badge>;
    } else if (fieldConf.confidence >= 0.6) {
      return <Badge variant="secondary" className="ml-2 text-xs bg-amber-100 text-amber-800">Medium ({Math.round(fieldConf.confidence * 100)}%)</Badge>;
    } else {
      return <Badge variant="secondary" className="ml-2 text-xs bg-red-100 text-red-800">Low ({Math.round(fieldConf.confidence * 100)}%)</Badge>;
    }
  };

  const updateInvoice = (updates: Partial<CanonicalInvoice>) => {
    onInvoiceChange({ ...invoice, ...updates });
  };

  const updateLineItem = (index: number, updates: Partial<LineItem>) => {
    const updatedItems = [...(invoice.line_items || [])];
    updatedItems[index] = { ...updatedItems[index], ...updates };
    
    // Recalculate amount if qty or unit_price changed
    if (updates.qty !== undefined || updates.unit_price !== undefined) {
      const item = updatedItems[index];
      updatedItems[index].amount = item.qty * item.unit_price;
    }
    
    updateInvoice({ line_items: updatedItems });
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      line_number: (invoice.line_items?.length || 0) + 1,
      sku: null,
      description: "",
      qty: 1,
      unit_price: 0,
      amount: 0,
      tax: 0,
    };
    
    updateInvoice({
      line_items: [...(invoice.line_items || []), newItem]
    });
  };

  const removeLineItem = (index: number) => {
    const updatedItems = [...(invoice.line_items || [])];
    updatedItems.splice(index, 1);
    updateInvoice({ line_items: updatedItems });
  };

  const EditableField = ({ 
    label, 
    value, 
    fieldName, 
    type = "text",
    multiline = false,
    options,
    placeholder
  }: {
    label: string;
    value: any;
    fieldName: string;
    type?: string;
    multiline?: boolean;
    options?: { value: string; label: string }[];
    placeholder?: string;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 flex items-center">
        {label}
        {getConfidenceBadge(fieldName)}
      </label>
      {!isEditing ? (
        <div className="p-2 bg-gray-50 rounded border text-sm">
          {value || "Not specified"}
        </div>
      ) : options ? (
        <Select 
          value={value || ""} 
          onValueChange={(newValue) => updateInvoice({ [fieldName]: newValue })}
        >
          <SelectTrigger>
            <SelectValue placeholder={placeholder} />
          </SelectTrigger>
          <SelectContent>
            {options.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : multiline ? (
        <Textarea
          value={value || ""}
          onChange={(e) => updateInvoice({ [fieldName]: e.target.value })}
          placeholder={placeholder}
          rows={3}
        />
      ) : (
        <Input
          type={type}
          value={value || ""}
          onChange={(e) => updateInvoice({ [fieldName]: type === "number" ? Number(e.target.value) : e.target.value })}
          placeholder={placeholder}
        />
      )}
    </div>
  );

  // Create URL for PDF preview
  const documentUrl = imageFile ? URL.createObjectURL(imageFile) : imageUrl;
  const canShowDocument = (inputType === 'file' && imageFile) || (inputType === 'url' && imageUrl);

  return (
    <div className="space-y-6">
      {/* Template Recognition Display */}
      <TemplateDisplay templateMatch={templateMatch} category={invoice.category} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Document/Text Preview */}
        {(rawOcrText || canShowDocument) && (
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center">
                {viewMode === 'ocr' ? (
                  <>
                    <FileText className="w-5 h-5 mr-2" />
                    Original OCR Text
                  </>
                ) : (
                  <>
                    <File className="w-5 h-5 mr-2" />
                    Original Document
                  </>
                )}
              </CardTitle>
              {canShowDocument && (
                <Select value={viewMode} onValueChange={(value: 'ocr' | 'document') => setViewMode(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ocr">OCR Text View</SelectItem>
                    <SelectItem value="document">Original Document</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'ocr' && rawOcrText ? (
              <>
                <div className="bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono text-gray-700">
                    {rawOcrText}
                  </pre>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => navigator.clipboard.writeText(rawOcrText)}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Text
                </Button>
              </>
            ) : viewMode === 'document' && canShowDocument ? (
              <div className="space-y-3">
                <div className="border rounded-lg overflow-hidden bg-gray-50 max-h-96">
                  <object
                    data={documentUrl}
                    type={inputType === 'file' && imageFile?.type.includes('pdf') ? 'application/pdf' : undefined}
                    className="w-full h-80"
                  >
                    <div className="p-4 text-center">
                      <p className="text-sm text-gray-600 mb-2">Cannot display document inline</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => window.open(documentUrl, '_blank')}
                      >
                        <File className="w-4 h-4 mr-2" />
                        Open in New Tab
                      </Button>
                    </div>
                  </object>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(documentUrl, '_blank')}
                >
                  <File className="w-4 h-4 mr-2" />
                  Open in New Tab
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Editable Invoice Preview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center">
              <Edit3 className="w-5 h-5 mr-2" />
              Extracted Invoice Data
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(!isEditing)}
            >
              {isEditing ? (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  View Mode
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Mode
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Invoice Information */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Invoice Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <EditableField
                label="Invoice Number"
                value={invoice.invoice_number}
                fieldName="invoice_number"
                placeholder="Enter invoice number"
              />
              <EditableField
                label="Invoice Date"
                value={invoice.invoice_date}
                fieldName="invoice_date"
                type="date"
              />
              <EditableField
                label="Currency"
                value={invoice.currency}
                fieldName="currency"
                options={[
                  { value: "USD", label: "USD ($)" },
                  { value: "EUR", label: "EUR (€)" },
                  { value: "GBP", label: "GBP (£)" },
                  { value: "JPY", label: "JPY (¥)" },
                ]}
                placeholder="Select currency"
              />
            </div>
          </div>

          <Separator />

          {/* Vendor Information */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Vendor Information</h3>
            <div className="space-y-4">
              <EditableField
                label="Vendor Name"
                value={invoice.vendor_name}
                fieldName="vendor_name"
                placeholder="Enter vendor name"
              />
              <EditableField
                label="Vendor Address"
                value={invoice.vendor_address}
                fieldName="vendor_address"
                multiline
                placeholder="Enter vendor address"
              />
            </div>
          </div>

          <Separator />

          {/* Customer Information */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Customer Information</h3>
            <div className="space-y-4">
              <EditableField
                label="Bill To"
                value={invoice.bill_to}
                fieldName="bill_to"
                multiline
                placeholder="Enter billing address"
              />
              <EditableField
                label="Ship To"
                value={invoice.ship_to}
                fieldName="ship_to"
                multiline
                placeholder="Enter shipping address"
              />
            </div>
          </div>

          <Separator />

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Line Items</h3>
              {isEditing && (
                <Button size="sm" onClick={addLineItem}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              )}
            </div>
            
            {(invoice.line_items || []).length === 0 ? (
              <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed">
                <p className="text-gray-500">No line items found</p>
                {isEditing && (
                  <Button variant="outline" size="sm" className="mt-2" onClick={addLineItem}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Item
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {(invoice.line_items || []).map((item, index) => (
                  <Card key={index} className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                      <div className="md:col-span-2">
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Description</label>
                        {isEditing ? (
                          <Input
                            value={item.description}
                            onChange={(e) => updateLineItem(index, { description: e.target.value })}
                            placeholder="Item description"
                            className="text-sm"
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 rounded text-sm">{item.description}</div>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Qty</label>
                        {isEditing ? (
                          <Input
                            type="number"
                            min="1"
                            value={item.qty}
                            onChange={(e) => updateLineItem(index, { qty: Number(e.target.value) })}
                            className="text-sm text-center"
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 rounded text-sm text-center">{item.qty}</div>
                        )}
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-700 mb-1 block">Unit Price</label>
                        {isEditing ? (
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateLineItem(index, { unit_price: Number(e.target.value) })}
                            className="text-sm text-right"
                          />
                        ) : (
                          <div className="p-2 bg-gray-50 rounded text-sm text-right">
                            {invoice.currency === "EUR" ? "€" : "$"}{item.unit_price.toFixed(2)}
                          </div>
                        )}
                      </div>
                      <div className="flex items-end gap-2">
                        <div className="flex-1">
                          <label className="text-xs font-medium text-gray-700 mb-1 block">Amount</label>
                          <div className="p-2 bg-gray-100 rounded text-sm text-right font-medium">
                            {invoice.currency === "EUR" ? "€" : "$"}{item.amount.toFixed(2)}
                          </div>
                        </div>
                        {isEditing && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeLineItem(index)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <Separator />

          {/* Totals */}
          <div>
            <h3 className="font-semibold text-gray-900 mb-4">Totals</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <EditableField
                label="Subtotal"
                value={invoice.subtotal}
                fieldName="subtotal"
                type="number"
              />
              <EditableField
                label="Tax"
                value={invoice.tax}
                fieldName="tax"
                type="number"
              />
              <EditableField
                label="Total"
                value={invoice.total}
                fieldName="total"
                type="number"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </div>
  );
}