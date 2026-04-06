# Basecamp + Climber Integration & TTS Enhancement Plan

## Current State Analysis

**Climber (Python CLI)**:
- ✅ Mature AI content processor (OpenAI/Anthropic APIs)
- ✅ Ingests URLs, PDFs, markdown → outputs JSON flashcards/briefings
- ✅ Already outputs Basecamp-compatible JSON format
- ✅ Robust CLI with presets (runbook, changelog, general)

**Basecamp (React PWA)**:
- ✅ Mobile-first study app for flashcards/audio
- ✅ File import system for Climber JSON
- ✅ Basic TTS (Web Speech API)
- ❌ No direct Climber integration
- ❌ No layperson onboarding

## The Integration Strategy

### Phase 1: Web API Bridge
**Goal**: Connect Climber's AI power to Basecamp's mobile UX

**Implementation**:
- Create FastAPI web service wrapper around Climber
- Expose endpoints: `/process`, `/status`, `/health`
- Deploy alongside Basecamp (same domain for CORS simplicity)
- Basecamp calls API instead of requiring file imports

### Phase 2: Enhanced TTS & Fun Voices
**Goal**: Make studying more engaging and accessible

**TTS Improvements**:
- Voice selection UI (system voices + character voices)
- **Peter Griffin voice simulation** using Web Audio API pitch/speed modulation
- TTS for flashcard questions/answers (hands-free study)
- Reading progress highlighting
- Speed/voice preferences storage

**Voice Personalities**:
- Standard (current)
- Peter Griffin (pitch-shifted + custom phrases)
- Motivational Coach (energetic tone)
- ASMR Study (soft, calming)

### Phase 3: Layperson Study Flows
**Goal**: Make it dead simple for non-technical users

**Quick Study Modes**:
1. **"Study This URL"** - paste link → auto-generate → study
2. **"Topic Deep Dive"** - enter topic → LLM creates comprehensive materials  
3. **"Document Study"** - upload PDF/text → extract key learning points
4. **"Refresh My Knowledge"** - revisit previous topics with new angles

**Onboarding Flow**:
- Welcome screen explaining the learning approach
- API key setup with clear privacy explanations
- Sample study session walkthrough
- Quick tour of features

### Phase 4: Advanced Learning Features
**Goal**: Make this a powerful learning companion

**Smart Features**:
- **Podcast Mode**: Auto-generate conversational audio scripts
- **Adaptive Flashcards**: Spaced repetition based on performance
- **Study Streaks**: Gamification with Peter Griffin celebrations
- **Offline Mode**: Cache frequently studied topics
- **Study Groups**: Share decks with teammates

## Technical Implementation

### Monorepo Structure:
```
/basecamp-platform/
├── web/                 # React PWA (existing Basecamp)
├── api/                 # FastAPI wrapper around Climber
├── climber/             # Python CLI (as submodule)
└── shared/              # Common types/schemas
```

### Key Files to Create/Modify:
**New Files**:
- `api/main.py` - FastAPI service
- `web/src/services/climberApi.ts` - API client
- `web/src/components/QuickStudy.tsx` - URL/topic input
- `web/src/hooks/useTTS.ts` - Enhanced TTS with voices
- `web/src/components/VoiceSettings.tsx` - Voice selection

**Modified Files**:
- `web/src/App.tsx` - Add quick study flows
- `web/src/components/AudioPlayer.tsx` - Voice selection
- `web/src/types/index.ts` - Add API types

### API Endpoints:
- `POST /api/process` - Process URL/text with Climber
- `GET /api/voices` - Available TTS voices
- `POST /api/audio/generate` - Generate audio with selected voice
- `GET /api/status/{task_id}` - Check processing status

## User Experience Flow

### For Laypeople:
1. **Open Basecamp** → Welcome screen
2. **"I want to study something"** → Quick study options
3. **Paste URL or enter topic** → AI generates materials  
4. **Pick voice** (including Peter Griffin!)
5. **Start studying** → Flashcards + audio with progress tracking

### For Advanced Users:
1. **Use Climber CLI** for batch processing
2. **Import to Basecamp** for mobile study
3. **Or use Basecamp's web interface** for one-off studies

## Why This Approach Works

1. **Preserves Climber's strengths** - robust AI processing stays in Python
2. **Leverages Basecamp's UX** - mobile-first study experience
3. **Bridges the gap** - web API makes integration seamless
4. **Serves both audiences** - technical users keep CLI, laypeople get guided UX
5. **Fun factor** - Peter Griffin voice makes studying memorable!

## Implementation Phases

### Phase 1: Enhanced TTS (Start Here)
- [ ] Create enhanced TTS hook with voice selection
- [ ] Add Peter Griffin voice simulation
- [ ] Add TTS to flashcard reading
- [ ] Create voice settings component
- [ ] Add TTS preferences storage

### Phase 2: Onboarding & UX
- [ ] Create welcome/onboarding flow
- [ ] Add quick study input components
- [ ] Create guided tour
- [ ] Add study mode selection

### Phase 3: API Integration
- [ ] Create FastAPI wrapper for Climber
- [ ] Implement processing endpoints
- [ ] Add API client to Basecamp
- [ ] Connect quick study flows to API

### Phase 4: Advanced Features
- [ ] Implement spaced repetition
- [ ] Add study streaks & gamification
- [ ] Create offline caching
- [ ] Add sharing functionality

This transforms Basecamp from a "companion app" into a complete learning platform while maintaining the modular architecture you've built.