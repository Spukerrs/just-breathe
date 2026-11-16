import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Animated,
  Easing,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import {
  SleepLog,
  SleepStats,
  ActiveSleepSession,
  SleepShortcut,
  SleepSound,
  SleepNoiseEvent,
  SleepAchievement,
  LocalChatMessage,
  SleepDebtAnalysis,
  ChronotypeProfile,
} from '../../types/sleep';
import { sleepService } from '../../services/sleepService';
import {
  SLEEP_THEME,
  DEFAULT_SOUNDS,
  ASSISTANT_PRESETS,
  DEFAULT_SLEEP_TAGS,
  SOUND_TIMER_OPTIONS,
} from '../../constants/sleepConstants';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_CARD_WIDTH = (SCREEN_WIDTH - 44) / 2;

// Módulos de descanso
type SleepModuleTab = 'shortcuts' | 'assistant' | 'sounds' | 'noises' | 'achievements';

interface SleepModuleItem {
  id: SleepModuleTab;
  title: string;
  subtitle: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeColor: string;
  badge: string;
  actionText: string;
}

const SLEEP_MODULES: SleepModuleItem[] = [
  {
    id: 'shortcuts',
    title: 'Atajos de Sueño',
    subtitle: 'Rutinas & Registro',
    description: 'Inicia siestas, programa descansos nocturnos y gestiona tus atajos rápidos de sueño.',
    icon: 'flash',
    activeColor: '#38BDF8', // Celeste / Cyan
    badge: 'Rápido',
    actionText: 'Explorar Atajos',
  },
  {
    id: 'assistant',
    title: 'Asistente del Sueño',
    subtitle: 'IA 100% Local',
    description: 'Consulta tus métricas de descanso, pide resúmenes y recibe consejos con privacidad total.',
    icon: 'sparkles',
    activeColor: '#A78BFA', // Violeta
    badge: 'Offline',
    actionText: 'Abrir Asistente',
  },
  {
    id: 'sounds',
    title: 'Paisajes Sonoros',
    subtitle: 'Ruido Blanco & Relax',
    description: 'Sintoniza sonidos relajantes de naturaleza, lluvia y meditaciones guiadas.',
    icon: 'musical-notes',
    activeColor: '#34D399', // Esmeralda
    badge: 'Ambiente',
    actionText: 'Escuchar Sonidos',
  },
  {
    id: 'noises',
    title: 'Monitor de Ruidos',
    subtitle: 'Detección Auditiva',
    description: 'Registra eventos sonoros nocturnos con decibeles y visualización de ondas sonoras.',
    icon: 'pulse',
    activeColor: '#F472B6', // Rosa
    badge: 'Audio',
    actionText: 'Ver Registros',
  },
  {
    id: 'achievements',
    title: 'Logros y Hábitos',
    subtitle: 'Gamificación & Rachas',
    description: 'Desbloquea insignias por constancia de sueño, mantén tus rachas y acumula gemas.',
    icon: 'trophy',
    activeColor: '#FBBF24', // Ámbar / Dorado
    badge: 'Nivel',
    actionText: 'Ver Mis Logros',
  },
];

export const SleepScreen: React.FC = () => {
  const [selectedModule, setSelectedModule] = useState<SleepModuleTab | null>(null);

  // Animaciones para transiciones suaves y fluidas
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handleSelectModule = (modId: SleepModuleTab) => {
    // 1. Suave desvanecimiento rápido de salida del Hub (120ms sin bloqueo)
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedModule(modId);
      slideAnim.setValue(24);
      scaleAnim.setValue(0.97);
      fadeAnim.setValue(0);

      // 2. Entrada fluida y sedosa del contenido con curva de desaceleración natural
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.bezier(0.2, 0.9, 0.3, 1),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const handleBackToHub = () => {
    // 1. Suave salida del contenido hacia abajo
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 140,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 16,
        duration: 140,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.96,
        duration: 140,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setSelectedModule(null);
      slideAnim.setValue(-16);
      scaleAnim.setValue(0.97);
      fadeAnim.setValue(0);

      // 2. Reaparición fluida y suave de la pantalla de módulos
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 260,
          easing: Easing.bezier(0.2, 0.9, 0.3, 1),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 280,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 280,
          easing: Easing.bezier(0.16, 1, 0.3, 1),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const [logs, setLogs] = useState<SleepLog[]>([]);
  const [stats, setStats] = useState<SleepStats>({
    averageHours: 0,
    averageQuality: 0,
    totalLogsLast7Days: 0,
    totalMinutesLast7Days: 0,
  });
  const [activeSession, setActiveSession] = useState<ActiveSleepSession | null>(null);
  const [shortcuts, setShortcuts] = useState<SleepShortcut[]>([]);
  const [noiseEvents, setNoiseEvents] = useState<SleepNoiseEvent[]>([]);
  const [achievements, setAchievements] = useState<SleepAchievement[]>([]);
  const [sleepDebt, setSleepDebt] = useState<SleepDebtAnalysis | null>(null);
  const [chronotype, setChronotype] = useState<ChronotypeProfile | null>(null);

  // Paisajes Sonoros con Temporizador (Fade-out)
  const [soundCategory, setSoundCategory] = useState<'nature' | 'white_noise' | 'meditation'>('nature');
  const [activeSoundId, setActiveSoundId] = useState<string | null>(null);
  const [soundTimerMinutes, setSoundTimerMinutes] = useState<number>(30); // 30m por defecto
  const [soundRemainingSeconds, setSoundRemainingSeconds] = useState<number>(30 * 60);

  // Temporizador en vivo para la sesión activa de descanso / siesta
  const [sessionElapsedMinutes, setSessionElapsedMinutes] = useState<number>(0);

  // Chat local del asistente
  const [chatMessages, setChatMessages] = useState<LocalChatMessage[]>([
    {
      id: 'init_1',
      sender: 'assistant',
      text: 'Hola, soy tu asistente local de descanso. Todos tus datos están protegidos con verificación criptográfica SHA-256 y guardados 100% en tu dispositivo. ¿En qué puedo ayudarte hoy?',
      timestamp: 'Ahora',
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');

  // Modales
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [backupLoading, setBackupLoading] = useState<boolean>(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState<boolean>(false);
  const [shortcutConfirmItem, setShortcutConfirmItem] = useState<SleepShortcut | null>(null);
  const [wakeModalVisible, setWakeModalVisible] = useState<boolean>(false);
  const [wakeRating, setWakeRating] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [wakeTags, setWakeTags] = useState<string[]>([]);
  const [wakeNotes, setWakeNotes] = useState<string>('');
  const [manualModalVisible, setManualModalVisible] = useState<boolean>(false);
  const [manualDate, setManualDate] = useState<string>('');
  const [manualBedtime, setManualBedtime] = useState<string>('23:00');
  const [manualWakeTime, setManualWakeTime] = useState<string>('07:00');
  const [manualRating, setManualRating] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [manualTags, setManualTags] = useState<string[]>([]);
  const [manualNotes, setManualNotes] = useState<string>('');

  // Cuenta regresiva del temporizador de sonido con apagado gradual
  useEffect(() => {
    if (!activeSoundId || soundTimerMinutes === 0) {
      return;
    }
    setSoundRemainingSeconds(soundTimerMinutes * 60);
    const interval = setInterval(() => {
      setSoundRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          setActiveSoundId(null); // Auto fade-out & stop
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSoundId, soundTimerMinutes]);

  // Cálculo en tiempo real de minutos transcurridos en la sesión de descanso
  useEffect(() => {
    if (!activeSession) {
      setSessionElapsedMinutes(0);
      return;
    }
    const updateElapsed = () => {
      const startMs = new Date(activeSession.startTime).getTime();
      const diff = Math.max(0, Math.floor((Date.now() - startMs) / (1000 * 60)));
      setSessionElapsedMinutes(diff);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 5000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const loadData = useCallback(async () => {
    try {
      const [
        fetchedLogs,
        fetchedStats,
        session,
        fetchedShortcuts,
        fetchedNoises,
        fetchedAchievements,
        fetchedDebt,
        fetchedChronotype,
      ] = await Promise.all([
        sleepService.getSleepLogs(),
        sleepService.getSleepStats(),
        sleepService.getActiveSleepSession(),
        sleepService.getShortcuts(),
        sleepService.getNoiseEvents(),
        sleepService.getAchievements(),
        sleepService.getSleepDebt(),
        sleepService.getChronotypeProfile(),
      ]);

      setLogs(fetchedLogs);
      setStats(fetchedStats);
      setActiveSession(session);
      setShortcuts(fetchedShortcuts);
      setNoiseEvents(fetchedNoises);
      setAchievements(fetchedAchievements);
      setSleepDebt(fetchedDebt);
      setChronotype(fetchedChronotype);
    } catch (error) {
      console.error('[SleepScreen] Error al sincronizar:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Limpiar datos de ejemplo iniciales para dejar la app en cero
  useEffect(() => {
    const initializeCleanState = async () => {
      try {
        const cleaned = await AsyncStorage.getItem('@just_breathe_clean_sample_data_v1');
        if (!cleaned) {
          await sleepService.clearAllSleepData();
          await AsyncStorage.setItem('@just_breathe_clean_sample_data_v1', 'true');
        }
      } catch (err) {
        console.warn('[SleepScreen] Error al inicializar limpieza:', err);
      }
      loadData();
    };
    initializeCleanState();
  }, [loadData]);

  const handleClearAllData = () => {
    Alert.alert(
      'Borrar Datos Registrados',
      '¿Deseas eliminar todos los registros y sesiones de ejemplo? La aplicación quedará limpia en 0.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Borrar Todo',
          style: 'destructive',
          onPress: async () => {
            await sleepService.clearAllSleepData();
            await loadData();
            setPrivacyModalVisible(false);
            Alert.alert('Datos eliminados', 'Todos los registros han sido borrados.');
          },
        },
      ]
    );
  };

  // Manejo de atajos (Iniciar siesta / noche programada con Modal personalizado)
  const handleRunShortcut = (shortcut: SleepShortcut) => {
    setShortcutConfirmItem(shortcut);
  };

  const handleConfirmStartShortcut = async () => {
    if (!shortcutConfirmItem) return;
    try {
      const session = await sleepService.startSleepSession(
        shortcutConfirmItem.type,
        shortcutConfirmItem.durationMinutes
      );
      setActiveSession(session);
    } catch {
      console.warn('[SleepScreen] Error al iniciar atajo');
    } finally {
      setShortcutConfirmItem(null);
    }
  };

  // Despertar y guardar
  const handleWakeUp = () => {
    setWakeRating(4);
    setWakeTags([]);
    setWakeNotes('');
    setWakeModalVisible(true);
  };

  const handleSaveWakeSession = async () => {
    if (!activeSession) return;
    const now = new Date();
    const bedDate = new Date(activeSession.startTime);
    const diffMinutes = Math.max(1, Math.round((now.getTime() - bedDate.getTime()) / (1000 * 60)));

    try {
      await sleepService.saveSleepLog({
        date: now.toISOString().split('T')[0],
        bedtime: activeSession.startTime,
        wakeTime: now.toISOString(),
        durationMinutes: diffMinutes,
        qualityRating: wakeRating,
        tags: wakeTags.length > 0 ? wakeTags : undefined,
        notes: wakeNotes.trim() ? wakeNotes.trim() : undefined,
      });

      await sleepService.clearActiveSleepSession();
      setActiveSession(null);
      setWakeModalVisible(false);
      await loadData();
      Alert.alert('¡Excelente descanso!', 'Tu sesión fue registrada con éxito en tu dispositivo.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la sesión de sueño.');
    }
  };

  // Carga manual
  const openManualModal = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setManualDate(yesterday.toISOString().split('T')[0]);
    setManualBedtime('23:00');
    setManualWakeTime('07:00');
    setManualRating(4);
    setManualTags([]);
    setManualNotes('');
    setManualModalVisible(true);
  };

  const handleSaveManual = async () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(manualDate)) {
      Alert.alert('Fecha inválida', 'Usa formato YYYY-MM-DD (ej. 2026-10-12).');
      return;
    }

    const [bH, bM] = manualBedtime.split(':').map(Number);
    const [wH, wM] = manualWakeTime.split(':').map(Number);
    if (isNaN(bH) || isNaN(wH)) {
      Alert.alert('Horas inválidas', 'Usa formato HH:mm.');
      return;
    }

    let diffMin = wH * 60 + wM - (bH * 60 + bM);
    if (diffMin <= 0) diffMin += 24 * 60;

    const bedDate = new Date(`${manualDate}T00:00:00`);
    bedDate.setHours(bH, bM, 0, 0);

    const wakeDate = new Date(`${manualDate}T00:00:00`);
    wakeDate.setHours(wH, wM, 0, 0);
    if (wakeDate.getTime() <= bedDate.getTime()) {
      wakeDate.setDate(wakeDate.getDate() + 1);
    }

    try {
      await sleepService.saveSleepLog({
        date: manualDate,
        bedtime: bedDate.toISOString(),
        wakeTime: wakeDate.toISOString(),
        durationMinutes: diffMin,
        qualityRating: manualRating,
        tags: manualTags.length > 0 ? manualTags : undefined,
        notes: manualNotes.trim() ? manualNotes.trim() : undefined,
      });

      setManualModalVisible(false);
      await loadData();
      Alert.alert('Éxito', 'Registro de noche guardado correctamente.');
    } catch {
      Alert.alert('Error', 'No se pudo guardar la noche anterior.');
    }
  };

  // Chat del asistente local (Offline y privado)
  const handleSendPrompt = async (promptText: string) => {
    if (!promptText.trim()) return;

    const userMsg: LocalChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      text: promptText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setChatInput('');

    // Respuesta del motor local offline
    const assistantMsg = await sleepService.getLocalAssistantAnswer(promptText);
    setChatMessages((prev) => [...prev, assistantMsg]);
  };

  // Backup handlers
  const handleExport = async () => {
    setBackupLoading(true);
    try {
      await sleepService.exportSleepData();
    } catch (e: any) {
      Alert.alert('Exportar Backup', e.message || 'Error al exportar.');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleImport = async () => {
    setBackupLoading(true);
    try {
      const res = await sleepService.importSleepData();
      if (res.success) {
        await loadData();
        Alert.alert('Importación Exitosa', res.message);
      }
    } catch (e: any) {
      Alert.alert('Error al importar', e.message);
    } finally {
      setBackupLoading(false);
    }
  };

  // Formato para mostrar horas
  const formatDurationText = (min: number) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return `${h}h ${m.toString().padStart(2, '0')}m`;
  };

  // ==========================================
  // RENDERIZADO DE PESTAÑAS
  // ==========================================

  // Pestaña 1: Atajos y Tracker (Screenshot 2)
  const renderShortcutsTab = () => {
    const targetMinutes = activeSession?.targetDurationMinutes;
    const remainingMinutes = targetMinutes ? Math.max(0, targetMinutes - sessionElapsedMinutes) : null;
    const progressPercent = targetMinutes
      ? Math.min(100, Math.round((sessionElapsedMinutes / targetMinutes) * 100))
      : null;
    const isAlarmReached = targetMinutes ? sessionElapsedMinutes >= targetMinutes : false;

    return (
      <View style={styles.tabContent}>
        {/* Banner de sesión activa si está durmiendo */}
        {activeSession ? (
          <View style={[styles.activeBanner, isAlarmReached && styles.activeBannerAlarm]}>
            <View style={styles.activeRow}>
              <View style={[styles.activeDot, isAlarmReached && styles.activeDotAlarm]} />
              <Text style={styles.activeTitle}>
                {activeSession.sessionType === 'nap' ? 'Siesta en Curso' : 'Descanso Nocturno'}
              </Text>
              {targetMinutes && (
                <View style={[styles.targetBadge, isAlarmReached && styles.targetBadgeAlarm]}>
                  <Ionicons
                    name={isAlarmReached ? 'alarm' : 'timer-outline'}
                    size={12}
                    color={isAlarmReached ? '#090D16' : SLEEP_THEME.colors.accent}
                  />
                  <Text style={[styles.targetBadgeText, isAlarmReached && styles.targetBadgeTextAlarm]}>
                    Meta {targetMinutes}m
                  </Text>
                </View>
              )}
            </View>

            <Text style={styles.activeSubtitle}>
              Iniciado a las{' '}
              {new Date(activeSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
              {' '}(hace {sessionElapsedMinutes} min)
            </Text>

            {/* Cuenta Regresiva y Barra de Progreso en Vivo */}
            {targetMinutes && (
              <View style={styles.sessionCountdownBox}>
                <View style={styles.countdownRow}>
                  <Text style={styles.countdownLabel}>
                    {isAlarmReached ? '⏰ ¡Tiempo cumplido!' : '⏳ Tiempo restante:'}
                  </Text>
                  <Text style={[styles.countdownValue, isAlarmReached && styles.countdownValueAlarm]}>
                    {isAlarmReached ? 'Despertar ahora' : `${remainingMinutes} min`}
                  </Text>
                </View>

                <View style={styles.sessionProgressBarBg}>
                  <View
                    style={[
                      styles.sessionProgressBarFill,
                      { width: `${progressPercent ?? 0}%` as any },
                      isAlarmReached && styles.sessionProgressBarAlarm,
                    ]}
                  />
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[styles.wakeButtonLarge, isAlarmReached && styles.wakeButtonAlarm]}
              onPress={handleWakeUp}
              activeOpacity={0.85}
            >
              <Ionicons name={isAlarmReached ? 'alarm' : 'sunny'} size={20} color="#090D16" />
              <Text style={styles.wakeButtonText}>
                {isAlarmReached ? '¡Alarma! Despertar y Calificar' : 'Despertar y Calificar'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
        /* Tarjeta Resumen Rápido */
        <View style={styles.scoreCard}>
          <View style={styles.scoreRow}>
            <View style={styles.scoreIconCircle}>
              <Ionicons name="moon" size={24} color={SLEEP_THEME.colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.scoreTitle}>Puntuación Semanal</Text>
              <Text style={styles.scoreSub}>
                {stats.averageHours > 0
                  ? `Promedio: ${stats.averageHours}h / noche (${stats.totalLogsLast7Days} registradas)`
                  : 'Comienza tu primera sesión'}
              </Text>
            </View>
            <View style={styles.scoreBadge}>
              <Text style={styles.scoreBadgeText}>
                {stats.averageQuality > 0 ? `${stats.averageQuality.toFixed(1)} ★` : '--'}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Título de Sección y Botón Carga Manual */}
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>Atajos de Sueño</Text>
        <TouchableOpacity style={styles.manualActionBtn} onPress={openManualModal}>
          <Ionicons name="create-outline" size={15} color={SLEEP_THEME.colors.primaryLight} />
          <Text style={styles.manualActionText}>Carga Manual</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Atajos (Diseño idéntico y moderno a Screenshot 2) */}
      <View style={styles.shortcutsList}>
        {shortcuts.map((sc) => (
          <View key={sc.id} style={styles.shortcutCard}>
            <View style={styles.shortcutIconContainer}>
              <View style={styles.shortcutIconBg}>
                <Ionicons
                  name={sc.type === 'night' ? 'moon' : 'time-outline'}
                  size={24}
                  color={sc.type === 'night' ? '#FBBF24' : SLEEP_THEME.colors.accent}
                />
              </View>
            </View>

            <View style={styles.shortcutTextContainer}>
              <Text style={styles.shortcutTitle}>{sc.title}</Text>
              <Text style={styles.shortcutSubtitle}>{sc.subtitle}</Text>
            </View>

            <TouchableOpacity
              style={styles.shortcutPlayBtn}
              onPress={() => handleRunShortcut(sc)}
              activeOpacity={0.7}
            >
              <Ionicons name="play" size={18} color={SLEEP_THEME.colors.textPrimary} />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );
};

  // Pestaña 2: Asistente Local Offline (Screenshot 1)
  const renderAssistantTab = () => (
    <View style={styles.tabContent}>
      {/* Carrusel horizontal de sugerencias rápidas */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.presetsScroll}
      >
        {ASSISTANT_PRESETS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.presetCard}
            onPress={() => handleSendPrompt(item.prompt)}
            activeOpacity={0.75}
          >
            <View style={styles.presetHeader}>
              <Text style={styles.presetTag}>{item.tag}</Text>
              <Ionicons name="bulb-outline" size={18} color="#FBBF24" />
            </View>
            <Text style={styles.presetPrompt}>{item.prompt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tarjetas Analíticas Inteligentes: Deuda de Sueño & Cronotipo Circadiano */}
      <View style={styles.assistantInsightsRow}>
        {/* Widget 1: Deuda de Sueño */}
        <TouchableOpacity
          style={styles.insightMiniCard}
          onPress={() => handleSendPrompt('¿Tengo deuda de sueño acumulada esta semana?')}
          activeOpacity={0.8}
        >
          <View style={styles.insightHeaderRow}>
            <View style={[styles.insightIconBox, { backgroundColor: 'rgba(251, 113, 133, 0.15)' }]}>
              <Ionicons name="hourglass-outline" size={16} color="#FB7185" />
            </View>
            <View
              style={[
                styles.insightStatusBadge,
                {
                  backgroundColor:
                    sleepDebt?.status === 'balanced'
                      ? 'rgba(52, 211, 153, 0.15)'
                      : 'rgba(251, 113, 133, 0.15)',
                },
              ]}
            >
              <Text
                style={[
                  styles.insightStatusBadgeText,
                  {
                    color:
                      sleepDebt?.status === 'balanced'
                        ? SLEEP_THEME.colors.success
                        : '#FB7185',
                  },
                ]}
              >
                {sleepDebt?.statusLabel || 'Sin deuda'}
              </Text>
            </View>
          </View>
          <Text style={styles.insightCardTitle}>Deuda de Sueño</Text>
          <Text style={styles.insightCardValue}>
            {sleepDebt && sleepDebt.deficitHours > 0
              ? `-${sleepDebt.deficitHours} hrs`
              : '0 hrs (Equilibrado)'}
          </Text>
          <Text style={styles.insightCardHint}>Toca para ver consejo analítico ➔</Text>
        </TouchableOpacity>

        {/* Widget 2: Cronotipo Circadiano */}
        <TouchableOpacity
          style={styles.insightMiniCard}
          onPress={() => handleSendPrompt('¿Cuál es mi cronotipo y regularidad circadiana?')}
          activeOpacity={0.8}
        >
          <View style={styles.insightHeaderRow}>
            <View style={[styles.insightIconBox, { backgroundColor: 'rgba(167, 139, 250, 0.15)' }]}>
              <Ionicons name={(chronotype?.icon as any) || 'moon-outline'} size={16} color="#A78BFA" />
            </View>
            <View style={styles.insightStatusBadge}>
              <Text style={[styles.insightStatusBadgeText, { color: '#A78BFA' }]}>
                {chronotype?.circadianConsistencyScore
                  ? `${chronotype.circadianConsistencyScore}% regular`
                  : 'Analizando'}
              </Text>
            </View>
          </View>
          <Text style={styles.insightCardTitle}>Cronotipo Natural</Text>
          <Text style={styles.insightCardValue} numberOfLines={1}>
            {chronotype?.title.split(' ')[0] || 'En calibración'}
          </Text>
          <Text style={styles.insightCardHint}>
            {chronotype?.averageBedtimeStr !== '--:--'
              ? `Sueño ~${chronotype?.averageBedtimeStr} hs ➔`
              : 'Requiere 2 noches ➔'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Indicador de Privacidad 100% Local */}
      <View style={styles.privacyBannerSmall}>
        <Ionicons name="shield-checkmark" size={14} color={SLEEP_THEME.colors.success} />
        <Text style={styles.privacyBannerText}>
          Asistente 100% offline: procesa tus registros locales sin salir de tu teléfono.
        </Text>
      </View>

      {/* Mensajes del Chat */}
      <View style={styles.chatArea}>
        {chatMessages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.chatBubble,
              msg.sender === 'user' ? styles.chatBubbleUser : styles.chatBubbleAssistant,
            ]}
          >
            {msg.sender === 'assistant' && (
              <View style={styles.botAvatarRow}>
                <Ionicons name="sparkles" size={12} color={SLEEP_THEME.colors.accent} />
                <Text style={styles.botName}>Just Breathe AI (Local)</Text>
              </View>
            )}
            <Text
              style={[
                styles.chatText,
                msg.sender === 'user' ? styles.chatTextUser : styles.chatTextAssistant,
              ]}
            >
              {msg.text}
            </Text>
            <Text style={styles.chatTime}>{msg.timestamp}</Text>
          </View>
        ))}
      </View>

      {/* Input para consulta personalizada */}
      <View style={styles.chatInputRow}>
        <TextInput
          style={styles.chatTextInput}
          placeholder="Pregúntale al asistente sobre tu descanso..."
          placeholderTextColor={SLEEP_THEME.colors.textMuted}
          value={chatInput}
          onChangeText={setChatInput}
          onSubmitEditing={() => handleSendPrompt(chatInput)}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={styles.chatSendBtn}
          onPress={() => handleSendPrompt(chatInput)}
          disabled={!chatInput.trim()}
        >
          <Ionicons name="send" size={18} color="#090D16" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Pestaña 3: Canciones de Cuna / Paisajes Sonoros (Screenshot 5)
  const renderSoundsTab = () => {
    const filteredSounds = DEFAULT_SOUNDS.filter((s) => s.category === soundCategory);
    const activeSound = DEFAULT_SOUNDS.find((s) => s.id === activeSoundId);

    const formatSeconds = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
      <View style={styles.tabContent}>
        {/* Reproductor Activo con Temporizador y Fade-out */}
        {activeSound && (
          <View style={styles.soundActivePlayerBox}>
            <View style={styles.soundActiveHeader}>
              <View style={styles.soundWavePill}>
                <Ionicons name="volume-high" size={16} color={SLEEP_THEME.colors.accent} />
                <Text style={styles.soundWavePillText}>REPRODUCIENDO AMBIENTE</Text>
              </View>

              <TouchableOpacity
                style={styles.soundStopBtn}
                onPress={() => setActiveSoundId(null)}
                activeOpacity={0.8}
              >
                <Ionicons name="stop" size={12} color="#FB7185" />
                <Text style={styles.soundStopBtnText}>Detener</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.soundActiveTitle}>{activeSound.title}</Text>
            <Text style={styles.soundActiveCategory}>{activeSound.tag} • Sonido continuo de relajación</Text>

            {/* Selector de Temporizador con Fade-out */}
            <View style={styles.soundTimerSection}>
              <View style={styles.soundTimerHeader}>
                <Ionicons name="hourglass-outline" size={14} color={SLEEP_THEME.colors.accent} />
                <Text style={styles.soundTimerTitle}>Temporizador de Apagado (Fade-out)</Text>
              </View>

              <View style={styles.soundTimerPillsRow}>
                {SOUND_TIMER_OPTIONS.map((opt) => {
                  const isSelected = soundTimerMinutes === opt.minutes;
                  return (
                    <TouchableOpacity
                      key={opt.minutes}
                      style={[
                        styles.soundTimerPill,
                        isSelected && styles.soundTimerPillSelected,
                      ]}
                      onPress={() => {
                        setSoundTimerMinutes(opt.minutes);
                        setSoundRemainingSeconds(opt.minutes * 60);
                      }}
                    >
                      <Text
                        style={[
                          styles.soundTimerPillText,
                          isSelected && styles.soundTimerPillTextSelected,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {soundTimerMinutes > 0 ? (
                <View style={styles.soundTimerStatusRow}>
                  <Text style={styles.soundTimerStatusText}>
                    Apagado automático en{' '}
                    <Text style={{ color: SLEEP_THEME.colors.accent, fontWeight: '700' }}>
                      {formatSeconds(soundRemainingSeconds)}
                    </Text>
                  </Text>
                  <View style={styles.fadeoutBadge}>
                    <Ionicons name="sparkles" size={11} color={SLEEP_THEME.colors.success} />
                    <Text style={styles.fadeoutBadgeText}>Fade-out gradual</Text>
                  </View>
                </View>
              ) : (
                <Text style={styles.soundTimerStatusText}>Reproducción continua sin límite</Text>
              )}
            </View>
          </View>
        )}

        {/* Selector de Categorías (Naturaleza, Ruido blanco, Meditación) */}
        <View style={styles.filterPills}>
          {(['nature', 'white_noise', 'meditation'] as const).map((cat) => {
            const labels = {
              nature: 'Naturaleza',
              white_noise: 'Ruido Blanco',
              meditation: 'Meditación',
            };
            const active = soundCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setSoundCategory(cat)}
              >
                <Text style={[styles.filterPillText, active && styles.filterPillTextActive]}>
                  {labels[cat]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Lista de Paisajes Sonoros (Screenshot 5) */}
        <View style={styles.soundsList}>
          {filteredSounds.map((snd) => {
            const isPlaying = activeSoundId === snd.id;
            return (
              <TouchableOpacity
                key={snd.id}
                style={[styles.soundItem, isPlaying && styles.soundItemPlaying]}
                onPress={() => setActiveSoundId(isPlaying ? null : snd.id)}
                activeOpacity={0.8}
              >
                <View style={styles.soundIconCircle}>
                  <Ionicons name={snd.icon as any} size={22} color={SLEEP_THEME.colors.accent} />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={styles.soundTitle}>{snd.title}</Text>
                  <Text style={styles.soundTag}>
                    {snd.tag} • {snd.durationText}
                  </Text>
                </View>

                <View style={[styles.playToggleBtn, isPlaying && styles.playToggleBtnPlaying]}>
                  <Ionicons
                    name={isPlaying ? 'pause' : 'play'}
                    size={16}
                    color={isPlaying ? '#090D16' : SLEEP_THEME.colors.textPrimary}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Pestaña 4: Ruidos de la noche y Formas de Onda (Screenshot 3)
  const renderNoisesTab = () => (
    <View style={styles.tabContent}>
      {/* Cabecera con fecha */}
      <View style={styles.noiseDateHeader}>
        <Text style={styles.noiseDateText}>Eventos Sonoros Registrados</Text>
        <TouchableOpacity
          style={styles.playAllBtn}
          onPress={() => Alert.alert('Reproducir', 'Reproduciendo fragmentos de audio locales.')}
        >
          <Ionicons name="play" size={14} color="#090D16" />
          <Text style={styles.playAllBtnText}>Reproducir todos</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de Eventos con Ondas Auditivas */}
      <View style={styles.noisesList}>
        {noiseEvents.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="mic-outline" size={32} color={SLEEP_THEME.colors.textMuted} style={{ marginBottom: 6 }} />
            <Text style={styles.emptyCardText}>No hay eventos sonoros capturados</Text>
            <Text style={[styles.emptyCardText, { fontSize: 11, marginTop: 4, color: SLEEP_THEME.colors.textMuted }]}>
              Las detecciones de audio y ruidos durante tu descanso aparecerán aquí.
            </Text>
          </View>
        ) : (
          noiseEvents.map((event) => (
            <View key={event.id} style={styles.noiseCard}>
              <View style={styles.noiseHeaderRow}>
                <Text style={styles.noiseTime}>{event.timeDisplay}</Text>
                <View style={styles.noisePills}>
                  <View style={styles.durationPill}>
                    <Text style={styles.durationPillText}>{event.durationMinutes} min</Text>
                  </View>
                  <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={16} color={SLEEP_THEME.colors.textMuted} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Onda Sonora Gráfica con Cyan Waves */}
              <View style={styles.waveformContainer}>
                {event.waveformPattern.map((val, idx) => (
                  <View
                    key={idx}
                    style={[
                      styles.waveformBar,
                      {
                        height: Math.max(4, Math.round(val * 24)),
                        backgroundColor: idx % 2 === 0 ? SLEEP_THEME.colors.accent : '#818CF8',
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Historial de Noches Registradas */}
      <Text style={[styles.sectionTitle, { marginTop: 24, marginBottom: 12 }]}>
        Historial de Noches ({logs.length})
      </Text>
      {logs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyCardText}>No hay noches guardadas aún.</Text>
        </View>
      ) : (
        logs.map((log) => (
          <View key={log.id} style={styles.historyLogCard}>
            <View style={styles.historyLogRow}>
              <Text style={styles.historyLogDate}>{log.date}</Text>
              <View style={{ flexDirection: 'row', gap: 2 }}>
                {([1, 2, 3, 4, 5] as const).map((s) => (
                  <Ionicons
                    key={s}
                    name={s <= log.qualityRating ? 'star' : 'star-outline'}
                    size={13}
                    color={s <= log.qualityRating ? '#FBBF24' : SLEEP_THEME.colors.border}
                  />
                ))}
              </View>
            </View>
            <Text style={styles.historyLogTimes}>
              {new Date(log.bedtime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} →{' '}
              {new Date(log.wakeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (
              {formatDurationText(log.durationMinutes)})
            </Text>
            {log.tags && log.tags.length > 0 && (
              <View style={styles.tagsMiniRow}>
                {log.tags.map((t, i) => (
                  <Text key={i} style={styles.tagMiniText}>
                    #{t}
                  </Text>
                ))}
              </View>
            )}
          </View>
        ))
      )}
    </View>
  );

  // Pestaña 5: Logros y Gamificación (Screenshot 4)
  const renderAchievementsTab = () => (
    <View style={styles.tabContent}>
      {/* Fila de Gemas Superiores */}
      <View style={styles.gemsRow}>
        <View style={styles.gemItem}>
          <Ionicons name="sparkles" size={18} color="#38BDF8" />
          <Text style={styles.gemCount}>425</Text>
        </View>
        <View style={styles.gemItem}>
          <Ionicons name="bulb" size={18} color="#FBBF24" />
          <Text style={styles.gemCount}>514</Text>
        </View>
        <View style={styles.gemItem}>
          <Ionicons name="moon" size={18} color="#818CF8" />
          <Text style={styles.gemCount}>509</Text>
        </View>
        <View style={styles.gemItem}>
          <Ionicons name="eye" size={18} color="#34D399" />
          <Text style={styles.gemCount}>431</Text>
        </View>
      </View>

      {/* Tarjetas de Logros con Barras de Progreso (Screenshot 4) */}
      <View style={styles.achievementsList}>
        {achievements.map((ach) => {
          const progressPercent = Math.min(100, Math.round((ach.current / ach.target) * 100));
          return (
            <View key={ach.id} style={styles.achievementCard}>
              <View style={styles.achievementHeader}>
                <View
                  style={[
                    styles.achievementIconCircle,
                    { backgroundColor: `${ach.categoryColor}20` },
                  ]}
                >
                  <Ionicons name={ach.icon as any} size={22} color={ach.categoryColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.achievementTitle}>{ach.title}</Text>
                  <Text style={styles.achievementDescription}>{ach.description}</Text>
                </View>
              </View>

              {/* Barra de Progreso */}
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    {
                      width: `${progressPercent}%`,
                      backgroundColor: ach.categoryColor,
                    },
                  ]}
                />
              </View>

              <Text style={styles.progressText}>
                {ach.current} / {ach.target}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={SLEEP_THEME.colors.background} />

      <Animated.View
        style={{
          flex: 1,
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }, { scale: scaleAnim }],
        }}
      >
        {selectedModule === null ? (
          // ========================================================
          // PANTALLA PRINCIPAL: MÓDULOS EN CUADRÍCULA VERTICAL
          // ========================================================
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={styles.verticalHubScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Bar Principal */}
            <View style={styles.mainTopBar}>
              <View>
                <Text style={styles.appBrand}>JUST BREATHE</Text>
                <Text style={styles.moduleTitle}>Sueño y Descanso</Text>
              </View>

              <View style={styles.topBarRight}>
                <TouchableOpacity
                  style={styles.topIconBtn}
                  onPress={() => setPrivacyModalVisible(true)}
                  accessibilityLabel="Información de Privacidad"
                >
                  <Ionicons name="help-circle-outline" size={22} color={SLEEP_THEME.colors.textSecondary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.topIconBtn}
                  onPress={handleImport}
                  disabled={backupLoading}
                  accessibilityLabel="Importar Backup"
                >
                  <Ionicons name="cloud-download-outline" size={20} color={SLEEP_THEME.colors.accent} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.topIconBtn}
                  onPress={handleExport}
                  disabled={backupLoading}
                  accessibilityLabel="Exportar Backup"
                >
                  <Ionicons name="share-outline" size={20} color={SLEEP_THEME.colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Banner de sesión activa si la hay */}
            {activeSession && (
              <View style={styles.hubActiveSessionPill}>
                <View style={styles.activeDot} />
                <Text style={styles.hubActiveSessionText}>
                  Descanso en curso • Iniciado a las{' '}
                  {new Date(activeSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
                </Text>
                <TouchableOpacity style={styles.hubWakeMiniBtn} onPress={handleWakeUp}>
                  <Text style={styles.hubWakeMiniText}>Despertar</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Encabezado del Hub Vertical (Una Sola Columna) */}
            <View style={styles.hubVerticalHeader}>
              <Text style={styles.hubHeroTitle}>Módulos de Descanso</Text>
              <Text style={styles.hubVerticalSubtitle}>
                Desliza hacia abajo y toca un módulo para abrirlo
              </Text>
            </View>

            {/* Lista Vertical en Una Sola Columna */}
            <View style={styles.singleColumnContainer}>
              {SLEEP_MODULES.map((mod) => (
                <TouchableOpacity
                  key={mod.id}
                  style={[
                    styles.singleColumnCard,
                    { borderColor: `${mod.activeColor}40` },
                  ]}
                  onPress={() => handleSelectModule(mod.id)}
                  activeOpacity={0.76}
                >
                  {/* Ícono Temático */}
                  <View
                    style={[
                      styles.singleColumnIconBox,
                      { backgroundColor: `${mod.activeColor}18` },
                    ]}
                  >
                    <Ionicons name={mod.icon} size={26} color={mod.activeColor} />
                  </View>

                  {/* Información del Módulo */}
                  <View style={styles.singleColumnInfo}>
                    <View style={styles.singleColumnTitleRow}>
                      <Text style={styles.singleColumnTitle}>{mod.title}</Text>
                      <View
                        style={[
                          styles.singleColumnBadge,
                          {
                            backgroundColor: `${mod.activeColor}15`,
                            borderColor: `${mod.activeColor}40`,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.singleColumnBadgeText,
                            { color: mod.activeColor },
                          ]}
                        >
                          {mod.badge}
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.singleColumnSubtitle, { color: mod.activeColor }]}>
                      {mod.subtitle}
                    </Text>

                    <Text style={styles.singleColumnDescription} numberOfLines={2}>
                      {mod.description}
                    </Text>
                  </View>

                  {/* Flecha de Navegación */}
                  <View
                    style={[
                      styles.singleColumnArrowBox,
                      { backgroundColor: `${mod.activeColor}15` },
                    ]}
                  >
                    <Ionicons name="chevron-forward" size={18} color={mod.activeColor} />
                  </View>

                  {/* Barra lateral indicadora */}
                  <View
                    style={[
                      styles.singleColumnLeftAccent,
                      { backgroundColor: mod.activeColor },
                    ]}
                  />
                </TouchableOpacity>
              ))}

              {/* Fila de Estadísticas Semanales Rápidas */}
              <View style={styles.quickStatsRow}>
                <View style={styles.quickStatBox}>
                  <Ionicons name="time-outline" size={16} color={SLEEP_THEME.colors.accent} />
                  <Text style={styles.quickStatValue}>
                    {stats.averageHours > 0 ? `${stats.averageHours}h` : '--'}
                  </Text>
                  <Text style={styles.quickStatLabel}>Promedio</Text>
                </View>
                <View style={styles.quickStatBox}>
                  <Ionicons name="star" size={16} color="#FBBF24" />
                  <Text style={styles.quickStatValue}>
                    {stats.averageQuality > 0 ? `${stats.averageQuality.toFixed(1)} ★` : '--'}
                  </Text>
                  <Text style={styles.quickStatLabel}>Calidad</Text>
                </View>
                <View style={styles.quickStatBox}>
                  <Ionicons name="moon-outline" size={16} color="#818CF8" />
                  <Text style={styles.quickStatValue}>{logs.length}</Text>
                  <Text style={styles.quickStatLabel}>Registros</Text>
                </View>
              </View>
            </View>

            {/* Footer de Privacidad Local */}
            <View style={styles.hubFooter}>
              <Ionicons name="shield-checkmark" size={14} color={SLEEP_THEME.colors.success} />
              <Text style={styles.hubFooterText}>
                Todo se procesa y guarda localmente en tu dispositivo
              </Text>
            </View>
          </ScrollView>
        ) : (
          // ========================================================
          // PANTALLA SECUNDARIA: CONTENIDO DEL MÓDULO ELEGIDO
          // ========================================================
          <View style={{ flex: 1 }}>
            {/* Barra Superior del Submódulo con Botón Volver */}
            <View style={styles.subModuleHeaderBar}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleBackToHub}
                activeOpacity={0.7}
                accessibilityLabel="Volver a los módulos"
              >
                <Ionicons name="chevron-back" size={22} color={SLEEP_THEME.colors.accent} />
                <Text style={styles.backButtonText}>Módulos</Text>
              </TouchableOpacity>

              <View style={styles.subModuleTitleContainer}>
                <Text style={styles.subModuleHeaderTitle}>
                  {SLEEP_MODULES.find((m) => m.id === selectedModule)?.title}
                </Text>
              </View>

              <View style={styles.subModuleHeaderActions}>
                {selectedModule === 'shortcuts' && (
                  <TouchableOpacity style={styles.subHeaderActionBtn} onPress={openManualModal}>
                    <Ionicons name="create-outline" size={18} color={SLEEP_THEME.colors.accent} />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* Contenido con Scroll Vertical Exclusivo del Módulo Seleccionado */}
            {loading && !refreshing ? (
              <View style={styles.centerContainer}>
                <ActivityIndicator size="large" color={SLEEP_THEME.colors.accent} />
                <Text style={styles.centerText}>Cargando datos del módulo...</Text>
              </View>
            ) : (
              <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={{ paddingBottom: 60 }}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => {
                      setRefreshing(true);
                      loadData();
                    }}
                    tintColor={SLEEP_THEME.colors.accent}
                  />
                }
              >
                {selectedModule === 'shortcuts' && renderShortcutsTab()}
                {selectedModule === 'assistant' && renderAssistantTab()}
                {selectedModule === 'sounds' && renderSoundsTab()}
                {selectedModule === 'noises' && renderNoisesTab()}
                {selectedModule === 'achievements' && renderAchievementsTab()}
              </ScrollView>
            )}
          </View>
        )}
      </Animated.View>

      {/* Modal de Calificación al Despertar */}
      <Modal visible={wakeModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalSheetTitle}>¡Buenos días!</Text>
            <Text style={styles.modalSheetSub}>¿Cómo calificarías la calidad de tu descanso?</Text>

            <View style={styles.starsRow}>
              {([1, 2, 3, 4, 5] as const).map((s) => (
                <TouchableOpacity key={s} onPress={() => setWakeRating(s)}>
                  <Ionicons
                    name={s <= wakeRating ? 'star' : 'star-outline'}
                    size={36}
                    color={s <= wakeRating ? '#FBBF24' : SLEEP_THEME.colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Factores influyentes:</Text>
            <View style={styles.tagsPicker}>
              {DEFAULT_SLEEP_TAGS.map((t) => {
                const isSelected = wakeTags.includes(t);
                return (
                  <TouchableOpacity
                    key={t}
                    style={[styles.tagOption, isSelected && styles.tagOptionActive]}
                    onPress={() =>
                      setWakeTags(isSelected ? wakeTags.filter((x) => x !== t) : [...wakeTags, t])
                    }
                  >
                    <Text style={[styles.tagOptionText, isSelected && { color: SLEEP_THEME.colors.accent }]}>
                      {isSelected ? `✓ ${t}` : t}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              style={styles.sheetInput}
              placeholder="Notas opcionales (sueños, interrupciones...)"
              placeholderTextColor={SLEEP_THEME.colors.textMuted}
              value={wakeNotes}
              onChangeText={setWakeNotes}
            />

            <View style={styles.sheetButtons}>
              <TouchableOpacity
                style={styles.sheetCancelBtn}
                onPress={() => setWakeModalVisible(false)}
              >
                <Text style={{ color: SLEEP_THEME.colors.textSecondary }}>Descartar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetSaveBtn} onPress={handleSaveWakeSession}>
                <Text style={styles.sheetSaveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de Carga Manual */}
      <Modal visible={manualModalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalSheet}>
            <Text style={styles.modalSheetTitle}>Cargar Noche Anterior</Text>

            <Text style={styles.fieldLabel}>Fecha (YYYY-MM-DD):</Text>
            <TextInput
              style={styles.sheetInput}
              value={manualDate}
              onChangeText={setManualDate}
              placeholder="2026-10-12"
              placeholderTextColor={SLEEP_THEME.colors.textMuted}
            />

            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Hora Acostarse:</Text>
                <TextInput
                  style={styles.sheetInput}
                  value={manualBedtime}
                  onChangeText={setManualBedtime}
                  placeholder="23:00"
                  placeholderTextColor={SLEEP_THEME.colors.textMuted}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Hora Despertar:</Text>
                <TextInput
                  style={styles.sheetInput}
                  value={manualWakeTime}
                  onChangeText={setManualWakeTime}
                  placeholder="07:00"
                  placeholderTextColor={SLEEP_THEME.colors.textMuted}
                />
              </View>
            </View>

            <Text style={styles.fieldLabel}>Calidad (1 a 5):</Text>
            <View style={styles.starsRow}>
              {([1, 2, 3, 4, 5] as const).map((s) => (
                <TouchableOpacity key={s} onPress={() => setManualRating(s)}>
                  <Ionicons
                    name={s <= manualRating ? 'star' : 'star-outline'}
                    size={32}
                    color={s <= manualRating ? '#FBBF24' : SLEEP_THEME.colors.border}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.sheetInput}
              placeholder="Notas opcionales..."
              placeholderTextColor={SLEEP_THEME.colors.textMuted}
              value={manualNotes}
              onChangeText={setManualNotes}
            />

            <View style={styles.sheetButtons}>
              <TouchableOpacity
                style={styles.sheetCancelBtn}
                onPress={() => setManualModalVisible(false)}
              >
                <Text style={{ color: SLEEP_THEME.colors.textSecondary }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sheetSaveBtn} onPress={handleSaveManual}>
                <Text style={styles.sheetSaveBtnText}>Guardar Noche</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de Garantía de Privacidad Local */}
      <Modal visible={privacyModalVisible} transparent animationType="fade">
        <View style={styles.privacyModalOverlay}>
          <View style={styles.privacyModalBox}>
            <View style={styles.privacyIconCircle}>
              <Ionicons name="lock-closed" size={30} color={SLEEP_THEME.colors.success} />
            </View>
            <Text style={styles.privacyTitle}>Privacidad 100% Local</Text>
            <Text style={styles.privacyBody}>
              En <Text style={{ fontWeight: '700', color: '#F8FAFC' }}>Just Breathe</Text>, todos
              tus registros de sueño, grabaciones de ruidos y notas se guardan de forma exclusiva en
              el almacenamiento interno de tu dispositivo.
              {'\n\n'}
              • Ningún dato se transfiere a la nube.{'\n'}
              • Cero rastreadores de terceros.{'\n'}
              • Tus copias de seguridad (JSON) te pertenecen y puedes exportarlas cuando desees.
            </Text>

            {/* Módulo de Auditoría y Verificación Criptográfica */}
            <View style={styles.securityAuditBox}>
              <View style={styles.securityAuditRow}>
                <Ionicons name="shield-checkmark" size={15} color={SLEEP_THEME.colors.success} />
                <Text style={styles.securityAuditText}>
                  Integridad SHA-256 Anti-Alteraciones activa
                </Text>
              </View>
              <View style={styles.securityAuditRow}>
                <Ionicons name="key" size={15} color={SLEEP_THEME.colors.accent} />
                <Text style={styles.securityAuditText}>
                  Generador Criptográfico Seguro (CSPRNG)
                </Text>
              </View>
              <View style={styles.securityAuditRow}>
                <Ionicons name="lock-closed" size={15} color="#A78BFA" />
                <Text style={styles.securityAuditText}>
                  Sanitización de inputs (Anti-XSS & Anti-DoS)
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.privacyResetBtn}
              onPress={handleClearAllData}
            >
              <Ionicons name="trash-outline" size={15} color={SLEEP_THEME.colors.danger} />
              <Text style={styles.privacyResetBtnText}>Borrar Registros (Reset a Cero)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.privacyCloseBtn}
              onPress={() => setPrivacyModalVisible(false)}
            >
              <Text style={styles.privacyCloseBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal Personalizado de Confirmación de Atajo (Dark Palette Theme) */}
      <Modal
        visible={shortcutConfirmItem !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setShortcutConfirmItem(null)}
      >
        <View style={styles.shortcutModalBackdrop}>
          <View style={styles.shortcutModalBox}>
            {/* Ícono de Cabecera con Halo Temático */}
            <View
              style={[
                styles.shortcutModalIconCircle,
                {
                  backgroundColor:
                    shortcutConfirmItem?.type === 'night'
                      ? 'rgba(251, 191, 36, 0.15)'
                      : 'rgba(56, 189, 248, 0.15)',
                  borderColor:
                    shortcutConfirmItem?.type === 'night'
                      ? 'rgba(251, 191, 36, 0.35)'
                      : 'rgba(56, 189, 248, 0.35)',
                },
              ]}
            >
              <Ionicons
                name={shortcutConfirmItem?.type === 'night' ? 'moon' : 'time-outline'}
                size={30}
                color={shortcutConfirmItem?.type === 'night' ? '#FBBF24' : SLEEP_THEME.colors.accent}
              />
            </View>

            {/* Título y Badge */}
            <Text style={styles.shortcutModalTitle}>
              Iniciar {shortcutConfirmItem?.title}
            </Text>

            <View style={styles.shortcutModalBadgePill}>
              <Ionicons name="timer-outline" size={13} color={SLEEP_THEME.colors.accent} />
              <Text style={styles.shortcutModalBadgeText}>
                {shortcutConfirmItem?.durationMinutes} min •{' '}
                {shortcutConfirmItem?.type === 'night' ? 'Sueño Nocturno' : 'Siesta Reparadora'}
              </Text>
            </View>

            {/* Descripción */}
            <Text style={styles.shortcutModalDescription}>
              ¿Deseas iniciar una sesión de{' '}
              <Text style={{ color: SLEEP_THEME.colors.textPrimary, fontWeight: '700' }}>
                {shortcutConfirmItem?.subtitle}
              </Text>
              ? El descanso se registrará de forma 100% privada en tu dispositivo.
            </Text>

            {/* Botones de Acción */}
            <View style={styles.shortcutModalButtonsRow}>
              <TouchableOpacity
                style={styles.shortcutModalCancelBtn}
                onPress={() => setShortcutConfirmItem(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.shortcutModalCancelText}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.shortcutModalConfirmBtn}
                onPress={handleConfirmStartShortcut}
                activeOpacity={0.8}
              >
                <Ionicons name="play" size={16} color="#090D16" />
                <Text style={styles.shortcutModalConfirmText}>Comenzar Ahora</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: SLEEP_THEME.colors.background,
  },
  mainTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
  },
  appBrand: {
    color: SLEEP_THEME.colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  moduleTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  topBarRight: {
    flexDirection: 'row',
    gap: 8,
  },
  topIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SLEEP_THEME.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  // Hub Vertical de Módulos
  verticalHubScrollContent: {
    paddingBottom: 28,
  },
  hubActiveSessionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    borderRadius: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.accent,
    gap: 8,
  },
  hubActiveSessionText: {
    flex: 1,
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  hubWakeMiniBtn: {
    backgroundColor: SLEEP_THEME.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  hubWakeMiniText: {
    color: '#090D16',
    fontSize: 11,
    fontWeight: '700',
  },
  hubVerticalHeader: {
    paddingHorizontal: 16,
    marginTop: 6,
    marginBottom: 12,
  },
  hubHeroTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  hubVerticalSubtitle: {
    color: SLEEP_THEME.colors.textMuted,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 3,
  },
  singleColumnContainer: {
    paddingHorizontal: 16,
    gap: 12,
  },
  singleColumnCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SLEEP_THEME.colors.surface,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 8,
    elevation: 3,
  },
  singleColumnLeftAccent: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 3.5,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  singleColumnIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  singleColumnInfo: {
    flex: 1,
    marginRight: 8,
  },
  singleColumnTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  singleColumnTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  singleColumnBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  singleColumnBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  singleColumnSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  singleColumnDescription: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 4,
  },
  singleColumnArrowBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Fila de estadísticas rápidas
  quickStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  quickStatBox: {
    flex: 1,
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
    gap: 3,
  },
  quickStatValue: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  quickStatLabel: {
    color: SLEEP_THEME.colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },
  hubFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginTop: 18,
  },
  hubFooterText: {
    color: SLEEP_THEME.colors.textMuted,
    fontSize: 11,
  },
  // Submódulo Abierto
  subModuleHeaderBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: SLEEP_THEME.colors.border,
    backgroundColor: SLEEP_THEME.colors.surface,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingVertical: 4,
    paddingRight: 8,
  },
  backButtonText: {
    color: SLEEP_THEME.colors.accent,
    fontSize: 15,
    fontWeight: '600',
  },
  subModuleTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  subModuleHeaderTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
  },
  subModuleHeaderActions: {
    width: 60,
    alignItems: 'flex-end',
  },
  subHeaderActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  centerText: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 13,
  },
  activeBanner: {
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.accent,
    marginBottom: 16,
  },
  activeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SLEEP_THEME.colors.accent,
  },
  activeTitle: {
    color: SLEEP_THEME.colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  activeSubtitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginVertical: 10,
  },
  wakeButtonLarge: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SLEEP_THEME.colors.accent,
    paddingVertical: 12,
    borderRadius: 10,
  },
  wakeButtonText: {
    color: '#090D16',
    fontSize: 14,
    fontWeight: '700',
  },
  scoreCard: {
    backgroundColor: SLEEP_THEME.colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
    marginBottom: 16,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scoreIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  scoreSub: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  scoreBadge: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  scoreBadgeText: {
    color: '#FBBF24',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  manualActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: SLEEP_THEME.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  manualActionText: {
    color: SLEEP_THEME.colors.primaryLight,
    fontSize: 12,
    fontWeight: '600',
  },
  shortcutsList: {
    gap: 10,
  },
  shortcutCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SLEEP_THEME.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  shortcutIconContainer: {
    marginRight: 14,
  },
  shortcutIconBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.borderSubtle,
  },
  shortcutTextContainer: {
    flex: 1,
  },
  shortcutTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  shortcutSubtitle: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  shortcutPlayBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  presetsScroll: {
    gap: 12,
    paddingBottom: 14,
  },
  presetCard: {
    width: 170,
    backgroundColor: SLEEP_THEME.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  presetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  presetTag: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  presetPrompt: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
  },
  privacyBannerSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(52, 211, 153, 0.08)',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
    marginBottom: 14,
  },
  privacyBannerText: {
    flex: 1,
    color: SLEEP_THEME.colors.success,
    fontSize: 11,
    lineHeight: 15,
  },
  chatArea: {
    gap: 10,
    marginBottom: 16,
  },
  chatBubble: {
    borderRadius: 16,
    padding: 12,
    maxWidth: '88%',
  },
  chatBubbleAssistant: {
    backgroundColor: SLEEP_THEME.colors.surface,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  chatBubbleUser: {
    backgroundColor: SLEEP_THEME.colors.primaryDark,
    alignSelf: 'flex-end',
  },
  botAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  botName: {
    color: SLEEP_THEME.colors.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  chatText: {
    fontSize: 13,
    lineHeight: 18,
  },
  chatTextAssistant: {
    color: SLEEP_THEME.colors.textPrimary,
  },
  chatTextUser: {
    color: '#FFFFFF',
  },
  chatTime: {
    color: SLEEP_THEME.colors.textMuted,
    fontSize: 9,
    alignSelf: 'flex-end',
    marginTop: 4,
  },
  chatInputRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  chatTextInput: {
    flex: 1,
    backgroundColor: SLEEP_THEME.colors.surface,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 13,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  chatSendBtn: {
    backgroundColor: SLEEP_THEME.colors.accent,
    borderRadius: 12,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterPills: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: SLEEP_THEME.colors.surface,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  filterPillActive: {
    backgroundColor: SLEEP_THEME.colors.accent,
    borderColor: SLEEP_THEME.colors.accent,
  },
  filterPillText: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#090D16',
    fontWeight: '700',
  },
  soundsList: {
    gap: 10,
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: SLEEP_THEME.colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
    gap: 12,
  },
  soundItemPlaying: {
    borderColor: SLEEP_THEME.colors.accent,
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
  },
  soundIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  soundTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  soundTag: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  playToggleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playToggleBtnPlaying: {
    backgroundColor: SLEEP_THEME.colors.accent,
  },
  noiseDateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  noiseDateText: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SLEEP_THEME.colors.accent,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 18,
  },
  playAllBtnText: {
    color: '#090D16',
    fontSize: 11,
    fontWeight: '700',
  },
  noisesList: {
    gap: 10,
  },
  noiseCard: {
    backgroundColor: SLEEP_THEME.colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  noiseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  noiseTime: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  noisePills: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  durationPill: {
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  durationPillText: {
    color: SLEEP_THEME.colors.accent,
    fontSize: 11,
    fontWeight: '600',
  },
  waveformContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 28,
    paddingHorizontal: 4,
  },
  waveformBar: {
    width: 4,
    borderRadius: 2,
  },
  historyLogCard: {
    backgroundColor: SLEEP_THEME.colors.surface,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.borderSubtle,
  },
  historyLogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  historyLogDate: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  historyLogTimes: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 12,
  },
  tagsMiniRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 6,
  },
  tagMiniText: {
    color: SLEEP_THEME.colors.primaryLight,
    fontSize: 10,
  },
  emptyCard: {
    backgroundColor: SLEEP_THEME.colors.surface,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyCardText: {
    color: SLEEP_THEME.colors.textMuted,
    fontSize: 13,
  },
  gemsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: SLEEP_THEME.colors.surface,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
    marginBottom: 16,
  },
  gemItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gemCount: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  achievementsList: {
    gap: 10,
  },
  achievementCard: {
    backgroundColor: SLEEP_THEME.colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  achievementHeader: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  achievementIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  achievementTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  achievementDescription: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 11,
    lineHeight: 15,
    marginTop: 2,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: SLEEP_THEME.colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    alignSelf: 'flex-end',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: SLEEP_THEME.colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    borderTopWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  modalSheetTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  modalSheetSub: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 13,
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginVertical: 12,
  },
  fieldLabel: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 12,
    marginBottom: 4,
    marginTop: 8,
  },
  tagsPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 8,
  },
  tagOption: {
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  tagOptionActive: {
    borderColor: SLEEP_THEME.colors.accent,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
  },
  tagOptionText: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 12,
  },
  sheetInput: {
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    borderRadius: 8,
    color: SLEEP_THEME.colors.textPrimary,
    padding: 10,
    fontSize: 13,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
    marginBottom: 8,
  },
  sheetButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  sheetCancelBtn: {
    flex: 1,
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  sheetSaveBtn: {
    flex: 2,
    backgroundColor: SLEEP_THEME.colors.accent,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  sheetSaveBtnText: {
    color: '#090D16',
    fontWeight: '700',
    fontSize: 14,
  },
  privacyModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  privacyModalBox: {
    backgroundColor: SLEEP_THEME.colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  privacyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  privacyTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 12,
  },
  privacyBody: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 20,
  },
  privacyResetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(251, 113, 133, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(251, 113, 133, 0.4)',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    width: '100%',
    marginBottom: 10,
  },
  privacyResetBtnText: {
    color: SLEEP_THEME.colors.danger,
    fontWeight: '700',
    fontSize: 13,
  },
  privacyCloseBtn: {
    backgroundColor: SLEEP_THEME.colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  privacyCloseBtnText: {
    color: '#090D16',
    fontWeight: '700',
    fontSize: 14,
  },
  // Modal de Confirmación de Atajos (Dark Theme)
  shortcutModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 8, 14, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  shortcutModalBox: {
    backgroundColor: SLEEP_THEME.colors.surface,
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: SLEEP_THEME.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 8,
  },
  shortcutModalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    borderWidth: 1,
  },
  shortcutModalTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  shortcutModalBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  shortcutModalBadgeText: {
    color: SLEEP_THEME.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  shortcutModalDescription: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 22,
  },
  shortcutModalButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  shortcutModalCancelBtn: {
    flex: 1,
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  shortcutModalCancelText: {
    color: SLEEP_THEME.colors.textSecondary,
    fontWeight: '600',
    fontSize: 13,
  },
  shortcutModalConfirmBtn: {
    flex: 1.4,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: SLEEP_THEME.colors.accent,
    paddingVertical: 13,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: SLEEP_THEME.colors.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  shortcutModalConfirmText: {
    color: '#090D16',
    fontWeight: '800',
    fontSize: 13,
  },
  // Alarma y cuenta regresiva activa
  activeBannerAlarm: {
    borderColor: '#FB7185',
    backgroundColor: 'rgba(251, 113, 133, 0.12)',
  },
  activeDotAlarm: {
    backgroundColor: '#FB7185',
  },
  targetBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginLeft: 'auto',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  targetBadgeAlarm: {
    backgroundColor: '#FB7185',
    borderColor: '#FB7185',
  },
  targetBadgeText: {
    color: SLEEP_THEME.colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  targetBadgeTextAlarm: {
    color: '#090D16',
  },
  sessionCountdownBox: {
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    borderRadius: 12,
    padding: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  countdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  countdownLabel: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 12,
  },
  countdownValue: {
    color: SLEEP_THEME.colors.accent,
    fontSize: 13,
    fontWeight: '800',
  },
  countdownValueAlarm: {
    color: '#FB7185',
  },
  sessionProgressBarBg: {
    height: 6,
    backgroundColor: SLEEP_THEME.colors.surfaceHighlight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sessionProgressBarFill: {
    height: '100%',
    backgroundColor: SLEEP_THEME.colors.accent,
    borderRadius: 3,
  },
  sessionProgressBarAlarm: {
    backgroundColor: '#FB7185',
  },
  wakeButtonAlarm: {
    backgroundColor: '#FB7185',
  },

  // Asistente - Tarjetas de Deuda y Cronotipo
  assistantInsightsRow: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  insightMiniCard: {
    flex: 1,
    backgroundColor: SLEEP_THEME.colors.surface,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  insightHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightStatusBadge: {
    backgroundColor: 'rgba(167, 139, 250, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  insightStatusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  insightCardTitle: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  insightCardValue: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  insightCardHint: {
    color: SLEEP_THEME.colors.textMuted,
    fontSize: 10,
    fontWeight: '500',
  },

  // Paisajes Sonoros - Reproductor Activo con Temporizador
  soundActivePlayerBox: {
    backgroundColor: SLEEP_THEME.colors.surface,
    borderRadius: 18,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.4)',
  },
  soundActiveHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  soundWavePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  soundWavePillText: {
    color: SLEEP_THEME.colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  soundStopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(251, 113, 133, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  soundStopBtnText: {
    color: '#FB7185',
    fontSize: 11,
    fontWeight: '700',
  },
  soundActiveTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    marginBottom: 2,
  },
  soundActiveCategory: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 12,
    marginBottom: 12,
  },
  soundTimerSection: {
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.borderSubtle,
  },
  soundTimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  soundTimerTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  soundTimerPillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  soundTimerPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: SLEEP_THEME.colors.surfaceHighlight,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  soundTimerPillSelected: {
    backgroundColor: SLEEP_THEME.colors.accent,
    borderColor: SLEEP_THEME.colors.accent,
  },
  soundTimerPillText: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 11,
    fontWeight: '600',
  },
  soundTimerPillTextSelected: {
    color: '#090D16',
    fontWeight: '800',
  },
  soundTimerStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  soundTimerStatusText: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 11,
  },
  fadeoutBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  fadeoutBadgeText: {
    color: SLEEP_THEME.colors.success,
    fontSize: 10,
    fontWeight: '600',
  },

  // Auditoría de Seguridad en Modal de Privacidad
  securityAuditBox: {
    width: '100%',
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
    gap: 8,
  },
  securityAuditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  securityAuditText: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
});

export default SleepScreen;
