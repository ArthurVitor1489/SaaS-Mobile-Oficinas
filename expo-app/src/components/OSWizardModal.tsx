import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, StyleSheet, Alert
} from 'react-native';
import { X, Search, Check, ClipboardList, Play, CheckCircle } from 'lucide-react-native';
import { theme } from '../styles/theme';
import { formatCurrency, containsInjection } from '../utils/formatters';
import { Client, Vehicle, ServiceItem, PartItem, OSItemService, OSItemPart, OSStatus } from '../types';

interface OSForm {
  clientId: string;
  vehicleId: string;
  notes: string;
  status: OSStatus;
  selectedServices: OSItemService[];
  selectedParts: OSItemPart[];
}

interface OSWizardModalProps {
  visible: boolean;
  editingOSId: string | null;
  initialForm: OSForm | null;
  clients: Client[];
  vehicles: Vehicle[];
  services: ServiceItem[];
  parts: PartItem[];
  onClose: () => void;
  onSubmit: (form: OSForm) => Promise<boolean>;
}

const emptyForm = (): OSForm => ({
  clientId: '',
  vehicleId: '',
  notes: '',
  status: 'Aberta',
  selectedServices: [],
  selectedParts: [],
});

export default function OSWizardModal({
  visible,
  editingOSId,
  initialForm,
  clients,
  vehicles,
  services,
  parts,
  onClose,
  onSubmit,
}: OSWizardModalProps) {
  const [wizardStep, setWizardStep] = useState(1);
  const [form, setForm] = useState<OSForm>(emptyForm());
  const [clientSearch, setClientSearch] = useState('');
  const [serviceSearch, setServiceSearch] = useState('');
  const [partSearch, setPartSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setForm(initialForm || emptyForm());
      setWizardStep(1);
      setClientSearch('');
      setServiceSearch('');
      setPartSearch('');
    }
  }, [visible, initialForm]);

  const handleClose = () => {
    setForm(emptyForm());
    onClose();
  };

  const servicesTotal = useMemo(() => {
    return form.selectedServices.reduce((acc, s) => acc + (s.price * s.quantity), 0);
  }, [form.selectedServices]);

  const partsTotal = useMemo(() => {
    return form.selectedParts.reduce((acc, p) => acc + (p.salePrice * p.quantity), 0);
  }, [form.selectedParts]);

  const grandTotal = useMemo(() => {
    return servicesTotal + partsTotal;
  }, [servicesTotal, partsTotal]);

  const handleUpdateServiceQty = (item: ServiceItem, qty: number) => {
    if (qty <= 0) {
      setForm(prev => ({
        ...prev,
        selectedServices: prev.selectedServices.filter(s => s.id !== item.id)
      }));
      return;
    }
    const exists = form.selectedServices.find(s => s.id === item.id);
    if (exists) {
      setForm(prev => ({
        ...prev,
        selectedServices: prev.selectedServices.map(s => s.id === item.id ? { ...s, quantity: qty } : s)
      }));
    } else {
      setForm(prev => ({
        ...prev,
        selectedServices: [...prev.selectedServices, { id: item.id, name: item.name, price: item.price, quantity: qty, code: item.code }]
      }));
    }
  };

  const handleUpdatePartQty = (item: PartItem, qty: number) => {
    if (qty <= 0) {
      setForm(prev => ({
        ...prev,
        selectedParts: prev.selectedParts.filter(p => p.id !== item.id)
      }));
      return;
    }
    const exists = form.selectedParts.find(p => p.id === item.id);
    if (exists) {
      setForm(prev => ({
        ...prev,
        selectedParts: prev.selectedParts.map(p => p.id === item.id ? { ...p, quantity: qty } : p)
      }));
    } else {
      setForm(prev => ({
        ...prev,
        selectedParts: [...prev.selectedParts, { id: item.id, name: item.name, code: item.code, salePrice: item.salePrice, quantity: qty }]
      }));
    }
  };

  const handleSave = async () => {
    if (!form.clientId || !form.vehicleId) {
      Alert.alert('Erro', 'Por favor, selecione um cliente e um veículo.');
      return;
    }

    if (form.selectedServices.length === 0 && form.selectedParts.length === 0) {
      Alert.alert('Aviso', 'A ordem de serviço deve conter pelo menos um serviço ou uma peça cadastrada.');
      return;
    }

    if (containsInjection(form.notes)) {
      Alert.alert('Erro', 'Caracteres ou comandos não permitidos detectados nas observações da OS.');
      return;
    }

    setSubmitting(true);
    try {
      const success = await onSubmit(form);
      if (success) {
        handleClose();
      }
    } catch (e: any) {
      Alert.alert('Erro', e.message || 'Erro ao salvar ordem de serviço.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredClients = useMemo(() => {
    return clients.filter(c =>
      c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
      (c.cpfCnpj && c.cpfCnpj.includes(clientSearch))
    );
  }, [clients, clientSearch]);

  const filteredServices = useMemo(() => {
    return services.filter(s =>
      s.name.toLowerCase().includes(serviceSearch.toLowerCase())
    );
  }, [services, serviceSearch]);

  const filteredParts = useMemo(() => {
    return parts.filter(p =>
      p.name.toLowerCase().includes(partSearch.toLowerCase())
    );
  }, [parts, partSearch]);

  const clientCars = useMemo(() => {
    if (!form.clientId) return [];
    return vehicles.filter(v => v.clientId === form.clientId);
  }, [vehicles, form.clientId]);

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
                {editingOSId ? 'Editar OS' : 'Gerar Nova OS'}
              </Text>
              <Text style={styles.modalStepText}>Passo {wizardStep} de 4</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <X size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* Stepper indicator line */}
          <View style={styles.stepperWrapper}>
            <View style={[styles.stepperBar, wizardStep >= 1 ? styles.stepperBarActive : null]} />
            <View style={[styles.stepperBar, wizardStep >= 2 ? styles.stepperBarActive : null]} />
            <View style={[styles.stepperBar, wizardStep >= 3 ? styles.stepperBarActive : null]} />
            <View style={[styles.stepperBar, wizardStep >= 4 ? styles.stepperBarActive : null]} />
          </View>

          {/* STEP 1: CLIENT & VEHICLE */}
          {wizardStep === 1 && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              <Text style={styles.inputLabel}>1. Selecionar Cliente *</Text>
              
              <View style={styles.searchWrapper}>
                <Search size={18} color="#64748b" style={styles.searchIcon} />
                <TextInput
                  placeholder="Buscar por nome ou CPF..."
                  placeholderTextColor="#475569"
                  value={clientSearch}
                  onChangeText={setClientSearch}
                  maxLength={50}
                  style={styles.searchInput}
                />
                {clientSearch !== '' && (
                  <TouchableOpacity onPress={() => setClientSearch('')} style={styles.clearSearch}>
                    <X size={18} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={[styles.pickerList, { maxHeight: 220 }]}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                  {filteredClients.length === 0 ? (
                    <View style={styles.emptySearchWrapper}>
                      <Text style={styles.emptySearchText}>Nenhum cliente encontrado</Text>
                    </View>
                  ) : (
                    filteredClients.map(c => {
                      const isSelected = form.clientId === c.id;
                      return (
                        <TouchableOpacity
                          key={c.id}
                          onPress={() => {
                            const cars = vehicles.filter(v => v.clientId === c.id);
                            setForm(prev => ({
                              ...prev,
                              clientId: c.id,
                              vehicleId: cars.length === 1 ? cars[0].id : '',
                            }));
                          }}
                          style={[styles.pickerItem, isSelected ? styles.pickerItemActive : null]}
                        >
                          <View style={styles.pickerItemContent}>
                            <View>
                              <Text style={[styles.pickerItemTitle, isSelected ? styles.pickerItemTitleActive : null]}>
                                {c.name}
                              </Text>
                              {c.cpfCnpj ? (
                                <Text style={styles.pickerItemSubtitle}>CPF/CNPJ: {c.cpfCnpj}</Text>
                              ) : null}
                            </View>
                            {isSelected && <Check size={16} color={theme.colors.primary} />}
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </ScrollView>
              </View>

              {form.clientId ? (
                <View style={{ marginTop: 8 }}>
                  <Text style={styles.inputLabel}>2. Selecionar Veículo *</Text>
                  {clientCars.length === 0 ? (
                    <View style={styles.noVehiclesWrapper}>
                      <Text style={styles.noVehiclesText}>
                        Nenhum veículo cadastrado para este cliente. Vá no menu "Clientes" e adicione um veículo primeiro.
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.vehiclesGrid}>
                      {clientCars.map(v => {
                        const isSelected = form.vehicleId === v.id;
                        return (
                          <TouchableOpacity
                            key={v.id}
                            onPress={() => setForm(prev => ({ ...prev, vehicleId: v.id }))}
                            style={[styles.vehicleCard, isSelected ? styles.vehicleCardActive : null]}
                          >
                            <Text style={[styles.vehicleCardTitle, isSelected ? styles.vehicleCardTitleActive : null]}>
                              {v.brand} {v.model}
                            </Text>
                            <View style={styles.vehicleCardBottom}>
                              <View style={[styles.plateBadge, isSelected ? styles.plateBadgeActive : null]}>
                                <Text style={styles.plateText}>{v.plate}</Text>
                              </View>
                              {isSelected && <Check size={14} color={theme.colors.primary} />}
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              ) : null}

              <TouchableOpacity
                disabled={!form.clientId || !form.vehicleId}
                style={[
                  styles.submitButton,
                  (!form.clientId || !form.vehicleId) ? styles.submitButtonDisabled : null,
                  { marginTop: 12 }
                ]}
                onPress={() => setWizardStep(2)}
              >
                <Text style={styles.submitButtonText}>Avançar Serviços</Text>
              </TouchableOpacity>
            </ScrollView>
          )}

          {/* STEP 2: ADD SERVICES */}
          {wizardStep === 2 && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              <Text style={styles.inputLabel}>Adicionar Serviços ao Orçamento</Text>

              <View style={styles.searchWrapper}>
                <Search size={18} color="#64748b" style={styles.searchIcon} />
                <TextInput
                  placeholder="Filtrar serviços do catálogo..."
                  placeholderTextColor="#475569"
                  value={serviceSearch}
                  onChangeText={setServiceSearch}
                  maxLength={50}
                  style={styles.searchInput}
                />
                {serviceSearch !== '' && (
                  <TouchableOpacity onPress={() => setServiceSearch('')} style={styles.clearSearch}>
                    <X size={18} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={[styles.pickerList, { maxHeight: 320, padding: 0 }]}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                  {filteredServices.length === 0 ? (
                    <View style={styles.emptySearchWrapper}>
                      <Text style={styles.emptySearchText}>Nenhum serviço disponível</Text>
                    </View>
                  ) : (
                    filteredServices.map(s => {
                      const addedItem = form.selectedServices.find(item => item.id === s.id);
                      const qty = addedItem ? addedItem.quantity : 0;
                      const isSelected = qty > 0;

                      return (
                        <View
                          key={s.id}
                          style={[styles.catalogItemRow, isSelected ? styles.catalogItemRowActive : null]}
                        >
                          <View style={styles.catalogItemInfo}>
                            <Text style={[styles.catalogItemName, isSelected ? styles.catalogItemNameActive : null]} numberOfLines={2}>
                              {s.name}
                            </Text>
                            <Text style={styles.catalogItemMeta}>
                              {s.code ? `CÓD: ${s.code}  •  ` : ''}
                              <Text style={styles.catalogItemPrice}>{formatCurrency(s.price)}</Text>
                            </Text>
                          </View>

                          <View style={styles.qtyController}>
                            {qty > 1 && (
                              <Text style={styles.qtyLabel}>{qty}x</Text>
                            )}
                            <View style={styles.qtyButtons}>
                              <TouchableOpacity
                                onPress={() => handleUpdateServiceQty(s, qty - 1)}
                                style={styles.qtyButton}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.qtyButtonText}>-</Text>
                              </TouchableOpacity>
                              <Text style={styles.qtyValue}>{qty}</Text>
                              <TouchableOpacity
                                onPress={() => handleUpdateServiceQty(s, qty + 1)}
                                style={styles.qtyButton}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.qtyButtonText}>+</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </View>

              <View style={styles.subtotalCard}>
                <Text style={styles.subtotalLabel}>Total em Serviços:</Text>
                <Text style={styles.subtotalValue}>{formatCurrency(servicesTotal)}</Text>
              </View>

              <View style={styles.navigationRow}>
                <TouchableOpacity
                  style={[styles.submitButton, styles.buttonBack]}
                  onPress={() => setWizardStep(1)}
                >
                  <Text style={styles.submitButtonText}>Voltar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, styles.buttonNext]}
                  onPress={() => setWizardStep(3)}
                >
                  <Text style={styles.submitButtonText}>Avançar Peças</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* STEP 3: ADD PARTS */}
          {wizardStep === 3 && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              <Text style={styles.inputLabel}>Adicionar Peças ao Orçamento</Text>

              <View style={styles.searchWrapper}>
                <Search size={18} color="#64748b" style={styles.searchIcon} />
                <TextInput
                  placeholder="Filtrar peças do catálogo..."
                  placeholderTextColor="#475569"
                  value={partSearch}
                  onChangeText={setPartSearch}
                  maxLength={50}
                  style={styles.searchInput}
                />
                {partSearch !== '' && (
                  <TouchableOpacity onPress={() => setPartSearch('')} style={styles.clearSearch}>
                    <X size={18} color="#64748b" />
                  </TouchableOpacity>
                )}
              </View>

              <View style={[styles.pickerList, { maxHeight: 320, padding: 0 }]}>
                <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                  {filteredParts.length === 0 ? (
                    <View style={styles.emptySearchWrapper}>
                      <Text style={styles.emptySearchText}>Nenhuma peça disponível</Text>
                    </View>
                  ) : (
                    filteredParts.map(p => {
                      const addedItem = form.selectedParts.find(item => item.id === p.id);
                      const qty = addedItem ? addedItem.quantity : 0;
                      const isSelected = qty > 0;

                      return (
                        <View
                          key={p.id}
                          style={[styles.catalogItemRow, isSelected ? styles.catalogItemRowActive : null]}
                        >
                          <View style={styles.catalogItemInfo}>
                            <Text style={[styles.catalogItemName, isSelected ? styles.catalogItemNameActive : null]} numberOfLines={2}>
                              {p.name}
                            </Text>
                            <Text style={styles.catalogItemMeta}>
                              {p.code ? `SKU: ${p.code} ` : ''}
                              {p.stock !== undefined ? `• Est: ${p.stock} ` : ''}
                              {p.code || p.stock !== undefined ? ' •  ' : ''}
                              <Text style={styles.catalogItemPrice}>{formatCurrency(p.salePrice)}</Text>
                            </Text>
                          </View>

                          <View style={styles.qtyController}>
                            {qty > 1 && (
                              <Text style={styles.qtyLabel}>{qty}x</Text>
                            )}
                            <View style={styles.qtyButtons}>
                              <TouchableOpacity
                                onPress={() => handleUpdatePartQty(p, qty - 1)}
                                style={styles.qtyButton}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.qtyButtonText}>-</Text>
                              </TouchableOpacity>
                              <Text style={styles.qtyValue}>{qty}</Text>
                              <TouchableOpacity
                                onPress={() => handleUpdatePartQty(p, qty + 1)}
                                style={styles.qtyButton}
                                activeOpacity={0.7}
                              >
                                <Text style={styles.qtyButtonText}>+</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        </View>
                      );
                    })
                  )}
                </ScrollView>
              </View>

              <View style={styles.subtotalCard}>
                <Text style={styles.subtotalLabel}>Total em Peças:</Text>
                <Text style={styles.subtotalValue}>{formatCurrency(partsTotal)}</Text>
              </View>

              <View style={styles.navigationRow}>
                <TouchableOpacity
                  style={[styles.submitButton, styles.buttonBack]}
                  onPress={() => setWizardStep(2)}
                >
                  <Text style={styles.submitButtonText}>Voltar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, styles.buttonNext]}
                  onPress={() => setWizardStep(4)}
                >
                  <Text style={styles.submitButtonText}>Avançar Revisão</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}

          {/* STEP 4: REVIEW & CONFIRM */}
          {wizardStep === 4 && (
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 16 }}>
              <Text style={styles.inputLabel}>Observações / Diagnóstico Técnico</Text>
              <TextInput
                placeholder="Escreva problemas observados ou detalhes adicionais..."
                placeholderTextColor="#475569"
                multiline
                numberOfLines={4}
                value={form.notes}
                onChangeText={t => setForm(prev => ({ ...prev, notes: t }))}
                maxLength={1000}
                style={[styles.modalInput, { height: 100, textAlignVertical: 'top', padding: 16 }]}
              />

              <Text style={styles.inputLabel}>Status da Ordem de Serviço</Text>
              <View style={styles.pickerFakeRow}>
                {(['Aberta', 'Em andamento', 'Concluída', 'Entregue'] as OSStatus[]).map(st => (
                  <TouchableOpacity
                    key={st}
                    onPress={() => setForm(prev => ({ ...prev, status: st }))}
                    style={[styles.pickerTag, form.status === st ? styles.pickerTagActive : null]}
                  >
                    <Text style={[styles.pickerTagText, form.status === st ? styles.pickerTagActiveText : null]}>
                      {st === 'Em andamento' ? 'Andamento' : st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.inputLabel}>Revisão de Custos e Totais</Text>
              <View style={styles.totalsCard}>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Soma de Serviços:</Text>
                  <Text style={styles.totalsVal}>{formatCurrency(servicesTotal)}</Text>
                </View>
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Soma de Peças:</Text>
                  <Text style={styles.totalsVal}>{formatCurrency(partsTotal)}</Text>
                </View>
                <View style={styles.divider} />
                <View style={[styles.totalsRow, { marginTop: 4 }]}>
                  <Text style={[styles.totalsLabel, { fontWeight: 'bold', color: theme.colors.primary }]}>TOTAL GERAL:</Text>
                  <Text style={[styles.totalsVal, { fontSize: 16, color: theme.colors.success }]}>
                    {formatCurrency(grandTotal)}
                  </Text>
                </View>
              </View>

              <View style={styles.navigationRow}>
                <TouchableOpacity
                  style={[styles.submitButton, styles.buttonBack]}
                  onPress={() => setWizardStep(3)}
                >
                  <Text style={styles.submitButtonText}>Voltar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, styles.buttonSave, submitting && { opacity: 0.7 }]}
                  onPress={handleSave}
                  disabled={submitting}
                >
                  <Text style={styles.submitButtonText}>
                    {submitting ? 'Salvando...' : editingOSId ? 'Salvar Alterações' : 'Criar Ordem'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
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
    marginBottom: theme.spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  modalStepText: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 2,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 8,
  },
  stepperWrapper: {
    flexDirection: 'row',
    gap: 4,
    height: 3,
    width: '100%',
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.md,
    borderRadius: 2,
  },
  stepperBar: {
    height: '100%',
    borderRadius: 2,
    flex: 1,
    backgroundColor: 'transparent',
  },
  stepperBarActive: {
    backgroundColor: theme.colors.primary,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.textMuted,
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.md,
    height: 56,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 15,
  },
  clearSearch: {
    padding: 4,
  },
  pickerList: {
    backgroundColor: theme.colors.inputBg,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.roundness.md,
    overflow: 'hidden',
  },
  emptySearchWrapper: {
    padding: 16,
    alignItems: 'center',
  },
  emptySearchText: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  pickerItem: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  pickerItemActive: {
    backgroundColor: 'rgba(59, 102, 255, 0.1)',
  },
  pickerItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerItemTitle: {
    fontSize: 16,
    color: '#cbd5e1',
    fontWeight: 'bold',
  },
  pickerItemTitleActive: {
    color: theme.colors.primary,
  },
  pickerItemSubtitle: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  noVehiclesWrapper: {
    padding: 16,
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderStyle: 'dashed',
    alignItems: 'center',
    marginVertical: 6,
  },
  noVehiclesText: {
    fontSize: 11,
    color: theme.colors.error,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  vehiclesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 6,
  },
  vehicleCard: {
    backgroundColor: '#0a0c10',
    borderColor: theme.colors.border,
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    minWidth: '46%',
    flexGrow: 1,
  },
  vehicleCardActive: {
    backgroundColor: 'rgba(59, 102, 255, 0.1)',
    borderColor: theme.colors.primary,
  },
  vehicleCardTitle: {
    fontSize: 14,
    color: '#cbd5e1',
    fontWeight: 'bold',
  },
  vehicleCardTitleActive: {
    color: theme.colors.primary,
  },
  vehicleCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  plateBadge: {
    backgroundColor: '#334155',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  plateBadgeActive: {
    backgroundColor: theme.colors.primary,
  },
  plateText: {
    fontSize: 11,
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.roundness.md,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: theme.colors.border,
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  catalogItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 72,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  catalogItemRowActive: {
    backgroundColor: 'rgba(59, 102, 255, 0.05)',
  },
  catalogItemInfo: {
    flex: 1,
    paddingRight: 12,
  },
  catalogItemName: {
    fontSize: 14,
    color: '#f8fafc',
    fontWeight: 'bold',
  },
  catalogItemNameActive: {
    color: theme.colors.primary,
  },
  catalogItemMeta: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  catalogItemPrice: {
    color: theme.colors.success,
    fontWeight: 'bold',
  },
  qtyController: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  qtyLabel: {
    fontSize: 12,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
    marginRight: 4,
  },
  qtyButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#181c24',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#334155',
  },
  qtyButtonText: {
    color: theme.colors.white,
    fontSize: 20,
    fontWeight: 'bold',
  },
  qtyValue: {
    minWidth: 20,
    textAlign: 'center',
    color: theme.colors.white,
    fontSize: 15,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  subtotalCard: {
    backgroundColor: '#0a0c10',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subtotalLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
  },
  subtotalValue: {
    fontSize: 16,
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  navigationRow: {
    flexDirection: 'row',
    gap: 12,
  },
  buttonBack: {
    flex: 1,
    backgroundColor: theme.colors.border,
  },
  buttonNext: {
    flex: 1,
  },
  buttonSave: {
    flex: 1,
    backgroundColor: '#10b981',
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
  totalsCard: {
    padding: 16,
    backgroundColor: '#0a0c10',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 1,
  },
  totalsLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  totalsVal: {
    fontSize: 13,
    color: '#f1f5f9',
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 4,
  },
});
