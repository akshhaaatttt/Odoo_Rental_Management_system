import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'react-hot-toast';

/**
 * Download Invoice Button Component
 * @param {string} invoiceId - Invoice ID (optional if orderId is provided)
 * @param {string} orderId - Order ID (optional if invoiceId is provided)
 * @param {string} variant - Button variant (default, outline, etc.)
 * @param {string} size - Button size
 * @param {string} className - Additional CSS classes
 */
export default function DownloadInvoiceButton({
  invoiceId,
  orderId,
  variant = 'outline',
  size = 'default',
  className = ''
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    if (!invoiceId && !orderId) {
      toast.error('Invoice or Order ID is required');
      return;
    }

    setIsDownloading(true);

    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Please login to download invoice');
        return;
      }

      // Determine endpoint based on provided ID
      const endpoint = invoiceId
        ? `/api/invoices/${invoiceId}/download`
        : `/api/invoices/order/${orderId}/download`;

      // Fetch PDF
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}${endpoint}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to download invoice');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'invoice.pdf';
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      // Convert response to blob
      const blob = await response.blob();

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('Invoice downloaded successfully');
    } catch (error) {
      console.error('Download error:', error);
      toast.error(error.message || 'Failed to download invoice');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      disabled={isDownloading}
      variant={variant}
      size={size}
      className={className}
    >
      {isDownloading ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
          Generating PDF...
        </>
      ) : (
        <>
          <Download className="h-4 w-4 mr-2" />
          Download Invoice
        </>
      )}
    </Button>
  );
}
