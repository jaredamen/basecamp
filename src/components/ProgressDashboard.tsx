// ProgressDashboard component
import type { UserProfile } from '../types/profile';

interface ProgressDashboardProps {
  profile: UserProfile;
  weeklyStats: {
    sessionsCount: number;
    cardsStudied: number;
    averageAccuracy: number;
    totalMinutes: number;
    streakActive: boolean;
  };
  onStartStudySession?: () => void;
}

export function ProgressDashboard({ profile, weeklyStats, onStartStudySession }: ProgressDashboardProps) {
  const getStreakEmoji = () => {
    if (profile.currentStreak >= 30) return '👑';
    if (profile.currentStreak >= 7) return '⚡';
    if (profile.currentStreak >= 3) return '🔥';
    return '✨';
  };

  const getStreakMessage = () => {
    const voicePersonality = profile.preferredVoice;
    
    if (profile.currentStreak === 0) {
      switch (voicePersonality) {
        case 'peter-griffin':
          return 'Come on, let\'s get this freakin\' streak started!';
        case 'motivational':
          return 'TODAY is the day to START your winning streak!';
        case 'asmr':
          return 'A new beginning... how peaceful and exciting...';
        default:
          return 'Ready to start a new study streak?';
      }
    } else if (!weeklyStats.streakActive) {
      switch (voicePersonality) {
        case 'peter-griffin':
          return `Don't let your ${profile.currentStreak}-day streak die! That'd be freakin' terrible!`;
        case 'motivational':
          return `Your ${profile.currentStreak}-day streak is WAITING for you! Don't give up now!`;
        case 'asmr':
          return `Your ${profile.currentStreak}-day streak... so close to continuing... just one gentle session...`;
        default:
          return `Keep your ${profile.currentStreak}-day streak alive!`;
      }
    } else {
      switch (voicePersonality) {
        case 'peter-griffin':
          return `Holy crap! ${profile.currentStreak} days! You're on a freakin' roll!`;
        case 'motivational':
          return `${profile.currentStreak} DAYS STRONG! You're absolutely CRUSHING it!`;
        case 'asmr':
          return `${profile.currentStreak} beautiful days of learning... so wonderfully consistent...`;
        default:
          return `Amazing ${profile.currentStreak}-day streak!`;
      }
    }
  };

  const getAccuracyColor = () => {
    if (weeklyStats.averageAccuracy >= 80) return 'text-green-400';
    if (weeklyStats.averageAccuracy >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  const formatStudyTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header with Greeting */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-dark-100">
          {profile.displayName ? `Hey ${profile.displayName}!` : 'Welcome back!'}
        </h2>
        <p className="text-dark-400">
          {getStreakMessage()}
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Study Streak */}
        <div className={`bg-dark-800 rounded-lg p-4 border-2 ${
          weeklyStats.streakActive ? 'border-orange-500/30 bg-orange-500/5' : 'border-dark-700'
        }`}>
          <div className="text-center space-y-2">
            <div className="text-2xl">{getStreakEmoji()}</div>
            <div className="text-2xl font-bold text-orange-400">
              {profile.currentStreak}
            </div>
            <div className="text-xs text-dark-400">day streak</div>
            {!weeklyStats.streakActive && profile.currentStreak > 0 && (
              <div className="text-xs text-orange-400">⚠️ At risk!</div>
            )}
          </div>
        </div>

        {/* Total Cards */}
        <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
          <div className="text-center space-y-2">
            <div className="text-2xl">🧠</div>
            <div className="text-2xl font-bold text-blue-400">
              {profile.totalCardsStudied}
            </div>
            <div className="text-xs text-dark-400">cards mastered</div>
          </div>
        </div>

        {/* Weekly Accuracy */}
        <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
          <div className="text-center space-y-2">
            <div className="text-2xl">🎯</div>
            <div className={`text-2xl font-bold ${getAccuracyColor()}`}>
              {weeklyStats.averageAccuracy}%
            </div>
            <div className="text-xs text-dark-400">accuracy</div>
          </div>
        </div>

        {/* Study Time */}
        <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
          <div className="text-center space-y-2">
            <div className="text-2xl">⏱️</div>
            <div className="text-2xl font-bold text-purple-400">
              {formatStudyTime(weeklyStats.totalMinutes)}
            </div>
            <div className="text-xs text-dark-400">this week</div>
          </div>
        </div>
      </div>

      {/* Weekly Progress Bar */}
      <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-dark-100">This Week's Progress</h3>
            <span className="text-sm text-dark-400">
              {weeklyStats.sessionsCount} sessions
            </span>
          </div>
          
          {/* Progress visualization */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-dark-400">
              <span>Cards studied</span>
              <span>{weeklyStats.cardsStudied}</span>
            </div>
            <div className="w-full bg-dark-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.min((weeklyStats.cardsStudied / 50) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Achievements */}
      {profile.achievements.length > 0 && (
        <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
          <h3 className="font-semibold text-dark-100 mb-3">Recent Achievements</h3>
          <div className="flex gap-3 overflow-x-auto">
            {profile.achievements
              .slice(-3)
              .reverse()
              .map((achievement) => (
                <div 
                  key={achievement.id}
                  className="flex-shrink-0 bg-dark-700 rounded-lg p-3 text-center min-w-[80px]"
                >
                  <div className="text-xl mb-1">{achievement.icon}</div>
                  <div className="text-xs text-dark-300 font-medium">{achievement.title}</div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="space-y-3">
        <button
          onClick={onStartStudySession}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 
                   rounded-lg font-semibold hover:from-blue-700 hover:to-purple-700 
                   transition-all transform hover:scale-105"
        >
          {weeklyStats.sessionsCount === 0 
            ? '🚀 Start Today\'s Session' 
            : '📚 Continue Learning'
          }
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button className="bg-dark-800 text-dark-200 py-3 px-4 rounded-lg border border-dark-700
                           hover:bg-dark-700 transition-colors">
            📊 View Stats
          </button>
          
          <button className="bg-dark-800 text-dark-200 py-3 px-4 rounded-lg border border-dark-700
                           hover:bg-dark-700 transition-colors">
            🎭 Voice Settings
          </button>
        </div>
      </div>

      {/* Motivational Footer */}
      <div className="text-center p-4 bg-gradient-to-r from-blue-600/10 to-purple-600/10 rounded-lg border border-blue-500/20">
        <p className="text-sm text-blue-300">
          {profile.longestStreak > profile.currentStreak ? (
            `🏆 Your record is ${profile.longestStreak} days - you can beat it!`
          ) : profile.longestStreak > 0 ? (
            `🎉 New personal record! ${profile.longestStreak} days!`
          ) : (
            '✨ Every expert was once a beginner. Start your journey today!'
          )}
        </p>
      </div>
    </div>
  );
}

// Compact version for smaller spaces
export function ProgressSummary({ profile, weeklyStats }: Omit<ProgressDashboardProps, 'onStartStudySession'>) {
  return (
    <div className="bg-dark-800 rounded-lg p-4 border border-dark-700">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <div className="text-sm font-semibold text-dark-100">
            {profile.displayName || 'Your Progress'}
          </div>
          <div className="flex items-center gap-3 text-xs text-dark-400">
            <span>🔥 {profile.currentStreak}d</span>
            <span>🧠 {profile.totalCardsStudied}</span>
            <span>🎯 {weeklyStats.averageAccuracy}%</span>
          </div>
        </div>
        
        <div className="text-right">
          <div className="text-2xl">
            {profile.currentStreak >= 7 ? '⚡' : profile.currentStreak >= 3 ? '🔥' : '✨'}
          </div>
        </div>
      </div>
    </div>
  );
}