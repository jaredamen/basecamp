import React from 'react';
import type { AudioBriefing } from '../types';
import { FileImport } from './FileImport';

interface AudioFeedProps {
  briefings: AudioBriefing[];
  loading: boolean;
  onBriefingSelect: (briefing: AudioBriefing) => void;
  onImport: (briefings: AudioBriefing[]) => void;
  onError: (error: string) => void;
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const estimateDuration = (script: string): string => {
  // Rough estimate: average reading speed is ~150 words per minute
  const wordCount = script.split(/\s+/).length;
  const minutes = Math.ceil(wordCount / 150);
  return `~${minutes} min`;
};

const PlayIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M8 5v14l11-7z"/>
  </svg>
);

const MicrophoneIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z"/>
  </svg>
);

export const AudioFeed: React.FC<AudioFeedProps> = ({
  briefings,
  loading,
  onBriefingSelect,
  onImport,
  onError
}) => {
  const handleImport = (data: AudioBriefing[] | unknown[]) => {
    // Filter to ensure we only get AudioBriefing items
    const audioBriefings = data.filter((item: unknown): item is AudioBriefing => 
      typeof item === 'object' && item !== null && 'script' in item && typeof (item as AudioBriefing).script === 'string'
    );
    
    if (audioBriefings.length === 0) {
      onError('No valid audio briefings found in the imported file');
      return;
    }
    
    onImport(audioBriefings as AudioBriefing[]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto pb-20">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-dark-100 mb-6">Audio Briefings</h1>
        
        <FileImport onImport={handleImport} onError={onError} />
        
        {briefings.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-dark-400 text-lg mb-2">No audio briefings available</p>
            <p className="text-dark-500 text-sm">Import a JSON file to get started</p>
          </div>
        ) : (
          <div className="space-y-3 mt-6">
            {briefings.map((briefing) => (
              <button
                key={briefing.briefing_id}
                onClick={() => onBriefingSelect(briefing)}
                className="w-full bg-dark-800 hover:bg-dark-700 rounded-lg p-4 text-left transition-colors group"
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-1">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      {briefing.audio_file ? (
                        <PlayIcon className="w-6 h-6 text-blue-400" />
                      ) : (
                        <MicrophoneIcon className="w-6 h-6 text-blue-400" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-dark-100 mb-1 truncate">
                      {briefing.title}
                    </h3>
                    
                    <div className="flex items-center space-x-4 text-sm text-dark-400 mb-2">
                      <span>{formatDate(briefing.created_at)}</span>
                      <span>•</span>
                      <span>{estimateDuration(briefing.script)}</span>
                      {briefing.audio_file && (
                        <>
                          <span>•</span>
                          <span className="text-green-400">Audio available</span>
                        </>
                      )}
                    </div>
                    
                    {briefing.source && (
                      <p className="text-xs text-dark-500 mb-3 truncate">
                        Source: {new URL(briefing.source).hostname}
                      </p>
                    )}
                    
                    {/* Script preview */}
                    <p className="text-sm text-dark-300 line-clamp-2">
                      {briefing.script.length > 120 
                        ? `${briefing.script.slice(0, 120)}...` 
                        : briefing.script
                      }
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <PlayIcon className="w-5 h-5 text-dark-400 group-hover:text-dark-200 transition-colors" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};