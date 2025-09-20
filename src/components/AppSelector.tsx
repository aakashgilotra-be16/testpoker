import React, { useState } from 'react';
import { Zap, Users, ArrowRight, Loader2 } from 'lucide-react';

interface AppSelectorProps {
  onSelectApp: (appType: 'estimation' | 'retrospective') => void;
}

export const AppSelector: React.FC<AppSelectorProps> = ({ onSelectApp }) => {
  const [selectedApp, setSelectedApp] = useState<'estimation' | 'retrospective' | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAppSelect = async (appType: 'estimation' | 'retrospective') => {
    setSelectedApp(appType);
    setLoading(true);
    
    // Add a small delay for better UX
    setTimeout(() => {
      onSelectApp(appType);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl mx-auto mb-6 flex items-center justify-center">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Agile Teams Super App</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Choose your agile collaboration tool to enhance your team's productivity and communication
          </p>
          <div className="mt-4 text-sm text-gray-500">
            You'll be asked to enter your name after selecting an app
          </div>
        </div>

        {/* App Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Story Estimation App */}
          <div 
            className={`relative group cursor-pointer transition-all duration-300 transform hover:scale-105 ${
              selectedApp === 'estimation' ? 'ring-4 ring-blue-500 ring-opacity-50' : ''
            }`}
            onClick={() => handleAppSelect('estimation')}
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-100 hover:border-blue-200 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                  <Zap className="w-8 h-8 text-white" />
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-blue-500 transition-colors" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Story Estimation</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Plan and estimate user stories with your team using planning poker. 
                Create stories, conduct voting sessions, and track estimation results.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span>Real-time collaborative voting</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span>Story management and tracking</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                  <span>Export results and reports</span>
                </div>
              </div>

              {selectedApp === 'estimation' && loading && (
                <div className="absolute inset-0 bg-white bg-opacity-90 rounded-2xl flex items-center justify-center">
                  <div className="flex items-center text-blue-600">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span className="font-medium">Loading Story Estimation...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Retrospective App */}
          <div 
            className={`relative group cursor-pointer transition-all duration-300 transform hover:scale-105 ${
              selectedApp === 'retrospective' ? 'ring-4 ring-purple-500 ring-opacity-50' : ''
            }`}
            onClick={() => handleAppSelect('retrospective')}
          >
            <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-gray-100 hover:border-purple-200 transition-all duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <Users className="w-8 h-8 text-white" />
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-purple-500 transition-colors" />
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Retrospective Sessions</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                Conduct effective team retrospectives with structured templates. 
                Gather feedback, identify improvements, and track team progress.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  <span>Structured retrospective templates</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  <span>Team feedback collection</span>
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  <span>Action item tracking</span>
                </div>
              </div>

              {selectedApp === 'retrospective' && loading && (
                <div className="absolute inset-0 bg-white bg-opacity-90 rounded-2xl flex items-center justify-center">
                  <div className="flex items-center text-purple-600">
                    <Loader2 className="w-6 h-6 animate-spin mr-2" />
                    <span className="font-medium">Loading Retrospectives...</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-12">
          <p className="text-gray-500 text-sm">
            Both tools support real-time collaboration and work seamlessly with your agile team
          </p>
        </div>
      </div>
    </div>
  );
};
