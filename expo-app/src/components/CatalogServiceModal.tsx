import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, Alert
} from 'react-native';
import { X } from 'lucide-react-native';
import { theme } from '../styles/theme';
import { containsInjection } from '../utils/formatters';

interface ServiceForm {
  name: string;
  code: string;
  description: string;
  price: string;
}

interface CatalogServiceModalProps {
  visible: boolean;
  editingServiceId: string | null;
  initialForm: ServiceForm | null;
  onClose: () => void;
  onSubmit: (form: ServiceForm) => Promise<boolean>;
}

const emptyForm: ServiceForm = {
  name: '',
  code: '',
  description: '',
  price: '',
};

export default function CatalogServiceModal({
  visible,
  editingServiceId,
  initialForm,
  onClose,
  onSubmit,
}: CatalogServiceModalProps) {
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(initialForm || emptyForm);
    }
  }, [visible, initialForm]);

  const handleClose = () => {
    setForm(emptyForm);
    onClose();
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.price.trim()) {
      Alert.alert('Erro', 'Por favor, preencha os campos obrigatórios (*).');
      return;
    }

    const priceVal = parseFloat(form.price.replace(',', '.'));
    if (isNaN(priceVal) || priceVal < 0) {
      Alert.alert('Erro', 'Por favor, informe um valor numérico válido para o preço.');
      return;
    }

    if (
      containsInjection(form.name) ||
      containsInjection(form.code) ||
      containsInjection(form.description) ||
      containsInjection(form.price)
    ) {
      Alert.alert('Erro', 'Caracteres ou comandos não permitidos detectados nos campos.');
      return;
    }

    setSubmitting(true);
    try {
      const success = await onSubmit({
        ...form,
        name: form.name.trim(),
        code: form.code.toUpperCase().trim(),
        price: priceVal.toString(),
        description: form.description.trim(),
      });
      if (success) {
        handleClose();
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Erro ao salvar serviço.');
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
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {editingServiceId ? 'Editar Mão de Obra' : 'Adicionar Mão de Obra'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.inputLabel}>Nome do Serviço *</Text>
            <TextInput
              placeholder="Ex: Regulagem de Freio"
              placeholderTextColor="#475569"
              value={form.name}
              onChangeText={t => setForm(prev => ({ ...prev, name: t }))}
              maxLength={150}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Código de Referência</Text>
            <TextInput
              placeholder="Ex: SRV-FREIO"
              placeholderTextColor="#475569"
              autoCapitalize="characters"
              value={form.code}
              onChangeText={t => setForm(prev => ({ ...prev, code: t }))}
              maxLength={30}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Valor Cobrado (R$) *</Text>
            <TextInput
              placeholder="Ex: 80.00"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              value={form.price}
              onChangeText={t => setForm(prev => ({ ...prev, price: t }))}
              maxLength={10}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Descrição</Text>
            <TextInput
              placeholder="Explicativo do serviço..."
              placeholderTextColor="#475569"
              value={form.description}
              onChangeText={t => setForm(prev => ({ ...prev, description: t }))}
              maxLength={500}
              style={styles.modalInput}
            />

            <TouchableOpacity 
              style={[styles.submitButton, submitting && { opacity: 0.7 }]} 
              onPress={handleSave}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Salvando...' : editingServiceId ? 'Salvar Alterações' : 'Salvar Serviço'}
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
  submitButton: {
    backgroundColor: theme.colors.primary,
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
