import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SleepLog } from '../../../types/sleep';
import { SLEEP_THEME } from '../../../constants/sleepConstants';

interface SleepLogItemProps {
  log: SleepLog;
  onDelete: (id: string) => Promise<void>;
}

export const SleepLogItem: React.FC<SleepLogItemProps> = ({ log, onDelete }) => {
  const formatDuration = (minutes: number): string => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  const formatTime = (isoString: string): string => {
    try {
      const date = new Date(isoString);
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    } catch {
      return '--:--';
    }
  };

  const formatDateDisplay = (dateStr: string): string => {
    try {
      const [year, month, day] = dateStr.split('-');
      const date = new Date(Number(year), Number(month) - 1, Number(day));
      return date.toLocaleDateString('es-ES', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      });
    } catch {
      return dateStr;
    }
  };

  const confirmDelete = () => {
    Alert.alert(
      'Eliminar Registro',
      `¿Deseas eliminar la sesión de sueño del ${log.date}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: () => onDelete(log.id),
        },
      ]
    );
  };

  return (
    <View style={styles.card}>
      {/* Header: Fecha y Botón de Borrar */}
      <View style={styles.headerRow}>
        <View style={styles.dateContainer}>
          <Ionicons name="calendar-outline" size={16} color={SLEEP_THEME.colors.primaryLight} />
          <Text style={styles.dateText}>{formatDateDisplay(log.date)}</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={styles.starsRow}>
            {([1, 2, 3, 4, 5] as const).map((star) => (
              <Ionicons
                key={star}
                name={star <= log.qualityRating ? 'star' : 'star-outline'}
                size={14}
                color={star <= log.qualityRating ? SLEEP_THEME.colors.star : SLEEP_THEME.colors.starInactive}
              />
            ))}
          </View>
          <TouchableOpacity onPress={confirmDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="trash-outline" size={18} color={SLEEP_THEME.colors.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Métricas Principales: Horarios y Duración */}
      <View style={styles.metricsRow}>
        <View style={styles.timesContainer}>
          <Text style={styles.timeValue}>{formatTime(log.bedtime)}</Text>
          <Ionicons name="moon" size={12} color={SLEEP_THEME.colors.textMuted} style={styles.metricIcon} />
          <Text style={styles.timeSeparator}>→</Text>
          <Text style={styles.timeValue}>{formatTime(log.wakeTime)}</Text>
          <Ionicons name="sunny" size={12} color={SLEEP_THEME.colors.accent} style={styles.metricIcon} />
        </View>

        <View style={styles.durationBadge}>
          <Ionicons name="time" size={14} color={SLEEP_THEME.colors.accent} />
          <Text style={styles.durationText}>{formatDuration(log.durationMinutes)}</Text>
        </View>
      </View>

      {/* Etiquetas (Tags) */}
      {log.tags && log.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {log.tags.map((tag, idx) => (
            <View key={`${tag}-${idx}`} style={styles.tagBadge}>
              <Text style={styles.tagText}>#{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Notas */}
      {log.notes && log.notes.trim().length > 0 && (
        <View style={styles.notesContainer}>
          <Ionicons name="document-text-outline" size={13} color={SLEEP_THEME.colors.textMuted} />
          <Text style={styles.notesText} numberOfLines={2}>
            {log.notes}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: SLEEP_THEME.colors.surface,
    borderRadius: SLEEP_THEME.borderRadius.md,
    padding: SLEEP_THEME.spacing.md,
    marginBottom: SLEEP_THEME.spacing.sm,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.borderSubtle,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: SLEEP_THEME.borderRadius.sm,
    marginBottom: 8,
  },
  timesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  timeValue: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  metricIcon: {
    marginHorizontal: 1,
  },
  timeSeparator: {
    color: SLEEP_THEME.colors.textMuted,
    fontSize: 12,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  durationText: {
    color: SLEEP_THEME.colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  tagBadge: {
    backgroundColor: 'rgba(129, 140, 248, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: SLEEP_THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.25)',
  },
  tagText: {
    color: SLEEP_THEME.colors.primaryLight,
    fontSize: 11,
    fontWeight: '500',
  },
  notesContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 8,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: SLEEP_THEME.colors.borderSubtle,
  },
  notesText: {
    flex: 1,
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    fontStyle: 'italic',
  },
});
