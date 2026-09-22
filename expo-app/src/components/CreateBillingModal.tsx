import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, Alert, Switch
} from 'react-native';
import { 
  X, Search, Check, Calculator, Calendar, CreditCard, DollarSign, 
  FileText, ChevronRight, Plus, Trash2, Clock, RefreshCw 
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDatabase } from '../context/DatabaseContext';
import { theme } from '../styles/theme';
import { PaymentMethod, Installment, BillingStatus } from '../types';
import { formatCurrency } from '../utils/formatters';

interface CreateBillingModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (billingId?: string) => void;
  preselectedOsId?: string;
}

export default function CreateBillingModal({
  visible,
  onClose,
  onSuccess,
  preselectedOsId,
}: CreateBillingModalProps) {
  const insets = useSafeAreaInsets();
  const { workOrders, clients, vehicles, billings, addBilling, addTransaction } = useDatabase();

  const [billingMode, setBillingMode] = useState<'os' | 'custom'>('os');
  const [selectedOsId, setSelectedOsId] = useState<string>('');
  const [osSearch, setOsSearch] = useState('');
  
  // Custom billing fields
  const [customClientName, setCustomClientName] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [customAmountStr, setCustomAmountStr] = useState('');

  // Values
  const [discountStr, setDiscountStr] = useState('');
  const [surchargeStr, setSurchargeStr] = useState('');

  // Payment conditions
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX');
  const [installmentsCount, setInstallmentsCount] = useState<number>(1);
  const [firstDueDate, setFirstDueDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isPaidNow, setIsPaidNow] = useState<boolean>(true);
  const [loading, setLoading] = useState(false);

  // Custom installments state (for custom boleto due dates and values)
  const [customInstallments, setCustomInstallments] = useState<Installment[]>([]);
  const [boletoPreset, setBoletoPreset] = useState<string>('30d');

  // Mappings
  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const vehicleMap = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);
  const billedOsIds = useMemo(() => new Set(billings.map(b => b.osId)), [billings]);

  // Unbilled work orders available for billing
  const availableOrders = useMemo(() => {
    return workOrders.filter(os => {
      if (preselectedOsId && os.id === preselectedOsId) return true;
      return !billedOsIds.has(os.id);
    });
  }, [workOrders, billedOsIds, preselectedOsId]);

  // Filtered orders for selector
  const filteredOrders = useMemo(() => {
    if (!osSearch.trim()) return availableOrders;
    const term = osSearch.toLowerCase();
    return availableOrders.filter(os => {
      const client = clientMap.get(os.clientId)?.name?.toLowerCase() || '';
      const plate = vehicleMap.get(os.vehicleId)?.plate?.toLowerCase() || '';
      const osNum = os.osNumber.toLowerCase();
      return osNum.includes(term) || client.includes(term) || plate.includes(term);
    });
  }, [availableOrders, osSearch, clientMap, vehicleMap]);

  // Selected OS entity
  const currentSelectedOs = useMemo(() => {
    return workOrders.find(o => o.id === selectedOsId) || null;
  }, [workOrders, selectedOsId]);

  // Base raw amount
  const baseAmount = useMemo(() => {
    if (billingMode === 'os') {
      return currentSelectedOs ? currentSelectedOs.grandTotal : 0;
    }
    const parsed = parseFloat(customAmountStr.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
  }, [billingMode, currentSelectedOs, customAmountStr]);

  // Final calculated total
  const finalAmount = useMemo(() => {
    const discount = parseFloat(discountStr.replace(',', '.')) || 0;
    const surcharge = parseFloat(surchargeStr.replace(',', '.')) || 0;
    return Math.max(0, baseAmount - discount + surcharge);
  }, [baseAmount, discountStr, surchargeStr]);

  // Helper to add N days to a date string YYYY-MM-DD
  const addDaysStr = (baseDateStr: string, days: number): string => {
    try {
      const parts = (baseDateStr || '').split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        const date = new Date(y, m - 1, d);
        date.setDate(date.getDate() + days);
        return date.toISOString().split('T')[0];
      }
    } catch (e) {}
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  };

  const applyBoletoPreset = (preset: string, total: number = finalAmount) => {
    setBoletoPreset(preset);
    const todayStr = new Date().toISOString().split('T')[0];
    let dates: string[] = [];
    let firstPaid = false;

    switch (preset) {
      case '30d':
        dates = [addDaysStr(todayStr, 30)];
        break;
      case '30_60d':
        dates = [addDaysStr(todayStr, 30), addDaysStr(todayStr, 60)];
        break;
      case '30_60_90d':
        dates = [addDaysStr(todayStr, 30), addDaysStr(todayStr, 60), addDaysStr(todayStr, 90)];
        break;
      case '15_30_45d':
        dates = [addDaysStr(todayStr, 15), addDaysStr(todayStr, 30), addDaysStr(todayStr, 45)];
        break;
      case 'entrada_30_60d':
        dates = [todayStr, addDaysStr(todayStr, 30), addDaysStr(todayStr, 60)];
        firstPaid = true;
        break;
      default:
        dates = customInstallments.length > 0
          ? customInstallments.map(i => i.dueDate)
          : [addDaysStr(todayStr, 30)];
        break;
    }

    const count = dates.length;
    const baseVal = Math.floor((total / count) * 100) / 100;
    const diff = Math.round((total - baseVal * count) * 100) / 100;

    const list: Installment[] = dates.map((due, idx) => ({
      number: idx + 1,
      amount: idx === count - 1 ? (baseVal + diff) : baseVal,
      dueDate: due,
      status: (idx === 0 && firstPaid) ? 'Pago' : 'Pendente',
      paidAt: (idx === 0 && firstPaid) ? new Date().toISOString() : undefined,
    }));

    setInstallmentsCount(count);
    if (firstPaid) setIsPaidNow(true);
    setCustomInstallments(list);
  };

  // Set initial selected OS and reset fields on open
  useEffect(() => {
    if (visible) {
      if (preselectedOsId) {
        setSelectedOsId(preselectedOsId);
        setBillingMode('os');
      } else if (availableOrders.length > 0) {
        setSelectedOsId(availableOrders[0].id);
        setBillingMode('os');
      } else {
        setBillingMode('custom');
      }
      setPaymentMethod('PIX');
      setInstallmentsCount(1);
      setIsPaidNow(true);
      setDiscountStr('');
      setSurchargeStr('');
      setFirstDueDate(new Date().toISOString().split('T')[0]);
      setCustomInstallments([]);
      setBoletoPreset('30d');
    }
  }, [visible, preselectedOsId, availableOrders]);

  // Adjust isPaidNow and installments based on payment method
  useEffect(() => {
    if (paymentMethod === 'PIX' || paymentMethod === 'Dinheiro' || paymentMethod === 'Débito') {
      setIsPaidNow(true);
      setInstallmentsCount(1);
    } else if (paymentMethod === 'Crédito') {
      setIsPaidNow(false);
    } else if (paymentMethod === 'Boleto') {
      setIsPaidNow(false);
      applyBoletoPreset(boletoPreset || '30d', finalAmount);
    }
  }, [paymentMethod]);

  // When finalAmount changes, adjust custom boleto amounts proportionally
  useEffect(() => {
    if (paymentMethod === 'Boleto' && customInstallments.length > 0 && finalAmount > 0) {
      const count = customInstallments.length;
      const baseVal = Math.floor((finalAmount / count) * 100) / 100;
      const diff = Math.round((finalAmount - baseVal * count) * 100) / 100;
      setCustomInstallments(prev => prev.map((inst, idx) => ({
        ...inst,
        amount: idx === count - 1 ? (baseVal + diff) : baseVal,
      })));
    }
  }, [finalAmount]);

  const handleUpdateInstallmentDueDate = (index: number, newDate: string) => {
    setCustomInstallments(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], dueDate: newDate };
      }
      return copy;
    });
    setBoletoPreset('custom');
  };

  const handleUpdateInstallmentAmount = (index: number, newAmountText: string) => {
    const val = parseFloat(newAmountText.replace(',', '.')) || 0;
    setCustomInstallments(prev => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index], amount: val };
      }
      return copy;
    });
    setBoletoPreset('custom');
  };

  const handleAddBoleto = () => {
    const lastDate = customInstallments[customInstallments.length - 1]?.dueDate || new Date().toISOString().split('T')[0];
    const nextDate = addDaysStr(lastDate, 30);
    const newCount = customInstallments.length + 1;
    const baseVal = Math.floor((finalAmount / newCount) * 100) / 100;
    const diff = Math.round((finalAmount - baseVal * newCount) * 100) / 100;

    const newList: Installment[] = [
      ...customInstallments.map((inst, idx) => ({
        ...inst,
        number: idx + 1,
        amount: baseVal,
      })),
      {
        number: newCount,
        amount: baseVal + diff,
        dueDate: nextDate,
        status: 'Pendente',
      },
    ];
    setCustomInstallments(newList);
    setInstallmentsCount(newCount);
    setBoletoPreset('custom');
  };

  const handleRemoveBoleto = (index: number) => {
    if (customInstallments.length <= 1) return;
    const filtered = customInstallments.filter((_, idx) => idx !== index);
    const newCount = filtered.length;
    const baseVal = Math.floor((finalAmount / newCount) * 100) / 100;
    const diff = Math.round((finalAmount - baseVal * newCount) * 100) / 100;

    const reindexed: Installment[] = filtered.map((inst, idx) => ({
      ...inst,
      number: idx + 1,
      amount: idx === newCount - 1 ? (baseVal + diff) : baseVal,
    }));
    setCustomInstallments(reindexed);
    setInstallmentsCount(newCount);
    setBoletoPreset('custom');
  };

  const balanceInstallmentAmounts = () => {
    if (customInstallments.length === 0 || finalAmount <= 0) return;
    const count = customInstallments.length;
    const baseVal = Math.floor((finalAmount / count) * 100) / 100;
    const diff = Math.round((finalAmount - baseVal * count) * 100) / 100;

    setCustomInstallments(prev => prev.map((inst, idx) => ({
      ...inst,
      amount: idx === count - 1 ? (baseVal + diff) : baseVal,
    })));
  };

  const customInstallmentsSum = useMemo(() => {
    return customInstallments.reduce((acc, i) => acc + (Number(i.amount) || 0), 0);
  }, [customInstallments]);

  const customSumDiff = Math.round((finalAmount - customInstallmentsSum) * 100) / 100;

  // Calculated standard installments breakdown preview (for Credit Card etc)
  const generatedInstallments = useMemo((): Installment[] => {
    if (finalAmount <= 0) return [];
    const count = Math.max(1, installmentsCount);
    const baseVal = Math.floor((finalAmount / count) * 100) / 100;
    const diff = Math.round((finalAmount - (baseVal * count)) * 100) / 100;

    const list: Installment[] = [];
    const [year, month, day] = firstDueDate.split('-').map(Number);
    const startDate = new Date(year, (month || 1) - 1, day || 1);

    for (let i = 1; i <= count; i++) {
      const d = new Date(startDate);
      d.setMonth(d.getMonth() + (i - 1));
      const instAmount = i === count ? (baseVal + diff) : baseVal;
      
      const isFirstPaid = i === 1 && isPaidNow;
      list.push({
        number: i,
        amount: instAmount,
        dueDate: d.toISOString().split('T')[0],
        status: isFirstPaid ? 'Pago' : 'Pendente',
        paidAt: isFirstPaid ? new Date().toISOString() : undefined,
      });
    }
    return list;
  }, [finalAmount, installmentsCount, firstDueDate, isPaidNow]);

  const handleSave = async () => {
    if (billingMode === 'os' && !selectedOsId) {
      Alert.alert('Atenção', 'Selecione a ordem de serviço a ser faturada.');
      return;
    }
    if (billingMode === 'custom' && (!customClientName.trim() || finalAmount <= 0)) {
      Alert.alert('Atenção', 'Informe o nome do cliente e o valor da cobrança.');
      return;
    }
    if (finalAmount <= 0) {
      Alert.alert('Atenção', 'O valor final da cobrança deve ser maior que zero.');
      return;
    }

    const effectiveInstallments = (paymentMethod === 'Boleto' && customInstallments.length > 0)
      ? customInstallments
      : generatedInstallments;

    if (effectiveInstallments.length === 0) {
      Alert.alert('Atenção', 'Nenhuma parcela foi configurada para esta cobrança.');
      return;
    }

    if (paymentMethod === 'Boleto') {
      const hasInvalidDate = effectiveInstallments.some(i => !/^\d{4}-\d{2}-\d{2}$/.test(i.dueDate));
      if (hasInvalidDate) {
        Alert.alert('Data Inválida', 'Preencha as datas dos boletos no formato AAAA-MM-DD (ex: 2026-10-15).');
        return;
      }
      if (Math.abs(customSumDiff) > 0.05) {
        Alert.alert(
          'Diferença nos Valores',
          `A soma dos boletos (${formatCurrency(customInstallmentsSum)}) difere do total da cobrança (${formatCurrency(finalAmount)}).\n\nClique em "Equilibrar Valores" para ajustar antes de gerar.`
        );
        return;
      }
    }

    setLoading(true);

    try {
      const allPaid = effectiveInstallments.every(i => i.status === 'Pago');
      const anyPaid = effectiveInstallments.some(i => i.status === 'Pago');
      const billingStatus: BillingStatus = allPaid ? 'Pago' : anyPaid ? 'Parcialmente pago' : 'Pendente';

      const billingPayload = {
        osId: billingMode === 'os' ? selectedOsId : 'AVULSO-' + Date.now(),
        amount: finalAmount,
        paymentMethod,
        status: billingStatus,
        installments: effectiveInstallments,
        dueDate: effectiveInstallments[0]?.dueDate || firstDueDate,
        customClientName: billingMode === 'custom' ? customClientName.trim() : undefined,
        customDescription: billingMode === 'custom' ? customDescription.trim() : undefined,
      };

      const newBilling = await addBilling(billingPayload);

      // If marked as paid now or first installment paid, register money entry in transactions flow
      if (isPaidNow || (effectiveInstallments[0] && effectiveInstallments[0].status === 'Pago')) {
        const paidAmount = effectiveInstallments.length === 1 ? finalAmount : effectiveInstallments[0].amount;
        const osLabel = currentSelectedOs ? currentSelectedOs.osNumber : 'Balcão';
        await addTransaction({
          type: 'Entrada',
          category: 'Pagamento OS',
          amount: paidAmount,
          date: new Date().toISOString().split('T')[0],
          description: `Recebimento ${osLabel} (${paymentMethod})`,
        });
      }

      setLoading(false);
      Alert.alert('Sucesso', 'Cobrança gerada com sucesso!', [
        {
          text: 'OK',
          onPress: () => {
            onClose();
            onSuccess(newBilling?.id);
          }
        }
      ]);
    } catch (err) {
      console.error(err);
      setLoading(false);
      Alert.alert('Erro', 'Não foi possível gerar a cobrança.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalOverlay}
      >
        <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* HEADER */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>Nova Cobrança</Text>
              <Text style={styles.modalSubtitle}>Faturamento de pedido ou venda avulsa</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.modalBody}>
            {/* TOGGLE MODE: OS ou AVULSA */}
            <View style={styles.modeToggleContainer}>
              <TouchableOpacity
                style={[styles.modeToggleBtn, billingMode === 'os' && styles.modeToggleBtnActive]}
                onPress={() => setBillingMode('os')}
              >
                <FileText size={16} color={billingMode === 'os' ? '#fff' : '#64748b'} style={{ marginRight: 6 }} />
                <Text style={[styles.modeToggleText, billingMode === 'os' && styles.modeToggleTextActive]}>
                  Ordem de Serviço (OS)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeToggleBtn, billingMode === 'custom' && styles.modeToggleBtnActive]}
                onPress={() => setBillingMode('custom')}
              >
                <DollarSign size={16} color={billingMode === 'custom' ? '#fff' : '#64748b'} style={{ marginRight: 6 }} />
                <Text style={[styles.modeToggleText, billingMode === 'custom' && styles.modeToggleTextActive]}>
                  Venda Avulsa / Balcão
                </Text>
              </TouchableOpacity>
            </View>

            {/* SELEÇÃO DA ORDEM DE SERVIÇO */}
            {billingMode === 'os' ? (
              <View style={styles.sectionCard}>
                <Text style={styles.sectionLabel}>SELECIONE A ORDEM DE SERVIÇO</Text>
                
                {availableOrders.length === 0 ? (
                  <View style={styles.emptyWarning}>
                    <Text style={styles.emptyWarningText}>
                      Não há ordens de serviço pendentes de faturamento.
                    </Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.searchBar}>
                      <Search size={14} color="#64748b" style={{ marginRight: 8 }} />
                      <TextInput
                        value={osSearch}
                        onChangeText={setOsSearch}
                        placeholder="Buscar por OS, cliente ou placa..."
                        placeholderTextColor="#64748b"
                        style={styles.searchInput}
                      />
                    </View>

                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.osScroll}>
                      {filteredOrders.map(os => {
                        const isSelected = os.id === selectedOsId;
                        const client = clientMap.get(os.clientId);
                        const vehicle = vehicleMap.get(os.vehicleId);

                        return (
                          <TouchableOpacity
                            key={os.id}
                            style={[styles.osCardSelect, isSelected && styles.osCardSelectActive]}
                            onPress={() => setSelectedOsId(os.id)}
                          >
                            <View style={styles.osCardSelectHeader}>
                              <Text style={[styles.osCardSelectNum, isSelected && { color: '#3b66ff' }]}>
                                {os.osNumber}
                              </Text>
                              {isSelected && <Check size={14} color="#3b66ff" />}
                            </View>
                            <Text style={styles.osCardSelectClient} numberOfLines={1}>
                              {client ? client.name : 'Cliente'}
                            </Text>
                            <Text style={styles.osCardSelectVehicle} numberOfLines={1}>
                              {vehicle ? `${vehicle.model} • ${vehicle.plate}` : '-'}
                            </Text>
                            <Text style={styles.osCardSelectTotal}>
                              {formatCurrency(os.grandTotal)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </>
                )}
              </View>
            ) : (
              /* DADOS COBRANÇA AVULSA */
              <View style={styles.sectionCard}>
                <Text style={styles.sectionLabel}>DADOS DO CLIENTE E VENDA</Text>
                
                <Text style={styles.fieldLabel}>Nome do Cliente *</Text>
                <TextInput
                  value={customClientName}
                  onChangeText={setCustomClientName}
                  placeholder="Ex: João Silva ou Cliente Balcão"
                  placeholderTextColor="#64748b"
                  style={styles.textInput}
                />

                <Text style={styles.fieldLabel}>Descrição / Itens</Text>
                <TextInput
                  value={customDescription}
                  onChangeText={setCustomDescription}
                  placeholder="Ex: 4L Óleo Motul + 1 Filtro de óleo"
                  placeholderTextColor="#64748b"
                  style={styles.textInput}
                />

                <Text style={styles.fieldLabel}>Valor Bruto (R$) *</Text>
                <TextInput
                  value={customAmountStr}
                  onChangeText={setCustomAmountStr}
                  placeholder="0,00"
                  placeholderTextColor="#64748b"
                  keyboardType="numeric"
                  style={styles.textInput}
                />
              </View>
            )}

            {/* VALORES E AJUSTES */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>VALORES E AJUSTES</Text>
              
              <View style={styles.amountSummaryRow}>
                <Text style={styles.summaryLabel}>Valor Base:</Text>
                <Text style={styles.summaryValue}>{formatCurrency(baseAmount)}</Text>
              </View>

              <View style={styles.adjustRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>Desconto (R$)</Text>
                  <TextInput
                    value={discountStr}
                    onChangeText={setDiscountStr}
                    placeholder="0,00"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>Acréscimo (R$)</Text>
                  <TextInput
                    value={surchargeStr}
                    onChangeText={setSurchargeStr}
                    placeholder="0,00"
                    placeholderTextColor="#64748b"
                    keyboardType="numeric"
                    style={styles.textInput}
                  />
                </View>
              </View>

              <View style={styles.totalFinalBox}>
                <Text style={styles.totalFinalLabel}>VALOR TOTAL A FATURAR:</Text>
                <Text style={styles.totalFinalVal}>{formatCurrency(finalAmount)}</Text>
              </View>
            </View>

            {/* FORMA DE PAGAMENTO */}
            <View style={styles.sectionCard}>
              <Text style={styles.sectionLabel}>FORMA DE PAGAMENTO</Text>
              
              <View style={styles.paymentMethodsGrid}>
                {(['PIX', 'Dinheiro', 'Débito', 'Crédito', 'Boleto'] as PaymentMethod[]).map(pm => {
                  const isSelected = paymentMethod === pm;
                  return (
                    <TouchableOpacity
                      key={pm}
                      style={[styles.pmBtn, isSelected && styles.pmBtnActive]}
                      onPress={() => setPaymentMethod(pm)}
                    >
                      <Text style={[styles.pmBtnText, isSelected && styles.pmBtnTextActive]}>
                        {pm}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* OPÇÕES DE BOLETO COM DATAS PERSONALIZADAS */}
              {paymentMethod === 'Boleto' && (
                <View style={styles.boletoSection}>
                  <View style={styles.boletoSectionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Calendar size={16} color="#3b66ff" />
                      <Text style={styles.boletoSectionTitle}>Vencimentos dos Boletos</Text>
                    </View>
                    <Text style={styles.boletoSectionSubtitle}>Escolha um prazo comum ou personalize cada data abaixo</Text>
                  </View>

                  {/* PRESETS DE PRAZO */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsScroll}>
                    {[
                      { key: '30d', label: '30 dias (1x)' },
                      { key: '30_60d', label: '30 / 60d (2x)' },
                      { key: '30_60_90d', label: '30 / 60 / 90d (3x)' },
                      { key: '15_30_45d', label: '15 / 30 / 45d (3x)' },
                      { key: 'entrada_30_60d', label: 'Entrada + 30/60d' },
                    ].map(p => (
                      <TouchableOpacity
                        key={p.key}
                        style={[styles.presetChip, boletoPreset === p.key && styles.presetChipActive]}
                        onPress={() => applyBoletoPreset(p.key)}
                      >
                        <Text style={[styles.presetChipText, boletoPreset === p.key && styles.presetChipTextActive]}>
                          {p.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {/* LISTA DE BOLETOS PERSONALIZADOS */}
                  <View style={styles.boletosList}>
                    {customInstallments.map((inst, index) => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      return (
                        <View key={inst.number} style={styles.boletoCard}>
                          {/* Top row: Boleto index and remove button */}
                          <View style={styles.boletoCardHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={styles.boletoIndexBadge}>
                                <Text style={styles.boletoIndexBadgeText}>{inst.number}º</Text>
                              </View>
                              <Text style={styles.boletoCardTitle}>
                                Boleto {inst.number} de {customInstallments.length}
                              </Text>
                              {inst.status === 'Pago' && (
                                <View style={styles.instPaidBadge}>
                                  <Text style={styles.instPaidBadgeText}>PAGO (ENTRADA)</Text>
                                </View>
                              )}
                            </View>

                            {customInstallments.length > 1 && (
                              <TouchableOpacity
                                onPress={() => handleRemoveBoleto(index)}
                                style={styles.removeBoletoBtn}
                              >
                                <Trash2 size={16} color="#ef4444" />
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* Data de Vencimento com TextInput e Chips */}
                          <View style={{ marginTop: 8 }}>
                            <Text style={styles.fieldSubLabel}>Data de Vencimento (AAAA-MM-DD):</Text>
                            <TextInput
                              value={inst.dueDate}
                              onChangeText={(text) => handleUpdateInstallmentDueDate(index, text)}
                              placeholder="2026-10-15"
                              placeholderTextColor="#64748b"
                              style={styles.boletoDateInput}
                            />

                            {/* Chips de Atalho de Data para este boleto */}
                            <View style={styles.dateChipsRow}>
                              <TouchableOpacity
                                style={styles.dateQuickChip}
                                onPress={() => handleUpdateInstallmentDueDate(index, todayStr)}
                              >
                                <Text style={styles.dateQuickChipText}>Hoje</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.dateQuickChip}
                                onPress={() => handleUpdateInstallmentDueDate(index, addDaysStr(todayStr, 15))}
                              >
                                <Text style={styles.dateQuickChipText}>+15d</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.dateQuickChip}
                                onPress={() => handleUpdateInstallmentDueDate(index, addDaysStr(todayStr, 30))}
                              >
                                <Text style={styles.dateQuickChipText}>+30d</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.dateQuickChip}
                                onPress={() => handleUpdateInstallmentDueDate(index, addDaysStr(todayStr, 45))}
                              >
                                <Text style={styles.dateQuickChipText}>+45d</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.dateQuickChip}
                                onPress={() => handleUpdateInstallmentDueDate(index, addDaysStr(todayStr, 60))}
                              >
                                <Text style={styles.dateQuickChipText}>+60d</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Valor do Boleto */}
                          <View style={{ marginTop: 10 }}>
                            <Text style={styles.fieldSubLabel}>Valor do Boleto (R$):</Text>
                            <TextInput
                              value={String(inst.amount)}
                              onChangeText={(text) => handleUpdateInstallmentAmount(index, text)}
                              keyboardType="numeric"
                              placeholder="0.00"
                              placeholderTextColor="#64748b"
                              style={styles.boletoAmountInput}
                            />
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  {/* Ações da Lista: Adicionar Boleto e Equilibrar */}
                  <View style={styles.boletoActionsRow}>
                    <TouchableOpacity
                      style={styles.addBoletoBtn}
                      onPress={handleAddBoleto}
                    >
                      <Plus size={16} color="#3b66ff" />
                      <Text style={styles.addBoletoBtnText}>+ Adicionar Outro Boleto</Text>
                    </TouchableOpacity>

                    {Math.abs(customSumDiff) > 0.01 && (
                      <TouchableOpacity
                        style={styles.balanceBtn}
                        onPress={balanceInstallmentAmounts}
                      >
                        <RefreshCw size={14} color="#f59e0b" />
                        <Text style={styles.balanceBtnText}>Equilibrar Valores</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Banner de Validação */}
                  <View style={[
                    styles.sumValidationBox,
                    Math.abs(customSumDiff) <= 0.01 ? styles.sumValidBox : styles.sumInvalidBox
                  ]}>
                    <Text style={[
                      styles.sumValidationText,
                      Math.abs(customSumDiff) <= 0.01 ? styles.sumValidText : styles.sumInvalidText
                    ]}>
                      {Math.abs(customSumDiff) <= 0.01
                        ? `✓ Total dos ${customInstallments.length} boletos: ${formatCurrency(customInstallmentsSum)} (Confere)`
                        : `⚠ Soma dos boletos: ${formatCurrency(customInstallmentsSum)} (Diferença de ${formatCurrency(customSumDiff)})`
                      }
                    </Text>
                  </View>
                </View>
              )}

              {/* OPÇÕES DE PARCELAMENTO NO CARTÃO DE CRÉDITO */}
              {paymentMethod === 'Crédito' && (
                <View style={styles.installmentsConfig}>
                  <Text style={styles.fieldLabel}>Número de Parcelas</Text>
                  <View style={styles.installmentsPicker}>
                    {[1, 2, 3, 4, 5, 6, 10, 12].map(num => (
                      <TouchableOpacity
                        key={num}
                        style={[styles.instNumBtn, installmentsCount === num && styles.instNumBtnActive]}
                        onPress={() => setInstallmentsCount(num)}
                      >
                        <Text style={[styles.instNumText, installmentsCount === num && styles.instNumTextActive]}>
                          {num}x
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={styles.fieldLabel}>Vencimento da 1ª Parcela (AAAA-MM-DD)</Text>
                  <TextInput
                    value={firstDueDate}
                    onChangeText={setFirstDueDate}
                    placeholder="2026-07-25"
                    placeholderTextColor="#64748b"
                    style={styles.textInput}
                  />

                  {/* PREVIEW DAS PARCELAS DE CARTÃO */}
                  {generatedInstallments.length > 0 && (
                    <View style={styles.installmentsPreview}>
                      <Text style={styles.previewTitle}>Plano de Parcelas Gerado:</Text>
                      {generatedInstallments.map(inst => (
                        <View key={inst.number} style={styles.previewRow}>
                          <Text style={styles.previewInstNum}>Parcela {inst.number}/{generatedInstallments.length}</Text>
                          <Text style={styles.previewDueDate}>{inst.dueDate}</Text>
                          <Text style={styles.previewAmount}>{formatCurrency(inst.amount)}</Text>
                          <View style={[styles.previewStatus, inst.status === 'Pago' ? styles.statusPaid : styles.statusPending]}>
                            <Text style={styles.previewStatusText}>{inst.status}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}

              {/* SWITCH RECEBIDO AGORA (PARA À VISTA) */}
              {(paymentMethod === 'PIX' || paymentMethod === 'Dinheiro' || paymentMethod === 'Débito') && (
                <View style={styles.switchRow}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={styles.switchTitle}>Marcar como já recebido?</Text>
                    <Text style={styles.switchDesc}>Dá baixa imediata e registra a entrada no fluxo de caixa.</Text>
                  </View>
                  <Switch
                    value={isPaidNow}
                    onValueChange={setIsPaidNow}
                    trackColor={{ false: '#1e293b', true: '#22c55e' }}
                    thumbColor="#fff"
                  />
                </View>
              )}
            </View>
          </ScrollView>

          {/* BOTÃO GERAR COBRANÇA */}
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={loading}
            >
              <Text style={styles.submitBtnText}>
                {loading ? 'GERANDO...' : `GERAR COBRANÇA (${formatCurrency(finalAmount)})`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#090b0f',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#181c24',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBody: {
    padding: 20,
  },
  modeToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#131720',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modeToggleBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 8,
  },
  modeToggleBtnActive: {
    backgroundColor: '#3b66ff',
  },
  modeToggleText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
  },
  modeToggleTextActive: {
    color: '#fff',
  },
  sectionCard: {
    backgroundColor: '#0f131a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 16,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    letterSpacing: 1,
    marginBottom: 12,
  },
  emptyWarning: {
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
    borderRadius: 10,
    alignItems: 'center',
  },
  emptyWarningText: {
    fontSize: 12,
    color: '#ef4444',
    textAlign: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181c24',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    borderWidth: 1,
    borderColor: '#242d3d',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#fff',
  },
  osScroll: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  osCardSelect: {
    width: 170,
    backgroundColor: '#181c24',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#242d3d',
  },
  osCardSelectActive: {
    borderColor: '#3b66ff',
    backgroundColor: 'rgba(59, 102, 255, 0.08)',
  },
  osCardSelectHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  osCardSelectNum: {
    fontSize: 13,
    fontWeight: '900',
    color: '#fff',
  },
  osCardSelectClient: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '600',
    marginBottom: 2,
  },
  osCardSelectVehicle: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 8,
  },
  osCardSelectTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#181c24',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#242d3d',
    color: '#fff',
    paddingHorizontal: 12,
    height: 44,
    fontSize: 14,
    marginBottom: 12,
  },
  amountSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 13,
    color: '#94a3b8',
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  adjustRow: {
    flexDirection: 'row',
  },
  totalFinalBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.25)',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  totalFinalLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#22c55e',
  },
  totalFinalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#22c55e',
  },
  paymentMethodsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pmBtn: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#181c24',
    borderWidth: 1,
    borderColor: '#242d3d',
  },
  pmBtnActive: {
    borderColor: '#3b66ff',
    backgroundColor: 'rgba(59, 102, 255, 0.15)',
  },
  pmBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  pmBtnTextActive: {
    color: '#3b66ff',
  },
  installmentsConfig: {
    marginBottom: 12,
  },
  installmentsPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  instNumBtn: {
    width: 44,
    height: 38,
    borderRadius: 8,
    backgroundColor: '#181c24',
    borderWidth: 1,
    borderColor: '#242d3d',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instNumBtnActive: {
    backgroundColor: '#3b66ff',
    borderColor: '#3b66ff',
  },
  instNumText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  instNumTextActive: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#181c24',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  switchDesc: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  installmentsPreview: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#cbd5e1',
    marginBottom: 8,
  },
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.05)',
  },
  previewInstNum: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#94a3b8',
    width: 80,
  },
  previewDueDate: {
    fontSize: 11,
    color: '#64748b',
    flex: 1,
    textAlign: 'center',
  },
  previewAmount: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
  previewStatus: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPaid: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
  },
  statusPending: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
  },
  previewStatusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  // BOLETOS STYLES
  boletoSection: {
    backgroundColor: '#121620',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#242e42',
    padding: 14,
    marginBottom: 16,
  },
  boletoSectionHeader: {
    marginBottom: 12,
  },
  boletoSectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
  },
  boletoSectionSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  presetsScroll: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: '#181e2b',
    borderWidth: 1,
    borderColor: '#2a364d',
    marginRight: 8,
  },
  presetChipActive: {
    backgroundColor: 'rgba(59, 102, 255, 0.2)',
    borderColor: '#3b66ff',
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#94a3b8',
  },
  presetChipTextActive: {
    color: '#3b66ff',
  },
  boletosList: {
    gap: 12,
  },
  boletoCard: {
    backgroundColor: '#171d2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222d42',
    padding: 12,
  },
  boletoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  boletoIndexBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(59, 102, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  boletoIndexBadgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#3b66ff',
  },
  boletoCardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  instPaidBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  instPaidBadgeText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#22c55e',
  },
  removeBoletoBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
  },
  fieldSubLabel: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 4,
    fontWeight: '600',
  },
  boletoDateInput: {
    backgroundColor: '#0f131c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#26334a',
    color: '#fff',
    paddingHorizontal: 10,
    height: 38,
    fontSize: 13,
    fontWeight: 'bold',
  },
  dateChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  dateQuickChip: {
    backgroundColor: '#1e2638',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#2d3b55',
  },
  dateQuickChipText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#93c5fd',
  },
  boletoAmountInput: {
    backgroundColor: '#0f131c',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#26334a',
    color: '#22c55e',
    paddingHorizontal: 10,
    height: 38,
    fontSize: 14,
    fontWeight: '900',
  },
  boletoActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  addBoletoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: 'rgba(59, 102, 255, 0.12)',
    borderWidth: 1,
    borderColor: '#3b66ff',
    borderRadius: 8,
    paddingVertical: 10,
  },
  addBoletoBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3b66ff',
  },
  balanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: '#f59e0b',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  balanceBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#f59e0b',
  },
  sumValidationBox: {
    marginTop: 12,
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
  },
  sumValidBox: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.25)',
  },
  sumInvalidBox: {
    backgroundColor: 'rgba(245, 158, 11, 0.1)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
  },
  sumValidationText: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sumValidText: {
    color: '#22c55e',
  },
  sumInvalidText: {
    color: '#f59e0b',
  },
  modalFooter: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  submitBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 12,
    height: 52,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitBtnText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5,
  },
});
