import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BottomNav } from '../../src/components/BottomNav';

describe('BottomNav', () => {
  it('renders both tabs', () => {
    const mockOnTabChange = vi.fn();
    
    render(
      <BottomNav activeTab="flashcards" onTabChange={mockOnTabChange} />
    );

    expect(screen.getByLabelText('Audio Briefings')).toBeInTheDocument();
    expect(screen.getByLabelText('Flashcards')).toBeInTheDocument();
  });

  it('highlights the active tab', () => {
    const mockOnTabChange = vi.fn();
    
    render(
      <BottomNav activeTab="audio" onTabChange={mockOnTabChange} />
    );

    const audioTab = screen.getByLabelText('Audio Briefings');
    const flashcardsTab = screen.getByLabelText('Flashcards');

    expect(audioTab).toHaveClass('active');
    expect(flashcardsTab).not.toHaveClass('active');
  });

  it('calls onTabChange when a tab is clicked', () => {
    const mockOnTabChange = vi.fn();
    
    render(
      <BottomNav activeTab="flashcards" onTabChange={mockOnTabChange} />
    );

    const audioTab = screen.getByLabelText('Audio Briefings');
    fireEvent.click(audioTab);

    expect(mockOnTabChange).toHaveBeenCalledWith('audio');
  });

  it('displays correct tab labels', () => {
    const mockOnTabChange = vi.fn();
    
    render(
      <BottomNav activeTab="flashcards" onTabChange={mockOnTabChange} />
    );

    expect(screen.getByText('Audio')).toBeInTheDocument();
    expect(screen.getByText('Flashcards')).toBeInTheDocument();
  });
});