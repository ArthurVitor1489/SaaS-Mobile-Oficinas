import React, { useState, useEffect } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, Alert
} from 'react-native';
import { X } from 'lucide-react-native';
import { theme } from '../styles/theme';
import { containsInjection } from '../utils/formatters';

interface PartForm {
  name: string;
  code: string;
  supplier: string;
  purchasePrice: string;
  salePrice: string;
  stock: string;
}

interface CatalogPartModalProps {
  visible: boolean;
  editingPartId: string | null;
  initialForm: PartForm | null;
  onClose: () => void;
  onSubmit: (form: PartForm) => Promise<boolean>;
}

const emptyForm: PartForm = {
  name: '',
  code: '',
  supplier: '',
  purchasePrice: '',
  salePrice: '',
  stock: '',
};

export default function CatalogPartModal({
  visible,
  editingPartId,
  initialForm,
  onClose,
  onSubmit,
}: CatalogPartModalProps) {
  const [form, setForm] = useState<PartForm>(emptyForm);
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
    if (!form.name.trim() || !form.code.trim() || !form.salePrice.trim() || !form.stock.trim()) {
      Alert.alert('Erro', 'Por favor, preencha os campos obrigatórios (*).');
      return;
    }

    const salePriceVal = parseFloat(form.salePrice.replace(',', '.'));
    const purchasePriceVal = parseFloat(form.purchasePrice.replace(',', '.')) || 0;
    const stockVal = parseFloat(form.stock) || 0;

    if (isNaN(salePriceVal) || salePriceVal < 0) {
      Alert.alert('Erro', 'Por favor, informe um preço de venda numérico válido.');
      return;
    }

    if (isNaN(purchasePriceVal) || purchasePriceVal < 0) {
      Alert.alert('Erro', 'Por favor, informe um preço de compra válido e maior ou igual a zero.');
      return;
    }

    if (isNaN(stockVal) || stockVal < 0 || !Number.isInteger(stockVal)) {
      Alert.alert('Erro', 'Por favor, informe uma quantidade em estoque inteira e válida.');
      return;
    }

    if (
      containsInjection(form.name) ||
      containsInjection(form.code) ||
      containsInjection(form.supplier) ||
      containsInjection(form.purchasePrice) ||
      containsInjection(form.salePrice) ||
      containsInjection(form.stock)
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
        supplier: form.supplier.trim(),
        purchasePrice: purchasePriceVal.toString(),
        salePrice: salePriceVal.toString(),
        stock: stockVal.toString(),
      });
      if (success) {
        handleClose();
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Erro ao salvar peça no estoque.');
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
              {editingPartId ? 'Editar Peça' : 'Adicionar Peça ao Catálogo'}
            </Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <Text style={styles.inputLabel}>Nome da Peça *</Text>
            <TextInput
              placeholder="Ex: Filtro de Óleo Volvo"
              placeholderTextColor="#475569"
              value={form.name}
              onChangeText={t => setForm(prev => ({ ...prev, name: t }))}
              maxLength={150}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Código / Referência SKU *</Text>
            <TextInput
              placeholder="Ex: 20565617"
              placeholderTextColor="#475569"
              autoCapitalize="characters"
              value={form.code}
              onChangeText={t => setForm(prev => ({ ...prev, code: t }))}
              maxLength={30}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Fabricante / Fornecedor</Text>
            <TextInput
              placeholder="Ex: Volvo Parts"
              placeholderTextColor="#475569"
              value={form.supplier}
              onChangeText={t => setForm(prev => ({ ...prev, supplier: t }))}
              maxLength={100}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Valor de Compra (R$)</Text>
            <TextInput
              placeholder="Ex: 120.00"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              value={form.purchasePrice}
              onChangeText={t => setForm(prev => ({ ...prev, purchasePrice: t }))}
              maxLength={10}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Valor de Venda (R$) *</Text>
            <TextInput
              placeholder="Ex: 210.00"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              value={form.salePrice}
              onChangeText={t => setForm(prev => ({ ...prev, salePrice: t }))}
              maxLength={10}
              style={styles.modalInput}
            />

            <Text style={styles.inputLabel}>Quantidade em Estoque *</Text>
            <TextInput
              placeholder="Ex: 15"
              placeholderTextColor="#475569"
              keyboardType="numeric"
              value={form.stock}
              onChangeText={t => setForm(prev => ({ ...prev, stock: t }))}
              maxLength={8}
              style={styles.modalInput}
            />

            <TouchableOpacity 
              style={[styles.submitButton, submitting && { opacity: 0.7 }]} 
              onPress={handleSave}
              disabled={submitting}
            >
              <Text style={styles.submitButtonText}>
                {submitting ? 'Salvando...' : editingPartId ? 'Salvar Alterações' : 'Salvar no Estoque'}
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
