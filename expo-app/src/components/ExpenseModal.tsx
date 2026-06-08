import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, Alert
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../styles/theme';
import { TransactionCategory } from '../types';
import { containsInjection } from '../utils/formatters';

interface ExpenseForm {
  description: string;
  amount: string;
  category: TransactionCategory;
  date: string;
}

interface ExpenseModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (form: ExpenseForm) => Promise<boolean>;
}

const getTodayString = () => new Date().toISOString().split('T')[0];

const emptyForm = (): ExpenseForm => ({
  description: '',
  amount: '',
  category: 'Operacional',
  date: getTodayString(),
});

export default function ExpenseModal({
  visible,
  onClose,
  onSubmit,
}: ExpenseModalProps) {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<ExpenseForm>(emptyForm());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(emptyForm());
    }
  }, [visible]);

  const handleClose = () => {
    setForm(emptyForm());
    onClose();
  };

  const handleSave = async () => {
    if (!form.description.trim() || !form.amount.trim() || !form.date.trim()) {
      Alert.alert('Erro', 'Por favor, preencha todos os campos obrigatórios (*).');
      return;
    }

    const value = parseFloat(form.amount.replace(',', '.'));
    if (isNaN(value) || value <= 0) {
      Alert.alert('Erro', 'Por favor, informe um valor numérico válido maior que zero.');
      return;
    }

    // Validar formato de data simples AAAA-MM-DD
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(form.date.trim())) {
      Alert.alert('Erro', 'Por favor, informe a data no formato AAAA-MM-DD (ex: 2026-06-03).');
      return;
    }

    if (
      containsInjection(form.description) ||
      containsInjection(form.amount) ||
      containsInjection(form.date)
    ) {
      Alert.alert('Erro', 'Caracteres ou comandos não permitidos detectados nos campos.');
      return;
    }

    setSubmitting(true);
    try {
      const success = await onSubmit({
        ...form,
        amount: value.toString(),
        description: form.description.trim(),
        date: form.date.trim(),
      });
      if (success) {
        handleClose();
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Erro ao registrar despesa.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalBg}
      >
        <View style={[styles.modalContent, { paddingBottom: insets.bottom > 0 ? insets.bottom + 8 : theme.spacing.xxl }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Lançar Despesa de Caixa</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.inputLabel}>Descrição da Despesa *</Text>
            <TextInput
              placeholder="Ex: Compra de Óleo de freio ou Energia Elétrica"
              placeholderTextColor="#475569"
              value={form.description}
              onChangeText={t => setForm(prev => ({ ...prev, description: t }))}
              maxLength={150}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Valor Pago (R$) *</Text>
            <TextInput
              placeholder="Ex: 150.00"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              value={form.amount}
              onChangeText={t => setForm(prev => ({ ...prev, amount: t }))}
              maxLength={10}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Data do Pagamento (AAAA-MM-DD) *</Text>
            <TextInput
              placeholder="Ex: 2026-06-03"
              placeholderTextColor="#475569"
              value={form.date}
              onChangeText={t => setForm(prev => ({ ...prev, date: t }))}
              maxLength={10}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Categoria da Despesa</Text>
            <View style={styles.pickerFakeRow}>
              {(['Compra Peças', 'Salário', 'Operacional', 'Outros'] as TransactionCategory[]).map(cat => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setForm(prev => ({ ...prev, category: cat }))}
                  style={[styles.pickerTag, form.category === cat ? styles.pickerTagActive : null]}
                >
                  <Text style={[styles.pickerTagText, form.category === cat ? styles.pickerTagActiveText : null]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, submitting && { opacity: 0.7 }]} 
              onPress={handleSave}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Salvando...' : 'Registrar Saída'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.roundness.lg,
    borderTopRightRadius: theme.roundness.lg,
    padding: theme.spacing.xxl,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  closeButton: {
    padding: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  modalInput: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.md,
    padding: theme.spacing.lg,
    fontSize: 15,
    color: theme.colors.text,
    marginBottom: theme.spacing.xl,
    minHeight: 56,
  },
  pickerFakeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: theme.spacing.xl,
  },
  pickerTag: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerTagActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pickerTagText: {
    color: theme.colors.textMuted,
    fontWeight: 'bold',
    fontSize: 13,
  },
  pickerTagActiveText: {
    color: theme.colors.white,
  },
  submitButton: {
    backgroundColor: theme.colors.error, // Vermelho para despesa
    borderRadius: theme.roundness.md,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
});
