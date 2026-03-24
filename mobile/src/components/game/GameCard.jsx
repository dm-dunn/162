import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { getTeamLogo, getTeamName, getTeamColor } from '../../utils/teamLogos';
import api from '../../services/api';
import { USE_MOCK_DATA } from '../../utils/mockData';

export default function GameCard({ game, existingPick, onPickMade, submitted }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [injuriesExpanded, setInjuriesExpanded] = useState(false);

  const gameTime = new Date(game.game_time);
  const isLocked = game.data_locked || submitted;

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getSpreadDisplay = (team) => {
    if (!game.spread) return '';
    if (team === 'home') {
      return game.spread > 0 ? `+${game.spread}` : `${game.spread}`;
    } else {
      return game.spread > 0 ? `${game.spread * -1}` : `+${game.spread * -1}`;
    }
  };

  const handlePickClick = async (pickedTeam, pickType) => {
    if (isLocked || loading) return;

    setLoading(true);
    setError('');

    try {
      if (USE_MOCK_DATA) {
        await new Promise(resolve => setTimeout(resolve, 300));
        onPickMade({ gameId: game.id, pickType, pickedTeam });
      } else {
        const response = await api.post('/picks', {
          gameId: game.id,
          pickType,
          pickedTeam
        });
        onPickMade(response.data.pick);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to make pick');
    } finally {
      setLoading(false);
    }
  };

  const isPicked = (team, pickType) => {
    return existingPick &&
      existingPick.picked_team === team &&
      existingPick.pick_type === pickType;
  };

  const hasPick = !!existingPick;
  const pickResult = existingPick?.result ?? null; // 'win' | 'loss' | null

  const renderTeamSection = (side) => {
    const abbr = side === 'away' ? game.away_team_abbr : game.home_team_abbr;
    const score = side === 'away' ? game.away_score : game.home_score;
    const teamColor = getTeamColor(abbr);
    const mlPicked = isPicked(side, 'moneyline');
    const sprPicked = isPicked(side, 'spread');
    const pickedBgColor = pickResult === 'win' ? '#16a34a' : pickResult === 'loss' ? '#dc2626' : teamColor;

    return (
      <View style={styles.teamSection}>
        <View style={styles.logoWrapper}>
          <Image
            source={{ uri: getTeamLogo(abbr) }}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.teamAbbr}>{abbr}</Text>
        {score !== null && <Text style={styles.score}>{score}</Text>}

        {/* ML Button */}
        <TouchableOpacity
          onPress={() => handlePickClick(side, 'moneyline')}
          disabled={isLocked || loading}
          activeOpacity={0.75}
          style={[
            styles.pickBtn,
            mlPicked
              ? { backgroundColor: pickedBgColor, borderColor: pickedBgColor }
              : { backgroundColor: 'transparent', borderColor: teamColor + '60' },
            isLocked && styles.pickBtnLocked,
          ]}
        >
          <Text style={[styles.pickBtnText, { color: mlPicked ? '#fff' : teamColor }]}>
            {mlPicked && pickResult ? (pickResult === 'win' ? '✅ ' : '❌ ') : ''}ML
          </Text>
        </TouchableOpacity>

        {/* Spread Button */}
        <TouchableOpacity
          onPress={() => handlePickClick(side, 'spread')}
          disabled={isLocked || loading}
          activeOpacity={0.75}
          style={[
            styles.pickBtn,
            sprPicked
              ? { backgroundColor: pickedBgColor, borderColor: pickedBgColor }
              : { backgroundColor: 'transparent', borderColor: teamColor + '60' },
            isLocked && styles.pickBtnLocked,
          ]}
        >
          <Text style={[styles.pickBtnText, { color: sprPicked ? '#fff' : teamColor }]}>
            {sprPicked && pickResult ? (pickResult === 'win' ? '✅ ' : '❌ ') : ''}{getSpreadDisplay(side) || 'SPR'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderPitchers = () => {
    const { away_pitcher, home_pitcher } = game;
    if (!away_pitcher && !home_pitcher) return null;

    const awayP = away_pitcher || null;
    const homeP = home_pitcher || null;

    return (
      <View style={styles.pitchersSection}>
        <View style={styles.sectionDivider} />
        <Text style={styles.sectionLabel}>PROBABLE PITCHERS</Text>
        <View style={styles.pitchersRow}>
          {/* Away pitcher */}
          <View style={styles.pitcherSide}>
            {awayP ? (
              <>
                <View style={styles.pitcherNameRow}>
                  <View style={[styles.handBadge, { backgroundColor: '#f3f4f6' }]}>
                    <Text style={styles.handBadgeText}>{awayP.hand}</Text>
                  </View>
                  <Text style={styles.pitcherName} numberOfLines={1}>{awayP.name}</Text>
                </View>
                <Text style={styles.pitcherStats}>{awayP.era} ERA · {awayP.record}</Text>
              </>
            ) : (
              <Text style={styles.pitcherTBD}>TBD</Text>
            )}
          </View>

          <View style={styles.pitcherVsDivider} />

          {/* Home pitcher */}
          <View style={[styles.pitcherSide, styles.pitcherSideRight]}>
            {homeP ? (
              <>
                <View style={styles.pitcherNameRow}>
                  <Text style={styles.pitcherName} numberOfLines={1}>{homeP.name}</Text>
                  <View style={[styles.handBadge, { backgroundColor: '#f3f4f6' }]}>
                    <Text style={styles.handBadgeText}>{homeP.hand}</Text>
                  </View>
                </View>
                <Text style={[styles.pitcherStats, { textAlign: 'right' }]}>{homeP.era} ERA · {homeP.record}</Text>
              </>
            ) : (
              <Text style={[styles.pitcherTBD, { textAlign: 'right' }]}>TBD</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  const getStatusBadgeStyle = (status) => {
    switch (status) {
      case 'IL60':
      case 'IL15':
      case 'IL10':
        return { bg: '#fef2f2', text: '#dc2626', label: status.replace('IL', 'IL-') };
      case 'day-to-day':
        return { bg: '#fffbeb', text: '#d97706', label: 'DTD' };
      case 'questionable':
        return { bg: '#fffbeb', text: '#d97706', label: 'GTD' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280', label: status };
    }
  };

  const renderInjuries = () => {
    const awayInj = game.away_injuries || [];
    const homeInj = game.home_injuries || [];
    const totalCount = awayInj.length + homeInj.length;

    if (totalCount === 0) return null;

    return (
      <View style={styles.injuriesSection}>
        <View style={styles.sectionDivider} />
        <TouchableOpacity
          style={styles.injuriesToggle}
          onPress={() => setInjuriesExpanded(prev => !prev)}
          activeOpacity={0.7}
        >
          <Text style={styles.injuriesToggleText}>
            ⚠ {totalCount} injury update{totalCount !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.injuriesChevron}>{injuriesExpanded ? '▴' : '▾'}</Text>
        </TouchableOpacity>

        {injuriesExpanded && (
          <View style={styles.injuriesExpanded}>
            <View style={styles.injuriesColumns}>
              {/* Away column */}
              <View style={styles.injuryColumn}>
                <Text style={styles.injuryTeamLabel}>{game.away_team_abbr}</Text>
                {awayInj.length === 0 ? (
                  <Text style={styles.injuryNone}>None reported</Text>
                ) : (
                  awayInj.map((p, i) => {
                    const badge = getStatusBadgeStyle(p.status);
                    return (
                      <View key={i} style={styles.injuryPlayer}>
                        <View style={styles.injuryPlayerRow}>
                          <Text style={styles.injuryPlayerName} numberOfLines={1}>{p.name}</Text>
                          <Text style={styles.injuryPosition}>{p.position}</Text>
                        </View>
                        <View style={styles.injuryBadgeRow}>
                          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
                          </View>
                          <Text style={styles.injuryNote} numberOfLines={1}>{p.note}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>

              <View style={styles.injuryColumnDivider} />

              {/* Home column */}
              <View style={styles.injuryColumn}>
                <Text style={styles.injuryTeamLabel}>{game.home_team_abbr}</Text>
                {homeInj.length === 0 ? (
                  <Text style={styles.injuryNone}>None reported</Text>
                ) : (
                  homeInj.map((p, i) => {
                    const badge = getStatusBadgeStyle(p.status);
                    return (
                      <View key={i} style={styles.injuryPlayer}>
                        <View style={styles.injuryPlayerRow}>
                          <Text style={styles.injuryPlayerName} numberOfLines={1}>{p.name}</Text>
                          <Text style={styles.injuryPosition}>{p.position}</Text>
                        </View>
                        <View style={styles.injuryBadgeRow}>
                          <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                            <Text style={[styles.statusBadgeText, { color: badge.text }]}>{badge.label}</Text>
                          </View>
                          <Text style={styles.injuryNote} numberOfLines={1}>{p.note}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[
      styles.card,
      pickResult === 'win'  && styles.cardWin,
      pickResult === 'loss' && styles.cardLoss,
      hasPick && !pickResult && styles.cardPicked,
    ]}>
      {/* Time row */}
      <View style={styles.timeRow}>
        <Text style={styles.gameTime}>{formatTime(gameTime)}</Text>
        {isLocked && !pickResult && <Text style={styles.lockBadge}>LOCKED</Text>}
        {pickResult === 'win'  && <Text style={styles.winBadge}>WIN</Text>}
        {pickResult === 'loss' && <Text style={styles.loseBadge}>LOSE</Text>}
        {hasPick && !pickResult && !isLocked && <Text style={styles.pickedBadge}>PICKED</Text>}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.matchup}>
        {renderTeamSection('away')}

        <View style={styles.vsContainer}>
          {loading ? (
            <ActivityIndicator size="small" color="#FF0000" />
          ) : (
            <Text style={styles.vs}>@</Text>
          )}
        </View>

        {renderTeamSection('home')}
      </View>

      {renderPitchers()}
      {renderInjuries()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 6,
  },
  cardPicked: {
    borderColor: '#c7d2fe',
    shadowColor: '#000080',
    shadowOpacity: 0.15,
  },
  cardWin: {
    borderColor: '#16a34a',
    borderWidth: 2.5,
    shadowColor: '#14532d',
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  cardLoss: {
    borderColor: '#dc2626',
    borderWidth: 2.5,
    shadowColor: '#7f1d1d',
    shadowOpacity: 0.4,
    shadowRadius: 14,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  gameTime: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  lockBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6b7280',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 1,
  },
  pickedBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16a34a',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 1,
  },
  winBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    backgroundColor: '#16a34a',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 1,
  },
  loseBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    letterSpacing: 1,
  },
  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: '#dc2626', fontSize: 12, textAlign: 'center' },
  matchup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teamSection: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  logoWrapper: {
    padding: 4,
  },
  logo: {
    width: 64,
    height: 64,
  },
  teamAbbr: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: 1,
  },
  score: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
  },
  pickBtn: {
    width: '90%',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  pickBtnLocked: { opacity: 0.4 },
  pickBtnText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  vsContainer: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vs: {
    color: '#d1d5db',
    fontWeight: '800',
    fontSize: 18,
  },

  // Shared section styles
  sectionDivider: {
    height: 1,
    backgroundColor: '#f3f4f6',
    marginBottom: 12,
    marginTop: 14,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9ca3af',
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 10,
  },

  // Pitchers
  pitchersSection: {},
  pitchersRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  pitcherSide: {
    flex: 1,
    alignItems: 'flex-start',
  },
  pitcherSideRight: {
    alignItems: 'flex-end',
  },
  pitcherNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    flexWrap: 'nowrap',
    maxWidth: '100%',
  },
  pitcherName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    flexShrink: 1,
  },
  handBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  handBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#374151',
  },
  pitcherStats: {
    fontSize: 11,
    color: '#9ca3af',
    marginTop: 2,
    fontWeight: '500',
  },
  pitcherTBD: {
    fontSize: 12,
    color: '#d1d5db',
    fontStyle: 'italic',
    fontWeight: '600',
  },
  pitcherVsDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 10,
    alignSelf: 'center',
  },

  // Injuries
  injuriesSection: {},
  injuriesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  injuriesToggleText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#d97706',
  },
  injuriesChevron: {
    fontSize: 11,
    color: '#9ca3af',
    fontWeight: '700',
  },
  injuriesExpanded: {
    marginTop: 10,
  },
  injuriesColumns: {
    flexDirection: 'row',
  },
  injuryColumn: {
    flex: 1,
  },
  injuryColumnDivider: {
    width: 1,
    backgroundColor: '#f3f4f6',
    marginHorizontal: 10,
  },
  injuryTeamLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: '#9ca3af',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  injuryNone: {
    fontSize: 11,
    color: '#d1d5db',
    fontStyle: 'italic',
  },
  injuryPlayer: {
    marginBottom: 8,
  },
  injuryPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'nowrap',
  },
  injuryPlayerName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#374151',
    flexShrink: 1,
  },
  injuryPosition: {
    fontSize: 10,
    color: '#9ca3af',
    fontWeight: '600',
  },
  injuryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  injuryNote: {
    fontSize: 10,
    color: '#9ca3af',
    flexShrink: 1,
  },
});
