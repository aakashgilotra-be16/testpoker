import React, { useState } from 'react';
import { X, Download, FileText, Database } from 'lucide-react';

interface Story {
  id: string;
  title: string;
  description: string;
  final_points: string | null;
  created_at: string;
}

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  stories: Story[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  stories,
}) => {
  const [format, setFormat] = useState<'csv' | 'json'>('csv');

  const exportData = () => {
    if (format === 'csv') {
      exportCSV();
    } else {
      exportJSON();
    }
    onClose();
  };

  const exportCSV = () => {
    const headers = ['Title', 'Description', 'Points', 'Created Date'];
    const rows = stories.map(story => [
      story.title,
      story.description,
      story.final_points || '',
      new Date(story.created_at).toLocaleDateString(),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => 
        row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(',')
      ),
    ].join('\n');

    downloadFile(csvContent, 'planning-poker-stories.csv', 'text/csv');
  };

  const exportJSON = () => {
    const jsonData = {
      exportDate: new Date().toISOString(),
      stories: stories.map(story => ({
        title: story.title,
        description: story.description,
        finalPoints: story.final_points,
        createdAt: story.created_at,
      })),
    };

    const jsonContent = JSON.stringify(jsonData, null, 2);
    downloadFile(jsonContent, 'planning-poker-stories.json', 'application/json');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center mr-3">
              <Download className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Export Stories</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <p className="text-gray-600 mb-4">
              Export {stories.length} stories in your preferred format
            </p>

            <div className="space-y-3">
              <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="format"
                  value="csv"
                  checked={format === 'csv'}
                  onChange={(e) => setFormat(e.target.value as 'csv')}
                  className="mr-3"
                />
                <FileText className="w-5 h-5 text-gray-500 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">CSV Format</div>
                  <div className="text-sm text-gray-500">
                    Comma-separated values, perfect for spreadsheets
                  </div>
                </div>
              </label>

              <label className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                <input
                  type="radio"
                  name="format"
                  value="json"
                  checked={format === 'json'}
                  onChange={(e) => setFormat(e.target.value as 'json')}
                  className="mr-3"
                />
                <Database className="w-5 h-5 text-gray-500 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">JSON Format</div>
                  <div className="text-sm text-gray-500">
                    Structured data format for developers
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={exportData}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-6 py-2 rounded-lg hover:from-green-600 hover:to-green-700 transition-all duration-200 font-medium flex items-center"
            >
              <Download className="w-4 h-4 mr-2" />
              Export {format.toUpperCase()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};