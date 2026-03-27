import { View, Text, useWindowDimensions } from 'react-native';

const CHART_H = 160;
const PAD = { top: 14, right: 10, bottom: 22, left: 30 };
const LINE_H = 3;
const DOT_R = 5;

export default function ProgressionChart({ progression, standings }) {
  const { width } = useWindowDimensions();
  // card has 16px padding each side, screen has 16px padding each side
  const chartWidth = width - 64;
  const innerW = chartWidth - PAD.left - PAD.right;
  const innerH = CHART_H - PAD.top - PAD.bottom;

  // Build color lookup from standings
  const userInfo = {};
  for (const s of standings) {
    userInfo[s.user_id] = { color: s.color || '#6b7280' };
  }

  if (!progression || progression.length === 0) {
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center' }}>
        <Text style={{ color: '#9ca3af', fontSize: 13 }}>
          No game data yet — check back once picks are scored.
        </Text>
      </View>
    );
  }

  // Group progression by user, prepend a zero-point start
  const userProg = {};
  for (const row of progression) {
    const uid = String(row.user_id);
    if (!userProg[uid]) userProg[uid] = [];
    userProg[uid].push({ day: row.day, pts: parseFloat(row.cumulative) });
  }

  const allDays = ['START', ...[...new Set(progression.map(r => r.day))].sort()];
  for (const uid of Object.keys(userProg)) {
    userProg[uid] = [{ day: 'START', pts: 0 }, ...userProg[uid]];
  }

  const maxPts = Math.max(...progression.map(r => parseFloat(r.cumulative) || 0), 1);
  const xScale = i => (i / Math.max(allDays.length - 1, 1)) * innerW;
  const yScale = pts => innerH - (pts / maxPts) * innerH;

  // Build lines + endpoint dots
  const lines = [];
  const endDots = [];

  for (const [uid, rows] of Object.entries(userProg)) {
    const color = (userInfo[uid] || userInfo[Number(uid)] || {}).color || '#6b7280';
    const pts = rows.map(r => ({
      x: xScale(allDays.indexOf(r.day)),
      y: yScale(r.pts),
    }));

    for (let i = 0; i < pts.length - 1; i++) {
      const { x: x1, y: y1 } = pts[i];
      const { x: x2, y: y2 } = pts[i + 1];
      const len = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
      const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
      lines.push({ key: `${uid}-${i}`, color, len, angle, cx: (x1 + x2) / 2, cy: (y1 + y2) / 2 });
    }

    const last = pts[pts.length - 1];
    endDots.push({ key: `${uid}-end`, color, x: last.x, y: last.y });
  }

  const yLabels = [
    { val: Math.round(maxPts),     top: PAD.top - 7 },
    { val: Math.round(maxPts / 2), top: PAD.top + innerH / 2 - 7 },
    { val: 0,                      top: PAD.top + innerH - 7 },
  ];

  return (
    <View style={{ marginTop: 4 }}>
      {/* Line Chart */}
      <View style={{ height: CHART_H, width: chartWidth, position: 'relative' }}>
        {yLabels.map(({ val, top }, i) => (
          <Text key={i} style={{
            position: 'absolute', left: 0, top,
            fontSize: 9, color: '#9ca3af', width: PAD.left - 4, textAlign: 'right',
          }}>
            {val}
          </Text>
        ))}

        <View style={{
          position: 'absolute', left: PAD.left, top: PAD.top,
          width: innerW, height: innerH,
          overflow: 'hidden',
        }}>
          {/* Horizontal grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map(r => (
            <View key={r} style={{
              position: 'absolute', left: 0, top: r * innerH,
              width: innerW, height: r === 1 ? 1.5 : 1,
              backgroundColor: r === 1 ? '#d1d5db' : '#f0f0f0',
            }} />
          ))}

          {/* Line segments */}
          {lines.map(({ key, color, len, angle, cx, cy }) => (
            <View key={key} style={{
              position: 'absolute',
              left: cx - len / 2,
              top: cy - LINE_H / 2,
              width: len,
              height: LINE_H,
              backgroundColor: color,
              borderRadius: LINE_H / 2,
              transform: [{ rotate: `${angle}deg` }],
            }} />
          ))}

          {/* End-of-line dots */}
          {endDots.map(({ key, color, x, y }) => (
            <View key={key} style={{
              position: 'absolute',
              left: x - DOT_R,
              top: y - DOT_R,
              width: DOT_R * 2,
              height: DOT_R * 2,
              borderRadius: DOT_R,
              backgroundColor: color,
              borderWidth: 2,
              borderColor: '#fff',
            }} />
          ))}
        </View>
      </View>

      {/* Legend */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4, paddingLeft: PAD.left }}>
        {standings.map(s => (
          <View key={s.user_id} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: s.color || '#6b7280' }} />
            <Text style={{ fontSize: 10, color: '#6b7280' }}>{s.username}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
