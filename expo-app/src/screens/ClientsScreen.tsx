import React, { useMemo } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { Search, X, UserPlus, ChevronRight, ArrowLeft, Edit2, Trash2, Car } from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme } from '../styles/theme';
import { formatCurrency, formatDate } from '../utils/formatters';
import { Client, Vehicle, WorkOrder } from '../types';

interface ClientsScreenProps {
  selectedClient: Client | null;
  setSelectedClient: (client: Client | null) => void;
  activeClientTab: 'vehicles' | 'history';
  setActiveClientTab: (tab: 'vehicles' | 'history') => void;
  clientTabSearch: string;
  setClientTabSearch: (search: string) => void;
  onAddClient: () => void;
  onEditClient: (client: Client) => void;
  onAddVehicle: () => void;
  onEditVehicle: (vehicle: Vehicle) => void;
  handleShareOS: (os: WorkOrder) => void;
}

export default function ClientsScreen({
  selectedClient,
  setSelectedClient,
  activeClientTab,
  setActiveClientTab,
  clientTabSearch,
  setClientTabSearch,
  onAddClient,
  onEditClient,
  onAddVehicle,
  onEditVehicle,
  handleShareOS,
}: ClientsScreenProps) {
  const { clients, vehicles, workOrders, deleteClient, deleteVehicle } = useDatabase();

  const filteredClients = useMemo(() => {
    return clients.filter(c =>
      c.name.toLowerCase().includes(clientTabSearch.toLowerCase()) ||
      (c.phone && c.phone.toLowerCase().includes(clientTabSearch.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(clientTabSearch.toLowerCase())) ||
      (c.cpfCnpj && c.cpfCnpj.includes(clientTabSearch))
    );
  }, [clients, clientTabSearch]);

  const clientCars = useMemo(() => {
    if (!selectedClient) return [];
    return vehicles.filter(v => v.clientId === selectedClient.id);
  }, [vehicles, selectedClient]);

  const clientOSHistory = useMemo(() => {
    if (!selectedClient) return [];
    return workOrders.filter(o => o.clientId === selectedClient.id);
  }, [workOrders, selectedClient]);

  const handleDeleteClientClick = () => {
    if (!selectedClient) return;
    Alert.alert(
      'Excluir Cliente',
      'Tem certeza que deseja excluir este cliente e todos os seus veículos associados?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteClient(selectedClient.id);
            if (success) {
              setSelectedClient(null);
              Alert.alert('Sucesso', 'Cliente excluído com sucesso!');
            }
          }
        }
      ]
    );
  };

  const handleDeleteVehicleClick = (carId: string) => {
    Alert.alert(
      'Excluir Veículo',
      'Deseja desvincular este veículo da frota do cliente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteVehicle(carId);
            if (success) {
              Alert.alert('Sucesso', 'Veículo removido com sucesso!');
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.screenHeader}>
        <Text style={styles.tabTitle}>Clientes e Veículos</Text>
        {!selectedClient && (
          <TouchableOpacity style={styles.actionButton} onPress={onAddClient}>
            <UserPlus size={16} color="#fff" />
            <Text style={styles.actionButtonText}>Novo Cliente</Text>
          </TouchableOpacity>
        )}
      </View>

      {!selectedClient ? (
        <View style={{ flex: 1 }}>
          {/* Client Search Bar */}
          <View style={styles.searchBarWrapper}>
            <Search size={14} color="#64748b" style={{ marginRight: 6 }} />
            <TextInput
              placeholder="Buscar por nome, telefone, CPF/CNPJ..."
              placeholderTextColor="#475569"
              value={clientTabSearch}
              onChangeText={setClientTabSearch}
              style={styles.searchBarInput}
            />
            {clientTabSearch !== '' && (
              <TouchableOpacity onPress={() => setClientTabSearch('')}>
                <X size={14} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>

          {/* Clients List */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {filteredClients.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  {clients.length === 0 ? 'Nenhum cliente cadastrado.' : 'Nenhum cliente encontrado.'}
                </Text>
              </View>
            ) : (
              filteredClients.map(client => {
                const cars = vehicles.filter(v => v.clientId === client.id);
                const totalCars = cars.length;
                return (
                  <TouchableOpacity
                    key={client.id}
                    style={styles.clientListItemCard}
                    onPress={() => {
                      setSelectedClient(client);
                      setActiveClientTab('vehicles');
                    }}
                  >
                    <View style={{ flex: 1, gap: 6 }}>
                      <Text style={styles.clientNameText}>{client.name}</Text>
                      <View style={styles.clientListItemMeta}>
                        <Text style={styles.clientListItemPhone}>{client.phone}</Text>
                        <View style={styles.dotSeparator} />
                        <View style={styles.carsBadge}>
                          <Text style={styles.carsBadgeText}>
                            {totalCars} {totalCars === 1 ? 'VEÍCULO' : 'VEÍCULOS'}
                          </Text>
                        </View>
                      </View>
                      {totalCars > 0 && (
                        <View style={styles.platesRow}>
                          {cars.map(c => (
                            <Text key={c.id} style={styles.plateItemBadge}>
                              {c.plate}
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                    <ChevronRight size={18} color="#64748b" />
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      ) : (
        // Client Profile Details
        <View style={styles.profileCard}>
          <View style={styles.profileHeaderRow}>
            <TouchableOpacity
              onPress={() => setSelectedClient(null)}
              style={styles.backButton}
            >
              <ArrowLeft size={16} color={theme.colors.primary} />
              <Text style={styles.backButtonText}>Voltar à Lista</Text>
            </TouchableOpacity>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => onEditClient(selectedClient)}
              >
                <Edit2 size={12} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={handleDeleteClientClick}
              >
                <Trash2 size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          <Text style={styles.profileClientName}>{selectedClient.name}</Text>
          <Text style={styles.profileDetailText}>Tel: {selectedClient.phone} | WhatsApp: {selectedClient.whatsapp}</Text>
          <Text style={styles.profileDetailText}>E-mail: {selectedClient.email || 'N/A'}</Text>
          <Text style={styles.profileDetailText}>Endereço: {selectedClient.address || 'N/A'}</Text>

          {selectedClient.notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>OBSERVAÇÕES DO CLIENTE</Text>
              <Text style={styles.notesText}>{selectedClient.notes}</Text>
            </View>
          ) : null}

          <View style={styles.segmentContainer}>
            <TouchableOpacity
              onPress={() => setActiveClientTab('vehicles')}
              style={[styles.segmentTab, activeClientTab === 'vehicles' ? styles.segmentTabActive : null]}
            >
              <Text style={[styles.segmentTabText, activeClientTab === 'vehicles' ? styles.segmentTabTextActive : null]}>
                Veículos
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveClientTab('history')}
              style={[styles.segmentTab, activeClientTab === 'history' ? styles.segmentTabActive : null]}
            >
              <Text style={[styles.segmentTabText, activeClientTab === 'history' ? styles.segmentTabTextActive : null]}>
                Histórico OS
              </Text>
            </TouchableOpacity>
          </View>

          {activeClientTab === 'vehicles' ? (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0, maxHeight: 220 }}>
              <View style={styles.tabSectionHeader}>
                <Text style={styles.sectionTitle}>FROTA VINCULADA</Text>
                <TouchableOpacity style={styles.actionButtonSmall} onPress={onAddVehicle}>
                  <Car size={12} color="#fff" />
                  <Text style={styles.actionButtonTextSmall}>+ Carro</Text>
                </TouchableOpacity>
              </View>

              {clientCars.length === 0 ? (
                <Text style={styles.emptyTabMessage}>Nenhum veículo associado.</Text>
              ) : (
                clientCars.map(car => (
                  <View key={car.id} style={styles.carRow}>
                    <View style={styles.carRowLeft}>
                      <Car size={14} color={theme.colors.primary} />
                      <View style={{ marginLeft: 8, flex: 1 }}>
                        <Text style={styles.carTextName}>{car.brand} {car.model} ({car.year})</Text>
                        <Text style={styles.carTextMeta}>Placa: {car.plate} | Km: {car.odometer}</Text>
                      </View>
                    </View>
                    
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <TouchableOpacity
                        style={styles.carActionEdit}
                        onPress={() => onEditVehicle(car)}
                      >
                        <Edit2 size={10} color={theme.colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.carActionDelete}
                        onPress={() => handleDeleteVehicleClick(car.id)}
                      >
                        <Trash2 size={10} color={theme.colors.error} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={{ flexGrow: 0, maxHeight: 220 }}>
              <Text style={styles.sectionTitle}>HISTÓRICO COMPLETO</Text>
              {clientOSHistory.length === 0 ? (
                <Text style={styles.emptyTabMessage}>Nenhuma OS encontrada para este cliente.</Text>
              ) : (
                clientOSHistory.map(os => (
                  <TouchableOpacity
                    key={os.id}
                    style={styles.osHistoryListItem}
                    onPress={() => handleShareOS(os)}
                  >
                    <View>
                      <Text style={styles.osHistoryNum}>{os.osNumber}</Text>
                      <Text style={styles.osHistoryDate}>{formatDate(os.date)}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.osHistoryTotal}>{formatCurrency(os.grandTotal)}</Text>
                      <Text style={styles.osHistoryStatus}>{os.status}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
  },
  screenHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  tabTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  actionButton: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.roundness.sm,
    minHeight: 48,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 13,
  },
  actionButtonSmall: {
    backgroundColor: theme.colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  actionButtonTextSmall: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: 11,
  },
  searchBarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.border,
    borderRadius: theme.roundness.md,
    paddingHorizontal: 12,
    height: 56,
    marginBottom: theme.spacing.md,
  },
  searchBarInput: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 14,
  },
  emptyContainer: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    padding: theme.spacing.xl,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    textAlign: 'center',
  },
  clientListItemCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    padding: 18,
    marginBottom: theme.spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  clientNameText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  clientListItemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  clientListItemPhone: {
    fontSize: 12,
    color: theme.colors.textDim,
  },
  dotSeparator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#475569',
  },
  carsBadge: {
    backgroundColor: 'rgba(59, 102, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: 'rgba(59, 102, 255, 0.3)',
  },
  carsBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  platesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  plateItemBadge: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#cbd5e1',
    backgroundColor: '#272e3f',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  profileCard: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.roundness.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  backButtonText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  editBtn: {
    padding: 8,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: theme.colors.error,
    borderRadius: 8,
  },
  profileClientName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 6,
  },
  profileDetailText: {
    fontSize: 13,
    color: theme.colors.textDim,
    marginBottom: 4,
  },
  notesBox: {
    backgroundColor: '#0a0c10',
    padding: 8,
    borderRadius: 8,
    marginVertical: 8,
  },
  notesLabel: {
    fontSize: 8,
    color: theme.colors.textMuted,
    fontWeight: 'bold',
  },
  notesText: {
    fontSize: 10,
    color: '#cbd5e1',
    marginTop: 2,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    padding: 4,
    borderRadius: theme.roundness.sm,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: theme.roundness.sm,
    minHeight: 40,
    justifyContent: 'center',
  },
  segmentTabActive: {
    backgroundColor: theme.colors.card,
  },
  segmentTabText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.textMuted,
  },
  segmentTabTextActive: {
    color: theme.colors.primary,
  },
  tabSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '900',
    color: theme.colors.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  emptyTabMessage: {
    fontSize: 12,
    color: theme.colors.textMuted,
    textAlign: 'center',
    paddingVertical: 12,
  },
  carRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    borderRadius: theme.roundness.sm,
    marginBottom: 8,
  },
  carRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  carTextName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#cbd5e1',
  },
  carTextMeta: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  carActionEdit: {
    padding: 6,
    backgroundColor: 'rgba(59, 102, 255, 0.1)',
    borderRadius: 6,
  },
  carActionDelete: {
    padding: 6,
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 6,
  },
  osHistoryListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 10,
    borderRadius: theme.roundness.sm,
    marginBottom: 8,
  },
  osHistoryNum: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  osHistoryDate: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
  osHistoryTotal: {
    fontSize: 13,
    fontWeight: 'bold',
    color: theme.colors.white,
  },
  osHistoryStatus: {
    fontSize: 10,
    color: theme.colors.textMuted,
    marginTop: 2,
  },
});
