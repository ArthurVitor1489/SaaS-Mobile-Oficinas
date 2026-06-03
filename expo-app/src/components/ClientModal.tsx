import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, Alert
} from 'react-native';
import { X } from 'lucide-react-native';
import { theme } from '../styles/theme';
import { validateEmail, validateCpfCnpj, validatePhone, containsInjection } from '../utils/formatters';

interface ClientForm {
  name: string;
  cpfCnpj: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  notes: string;
}

interface ClientModalProps {
  visible: boolean;
  editingClientId: string | null;
  initialForm: ClientForm | null;
  onClose: () => void;
  onSubmit: (form: ClientForm) => Promise<boolean>;
}

const emptyForm: ClientForm = {
  name: '',
  cpfCnpj: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  notes: '',
};

export default function ClientModal({
  visible,
  editingClientId,
  initialForm,
  onClose,
  onSubmit,
}: ClientModalProps) {
  const [form, setForm] = useState<ClientForm>(emptyForm);
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
    if (!form.name.trim() || !form.phone.trim()) {
      Alert.alert('Erro', 'Por favor, preencha o nome e telefone do cliente.');
      return;
    }

    if (form.email.trim() && !validateEmail(form.email.trim())) {
      Alert.alert('Erro', 'Por favor, informe um endereço de e-mail válido.');
      return;
    }

    if (form.cpfCnpj.trim() && !validateCpfCnpj(form.cpfCnpj.trim())) {
      Alert.alert('Erro', 'Por favor, informe um CPF ou CNPJ válido.');
      return;
    }

    if (!validatePhone(form.phone.trim())) {
      Alert.alert('Erro', 'Por favor, informe um número de telefone válido com DDD (mínimo 10 dígitos).');
      return;
    }

    if (form.whatsapp.trim() && !validatePhone(form.whatsapp.trim())) {
      Alert.alert('Erro', 'Por favor, informe um número de WhatsApp válido com DDD (mínimo 10 dígitos).');
      return;
    }

    if (
      containsInjection(form.name) ||
      containsInjection(form.cpfCnpj) ||
      containsInjection(form.phone) ||
      containsInjection(form.whatsapp) ||
      containsInjection(form.email) ||
      containsInjection(form.address) ||
      containsInjection(form.notes)
    ) {
      Alert.alert('Erro', 'Caracteres ou comandos não permitidos detectados nos campos.');
      return;
    }

    setSubmitting(true);
    try {
      const whatsappVal = form.whatsapp.trim() || form.phone.trim();
      const success = await onSubmit({
        ...form,
        whatsapp: whatsappVal,
      });
      if (success) {
        handleClose();
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Erro ao salvar cliente.');
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
              {editingClientId ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.inputLabel}>Nome Completo / Razão Social *</Text>
            <TextInput
              placeholder="Ex: João da Silva"
              placeholderTextColor="#475569"
              value={form.name}
              onChangeText={t => setForm(prev => ({ ...prev, name: t }))}
              maxLength={100}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>CPF / CNPJ</Text>
            <TextInput
              placeholder="Ex: 123.456.789-00"
              placeholderTextColor="#475569"
              value={form.cpfCnpj}
              onChangeText={t => setForm(prev => ({ ...prev, cpfCnpj: t }))}
              maxLength={20}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Telefone *</Text>
            <TextInput
              placeholder="Ex: (11) 4500-0000"
              placeholderTextColor="#475569"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={t => setForm(prev => ({ ...prev, phone: t }))}
              maxLength={20}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>WhatsApp / Celular</Text>
            <TextInput
              placeholder="Ex: (11) 99999-9999"
              placeholderTextColor="#475569"
              keyboardType="phone-pad"
              value={form.whatsapp}
              onChangeText={t => setForm(prev => ({ ...prev, whatsapp: t }))}
              maxLength={20}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>E-mail</Text>
            <TextInput
              placeholder="Ex: joao@email.com"
              placeholderTextColor="#475569"
              keyboardType="email-address"
              autoCapitalize="none"
              value={form.email}
              onChangeText={t => setForm(prev => ({ ...prev, email: t }))}
              maxLength={100}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Endereço Completo</Text>
            <TextInput
              placeholder="Ex: Av. Paulista, 1000 - Bela Vista"
              placeholderTextColor="#475569"
              value={form.address}
              onChangeText={t => setForm(prev => ({ ...prev, address: t }))}
              maxLength={255}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Observações Adicionais</Text>
            <TextInput
              placeholder="Algum detalhe particular deste cliente..."
              placeholderTextColor="#475569"
              value={form.notes}
              onChangeText={t => setForm(prev => ({ ...prev, notes: t }))}
              maxLength={500}
              style={styles.modalInput}
            />

            <TouchableOpacity 
              style={[styles.submitButton, submitting && { opacity: 0.7 }]} 
              onPress={handleSave}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Salvando...' : editingClientId ? 'Salvar Alterações' : 'Salvar Cadastro'}
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
