import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { SleepLog, SleepStats, ActiveSleepSession } from '../../types/sleep';
import { sleepService } from '../../services/sleepService';
import { SLEEP_THEME } from '../../constants/sleepConstants';

import { WeeklyStatsCard } from './components/WeeklyStatsCard';
import { LiveTrackerCard } from './components/LiveTrackerCard';
import { SleepLogItem } from './components/SleepLogItem';
import { WakeUpReviewModal } from './components/WakeUpReviewModal';
import { ManualEntryModal } from './components/ManualEntryModal';

export const SleepScreen: React.FC = () => {
  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [stats, setStats] = useState<SleepStats>({
    averageHours: 0,
    averageQuality: 0,
    totalLogsLast7Days: 0,
    totalMinutesLast7Days: 0,
  });
  const [activeSession, setActiveSession] = useState<ActiveSleepSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Modales
  const [reviewModalVisible, setReviewModalVisible] = useState<boolean>(false);
  const [reviewStartTime, setReviewStartTime] = useState<string | null>(null);
  const [manualModalVisible, setManualModalVisible] = useState<boolean>(false);
  const [backupLoading, setBackupLoading] = useState<boolean>(false);

  // Carga inicial y refresco de datos
  const loadData = useCallback(async () => {
    try {
      const [fetchedLogs, fetchedStats, session] = await Promise.all([
        sleepService.getSleepLogs(),
        sleepService.getSleepStats(),
        sleepService.getActiveSleepSession(),
      ]);

      setLogs(fetchedLogs);
      setStats(fetchedStats);
      setActiveSession(session);
    } catch (error) {
      console.error('[SleepScreen] Error al cargar datos:', error);
      Alert.alert('Error', 'No se pudieron sincronizar los datos de descanso.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // ==========================================
  // HANDLERS DEL TRACKER EN VIVO
  // ==========================================

  const handleStartSleep = async () => {
    try {
      const session = await sleepService.startSleepSession();
      setActiveSession(session);
    } catch (error) {
      Alert.alert('Error', 'No se pudo iniciar el trackeo de sueño.');
    }
  };

  const handleWakeUp = (startTime: string) => {
    setReviewStartTime(startTime);
    setReviewModalVisible(true);
  };

  const handleCancelSleepSession = async () => {
    try {
      await sleepService.clearActiveSleepSession();
      setActiveSession(null);
    } catch (error) {
      console.error('[SleepScreen] Error al cancelar sesión:', error);
    }
  };

  const handleSaveLiveLog = async (logData: Omit<SleepLog, 'id'>) => {
    try {
      await sleepService.saveSleepLog(logData);
      await sleepService.clearActiveSleepSession();
      setActiveSession(null);
      await loadData();
      Alert.alert('¡Excelente descanso!', 'Tu sesión de sueño se guardó correctamente.');
    } catch (error) {
      Alert.alert('Error', 'No se pudo registrar la sesión.');
    }
  };

  // ==========================================
  // HANDLERS DE CARGA MANUAL Y BORRADO
  // ==========================================

  const handleSaveManualLog = async (logData: Omit<SleepLog, 'id'>) => {
    try {
      await sleepService.saveSleepLog(logData);
      await loadData();
      Alert.alert('Éxito', 'La noche anterior fue registrada correctamente.');
    } catch (error) {
      Alert.alert('Error', 'Ocurrió un error al guardar la noche anterior.');
    }
  };

  const handleDeleteLog = async (id: string) => {
    try {
      await sleepService.deleteSleepLog(id);
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'No se pudo eliminar el registro.');
    }
  };

  // ==========================================
  // BACKUP LOCAL: EXPORTACIÓN E IMPORTACIÓN
  // ==========================================

  const handleExportBackup = async () => {
    if (logs.length === 0) {
      Alert.alert('Sin registros', 'Aún no tienes registros de sueño guardados para exportar.');
      return;
    }

    setBackupLoading(true);
    try {
      await sleepService.exportSleepData();
    } catch (error: any) {
      if (error?.message) {
        Alert.alert('Exportación', error.message);
      }
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImportBackup = async () => {
    setBackupLoading(true);
    try {
      const result = await sleepService.importSleepData();
      if (result.success) {
        await loadData();
        Alert.alert('Importación completada', result.message);
      }
    } catch (error: any) {
      Alert.alert('Error en importación', error?.message || 'No se pudo procesar el archivo.');
    } finally {
      setBackupLoading(false);
    }
  };

  // ==========================================
  // RENDERIZADO DE COMPONENTES
  // ==========================================

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Barra superior de la App */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.appTitle}>Just Breathe</Text>
          <Text style={styles.screenTitle}>Trackeo de Sueño</Text>
        </View>

        {/* Acciones de Backup */}
        <View style={styles.backupActions}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleImportBackup}
            disabled={backupLoading}
            accessibilityLabel="Importar Backup"
            accessibilityRole="button"
          >
            <Ionicons name="cloud-download-outline" size={20} color={SLEEP_THEME.colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleExportBackup}
            disabled={backupLoading}
            accessibilityLabel="Exportar Backup"
            accessibilityRole="button"
          >
            <Ionicons name="share-outline" size={20} color={SLEEP_THEME.colors.primaryLight} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Indicador de carga de backup si está activo */}
      {backupLoading && (
        <View style={styles.backupProgressBanner}>
          <ActivityIndicator size="small" color={SLEEP_THEME.colors.accent} />
          <Text style={styles.backupProgressText}>Procesando copia de seguridad...</Text>
        </View>
      )}

      {/* Resumen Semanal */}
      <WeeklyStatsCard stats={stats} />

      {/* Tracker en Vivo */}
      <LiveTrackerCard
        activeSession={activeSession}
        onStartSleep={handleStartSleep}
        onWakeUp={handleWakeUp}
        onCancelSleep={handleCancelSleepSession}
      />

      {/* Barra de Historial y Botón Carga Manual */}
      <View style={styles.historySectionHeader}>
        <View style={styles.historyTitleRow}>
          <Ionicons name="time-outline" size={18} color={SLEEP_THEME.colors.textPrimary} />
          <Text style={styles.historySectionTitle}>Historial de Noches</Text>
        </View>

        <TouchableOpacity
          style={styles.manualEntryBtn}
          onPress={() => setManualModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={16} color={SLEEP_THEME.colors.primaryLight} />
          <Text style={styles.manualEntryBtnText}>Cargar Noche</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyHistory = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="moon-outline" size={36} color={SLEEP_THEME.colors.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>Sin registros aún</Text>
        <Text style={styles.emptySubtitle}>
          Usa el botón "Ir a dormir" esta noche o presiona "Cargar Noche" para registrar un descanso anterior.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={SLEEP_THEME.colors.background} />

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={SLEEP_THEME.colors.primary} />
          <Text style={styles.loadingText}>Cargando registros de descanso...</Text>
        </View>
      ) : (
        <FlatList
          data={logs}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <SleepLogItem log={item} onDelete={handleDeleteLog} />}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyHistory}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={SLEEP_THEME.colors.primary}
              colors={[SLEEP_THEME.colors.primary]}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Modal para calificar al despertar */}
      <WakeUpReviewModal
        visible={reviewModalVisible}
        startTime={reviewStartTime}
        onClose={() => setReviewModalVisible(false)}
        onSave={handleSaveLiveLog}
      />

      {/* Modal para carga manual */}
      <ManualEntryModal
        visible={manualModalVisible}
        onClose={() => setManualModalVisible(false)}
        onSave={handleSaveManualLog}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SLEEP_THEME.colors.background,
  },
  listContent: {
    paddingHorizontal: SLEEP_THEME.spacing.lg,
    paddingBottom: SLEEP_THEME.spacing.xxl,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 14,
  },
  headerContainer: {
    paddingTop: SLEEP_THEME.spacing.md,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SLEEP_THEME.spacing.lg,
  },
  appTitle: {
    color: SLEEP_THEME.colors.accent,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  screenTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    marginTop: 2,
  },
  backupActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: SLEEP_THEME.borderRadius.md,
    backgroundColor: SLEEP_THEME.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  backupProgressBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    paddingVertical: 8,
    borderRadius: SLEEP_THEME.borderRadius.md,
    marginBottom: SLEEP_THEME.spacing.md,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.accentMuted,
  },
  backupProgressText: {
    color: SLEEP_THEME.colors.accent,
    fontSize: 12,
    fontWeight: '500',
  },
  historySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SLEEP_THEME.spacing.md,
    marginTop: SLEEP_THEME.spacing.xs,
  },
  historyTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historySectionTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  manualEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SLEEP_THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  manualEntryBtnText: {
    color: SLEEP_THEME.colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 36,
    paddingHorizontal: SLEEP_THEME.spacing.lg,
  },
  emptyIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: SLEEP_THEME.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.borderSubtle,
  },
  emptyTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  emptySubtitle: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },
});

export default SleepScreen;
