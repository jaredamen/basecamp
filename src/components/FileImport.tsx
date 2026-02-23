import React, { useRef } from 'react';
import type { FlashcardDeck, AudioBriefing } from '../types';
import createDataLoader from '../data/loader';

interface FileImportProps {
  onImport: (data: FlashcardDeck[] | AudioBriefing[]) => void;
  onError: (error: string) => void;
}

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
  </svg>
);

export const FileImport: React.FC<FileImportProps> = ({ onImport, onError }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dataLoader = createDataLoader();

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      onError('Please select a JSON file');
      return;
    }

    try {
      const data = await dataLoader.importFromFile(file);
      onImport(data);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to import file');
    } finally {
      // Reset the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={handleFileSelect}
        className="w-full flex flex-col items-center justify-center p-6 border-2 border-dashed border-dark-600 rounded-lg hover:border-blue-500 transition-colors bg-dark-800 hover:bg-dark-750"
      >
        <UploadIcon className="w-8 h-8 mb-2 text-dark-400" />
        <span className="text-sm font-medium text-dark-200">Import JSON File</span>
        <span className="text-xs text-dark-500 mt-1">
          Select flashcard decks or audio briefings
        </span>
      </button>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Import JSON file"
      />
    </div>
  );
};