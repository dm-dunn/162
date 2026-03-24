import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';

function buildChartData(progression, standings) {
  if (!progression.length || !standings.length) return [];

  const userIds = standings.map(s => s.user_id);

  // Start row: all users at 0
  const start = { day: 'Start' };
  userIds.forEach(uid => { start[`u_${uid}`] = 0; });

  // Group by day
  const byDay = {};
  progression.forEach(row => {
    const d = new Date(row.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (!byDay[d]) byDay[d] = { day: d };
    byDay[d][`u_${row.user_id}`] = Number(row.cumulative);
  });

  // Forward-fill missing values within each day
  const sorted = Object.values(byDay);
  const last = {};
  sorted.forEach(pt => {
    userIds.forEach(uid => {
      const k = `u_${uid}`;
      if (pt[k] == null) pt[k] = last[k] ?? 0;
      last[k] = pt[k];
    });
  });

  return [start, ...sorted];
}

function computeStreak(form) {
  // form = array of {result} oldest-to-newest
  if (!form.length) return { type: null, count: 0 };
  let last = form[form.length - 1].result;
  let count = 0;
  for (let i = form.length - 1; i >= 0; i--) {
    if (form[i].result === last) count++;
    else break;
  }
  return { type: last === 'win' ? 'hot' : 'cold', count };
}

const CustomTooltip = ({ active, payload, label, standings }) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => b.value - a.value);
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-600 mb-1">{label}</p>
      {sorted.map(entry => {
        const uid = Number(entry.dataKey.replace('u_', ''));
        const s = standings.find(x => x.user_id === uid);
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 py-0.5">
            <span className="w-2 h-2 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: entry.color }} />
            <span className="text-gray-700">{s?.username || entry.dataKey}</span>
            <span className="font-bold ml-auto pl-3" style={{ color: entry.color }}>{entry.value} pts</span>
          </div>
        );
      })}
    </div>
  );
};

export default function LeagueProgressionChart({ standings, progression, recentForm }) {
  const chartData = buildChartData(progression, standings);

  // Group recent form by user
  const formByUser = {};
  recentForm.forEach(row => {
    if (!formByUser[row.user_id]) formByUser[row.user_id] = [];
    formByUser[row.user_id].push(row);
  });

  if (!chartData.length) {
    return (
      <div className="text-gray-400 text-sm text-center py-8">
        No progression data yet — picks will appear here once games are scored.
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Points Progression</h3>
        <span className="text-xs text-gray-400">Cumulative over the season</span>
      </div>

      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<CustomTooltip standings={standings} />} />
          {standings.map(s => (
            <Line
              key={s.user_id}
              type="monotone"
              dataKey={`u_${s.user_id}`}
              stroke={s.color || '#1e40af'}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
              name={s.username}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Recent Form Guide */}
      <div className="mt-4 border-t border-gray-100 pt-3">
        <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Recent Form</p>
        <div className="space-y-1.5">
          {standings.map(s => {
            const form = formByUser[s.user_id] || [];
            const streak = computeStreak(form);
            return (
              <div key={s.user_id} className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color || '#1e40af' }} />
                <span className="text-xs text-gray-600 w-24 truncate">{s.username}</span>
                <div className="flex gap-0.5">
                  {form.map((pick, i) => (
                    <span
                      key={i}
                      title={pick.result}
                      className={`w-4 h-4 rounded-sm text-[9px] font-bold flex items-center justify-center ${
                        pick.result === 'win'
                          ? 'bg-green-500 text-white'
                          : 'bg-red-400 text-white'
                      }`}
                    >
                      {pick.result === 'win' ? 'W' : 'L'}
                    </span>
                  ))}
                </div>
                {streak.count >= 3 && (
                  <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    streak.type === 'hot'
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-blue-100 text-blue-500'
                  }`}>
                    {streak.type === 'hot' ? '🔥' : '❄️'} {streak.count}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
