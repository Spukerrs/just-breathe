import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
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
} from '../../types/sleep';
import { sleepService } from '../../services/sleepService';
import {
  SLEEP_THEME,
  DEFAULT_SOUNDS,
  ASSISTANT_PRESETS,
  DEFAULT_SLEEP_TAGS,
} from '../../constants/sleepConstants';

// Pestañas principales inspiradas en las capturas de pantalla
type SleepModuleTab = 'shortcuts' | 'assistant' | 'sounds' | 'noises' | 'achievements';

export const SleepScreen: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<SleepModuleTab>('shortcuts');
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
  const [soundCategory, setSoundCategory] = useState<'nature' | 'white_noise' | 'meditation'>('nature');
  const [activeSoundId, setActiveSoundId] = useState<string | null>(null);

  // Chat local del asistente
  const [chatMessages, setChatMessages] = useState<LocalChatMessage[]>([
    {
      id: 'init_1',
      sender: 'assistant',
      text: 'Hola, soy tu asistente local de descanso. Todos tus datos están guardados de forma 100% privada en tu dispositivo. ¿En qué puedo ayudarte hoy?',
      timestamp: 'Ahora',
    },
  ]);
  const [chatInput, setChatInput] = useState<string>('');

  // Modales
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [backupLoading, setBackupLoading] = useState<boolean>(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState<boolean>(false);
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

  const loadData = useCallback(async () => {
    try {
      const [fetchedLogs, fetchedStats, session, fetchedShortcuts, fetchedNoises, fetchedAchievements] =
        await Promise.all([
          sleepService.getSleepLogs(),
          sleepService.getSleepStats(),
          sleepService.getActiveSleepSession(),
          sleepService.getShortcuts(),
          sleepService.getNoiseEvents(),
          sleepService.getAchievements(),
        ]);

      setLogs(fetchedLogs);
      setStats(fetchedStats);
      setActiveSession(session);
      setShortcuts(fetchedShortcuts);
      setNoiseEvents(fetchedNoises);
      setAchievements(fetchedAchievements);
    } catch (error) {
      console.error('[SleepScreen] Error al sincronizar:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Manejo de atajos (Iniciar siesta / noche programada)
  const handleRunShortcut = async (shortcut: SleepShortcut) => {
    Alert.alert(
      `Iniciar ${shortcut.title}`,
      `¿Deseas iniciar una sesión de ${shortcut.subtitle} (${shortcut.durationMinutes} minutos)?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Comenzar Ahora',
          onPress: async () => {
            try {
              const session = await sleepService.startSleepSession(shortcut.type, shortcut.durationMinutes);
              setActiveSession(session);
              Alert.alert('Sesión iniciada', `El descanso de ${shortcut.title} está en curso.`);
            } catch {
              Alert.alert('Error', 'No se pudo iniciar el atajo.');
            }
          },
        },
      ]
    );
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
  const renderShortcutsTab = () => (
    <View style={styles.tabContent}>
      {/* Banner de sesión activa si está durmiendo */}
      {activeSession ? (
        <View style={styles.activeBanner}>
          <View style={styles.activeRow}>
            <View style={styles.activeDot} />
            <Text style={styles.activeTitle}>
              {activeSession.sessionType === 'nap' ? 'Siesta en Curso' : 'Descanso Nocturno'}
            </Text>
          </View>
          <Text style={styles.activeSubtitle}>
            Iniciado a las{' '}
            {new Date(activeSession.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs
          </Text>
          <TouchableOpacity style={styles.wakeButtonLarge} onPress={handleWakeUp}>
            <Ionicons name="sunny" size={20} color="#090D16" />
            <Text style={styles.wakeButtonText}>Despertar y Calificar</Text>
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

    return (
      <View style={styles.tabContent}>
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

      {/* Lista de Eventos con Ondas Auditivas (Screenshot 3) */}
      <View style={styles.noisesList}>
        {noiseEvents.map((event) => (
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
        ))}
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

      {/* Top Bar Principal */}
      <View style={styles.mainTopBar}>
        <View>
          <Text style={styles.appBrand}>JUST BREATHE</Text>
          <Text style={styles.moduleTitle}>Asistente del Sueño</Text>
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

      {/* Navegador Segmentado de Pestañas Superiores */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabsScroll}
      >
        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'shortcuts' && styles.tabButtonActive]}
          onPress={() => setCurrentTab('shortcuts')}
        >
          <Ionicons
            name="flash-outline"
            size={16}
            color={currentTab === 'shortcuts' ? '#090D16' : SLEEP_THEME.colors.textSecondary}
          />
          <Text
            style={[styles.tabButtonText, currentTab === 'shortcuts' && styles.tabButtonTextActive]}
          >
            Atajos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'assistant' && styles.tabButtonActive]}
          onPress={() => setCurrentTab('assistant')}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={16}
            color={currentTab === 'assistant' ? '#090D16' : SLEEP_THEME.colors.textSecondary}
          />
          <Text
            style={[styles.tabButtonText, currentTab === 'assistant' && styles.tabButtonTextActive]}
          >
            Asistente
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'sounds' && styles.tabButtonActive]}
          onPress={() => setCurrentTab('sounds')}
        >
          <Ionicons
            name="musical-notes-outline"
            size={16}
            color={currentTab === 'sounds' ? '#090D16' : SLEEP_THEME.colors.textSecondary}
          />
          <Text
            style={[styles.tabButtonText, currentTab === 'sounds' && styles.tabButtonTextActive]}
          >
            Sonidos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'noises' && styles.tabButtonActive]}
          onPress={() => setCurrentTab('noises')}
        >
          <Ionicons
            name="pulse-outline"
            size={16}
            color={currentTab === 'noises' ? '#090D16' : SLEEP_THEME.colors.textSecondary}
          />
          <Text
            style={[styles.tabButtonText, currentTab === 'noises' && styles.tabButtonTextActive]}
          >
            Ruidos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, currentTab === 'achievements' && styles.tabButtonActive]}
          onPress={() => setCurrentTab('achievements')}
        >
          <Ionicons
            name="trophy-outline"
            size={16}
            color={currentTab === 'achievements' ? '#090D16' : SLEEP_THEME.colors.textSecondary}
          />
          <Text
            style={[
              styles.tabButtonText,
              currentTab === 'achievements' && styles.tabButtonTextActive,
            ]}
          >
            Logros
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Contenido Principal con Pull-To-Refresh */}
      {loading && !refreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={SLEEP_THEME.colors.accent} />
          <Text style={styles.centerText}>Cargando descanso local...</Text>
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
          {currentTab === 'shortcuts' && renderShortcutsTab()}
          {currentTab === 'assistant' && renderAssistantTab()}
          {currentTab === 'sounds' && renderSoundsTab()}
          {currentTab === 'noises' && renderNoisesTab()}
          {currentTab === 'achievements' && renderAchievementsTab()}
        </ScrollView>
      )}

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
            <TouchableOpacity
              style={styles.privacyCloseBtn}
              onPress={() => setPrivacyModalVisible(false)}
            >
              <Text style={styles.privacyCloseBtnText}>Entendido</Text>
            </TouchableOpacity>
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
  tabsScroll: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SLEEP_THEME.colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  tabButtonActive: {
    backgroundColor: SLEEP_THEME.colors.accent,
    borderColor: SLEEP_THEME.colors.accent,
  },
  tabButtonText: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tabButtonTextActive: {
    color: '#090D16',
    fontWeight: '700',
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
});

export default SleepScreen;
