import React, { useState } from 'react';
import { X, FileText, Upload, AlertCircle } from 'lucide-react';

interface BulkStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (stories: Array<{ title: string; description: string }>) => Promise<void>;
}

export const BulkStoryModal: React.FC<BulkStoryModalProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const [storiesText, setStoriesText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!storiesText.trim()) {
      setError('Please enter some stories');
      return;
    }

    const lines = storiesText
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    if (lines.length === 0) {
      setError('Please enter at least one story');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const stories = lines.map(line => {
        // Check if line contains a separator like " - " to split title and description
        const separatorIndex = line.indexOf(' - ');
        if (separatorIndex > 0) {
          return {
            title: line.substring(0, separatorIndex).trim(),
            description: line.substring(separatorIndex + 3).trim(),
          };
        }
        return {
          title: line,
          description: '',
        };
      });

      await onSave(stories);
      setStoriesText('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save stories');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStoriesText('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  const previewStories = storiesText
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Bulk Import Stories</h2>
          </div>
          <button
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="stories" className="block text-sm font-medium text-gray-700 mb-2">
              Stories (one per line)
            </label>
            <textarea
              id="stories"
              value={storiesText}
              onChange={(e) => setStoriesText(e.target.value)}
              rows={12}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none font-mono text-sm"
              placeholder="Enter your stories, one per line:

As a user, I want to login to the system
As a user, I want to view my profile - So I can see my personal information
As an admin, I want to manage users
As a developer, I want to write unit tests - To ensure code quality

Tip: Use ' - ' to separate title from description"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2">
              <strong>Format:</strong> Each line becomes a new story. Use " - " to separate title from description.
            </p>
          </div>

          {previewStories.length > 0 && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Preview ({previewStories.length} stories)
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {previewStories.slice(0, 5).map((story, index) => {
                  const separatorIndex = story.indexOf(' - ');
                  const title = separatorIndex > 0 ? story.substring(0, separatorIndex) : story;
                  const description = separatorIndex > 0 ? story.substring(separatorIndex + 3) : '';
                  
                  return (
                    <div key={index} className="bg-white p-3 rounded border border-gray-200">
                      <div className="font-medium text-gray-900 text-sm">{title}</div>
                      {description && (
                        <div className="text-gray-600 text-xs mt-1">{description}</div>
                      )}
                    </div>
                  );
                })}
                {previewStories.length > 5 && (
                  <div className="text-center text-gray-500 text-sm py-2">
                    ... and {previewStories.length - 5} more stories
                  </div>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center text-red-600 text-sm bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || previewStories.length === 0}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creating Stories...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Create {previewStories.length} Stories
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};