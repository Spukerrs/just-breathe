import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SleepStats } from '../../../types/sleep';
import { SLEEP_THEME } from '../../../constants/sleepConstants';

interface WeeklyStatsCardProps {
  stats: SleepStats;
}

export const WeeklyStatsCard: React.FC<WeeklyStatsCardProps> = ({ stats }) => {
  const formatDuration = (hours: number): string => {
    if (hours === 0) return '--';
    const totalMinutes = Math.round(hours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleContainer}>
          <Ionicons name="stats-chart" size={18} color={SLEEP_THEME.colors.accent} />
          <Text style={styles.headerTitle}>Resumen Semanal (Últimos 7 días)</Text>
        </View>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {stats.totalLogsLast7Days} {stats.totalLogsLast7Days === 1 ? 'noche' : 'noches'}
          </Text>
        </View>
      </View>

      <View style={styles.statsContainer}>
        {/* Promedio Horas */}
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Promedio de Sueño</Text>
          <Text style={styles.statValue}>{formatDuration(stats.averageHours)}</Text>
          <Text style={styles.statSub}>{stats.averageHours > 0 ? `${stats.averageHours} hrs/noche` : 'Sin datos'}</Text>
        </View>

        <View style={styles.statDivider} />

        {/* Calidad Media */}
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Calidad Media</Text>
          <View style={styles.ratingRow}>
            <Text style={styles.statValue}>
              {stats.averageQuality > 0 ? stats.averageQuality.toFixed(1) : '--'}
            </Text>
            {stats.averageQuality > 0 && (
              <Ionicons name="star" size={18} color={SLEEP_THEME.colors.star} style={styles.starIcon} />
            )}
          </View>
          <Text style={styles.statSub}>
            {stats.averageQuality >= 4
              ? 'Óptima recuperación'
              : stats.averageQuality >= 3
              ? 'Calidad moderada'
              : stats.averageQuality > 0
              ? 'Por mejorar'
              : 'Sin registros'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: SLEEP_THEME.colors.surface,
    borderRadius: SLEEP_THEME.borderRadius.lg,
    padding: SLEEP_THEME.spacing.lg,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
    marginBottom: SLEEP_THEME.spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SLEEP_THEME.spacing.md,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  badge: {
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SLEEP_THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.borderSubtle,
  },
  badgeText: {
    color: SLEEP_THEME.colors.accent,
    fontSize: 11,
    fontWeight: '500',
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    borderRadius: SLEEP_THEME.borderRadius.md,
    paddingVertical: SLEEP_THEME.spacing.md,
    paddingHorizontal: SLEEP_THEME.spacing.sm,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.borderSubtle,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 48,
    backgroundColor: SLEEP_THEME.colors.border,
  },
  statLabel: {
    color: SLEEP_THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statValue: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginLeft: 4,
  },
  statSub: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
});
