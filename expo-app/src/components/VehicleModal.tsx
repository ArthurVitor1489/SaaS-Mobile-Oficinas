import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, Alert
} from 'react-native';
import { X } from 'lucide-react-native';
import { theme } from '../styles/theme';
import { validatePlate, containsInjection } from '../utils/formatters';

interface VehicleForm {
  plate: string;
  brand: string;
  model: string;
  year: string;
  chassis: string;
  odometer: string;
}

interface VehicleModalProps {
  visible: boolean;
  editingVehicleId: string | null;
  initialForm: VehicleForm | null;
  clientName: string;
  onClose: () => void;
  onSubmit: (form: VehicleForm) => Promise<boolean>;
}

const emptyForm: VehicleForm = {
  plate: '',
  brand: '',
  model: '',
  year: '',
  chassis: '',
  odometer: '',
};

export default function VehicleModal({
  visible,
  editingVehicleId,
  initialForm,
  clientName,
  onClose,
  onSubmit,
}: VehicleModalProps) {
  const [form, setForm] = useState<VehicleForm>(emptyForm);
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
    if (!form.brand.trim() || !form.model.trim() || !form.plate.trim()) {
      Alert.alert('Erro', 'Por favor, preencha placa, marca e modelo.');
      return;
    }

    if (!validatePlate(form.plate.trim())) {
      Alert.alert('Erro', 'Placa com formato inválido. Use AAA-9999 ou ABC1D23.');
      return;
    }

    const yearNum = parseInt(form.year.trim(), 10);
    if (form.year.trim() && (isNaN(yearNum) || yearNum < 1900 || yearNum > new Date().getFullYear() + 2)) {
      Alert.alert('Erro', 'Por favor, informe um ano válido para o veículo.');
      return;
    }

    const odometerNum = parseInt(form.odometer.trim(), 10);
    if (form.odometer.trim() && (isNaN(odometerNum) || odometerNum < 0)) {
      Alert.alert('Erro', 'A quilometragem do veículo deve ser um número maior ou igual a zero.');
      return;
    }

    if (
      containsInjection(form.brand) ||
      containsInjection(form.model) ||
      containsInjection(form.plate) ||
      containsInjection(form.year) ||
      containsInjection(form.chassis) ||
      containsInjection(form.odometer)
    ) {
      Alert.alert('Erro', 'Caracteres ou comandos não permitidos detectados nos campos.');
      return;
    }

    setSubmitting(true);
    try {
      const yearVal = form.year.trim() || new Date().getFullYear().toString();
      const odometerVal = form.odometer.trim() || '0';
      const success = await onSubmit({
        ...form,
        plate: form.plate.toUpperCase().replace('-', '').trim(),
        year: yearVal,
        odometer: odometerVal,
      });
      if (success) {
        handleClose();
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Erro ao salvar veículo.');
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
            <View>
              <Text style={styles.modalTitle}>
                {editingVehicleId ? 'Editar Veículo' : 'Novo Veículo'}
              </Text>
              <Text style={styles.modalSubtitle}>Cliente: {clientName}</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.inputLabel}>Marca *</Text>
            <TextInput
              placeholder="Ex: Volvo"
              placeholderTextColor="#475569"
              value={form.brand}
              onChangeText={t => setForm(prev => ({ ...prev, brand: t }))}
              maxLength={50}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Modelo *</Text>
            <TextInput
              placeholder="Ex: FH 540"
              placeholderTextColor="#475569"
              value={form.model}
              onChangeText={t => setForm(prev => ({ ...prev, model: t }))}
              maxLength={100}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Placa *</Text>
            <TextInput
              placeholder="Ex: AAA9A99"
              placeholderTextColor="#475569"
              autoCapitalize="characters"
              value={form.plate}
              onChangeText={t => setForm(prev => ({ ...prev, plate: t }))}
              maxLength={10}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Ano</Text>
            <TextInput
              placeholder={`Ex: ${new Date().getFullYear()}`}
              placeholderTextColor="#475569"
              keyboardType="number-pad"
              value={form.year}
              onChangeText={t => setForm(prev => ({ ...prev, year: t }))}
              maxLength={4}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Código do Chassi (Opcional)</Text>
            <TextInput
              placeholder="Número do Chassi"
              placeholderTextColor="#475569"
              autoCapitalize="characters"
              value={form.chassis}
              onChangeText={t => setForm(prev => ({ ...prev, chassis: t }))}
              maxLength={30}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Quilometragem Atual (Odomêtro)</Text>
            <TextInput
              placeholder="Ex: 125000"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              value={form.odometer}
              onChangeText={t => setForm(prev => ({ ...prev, odometer: t }))}
              maxLength={15}
              style={styles.modalInput}
            />

            <TouchableOpacity 
              style={[styles.submitButton, submitting && { opacity: 0.7 }]} 
              onPress={handleSave}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Salvando...' : editingVehicleId ? 'Salvar Alterações' : 'Salvar Veículo'}
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
  modalSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 2,
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
