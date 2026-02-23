import React from 'react';
import type { TabType } from '../types';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const AudioIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
  </svg>
);

const FlashcardIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/>
  </svg>
);

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, onTabChange }) => {
  return (
    <nav className="tab-bar">
      <button
        className={`tab-item ${activeTab === 'audio' ? 'active' : ''}`}
        onClick={() => onTabChange('audio')}
        aria-label="Audio Briefings"
      >
        <AudioIcon className="w-6 h-6 mb-1" />
        <span className="text-xs font-medium">Audio</span>
      </button>
      
      <button
        className={`tab-item ${activeTab === 'flashcards' ? 'active' : ''}`}
        onClick={() => onTabChange('flashcards')}
        aria-label="Flashcards"
      >
        <FlashcardIcon className="w-6 h-6 mb-1" />
        <span className="text-xs font-medium">Flashcards</span>
      </button>
    </nav>
  );
};