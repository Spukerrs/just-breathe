import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActiveSleepSession } from '../../../types/sleep';
import { SLEEP_THEME } from '../../../constants/sleepConstants';

interface LiveTrackerCardProps {
  activeSession: ActiveSleepSession | null;
  onStartSleep: () => Promise<void>;
  onWakeUp: (startTime: string) => void;
  onCancelSleep: () => Promise<void>;
}

export const LiveTrackerCard: React.FC<LiveTrackerCardProps> = ({
  activeSession,
  onStartSleep,
  onWakeUp,
  onCancelSleep,
}) => {
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);

  // Calcular tiempo transcurrido en vivo si hay una sesión activa
  useEffect(() => {
    if (!activeSession) {
      setElapsedMinutes(0);
      return;
    }

    const calculateElapsed = () => {
      const startMs = new Date(activeSession.startTime).getTime();
      const nowMs = Date.now();
      const diffMinutes = Math.max(0, Math.floor((nowMs - startMs) / (1000 * 60)));
      setElapsedMinutes(diffMinutes);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000 * 30); // actualiza cada 30s
    return () => clearInterval(interval);
  }, [activeSession]);

  const handleWakeUpPress = () => {
    if (!activeSession) return;
    onWakeUp(activeSession.startTime);
  };

  const handleCancelPress = () => {
    Alert.alert(
      'Cancelar Sesión en Curso',
      '¿Deseas descartar el registro de la noche actual?',
      [
        { text: 'Continuar Durmiendo', style: 'cancel' },
        { text: 'Descartar', style: 'destructive', onPress: onCancelSleep },
      ]
    );
  };

  const formatElapsedTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}h ${mins.toString().padStart(2, '0')}m`;
  };

  const formatStartTime = (isoString: string): string => {
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  return (
    <View style={[styles.card, activeSession && styles.cardActive]}>
      {activeSession ? (
        // Estado: Durmiendo actualmente
        <View>
          <View style={styles.activeHeader}>
            <View style={styles.pulsingBadge}>
              <View style={styles.pulseDot} />
              <Text style={styles.pulseText}>SESIÓN EN CURSO</Text>
            </View>
            <TouchableOpacity onPress={handleCancelPress} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle-outline" size={22} color={SLEEP_THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.timerDisplay}>
            <Ionicons name="moon" size={32} color={SLEEP_THEME.colors.primaryLight} style={styles.moonGlow} />
            <Text style={styles.elapsedTimer}>{formatElapsedTime(elapsedMinutes)}</Text>
            <Text style={styles.bedtimeNote}>
              Hora de acostarse: {formatStartTime(activeSession.startTime)} hs
            </Text>
          </View>

          <TouchableOpacity style={styles.wakeUpButton} onPress={handleWakeUpPress} activeOpacity={0.85}>
            <Ionicons name="sunny" size={20} color="#0B0F19" />
            <Text style={styles.wakeUpButtonText}>Despertar y Calificar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Estado: Inactivo / Listo para dormir
        <View style={styles.idleContainer}>
          <View style={styles.idleIconWrapper}>
            <Ionicons name="bed-outline" size={28} color={SLEEP_THEME.colors.primary} />
          </View>
          <View style={styles.idleTextContainer}>
            <Text style={styles.idleTitle}>Tracker en Vivo</Text>
            <Text style={styles.idleSubtitle}>
              Presiona al acostarte y registra tu descanso en tiempo real.
            </Text>
          </View>
          <TouchableOpacity style={styles.sleepButton} onPress={onStartSleep} activeOpacity={0.85}>
            <Ionicons name="moon" size={18} color="#FFFFFF" />
            <Text style={styles.sleepButtonText}>Ir a dormir</Text>
          </TouchableOpacity>
        </View>
      )}
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
  },
  cardActive: {
    borderColor: SLEEP_THEME.colors.primary,
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
  },
  idleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SLEEP_THEME.spacing.md,
  },
  idleIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: SLEEP_THEME.borderRadius.md,
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.borderSubtle,
  },
  idleTextContainer: {
    flex: 1,
  },
  idleTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  idleSubtitle: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  sleepButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SLEEP_THEME.colors.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: SLEEP_THEME.borderRadius.md,
    shadowColor: SLEEP_THEME.colors.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  sleepButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  activeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SLEEP_THEME.spacing.sm,
  },
  pulsingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: SLEEP_THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SLEEP_THEME.colors.accent,
  },
  pulseText: {
    color: SLEEP_THEME.colors.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  timerDisplay: {
    alignItems: 'center',
    paddingVertical: SLEEP_THEME.spacing.md,
  },
  moonGlow: {
    marginBottom: 6,
  },
  elapsedTimer: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1,
  },
  bedtimeNote: {
    color: SLEEP_THEME.colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  wakeUpButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SLEEP_THEME.colors.accent,
    paddingVertical: 12,
    borderRadius: SLEEP_THEME.borderRadius.md,
    marginTop: 4,
  },
  wakeUpButtonText: {
    color: '#0B0F19',
    fontSize: 14,
    fontWeight: '700',
  },
});
