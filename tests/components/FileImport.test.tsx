import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { FileImport } from '../../src/components/FileImport';

describe('FileImport', () => {
  it('renders import button', () => {
    const mockOnImport = vi.fn();
    const mockOnError = vi.fn();
    
    render(<FileImport onImport={mockOnImport} onError={mockOnError} />);

    expect(screen.getByText('Import JSON File')).toBeInTheDocument();
    expect(screen.getByText('Select flashcard decks or audio briefings')).toBeInTheDocument();
  });

  it('accepts JSON files', () => {
    const mockOnImport = vi.fn();
    const mockOnError = vi.fn();
    
    render(<FileImport onImport={mockOnImport} onError={mockOnError} />);

    const fileInput = screen.getByLabelText('Import JSON file');
    expect(fileInput).toHaveAttribute('accept', '.json');
  });

  it('shows error for non-JSON files', async () => {
    const mockOnImport = vi.fn();
    const mockOnError = vi.fn();
    
    render(<FileImport onImport={mockOnImport} onError={mockOnError} />);

    const fileInput = screen.getByLabelText('Import JSON file');
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Please select a JSON file');
    });
  });

  it('processes valid flashcard JSON', async () => {
    const mockOnImport = vi.fn();
    const mockOnError = vi.fn();
    
    render(<FileImport onImport={mockOnImport} onError={mockOnError} />);

    const fileInput = screen.getByLabelText('Import JSON file');
    const flashcardData = {
      deck_id: 'test-deck',
      title: 'Test Deck',
      cards: [{ id: '1', question: 'Q', answer: 'A' }],
      source: 'test',
      created_at: '2025-01-01T00:00:00Z'
    };
    
    const file = new File([JSON.stringify(flashcardData)], 'test.json', { 
      type: 'application/json' 
    });
    
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockOnImport).toHaveBeenCalledWith([flashcardData]);
    });
  });
});