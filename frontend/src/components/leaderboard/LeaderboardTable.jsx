export default function LeaderboardTable({ leaderboard, currentUserId }) {
  // Calculate max points for scaling
  const maxPoints = Math.max(...leaderboard.map(entry => entry.total_points), 100);

  return (
    <div className="card">
      <div className="space-y-2">
        {leaderboard.map((entry) => {
          const isCurrentUser = entry.user_id === currentUserId;
          const percentOfMax = (entry.total_points / maxPoints) * 100;

          return (
            <div
              key={entry.user_id}
              className={`rounded-lg transition-all ${
                isCurrentUser ? 'ring-2 ring-secondary-red' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Rank */}
                <span className="text-xl font-bold text-secondary-navy min-w-[2.5rem] text-center">
                  {entry.rank}
                </span>

                {/* Bar graph container */}
                <div className="flex-1 relative h-10 bg-gray-100 rounded-lg overflow-hidden shadow-inner">
                  {/* Colored bar with gradient and shadow */}
                  <div
                    className="absolute inset-y-0 left-0 rounded-lg transition-all duration-500 flex items-center justify-between px-3 shadow-md"
                    style={{
                      width: `${percentOfMax}%`,
                      background: `linear-gradient(to bottom, ${entry.color || '#1e40af'}, ${entry.color || '#1e40af'}dd)`,
                      minWidth: percentOfMax > 0 ? '60px' : '0'
                    }}
                  >
                    {/* Glossy overlay on top half */}
                    <div className="absolute inset-0 rounded-lg pointer-events-none"
                         style={{
                           background: 'linear-gradient(to bottom, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0.1) 40%, transparent 50%)'
                         }}
                    />

                    {/* Content */}
                    <div className="flex items-center gap-2 text-white text-sm font-medium relative z-10">
                      <span>{entry.username}</span>
                      {isCurrentUser && (
                        <span className="text-xs bg-white/20 backdrop-blur-sm px-1.5 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </div>
                    <span className="text-white text-sm font-semibold relative z-10">
                      {entry.total_points}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
