import { useState } from 'react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export default function ExportModal({ threadId, messages, agentName, onClose }) {
  const [exportType, setExportType] = useState('pdf');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const exportAsPDF = async () => {
    setLoading(true);
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pageWidth = pdf.internal.pageSize.getWidth();
      const margin = 20;
      let yPosition = margin;

      // Add title
      pdf.setFontSize(20);
      pdf.text(`Chat with ${agentName}`, margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.text(new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      }), margin, yPosition);
      yPosition += 15;

      // Add messages
      pdf.setFontSize(11);
      messages.forEach((message) => {
        const sender = message.role === 'user' ? 'You' : agentName;
        const time = new Date(message.created_at).toLocaleTimeString();
        
        // Check if we need a new page
        if (yPosition > pageHeight - 30) {
          pdf.addPage();
          yPosition = margin;
        }

        // Add sender and time
        pdf.setFont(undefined, 'bold');
        pdf.text(`${sender} - ${time}`, margin, yPosition);
        yPosition += 5;

        // Add message content
        pdf.setFont(undefined, 'normal');
        const lines = pdf.splitTextToSize(message.content, pageWidth - 2 * margin);
        lines.forEach(line => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = margin;
          }
          pdf.text(line, margin, yPosition);
          yPosition += 5;
        });
        yPosition += 5;
      });

      // Add footer
      pdf.setFontSize(10);
      pdf.text('Generated from AI Chat Platform', margin, pageHeight - 10);

      // Save the PDF
      pdf.save(`chat-${agentName}-${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Failed to export PDF:', error);
      alert('Failed to export as PDF');
    } finally {
      setLoading(false);
    }
  };

  const sendEmail = async () => {
    if (!email) {
      alert('Please enter an email address');
      return;
    }

    setLoading(true);
    try {
      // Format messages for email
      const transcript = messages.map(msg => {
        const sender = msg.role === 'user' ? 'You' : agentName;
        const time = new Date(msg.created_at).toLocaleTimeString();
        return `${sender} (${time}):\n${msg.content}\n`;
      }).join('\n---\n\n');

      const emailContent = `
Chat with ${agentName}
Date: ${new Date().toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}

================================

${transcript}

================================
Generated from AI Chat Platform
      `.trim();

      // Try to use the backend API first
      try {
        const response = await axios.post(
          `${API_BASE_URL}/api/chat/threads/${threadId}/share`,
          { email, format: 'text' }
        );
        
        if (response.data.success) {
          // For now, fallback to mailto since email service isn't configured
          const subject = encodeURIComponent(`Chat transcript with ${agentName}`);
          const body = encodeURIComponent(emailContent);
          window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
          
          alert('Email client opened with transcript');
          onClose();
        }
      } catch (apiError) {
        // If API fails, use mailto as fallback
        const subject = encodeURIComponent(`Chat transcript with ${agentName}`);
        const body = encodeURIComponent(emailContent);
        window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
        
        alert('Email client opened with transcript');
        onClose();
      }
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (exportType === 'pdf') {
      exportAsPDF();
    } else {
      sendEmail();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full mx-2 sm:mx-0">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Export Conversation</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Export Format
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="pdf"
                    checked={exportType === 'pdf'}
                    onChange={(e) => setExportType(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2">Export as PDF</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="email"
                    checked={exportType === 'email'}
                    onChange={(e) => setExportType(e.target.value)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="ml-2">Send via Email</span>
                </label>
              </div>
            </div>

            {exportType === 'email' && (
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="recipient@example.com"
                />
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> The export will include all {messages.length} messages in this conversation.
              </p>
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6 border-t border-gray-200 flex flex-col sm:flex-row justify-end gap-3 sm:gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900 order-2 sm:order-1"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="px-6 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 order-1 sm:order-2"
          >
            {loading ? 'Processing...' : (exportType === 'pdf' ? 'Export PDF' : 'Send Email')}
          </button>
        </div>
      </div>
    </div>
  );
}