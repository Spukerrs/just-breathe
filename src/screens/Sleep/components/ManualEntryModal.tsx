import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SleepLog } from '../../../types/sleep';
import { SLEEP_THEME, DEFAULT_SLEEP_TAGS } from '../../../constants/sleepConstants';

interface ManualEntryModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (log: Omit<SleepLog, 'id'>) => Promise<void>;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({
  visible,
  onClose,
  onSave,
}) => {
  // Valores por defecto
  const [dateStr, setDateStr] = useState<string>('');
  const [bedtimeInput, setBedtimeInput] = useState<string>('23:00');
  const [wakeTimeInput, setWakeTimeInput] = useState<string>('07:00');
  const [qualityRating, setQualityRating] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Inicializar con la fecha de ayer (lo más habitual al cargar manualmente)
  useEffect(() => {
    if (visible) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      setDateStr(yesterday.toISOString().split('T')[0]);
      setBedtimeInput('23:00');
      setWakeTimeInput('07:00');
      setQualityRating(4);
      setSelectedTags([]);
      setCustomTagInput('');
      setNotes('');
      setIsSubmitting(false);
    }
  }, [visible]);

  // Cálculo de duración estimada en base a horas HH:mm
  const calculateDuration = (): { minutes: number; text: string } => {
    const bedRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    const wakeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

    if (!bedRegex.test(bedtimeInput) || !wakeRegex.test(wakeTimeInput)) {
      return { minutes: 0, text: 'Horas incompletas (formato HH:mm)' };
    }

    const [bH, bM] = bedtimeInput.split(':').map(Number);
    const [wH, wM] = wakeTimeInput.split(':').map(Number);

    const bedMinutes = bH * 60 + bM;
    const wakeMinutes = wH * 60 + wM;

    let diff = wakeMinutes - bedMinutes;
    // Si la hora de despertar es menor o igual, asumimos que cruzó la medianoche
    if (diff <= 0) {
      diff += 24 * 60;
    }

    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return { minutes: diff, text: `${h}h ${m}m (${diff} minutos)` };
  };

  const durationInfo = calculateDuration();

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    const trimmed = customTagInput.trim().toLowerCase();
    if (trimmed && !selectedTags.includes(trimmed)) {
      setSelectedTags([...selectedTags, trimmed]);
      setCustomTagInput('');
    }
  };

  const handleSave = async () => {
    if (isSubmitting) return;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      Alert.alert('Fecha inválida', 'Usa el formato YYYY-MM-DD (ejemplo: 2026-10-12).');
      return;
    }

    if (durationInfo.minutes <= 0) {
      Alert.alert('Horas inválidas', 'Por favor ingresa horas válidas en formato HH:mm (ej. 23:30 y 07:15).');
      return;
    }

    setIsSubmitting(true);
    try {
      // Reconstruir fechas ISO exactas
      const [bH, bM] = bedtimeInput.split(':').map(Number);
      const [wH, wM] = wakeTimeInput.split(':').map(Number);

      const bedDate = new Date(`${dateStr}T00:00:00`);
      bedDate.setHours(bH, bM, 0, 0);

      const wakeDate = new Date(`${dateStr}T00:00:00`);
      wakeDate.setHours(wH, wM, 0, 0);

      // Si la hora de despertar es menor a la de acostarse, ocurrió al día siguiente
      if (wakeDate.getTime() <= bedDate.getTime()) {
        wakeDate.setDate(wakeDate.getDate() + 1);
      }

      await onSave({
        date: dateStr,
        bedtime: bedDate.toISOString(),
        wakeTime: wakeDate.toISOString(),
        durationMinutes: durationInfo.minutes,
        qualityRating,
        tags: selectedTags,
        notes: notes.trim() ? notes.trim() : undefined,
      });

      onClose();
    } catch (error) {
      console.error('[ManualEntryModal] Error al guardar:', error);
      Alert.alert('Error', 'No se pudo guardar el registro manual.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Cargar Noche Anterior</Text>
              <Text style={styles.subtitle}>Registro manual de tu descanso</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={SLEEP_THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Fecha */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fecha de la noche (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={dateStr}
                onChangeText={setDateStr}
                placeholder="2026-10-12"
                placeholderTextColor={SLEEP_THEME.colors.textMuted}
                autoCapitalize="none"
              />
            </View>

            {/* Horarios de Acostarse y Despertar */}
            <View style={styles.row}>
              <View style={[styles.section, { flex: 1 }]}>
                <Text style={styles.sectionTitle}>Hora Acostarse</Text>
                <TextInput
                  style={styles.input}
                  value={bedtimeInput}
                  onChangeText={setBedtimeInput}
                  placeholder="23:00"
                  placeholderTextColor={SLEEP_THEME.colors.textMuted}
                  maxLength={5}
                />
              </View>

              <View style={[styles.section, { flex: 1 }]}>
                <Text style={styles.sectionTitle}>Hora Despertar</Text>
                <TextInput
                  style={styles.input}
                  value={wakeTimeInput}
                  onChangeText={setWakeTimeInput}
                  placeholder="07:00"
                  placeholderTextColor={SLEEP_THEME.colors.textMuted}
                  maxLength={5}
                />
              </View>
            </View>

            {/* Preview de duración calculada */}
            <View style={styles.durationCard}>
              <Ionicons name="hourglass-outline" size={16} color={SLEEP_THEME.colors.accent} />
              <Text style={styles.durationCardText}>Duración calculada: {durationInfo.text}</Text>
            </View>

            {/* Calidad (1-5 Estrellas) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Calidad del Sueño (1 a 5)</Text>
              <View style={styles.starsRow}>
                {([1, 2, 3, 4, 5] as const).map((star) => (
                  <TouchableOpacity
                    key={star}
                    style={styles.starTouch}
                    onPress={() => setQualityRating(star)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={star <= qualityRating ? 'star' : 'star-outline'}
                      size={32}
                      color={star <= qualityRating ? SLEEP_THEME.colors.star : SLEEP_THEME.colors.starInactive}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Tags */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Factores que influyeron (Tags)</Text>
              <View style={styles.tagsContainer}>
                {DEFAULT_SLEEP_TAGS.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      style={[styles.tagChip, isSelected && styles.tagChipSelected]}
                      onPress={() => toggleTag(tag)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.tagText, isSelected && styles.tagTextSelected]}>
                        {isSelected ? `✓ ${tag}` : tag}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.customTagRow}>
                <TextInput
                  style={styles.customTagInput}
                  placeholder="Agregar etiqueta personalizada..."
                  placeholderTextColor={SLEEP_THEME.colors.textMuted}
                  value={customTagInput}
                  onChangeText={setCustomTagInput}
                  onSubmitEditing={handleAddCustomTag}
                />
                <TouchableOpacity
                  style={styles.addTagButton}
                  onPress={handleAddCustomTag}
                  disabled={!customTagInput.trim()}
                >
                  <Ionicons name="add" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Notas */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notas (Opcional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="Observaciones de la noche..."
                placeholderTextColor={SLEEP_THEME.colors.textMuted}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSubmitting}>
              <Text style={styles.saveBtnText}>
                {isSubmitting ? 'Guardando...' : 'Guardar Noche'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: SLEEP_THEME.colors.background,
    borderTopLeftRadius: SLEEP_THEME.borderRadius.xl,
    borderTopRightRadius: SLEEP_THEME.borderRadius.xl,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SLEEP_THEME.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: SLEEP_THEME.colors.borderSubtle,
  },
  title: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  subtitle: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  scrollBody: {
    padding: SLEEP_THEME.spacing.lg,
  },
  section: {
    marginBottom: SLEEP_THEME.spacing.md,
  },
  sectionTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    backgroundColor: SLEEP_THEME.colors.surface,
    color: SLEEP_THEME.colors.textPrimary,
    borderRadius: SLEEP_THEME.borderRadius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  durationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    padding: 10,
    borderRadius: SLEEP_THEME.borderRadius.md,
    marginBottom: SLEEP_THEME.spacing.md,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.borderSubtle,
  },
  durationCardText: {
    color: SLEEP_THEME.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  starTouch: {
    padding: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  tagChip: {
    backgroundColor: SLEEP_THEME.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: SLEEP_THEME.borderRadius.full,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  tagChipSelected: {
    backgroundColor: 'rgba(129, 140, 248, 0.2)',
    borderColor: SLEEP_THEME.colors.primary,
  },
  tagText: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 12,
  },
  tagTextSelected: {
    color: SLEEP_THEME.colors.primaryLight,
    fontWeight: '600',
  },
  customTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customTagInput: {
    flex: 1,
    backgroundColor: SLEEP_THEME.colors.surface,
    color: SLEEP_THEME.colors.textPrimary,
    borderRadius: SLEEP_THEME.borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  addTagButton: {
    backgroundColor: SLEEP_THEME.colors.primaryDark,
    borderRadius: SLEEP_THEME.borderRadius.md,
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notesInput: {
    backgroundColor: SLEEP_THEME.colors.surface,
    borderRadius: SLEEP_THEME.borderRadius.md,
    color: SLEEP_THEME.colors.textPrimary,
    padding: 12,
    fontSize: 13,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
    minHeight: 65,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: SLEEP_THEME.spacing.lg,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: SLEEP_THEME.colors.surface,
    paddingVertical: 12,
    borderRadius: SLEEP_THEME.borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
  },
  cancelBtnText: {
    color: SLEEP_THEME.colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 2,
    backgroundColor: SLEEP_THEME.colors.primary,
    paddingVertical: 12,
    borderRadius: SLEEP_THEME.borderRadius.md,
    alignItems: 'center',
  },
  saveBtnText: {
    color: '#0B0F19',
    fontSize: 14,
    fontWeight: '700',
  },
});
