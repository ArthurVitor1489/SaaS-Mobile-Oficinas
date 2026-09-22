import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Alert, StyleSheet, Platform, Linking } from 'react-native';
import { ArrowLeft, Edit2, PenTool, FileText, DollarSign, X, Check, Trash2, ChevronRight, MessageSquare } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import { useDatabase } from '../context/DatabaseContext';
import { theme, useTheme } from '../styles/theme';
import { formatCurrency, formatDate } from '../utils/formatters';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import OSWizardModal from '../components/OSWizardModal';
import SignaturePad from '../components/SignaturePad';
import CreateBillingModal from '../components/CreateBillingModal';
import { WorkOrder, OSStatus, PaymentMethod } from '../types';

export default function OSDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { colors, isDark } = useTheme();
  const { osId } = route.params;

  const {
    workOrders,
    clients,
    vehicles,
    billings,
    updateWorkOrderStatus,
    saveWorkOrderSignature,
    addBilling,
    updateWorkOrder,
    deleteWorkOrder,
    services,
    parts,
    settings
  } = useDatabase();

  const [osWizardModalVisible, setOsWizardModalVisible] = useState(false);
  const [editingOSForm, setEditingOSForm] = useState<any>(null);
  const [signingOS, setSigningOS] = useState(false);
  const [createBillingModalVisible, setCreateBillingModalVisible] = useState(false);

  const clientMap = useMemo(() => new Map(clients.map(c => [c.id, c])), [clients]);
  const vehicleMap = useMemo(() => new Map(vehicles.map(v => [v.id, v])), [vehicles]);
  const billingMap = useMemo(() => new Map(billings.map(b => [b.osId, b])), [billings]);

  const os = useMemo(() => workOrders.find(o => o.id === osId), [workOrders, osId]);

  if (!os) {
    return (
      <View style={[styles.screenContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.colors.textMuted }}>Ordem de serviço não encontrada.</Text>
        <TouchableOpacity 
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'OSList' }],
            });
          }} 
          style={[styles.backButton, { marginTop: 12 }]}
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const client = clientMap.get(os.clientId);
  const vehicle = vehicleMap.get(os.vehicleId);
  const billing = billingMap.get(os.id);

  const handleDeleteOS = () => {
    Alert.alert(
      'Excluir Ordem de Serviço',
      'Tem certeza que deseja excluir permanentemente esta ordem de serviço? Esta ação não pode ser desfeita.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteWorkOrder(os.id);
            if (success) {
              Alert.alert('Sucesso', 'Ordem de serviço excluída com sucesso!');
              navigation.goBack();
            } else {
              Alert.alert('Erro', 'Não foi possível excluir esta ordem de serviço.');
            }
          }
        }
      ]
    );
  };

  const handleOpenOSWizardForEdit = () => {
    setEditingOSForm({
      clientId: os.clientId,
      vehicleId: os.vehicleId,
      notes: os.notes || '',
      status: os.status,
      selectedServices: os.services,
      selectedParts: os.parts,
    });
    setOsWizardModalVisible(true);
  };

  const handleOSWizardSubmit = async (form: any) => {
    const servicesTotal = form.selectedServices.reduce((acc: number, s: any) => acc + (s.price * s.quantity), 0);
    const partsTotal = form.selectedParts.reduce((acc: number, p: any) => acc + (p.salePrice * p.quantity), 0);
    const grandTotal = servicesTotal + partsTotal;

    const dataToSave = {
      clientId: form.clientId,
      vehicleId: form.vehicleId,
      notes: form.notes,
      status: form.status,
      services: form.selectedServices,
      parts: form.selectedParts,
      servicesTotal,
      partsTotal,
      grandTotal,
    };

    const success = await updateWorkOrder(os.id, dataToSave);
    if (success) {
      Alert.alert('Sucesso', 'Ordem de serviço atualizada com sucesso!');
    }
    return success;
  };

  const handleShareOS = async () => {

    const servicesListHTML = os.services
      .map((s: any) => `<tr>
        <td>${s.name} ${s.code ? `(${s.code})` : ''}</td>
        <td>${s.quantity || 1}</td>
        <td>${formatCurrency(s.price)}</td>
        <td>${formatCurrency(s.price * (s.quantity || 1))}</td>
      </tr>`)
      .join('');

    const partsListHTML = os.parts
      .map((p: any) => `<tr>
        <td>${p.name} ${p.code ? `(${p.code})` : ''}</td>
        <td>${p.quantity}</td>
        <td>${formatCurrency(p.salePrice)}</td>
        <td>${formatCurrency(p.salePrice * p.quantity)}</td>
      </tr>`)
      .join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <title>Ordem de Serviço ${os.osNumber}</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          @page {
            size: A4 portrait;
            margin: 15mm;
          }
          body {
            font-family: 'Inter', sans-serif;
            color: #0f172a;
            line-height: 1.4;
            padding: 0;
            width: calc(100% - 8px);
            margin: 0 auto;
            background: #ffffff;
            font-size: 11px;
            box-sizing: border-box;
          }
          .header-grid {
            display: grid;
            grid-template-columns: 7fr 3fr;
            gap: 12px;
            margin-bottom: 12px;
          }
          .border-box {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            padding: 12px;
            background: #ffffff;
            box-sizing: border-box;
          }
          .company-title {
            font-size: 15px;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 8px;
            border-bottom: 1.5px solid #0f172a;
            padding-bottom: 4px;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .company-text {
            font-size: 9.5px;
            font-weight: 500;
            margin-bottom: 3px;
            color: #0f172a;
          }
          .center-box {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
          }
          .os-tag {
            border: 1.5px solid #0f172a;
            border-radius: 4px;
            padding: 2px 6px;
            font-size: 9px;
            font-weight: 800;
            text-transform: uppercase;
            margin-bottom: 6px;
            color: #0f172a;
          }
          .os-num {
            font-size: 20px;
            font-weight: 800;
            margin-bottom: 6px;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .os-meta {
            font-size: 9.5px;
            color: #334155;
            font-weight: 500;
            margin-top: 1px;
          }
          .section-box {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            margin-bottom: 12px;
            box-sizing: border-box;
            background: #ffffff;
            overflow: hidden;
          }
          .section-title {
            background: #f8fafc;
            border-bottom: 1.5px solid #0f172a;
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .section-content {
            padding: 10px;
          }
          .customer-grid {
            display: grid;
            grid-template-columns: 38fr 34fr 28fr;
            gap: 10px;
            font-size: 10px;
          }
          .customer-row {
            margin-bottom: 4px;
          }
          .customer-label {
            font-weight: 700;
            color: #0f172a;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            padding: 8px 12px;
            font-size: 10px;
            border-right: 1.5px solid #0f172a;
            border-bottom: 1.5px solid #0f172a;
            box-sizing: border-box;
            color: #0f172a;
          }
          th {
            background: #ffffff;
            color: #0f172a;
            font-weight: 800;
            text-transform: uppercase;
            text-align: left;
          }
          th:last-child, td:last-child {
            border-right: none;
          }
          tr:last-child td {
            border-bottom: none;
          }
          .center-col {
            text-align: center;
          }
          .right-col {
            text-align: right;
          }
          .totals-row {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 10px;
            margin-bottom: 12px;
          }
          .total-card {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            padding: 10px;
            box-sizing: border-box;
            background: #ffffff;
          }
          .total-card-label {
            font-size: 8px;
            font-weight: 800;
            color: #64748b;
            text-transform: uppercase;
            margin-bottom: 4px;
          }
          .total-card-value {
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
          }
          .bottom-row {
            display: grid;
            grid-template-columns: 3fr 2fr;
            gap: 12px;
            margin-bottom: 25px;
          }
          .obs-box {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            min-height: 85px;
            box-sizing: border-box;
            padding: 0;
            display: flex;
            flex-direction: column;
            overflow: hidden;
          }
          .obs-title {
            background: #f8fafc;
            border-bottom: 1.5px solid #0f172a;
            padding: 8px 12px;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #0f172a;
          }
          .obs-content {
            padding: 10px;
            font-size: 10px;
            line-height: 1.4;
          }
          .signature-box {
            border: 1.5px solid #0f172a;
            border-radius: 8px;
            min-height: 85px;
            box-sizing: border-box;
            padding: 12px;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #ffffff;
            text-align: center;
          }
          .signature-svg {
            max-height: 50px;
            width: 100%;
            object-fit: contain;
            margin-bottom: 4px;
          }
          .signature-line {
            width: 80%;
            border-top: 1px solid #334155;
            margin-top: 4px;
            padding-top: 3px;
            font-size: 8px;
            font-weight: 700;
            color: #334155;
            text-transform: uppercase;
          }
          .pdf-footer {
            border-top: 1.5px solid #0f172a;
            padding-top: 8px;
            text-align: center;
            font-size: 8.5px;
            font-weight: 600;
            color: #64748b;
          }
        </style>
      </head>
      <body>
        <div class="header-grid">
          <div class="border-box">
            <div class="company-title">${settings.name.toUpperCase()}</div>
            <div class="company-text">CNPJ: ${settings.cnpj || '-'}</div>
            <div class="company-text">Tel/Whats: ${settings.phone} ${settings.whatsapp ? `/ ${settings.whatsapp}` : ''}</div>
            <div class="company-text">End: ${settings.address || '-'}</div>
          </div>
          <div class="border-box center-box">
            <div class="os-tag">Ordem de Serviço</div>
            <div class="os-num">${os.osNumber}</div>
            <div class="os-meta">Situação: <b>${billing ? (billing.status === 'Pago' ? 'Faturada (Paga)' : 'Faturada (Pendente)') : 'A Faturar'}</b></div>
            <div class="os-meta">${os.date.split('-').reverse().join('/')}</div>
          </div>
        </div>

        <div class="section-box">
          <div class="section-title">Dados do Cliente & Veículo</div>
          <div class="section-content">
            <div class="customer-grid">
              <div class="customer-row">
                <span class="customer-label">Cliente:</span> ${client?.name || '-'}<br>
                <span class="customer-label">Endereço:</span> ${client?.address || '-'}<br>
                <span class="customer-label">Contatos:</span> ${client?.phone || '-'}
              </div>
              <div class="customer-row">
                <span class="customer-label">Veículo:</span> ${vehicle ? `${vehicle.brand} ${vehicle.model}` : '-'}<br>
                <span class="customer-label">Placa:</span> ${vehicle?.plate.toUpperCase() || '-'}<br>
                <span class="customer-label">Km/Odo:</span> ${vehicle?.odometer || '0'} Km
              </div>
              <div class="customer-row">
                <span class="customer-label">Ano:</span> ${vehicle?.year || '-'}<br>
                <span class="customer-label">Chassi:</span> ${vehicle?.chassis || '-'}
              </div>
            </div>
          </div>
        </div>

        ${os.services.length > 0 ? `
          <div class="section-box">
            <div class="section-title">Serviços Executados (Mão de Obra)</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 50%;">Descrição do Serviço</th>
                  <th style="width: 10%;" class="center-col">Qtd</th>
                  <th style="width: 20%;" class="right-col">Unitário</th>
                  <th style="width: 20%;" class="right-col">Total</th>
                </tr>
              </thead>
              <tbody>
                ${servicesListHTML}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${os.parts.length > 0 ? `
          <div class="section-box">
            <div class="section-title">Peças Aplicadas</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 50%;">Nome da Peça / Código</th>
                  <th style="width: 10%;" class="center-col">Qtd</th>
                  <th style="width: 20%;" class="right-col">Unitário</th>
                  <th style="width: 20%;" class="right-col">Total</th>
                </tr>
              </thead>
              <tbody>
                ${partsListHTML}
              </tbody>
            </table>
          </div>
        ` : ''}

        <div class="totals-row">
          <div class="total-card">
            <div class="total-card-label">Total Mão de Obra</div>
            <div class="total-card-value">${formatCurrency(os.servicesTotal)}</div>
          </div>
          <div class="total-card">
            <div class="total-card-label">Total Peças</div>
            <div class="total-card-value">${formatCurrency(os.partsTotal)}</div>
          </div>
          <div class="total-card">
            <div class="total-card-label">Desconto</div>
            <div class="total-card-value">- ${formatCurrency(0)}</div>
          </div>
          <div class="total-card" style="border-color: #0f172a; background: #f8fafc;">
            <div class="total-card-label" style="color: #0f172a;">VALOR TOTAL GERAL</div>
            <div class="total-card-value" style="color: #0f172a; font-size: 15px;">${formatCurrency(os.grandTotal)}</div>
          </div>
        </div>

        <div class="bottom-row">
          <div class="obs-box">
            <div class="obs-title">Constatações Técnicas & Observações</div>
            <div class="obs-content">
              ${os.notes || 'Sem observações registradas para esta Ordem de Serviço.'}
            </div>
          </div>
          
          <div class="signature-box">
            ${os.signature ? `
              <div class="signature-svg">
                ${os.signature}
              </div>
            ` : '<div style="height: 48px; display: flex; align-items: center; justify-content: center; font-size: 9px; color: #94a3b8;">Aguardando Assinatura</div>'}
            <div class="signature-line">Assinatura do Cliente</div>
          </div>
        </div>

        <div class="pdf-footer">
          Gerado automaticamente via OficinaPro SaaS Mobile
        </div>
      </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (err) {
      Alert.alert('Erro', 'Não foi possível gerar ou compartilhar o PDF.');
    }
  };

  const handleSendWhatsApp = () => {
    const rawPhone = client?.whatsapp || client?.phone || '';
    const cleanPhone = rawPhone.replace(/\D/g, '');
    
    const clientGreeting = client?.name ? `Olá *${client.name}*!` : 'Olá!';
    const workshopName = settings.name || 'MecânicaPro';
    const vehicleText = vehicle ? `\n🚗 *Veículo:* ${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : '';
    
    let servicesSummary = '';
    if (os.services.length > 0) {
      servicesSummary = `\n🔧 *Serviços:* ` + os.services.map(s => s.name).join(', ');
    }

    let partsSummary = '';
    if (os.parts.length > 0) {
      partsSummary = `\n🔩 *Peças:* ` + os.parts.map(p => p.name).join(', ');
    }

    const billingStatusText = billing 
      ? (billing.status === 'Pago' ? 'Faturada e Paga ✅' : `Faturada (${billing.paymentMethod.toUpperCase()}) ⏳`)
      : 'Aguardando Faturamento';

    const message = 
      `*${workshopName.toUpperCase()}*\n` +
      `${clientGreeting}\n\n` +
      `Resumo da sua Ordem de Serviço *#${os.osNumber}*:${vehicleText}${servicesSummary}${partsSummary}\n` +
      `💰 *Total Geral:* ${formatCurrency(os.grandTotal)}\n` +
      `📋 *Situação:* ${billingStatusText}\n\n` +
      `Estamos à disposição para qualquer dúvida! 👍`;

    const encoded = encodeURIComponent(message);
    if (cleanPhone) {
      const fullPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
      Linking.openURL(`https://wa.me/${fullPhone}?text=${encoded}`);
    } else {
      Linking.openURL(`https://wa.me/?text=${encoded}`);
    }
  };

  return (
    <View style={[styles.screenContainer, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView} contentContainerStyle={styles.scrollViewContent}>
        <View style={styles.screenHeaderOS}>
        <TouchableOpacity
          onPress={() => {
            navigation.reset({
              index: 0,
              routes: [{ name: 'OSList' }],
            });
          }}
          style={styles.backButton}
        >
          <ArrowLeft size={20} color={colors.primary} style={styles.backButtonIcon} />
          <Text style={[styles.backButtonText, { color: colors.primary }]}>Voltar</Text>
        </TouchableOpacity>
        
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
          <TouchableOpacity
            onPress={handleOpenOSWizardForEdit}
            style={[styles.editOSButton, { backgroundColor: isDark ? 'rgba(59, 102, 255, 0.1)' : 'rgba(59, 102, 255, 0.12)' }]}
          >
            <Edit2 size={14} color={colors.primary} style={styles.editButtonIcon} />
            <Text style={[styles.editOSButtonText, { color: colors.primary }]}>Editar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleDeleteOS}
            style={styles.deleteOSButton}
          >
            <Trash2 size={14} color={colors.error} style={styles.deleteButtonIcon} />
            <Text style={[styles.deleteOSButtonText, { color: colors.error }]}>Excluir</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* BANNER DE FATURAMENTO / SITUAÇÃO DA OS */}
      {billing ? (
        <View style={[
          styles.billingStatusCard,
          billing.status === 'Pago' ? styles.billingStatusCardPaid : styles.billingStatusCardPending
        ]}>
          <View style={styles.billingStatusHeader}>
            <View style={styles.billingBadgeRow}>
              <View style={[
                styles.billingStatusDot,
                { backgroundColor: billing.status === 'Pago' ? colors.success : colors.warning }
              ]} />
              <View>
                <Text style={[
                  styles.billingStatusTitle,
                  { color: billing.status === 'Pago' ? colors.success : colors.warning }
                ]}>
                  {billing.status === 'Pago' ? 'FATURADA • PAGA' : 'FATURADA • AGUARDANDO PAGAMENTO'}
                </Text>
                <Text style={[styles.billingStatusSubtitle, { color: colors.textMuted }]}>
                  {billing.paymentMethod.toUpperCase()} {billing.installments.length > 1 ? `• ${billing.installments.length}x` : '• À vista'} • Total: {formatCurrency(billing.amount)}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('FinanceTab', { screen: 'BillingDetail', params: { billingId: billing.id } })}
              style={styles.billingViewLinkBtn}
            >
              <Text style={[styles.billingViewLinkText, { color: colors.primary }]}>Ver</Text>
              <ChevronRight size={14} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.billingStatusCardUnbilled}>
          <View style={styles.billingStatusHeader}>
            <View style={styles.billingBadgeRow}>
              <View style={[styles.billingStatusDot, { backgroundColor: '#f59e0b' }]} />
              <View>
                <Text style={styles.billingStatusTitleUnbilled}>AGUARDANDO FATURAMENTO</Text>
                <Text style={styles.billingStatusSubtitleUnbilled}>Serviço em execução • Pronto para faturar</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setCreateBillingModalVisible(true)}
              style={[styles.billingQuickActionBtn, { backgroundColor: colors.primary }]}
            >
              <DollarSign size={14} color="#fff" />
              <Text style={styles.billingQuickActionBtnText}>Faturar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={[styles.osInfoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardRowSpaceBetween}>
          <Text style={[styles.detailedOSNum, { color: colors.primary }]}>{os.osNumber}</Text>
          <Text style={[styles.detailedOSDate, { color: colors.textDim }]}>Data: {formatDate(os.date)}</Text>
        </View>
        <View style={[styles.detailedOSClientInfo, { borderTopColor: colors.border }]}>
          <View>
            <Text style={[styles.cardLabelText, { color: colors.textMuted }]}>Cliente</Text>
            <Text style={[styles.detailedClientName, { color: colors.text }]}>{client?.name}</Text>
          </View>
          <View>
            <Text style={[styles.cardLabelText, { color: colors.textMuted }]}>Veículo</Text>
            <Text style={[styles.detailedClientVehicle, { color: colors.text }]}>
              {vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.plate})` : 'N/A'}
            </Text>
          </View>
        </View>
      </View>

      {os.services.length > 0 && (
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Serviços Executados</Text>
          <View style={[styles.itemsWrapperCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {os.services.map((s, idx) => (
              <View key={idx} style={[styles.detailItemRow, { borderBottomColor: colors.border }, idx === os.services.length - 1 ? { borderBottomWidth: 0 } : null]}>
                <View style={styles.detailItemLeft}>
                  <Text style={[styles.detailItemName, { color: colors.text }]}>{s.name}</Text>
                  {s.code ? <Text style={[styles.detailItemCode, { color: colors.textMuted }]}>CÓD: {s.code}</Text> : null}
                </View>
                <View style={styles.detailItemRight}>
                  <Text style={[styles.detailItemPrice, { color: colors.text }]}>{formatCurrency(s.price * s.quantity)}</Text>
                  {s.quantity > 1 ? (
                    <Text style={[styles.detailItemQtyMeta, { color: colors.textMuted }]}>{s.quantity}x {formatCurrency(s.price)}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {os.parts.length > 0 && (
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Peças Substituídas</Text>
          <View style={[styles.itemsWrapperCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {os.parts.map((p, idx) => (
              <View key={idx} style={[styles.detailItemRow, { borderBottomColor: colors.border }, idx === os.parts.length - 1 ? { borderBottomWidth: 0 } : null]}>
                <View style={styles.detailItemLeft}>
                  <Text style={[styles.detailItemName, { color: colors.text }]}>{p.name}</Text>
                  {p.code ? <Text style={[styles.detailItemCode, { color: colors.textMuted }]}>SKU: {p.code}</Text> : null}
                </View>
                <View style={styles.detailItemRight}>
                  <Text style={[styles.detailItemPrice, { color: colors.text }]}>{formatCurrency(p.salePrice * p.quantity)}</Text>
                  {p.quantity > 1 ? (
                    <Text style={[styles.detailItemQtyMeta, { color: colors.textMuted }]}>{p.quantity}x {formatCurrency(p.salePrice)}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={[styles.totalsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.summaryTotalsRow}>
          <Text style={[styles.summaryTotalsLabel, { color: colors.textDim }]}>Mão de Obra:</Text>
          <Text style={[styles.summaryTotalsVal, { color: colors.text }]}>{formatCurrency(os.servicesTotal)}</Text>
        </View>
        <View style={styles.summaryTotalsRow}>
          <Text style={[styles.summaryTotalsLabel, { color: colors.textDim }]}>Peças:</Text>
          <Text style={[styles.summaryTotalsVal, { color: colors.text }]}>{formatCurrency(os.partsTotal)}</Text>
        </View>
        <View style={[styles.summaryTotalsDivider, { backgroundColor: colors.border }]} />
        <View style={styles.summaryTotalsRowGrand}>
          <Text style={[styles.summaryTotalsGrandLabel, { color: colors.primary }]}>TOTAL GERAL:</Text>
          <Text style={[styles.summaryTotalsGrandValue, { color: colors.success }]}>{formatCurrency(os.grandTotal)}</Text>
        </View>
      </View>

      {os.notes ? (
        <View style={styles.sectionWrapper}>
          <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Observações</Text>
          <View style={[styles.detailedNotesBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.detailedNotesText, { color: colors.text }]}>{os.notes}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.sectionWrapper}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Assinatura Digital do Cliente</Text>
        <View style={styles.signatureWrapper}>
          {os.signature ? (
            <View style={[styles.signatureDisplayCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <SvgXml xml={os.signature} width="220" height="90" />
              <Text style={styles.signatureDisplayLabel}>ASSINADO DIGITALMENTE</Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setSigningOS(true)}
              style={[styles.signatureCollectButton, { borderColor: colors.border }]}
            >
              <PenTool size={16} color={colors.textDim} />
              <Text style={[styles.signatureCollectText, { color: colors.textDim }]}>Coletar Assinatura do Cliente</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.actionsPanelRow}>
        <TouchableOpacity
          onPress={handleShareOS}
          style={[styles.shareOSButton, { backgroundColor: isDark ? '#475569' : '#64748b' }]}
        >
          <FileText size={15} color="#fff" />
          <Text style={styles.shareOSButtonText}>PDF</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleSendWhatsApp}
          style={styles.whatsAppOSButton}
        >
          <MessageSquare size={15} color="#fff" />
          <Text style={styles.whatsAppOSButtonText}>WhatsApp</Text>
        </TouchableOpacity>

        {billing ? (
          <TouchableOpacity
            onPress={() => navigation.navigate('FinanceTab', { screen: 'BillingDetail', params: { billingId: billing.id } })}
            style={styles.billedIndicatorBadge}
          >
            <Text style={styles.billedIndicatorText}>💰 Cobrança</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setCreateBillingModalVisible(true)}
            style={[styles.billOSButton, { backgroundColor: colors.primary }]}
          >
            <DollarSign size={15} color="#fff" />
            <Text style={styles.billOSButtonText}>Faturar</Text>
          </TouchableOpacity>
        )}
      </View>

      <OSWizardModal 

        visible={osWizardModalVisible}
        editingOSId={os.id}
        initialForm={editingOSForm}
        clients={clients}
        vehicles={vehicles}
        services={services}
        parts={parts}
        onClose={() => setOsWizardModalVisible(false)}
        onSubmit={handleOSWizardSubmit}
      />

      <Modal visible={signingOS} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalContentSignature}>
            <SignaturePad 
              onSave={async (svg) => {
                const success = await saveWorkOrderSignature(os.id, svg);
                if (success) {
                  setSigningOS(false);
                  Alert.alert('Sucesso', 'Assinatura registrada!');
                }
              }}
              onCancel={() => setSigningOS(false)}
            />
          </View>
        </View>
      </Modal>

      <CreateBillingModal
        visible={createBillingModalVisible}
        preselectedOsId={os.id}
        onClose={() => setCreateBillingModalVisible(false)}
        onSuccess={(newBillingId?: string) => {
          setCreateBillingModalVisible(false);
          if (newBillingId) {
            navigation.navigate('FinanceTab', {
              screen: 'BillingDetail',
              params: { billingId: newBillingId }
            });
          }
        }}
      />
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#090b0f',
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  editOSButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 102, 255, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: 40,
  },
  editOSButtonText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
  cardLabelText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  sectionTitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginTop: 14,
    marginBottom: 8,
  },
  billingStatusCard: {
    borderRadius: theme.roundness.md,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  billingStatusCardPaid: {
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  billingStatusCardPending: {
    backgroundColor: 'rgba(234, 179, 8, 0.08)',
    borderColor: 'rgba(234, 179, 8, 0.3)',
  },
  billingStatusCardUnbilled: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: theme.roundness.md,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
  },
  billingStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billingBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  billingStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  billingStatusTitle: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  billingStatusSubtitle: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  billingStatusTitleUnbilled: {
    fontSize: 12,
    fontWeight: '900',
    color: '#f59e0b',
    letterSpacing: 0.5,
  },
  billingStatusSubtitleUnbilled: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  billingViewLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(59, 102, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  billingViewLinkText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  billingQuickActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  billingQuickActionBtnText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusButtonsContainer: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 16,
    marginTop: 0,
  },
  statusBadgeButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#181c24',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center',
    minHeight: 40,
    justifyContent: 'center',
  },
  statusBadgeButtonText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    padding: theme.spacing.lg,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  detailedOSNum: {
    fontSize: 18,
    fontWeight: '900',
    color: theme.colors.primary,
  },
  detailedOSDate: {
    fontSize: 13,
    color: theme.colors.textDim,
  },
  detailedOSClientInfo: {
    borderTopWidth: 1,
    borderTopColor: '#272e3f',
    paddingTop: 10,
    gap: 8,
  },
  detailedClientName: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 2,
  },
  detailedClientVehicle: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 2,
  },
  itemsWrapperCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  detailItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#272e3f',
  },
  detailItemName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#cbd5e1',
  },
  detailItemCode: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: 'bold',
  },
  detailItemPrice: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  detailItemQtyMeta: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  summaryTotalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryTotalsLabel: {
    fontSize: 12,
    color: theme.colors.textDim,
  },
  summaryTotalsVal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#fff',
  },
  summaryTotalsDivider: {
    height: 1,
    backgroundColor: '#272e3f',
    marginVertical: 4,
  },
  summaryTotalsGrandLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  summaryTotalsGrandValue: {
    fontSize: 16,
    fontWeight: '900',
    color: theme.colors.success,
  },
  detailedNotesBox: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: 14,
    marginTop: 0,
  },
  detailedNotesText: {
    fontSize: 13,
    color: '#cbd5e1',
    lineHeight: 18,
  },
  signatureDisplayCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    padding: 14,
    alignItems: 'center',
  },
  signatureDisplayLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: theme.colors.success,
    letterSpacing: 0.5,
    marginTop: 6,
  },
  signatureCollectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderStyle: 'dashed',
    borderRadius: theme.roundness.md,
    padding: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
  },
  signatureCollectText: {
    fontSize: 13,
    color: theme.colors.textDim,
    fontWeight: 'bold',
  },
  actionsPanelRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  shareOSButton: {
    flex: 1,
    backgroundColor: '#475569',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: theme.roundness.md,
    minHeight: 52,
  },
  shareOSButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: 'bold',
  },
  whatsAppOSButton: {
    flex: 1.1,
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: theme.roundness.md,
    minHeight: 52,
  },
  whatsAppOSButtonText: {
    fontSize: 13,
    color: '#fff',
    fontWeight: 'bold',
  },
  billOSButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: theme.roundness.md,
    minHeight: 52,
  },
  billOSButtonText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: 'bold',
  },
  billedIndicatorBadge: {
    flex: 1,
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    borderRadius: theme.roundness.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  billedIndicatorText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.success,
  },
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
  modalBillingValueLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 0.8,
  },
  modalBillingValueText: {
    fontSize: 24,
    fontWeight: '900',
    color: theme.colors.success,
    marginTop: 4,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  pickerFakeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  pickerTag: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  pickerTagActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pickerTagText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  pickerTagActiveText: {
    color: '#fff',
  },
  installmentsPickerList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  installmentsPickerItem: {
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  installmentsPickerItemActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  installmentsPickerText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  installmentsPickerTextActive: {
    color: '#fff',
  },
  installmentsPreviewCard: {
    backgroundColor: '#0a0c10',
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  installmentPreviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  installmentPreviewNum: {
    fontSize: 11,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  installmentPreviewDetails: {
    fontSize: 11,
    color: '#fff',
    fontWeight: 'bold',
  },
  confirmBillingButton: {
    backgroundColor: theme.colors.success,
    borderRadius: theme.roundness.md,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  confirmBillingText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 30,
  },
  screenHeaderOS: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  backButtonIcon: {
    marginRight: 4,
  },
  editButtonIcon: {
    marginRight: 6,
  },
  sectionWrapper: {
    marginBottom: 16,
  },
  osInfoCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  cardRowSpaceBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  detailItemLeft: {
    flex: 1,
    paddingRight: 8,
  },
  detailItemRight: {
    alignItems: 'flex-end',
  },
  totalsCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    padding: 16,
    gap: 6,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  summaryTotalsRowGrand: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  signatureWrapper: {
    marginTop: 0,
  },
  modalContentSignature: {
    backgroundColor: theme.colors.surface,
    borderTopLeftRadius: theme.roundness.lg,
    borderTopRightRadius: theme.roundness.lg,
    padding: theme.spacing.xxl,
    maxHeight: '60%',
  },
  modalBillingValueWrapper: {
    marginBottom: 12,
  },
  modalBillingScrollViewContent: {
    paddingBottom: 24,
  },
  deleteOSButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    minHeight: 40,
  },
  deleteOSButtonText: {
    fontSize: 13,
    color: theme.colors.error,
    fontWeight: 'bold',
  },
  deleteButtonIcon: {
    marginRight: 6,
  },
});

