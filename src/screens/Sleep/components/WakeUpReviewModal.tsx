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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SleepLog } from '../../../types/sleep';
import { SLEEP_THEME, DEFAULT_SLEEP_TAGS } from '../../../constants/sleepConstants';

interface WakeUpReviewModalProps {
  visible: boolean;
  startTime: string | null;
  onClose: () => void;
  onSave: (log: Omit<SleepLog, 'id'>) => Promise<void>;
}

const QUALITY_LABELS: Record<number, string> = {
  1: 'Muy malo (Agotado)',
  2: 'Insuficiente (Interrumpido)',
  3: 'Aceptable (Normal)',
  4: 'Bueno (Descansado)',
  5: 'Excelente (Reparador)',
};

export const WakeUpReviewModal: React.FC<WakeUpReviewModalProps> = ({
  visible,
  startTime,
  onClose,
  onSave,
}) => {
  const [qualityRating, setQualityRating] = useState<1 | 2 | 3 | 4 | 5>(4);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [notes, setNotes] = useState<string>('');
  const [customTagInput, setCustomTagInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reset al abrir
  useEffect(() => {
    if (visible) {
      setQualityRating(4);
      setSelectedTags([]);
      setNotes('');
      setCustomTagInput('');
      setIsSubmitting(false);
    }
  }, [visible]);

  if (!startTime) return null;

  const wakeDate = new Date();
  const bedDate = new Date(startTime);
  const diffMinutes = Math.max(1, Math.round((wakeDate.getTime() - bedDate.getTime()) / (1000 * 60)));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

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
    setIsSubmitting(true);

    try {
      const dateStr = wakeDate.toISOString().split('T')[0];
      await onSave({
        date: dateStr,
        bedtime: bedDate.toISOString(),
        wakeTime: wakeDate.toISOString(),
        durationMinutes: diffMinutes,
        qualityRating,
        tags: selectedTags,
        notes: notes.trim() ? notes.trim() : undefined,
      });
      onClose();
    } catch (error) {
      console.error('[WakeUpReviewModal] Error al guardar:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatHourMin = (date: Date): string => {
    return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
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
              <Text style={styles.title}>¡Buenos días!</Text>
              <Text style={styles.subtitle}>Califica tu descanso para completar el registro.</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={SLEEP_THEME.colors.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Resumen de Tiempo */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Acostarse</Text>
                  <Text style={styles.timeValue}>{formatHourMin(bedDate)}</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={SLEEP_THEME.colors.accent} />
                <View style={styles.timeBlock}>
                  <Text style={styles.timeLabel}>Despertar</Text>
                  <Text style={styles.timeValue}>{formatHourMin(wakeDate)}</Text>
                </View>
              </View>

              <View style={styles.durationPill}>
                <Ionicons name="time-outline" size={16} color={SLEEP_THEME.colors.accent} />
                <Text style={styles.durationText}>
                  Duración total: {hours}h {minutes}m ({diffMinutes} min)
                </Text>
              </View>
            </View>

            {/* Selector de Calidad (1-5 Estrellas) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>¿Cómo calificarías tu sueño?</Text>
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
                      size={36}
                      color={star <= qualityRating ? SLEEP_THEME.colors.star : SLEEP_THEME.colors.starInactive}
                    />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.qualityLabel}>{QUALITY_LABELS[qualityRating]}</Text>
            </View>

            {/* Factores & Etiquetas (Tags) */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Factores de la noche (Tags)</Text>
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

              {/* Agregar tag personalizado */}
              <View style={styles.customTagRow}>
                <TextInput
                  style={styles.customTagInput}
                  placeholder="Otro factor (ej. té de tilo)..."
                  placeholderTextColor={SLEEP_THEME.colors.textMuted}
                  value={customTagInput}
                  onChangeText={setCustomTagInput}
                  onSubmitEditing={handleAddCustomTag}
                  returnKeyType="done"
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

            {/* Notas Adicionales */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notas u Observaciones (Opcional)</Text>
              <TextInput
                style={styles.notesInput}
                placeholder="¿Te despertaste a mitad de noche? ¿Tuviste sueños vívidos?"
                placeholderTextColor={SLEEP_THEME.colors.textMuted}
                multiline
                numberOfLines={3}
                value={notes}
                onChangeText={setNotes}
              />
            </View>
          </ScrollView>

          {/* Botones de Acción */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSubmitting}>
              <Text style={styles.cancelBtnText}>Descartar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={isSubmitting}>
              <Text style={styles.saveBtnText}>
                {isSubmitting ? 'Guardando...' : 'Guardar Registro'}
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
    maxHeight: '88%',
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
  summaryCard: {
    backgroundColor: SLEEP_THEME.colors.surface,
    borderRadius: SLEEP_THEME.borderRadius.md,
    padding: SLEEP_THEME.spacing.md,
    borderWidth: 1,
    borderColor: SLEEP_THEME.colors.border,
    marginBottom: SLEEP_THEME.spacing.lg,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 10,
  },
  timeBlock: {
    alignItems: 'center',
  },
  timeLabel: {
    color: SLEEP_THEME.colors.textMuted,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  timeValue: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  durationPill: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: SLEEP_THEME.colors.surfaceElevated,
    paddingVertical: 6,
    borderRadius: SLEEP_THEME.borderRadius.full,
  },
  durationText: {
    color: SLEEP_THEME.colors.accent,
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    marginBottom: SLEEP_THEME.spacing.lg,
  },
  sectionTitle: {
    color: SLEEP_THEME.colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: SLEEP_THEME.spacing.sm,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  starTouch: {
    padding: 4,
  },
  qualityLabel: {
    color: SLEEP_THEME.colors.star,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  tagChip: {
    backgroundColor: SLEEP_THEME.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 7,
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
    minHeight: 70,
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
