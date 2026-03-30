import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { getTeamName, getTeamColor } from '../../utils/teamLogos';
import { getLogoUri } from '../../services/logoCache';
import api from '../../services/api';
import { USE_MOCK_DATA } from '../../utils/mockData';

const C = {
  cream: '#F4E9D0',
  creamDark: '#E8D9B8',
  creamDeep: '#D4C098',
  parchment: '#F9F3E3',
  red: '#C41E3A',
  redDark: '#9E1730',
  navy: '#0D1B4F',
  navyMid: '#1A2F6E',
  gold: '#C4912A',
  goldLight: '#E8B84B',
  brown: '#3D2112',
  ink: '#1A0F08',
  inkMid: '#4A3728',
  inkLight: '#7A6050',
  green: '#2E6B3E',
  white: '#FFFFFF',
};

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
  const pickResult = existingPick?.result ?? null; // 'win' | 'loss' | null (legacy)
  const pickOutcome = existingPick?.outcome ?? null; // 'MW', 'ML', 'SFW', 'SFL', 'SDW', 'SDL', 'SP'
  const pointsEarned = existingPick?.points_earned; // NUMERIC or null if not graded

  // Build result badge text from outcome and points_earned
  const getResultBadgeText = () => {
    if (pointsEarned === null || pointsEarned === undefined) {
      return null; // Not yet graded
    }
    // Don't show any badge until grading has actually run (outcome or legacy result required)
    if (!pickOutcome && !pickResult) return null;

    let icon = '';
    let label = '';

    // Determine icon and label based on outcome
    switch (pickOutcome) {
      case 'MW': // Moneyline Win
        icon = '✓';
        label = 'WIN';
        break;
      case 'ML': // Moneyline Loss
        icon = '✗';
        label = 'LOSS';
        break;
      case 'SFW': // Spread Favorite Win
        icon = '✓';
        label = 'WIN';
        break;
      case 'SFL': // Spread Favorite Loss
        icon = '✗';
        label = 'LOSS';
        break;
      case 'SDW': // Spread Dog Win
        icon = '✓';
        label = 'WIN';
        break;
      case 'SDL': // Spread Dog Loss
        icon = '✗';
        label = 'LOSS';
        break;
      case 'SP': // Spread Push
        icon = '↔';
        label = 'PUSH';
        break;
      default:
        // Fallback to legacy result field if outcome is not set
        if (pickResult === 'win') {
          icon = '✓';
          label = 'WIN';
        } else if (pickResult === 'loss') {
          icon = '✗';
          label = 'LOSS';
        }
        break;
    }

    // Format points string
    let pointsStr = '';
    if (pointsEarned === 0 || pointsEarned === 0.0) {
      pointsStr = ' 0 pts';
    } else if (pointsEarned > 0) {
      pointsStr = ` +${pointsEarned} ${pointsEarned === 1 ? 'pt' : 'pts'}`;
    } else {
      pointsStr = ` ${pointsEarned} ${pointsEarned === -1 ? 'pt' : 'pts'}`;
    }

    return `${icon} ${label}${pointsStr}`;
  };

  const renderTeamSection = (side) => {
    const abbr = side === 'away' ? game.away_team_abbr : game.home_team_abbr;
    const score = side === 'away' ? game.away_score : game.home_score;
    const teamColor = getTeamColor(abbr);
    const mlPicked = isPicked(side, 'moneyline');
    const sprPicked = isPicked(side, 'spread');
    const pickedBgColor = pickResult === 'win' ? C.green : pickResult === 'loss' ? C.red : teamColor;

    return (
      <View style={styles.teamSection}>
        <View style={styles.logoWrapper}>
          {getLogoUri(abbr) ? (
            <Image
              source={{ uri: getLogoUri(abbr) }}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <View style={[styles.logo, styles.logoPlaceholder]}>
              <Text style={styles.logoPlaceholderText}>{abbr}</Text>
            </View>
          )}
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
              : { backgroundColor: C.white, borderColor: teamColor },
            isLocked && styles.pickBtnLocked,
          ]}
        >
          <Text style={styles.pickBtnLabel}>ML</Text>
          <Text style={[styles.pickBtnValue, { color: mlPicked ? C.white : teamColor }]}>
            {mlPicked && pickResult ? (pickResult === 'win' ? '✓' : '✗') : abbr.slice(0, 2)}
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
              : { backgroundColor: C.white, borderColor: teamColor },
            isLocked && styles.pickBtnLocked,
          ]}
        >
          <Text style={styles.pickBtnLabel}>SPR</Text>
          <Text style={[styles.pickBtnValue, { color: sprPicked ? C.white : teamColor }]}>
            {sprPicked && pickResult ? (pickResult === 'win' ? '✓' : '✗') : getSpreadDisplay(side) || '—'}
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
                  <View style={[styles.handBadge, { backgroundColor: C.cream }]}>
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
                  <View style={[styles.handBadge, { backgroundColor: C.cream }]}>
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
        return { bg: C.cream, text: C.ink, label: status };
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
      {/* Tape strip */}
      <View style={styles.tapeStrip} />

      {/* Time row */}
      <View style={styles.timeRow}>
        <Text style={styles.gameTime}>{formatTime(gameTime)}</Text>
        {isLocked && !pickResult && <Text style={styles.lockBadge}>🔒 LOCKED</Text>}
        {pickResult === 'win'  && <Text style={styles.winBadge}>✓ WIN</Text>}
        {pickResult === 'loss' && <Text style={styles.loseBadge}>✗ LOSS</Text>}
        {hasPick && !pickResult && !isLocked && <Text style={styles.pickedBadge}>PICKED</Text>}
      </View>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {/* Result badge (if graded) */}
      {getResultBadgeText() && (
        <View style={[styles.resultBadge, (pickOutcome === 'SP' || pointsEarned === 0) ? styles.resultPush : pickOutcome?.startsWith('SF') || pickOutcome === 'MW' || pickOutcome === 'SDW' ? styles.resultWin : styles.resultLoss]}>
          <Text style={styles.resultText}>
            {getResultBadgeText()}
          </Text>
        </View>
      )}

      {/* Matchup */}
      {!pickResult && (
        <View style={styles.matchup}>
          {renderTeamSection('away')}

          <View style={styles.vsContainer}>
            {loading ? (
              <ActivityIndicator size="small" color={C.red} />
            ) : (
              <Text style={styles.vs}>@</Text>
            )}
          </View>

          {renderTeamSection('home')}
        </View>
      )}

      {renderPitchers()}
      {renderInjuries()}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: C.parchment,
    borderWidth: 1,
    borderColor: C.creamDeep,
    shadowColor: C.creamDeep,
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 3,
    marginBottom: 12,
    marginHorizontal: 0,
    overflow: 'hidden',
  },
  cardPicked: {
    borderColor: C.gold,
    shadowColor: C.gold,
  },
  cardWin: {
    borderColor: C.green,
    borderWidth: 1.5,
    shadowColor: C.green,
  },
  cardLoss: {
    borderColor: C.red,
    borderWidth: 1.5,
    shadowColor: C.red,
  },

  tapeStrip: {
    height: 5,
    backgroundColor: C.navy,
    width: '100%',
  },

  timeRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderBottomWidth: 1,
    borderBottomColor: C.creamDeep,
  },
  gameTime: {
    fontSize: 8,
    color: C.inkLight,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  lockBadge: {
    fontSize: 8,
    fontWeight: '800',
    color: C.inkLight,
    backgroundColor: C.cream,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    letterSpacing: 1,
  },
  pickedBadge: {
    fontSize: 8,
    fontWeight: '800',
    color: C.green,
    backgroundColor: C.cream,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    letterSpacing: 1,
  },
  winBadge: {
    fontSize: 8,
    fontWeight: '800',
    color: C.white,
    backgroundColor: C.green,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    letterSpacing: 1,
  },
  loseBadge: {
    fontSize: 8,
    fontWeight: '800',
    color: C.white,
    backgroundColor: C.red,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    letterSpacing: 1,
  },

  resultBadge: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 3,
    alignItems: 'center',
  },
  resultWin: {
    backgroundColor: C.green,
  },
  resultLoss: {
    backgroundColor: C.red,
  },
  resultPush: {
    backgroundColor: C.gold,
  },
  resultText: {
    color: C.white,
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1,
  },

  errorBox: {
    backgroundColor: '#fef2f2',
    borderRadius: 3,
    padding: 8,
    marginHorizontal: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  errorText: { color: '#dc2626', fontSize: 11, textAlign: 'center' },

  matchup: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  teamSection: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  logoWrapper: {
    padding: 4,
  },
  logo: {
    width: 56,
    height: 56,
  },
  logoPlaceholder: {
    backgroundColor: C.creamDark,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoPlaceholderText: {
    fontSize: 11,
    fontWeight: '900',
    color: C.navy,
    letterSpacing: 1,
  },
  teamAbbr: {
    fontSize: 14,
    fontWeight: '900',
    color: C.ink,
    letterSpacing: 1,
  },
  score: {
    fontSize: 20,
    fontWeight: '900',
    color: C.ink,
  },

  pickBtn: {
    width: '90%',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 2,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
  },
  pickBtnLocked: { opacity: 0.7 },
  pickBtnLabel: {
    fontSize: 7,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  pickBtnValue: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  vsContainer: {
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vs: {
    color: C.inkLight,
    fontWeight: '700',
    fontSize: 16,
    fontStyle: 'italic',
  },

  // Shared section styles
  sectionDivider: {
    height: 1,
    backgroundColor: C.creamDeep,
    marginBottom: 10,
    marginTop: 10,
    marginHorizontal: 12,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: C.inkLight,
    letterSpacing: 1.5,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'uppercase',
  },

  // Pitchers
  pitchersSection: {
    paddingHorizontal: 12,
  },
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
    fontSize: 12,
    fontWeight: '700',
    color: C.ink,
    flexShrink: 1,
  },
  handBadge: {
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: C.creamDeep,
  },
  handBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: C.ink,
  },
  pitcherStats: {
    fontSize: 10,
    color: C.inkLight,
    marginTop: 2,
    fontWeight: '600',
  },
  pitcherTBD: {
    fontSize: 11,
    color: C.creamDeep,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  pitcherVsDivider: {
    width: 1,
    height: 36,
    backgroundColor: C.creamDeep,
    marginHorizontal: 10,
    alignSelf: 'center',
  },

  // Injuries
  injuriesSection: {
    paddingHorizontal: 12,
  },
  injuriesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  injuriesToggleText: {
    fontSize: 11,
    fontWeight: '600',
    color: C.red,
  },
  injuriesChevron: {
    fontSize: 10,
    color: C.inkLight,
    fontWeight: '700',
  },
  injuriesExpanded: {
    marginTop: 8,
  },
  injuriesColumns: {
    flexDirection: 'row',
  },
  injuryColumn: {
    flex: 1,
  },
  injuryColumnDivider: {
    width: 1,
    backgroundColor: C.creamDeep,
    marginHorizontal: 10,
  },
  injuryTeamLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: C.inkLight,
    letterSpacing: 1.5,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  injuryNone: {
    fontSize: 10,
    color: C.creamDeep,
    fontStyle: 'italic',
  },
  injuryPlayer: {
    marginBottom: 6,
  },
  injuryPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'nowrap',
  },
  injuryPlayerName: {
    fontSize: 11,
    fontWeight: '700',
    color: C.ink,
    flexShrink: 1,
  },
  injuryPosition: {
    fontSize: 9,
    color: C.inkLight,
    fontWeight: '600',
  },
  injuryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  statusBadge: {
    borderRadius: 2,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  statusBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  injuryNote: {
    fontSize: 9,
    color: C.inkLight,
    flexShrink: 1,
  },
});
