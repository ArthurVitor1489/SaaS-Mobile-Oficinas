import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, StyleSheet } from 'react-native';
import { ArrowLeft, Edit2, Trash2, Car } from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme } from '../styles/theme';
import { formatDate, formatCurrency } from '../utils/formatters';
import { useNavigation, useRoute } from '@react-navigation/native';
import ClientModal from '../components/ClientModal';
import VehicleModal from '../components/VehicleModal';
import { Client, Vehicle, WorkOrder } from '../types';

export default function ClientDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { clientId } = route.params;

  const {
    clients,
    vehicles,
    workOrders,
    updateClient,
    deleteClient,
    addVehicle,
    updateVehicle,
    deleteVehicle
  } = useDatabase();

  const [activeClientTab, setActiveClientTab] = useState<'vehicles' | 'history'>('vehicles');

  // Modals Visibility and Forms Trackers
  const [clientModalVisible, setClientModalVisible] = useState(false);
  const [clientInitialForm, setClientInitialForm] = useState<any>(null);

  const [vehicleModalVisible, setVehicleModalVisible] = useState(false);
  const [editingVehicleId, setEditingVehicleId] = useState<string | null>(null);
  const [vehicleInitialForm, setVehicleInitialForm] = useState<any>(null);

  const client = useMemo(() => clients.find(c => c.id === clientId), [clients, clientId]);

  const clientCars = useMemo(() => {
    return vehicles.filter(v => v.clientId === clientId);
  }, [vehicles, clientId]);

  const clientOSHistory = useMemo(() => {
    return workOrders.filter(o => o.clientId === clientId);
  }, [workOrders, clientId]);

  if (!client) {
    return (
      <View style={[styles.screenContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: theme.colors.textMuted }}>Cliente não encontrado.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { marginTop: 12 }]}>
          <Text style={styles.backButtonText}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const handleOpenClientModalForEdit = () => {
    setClientInitialForm({
      name: client.name,
      cpfCnpj: client.cpfCnpj || '',
      phone: client.phone,
      whatsapp: client.whatsapp || '',
      email: client.email || '',
      address: client.address || '',
      notes: client.notes || ''
    });
    setClientModalVisible(true);
  };

  const handleClientSubmit = async (form: any) => {
    const success = await updateClient(clientId, form);
    if (success) {
      Alert.alert('Sucesso', 'Cliente atualizado com sucesso!');
    }
    return success;
  };

  const handleOpenVehicleModalForCreate = () => {
    setEditingVehicleId(null);
    setVehicleInitialForm(null);
    setVehicleModalVisible(true);
  };

  const handleOpenVehicleModalForEdit = (vehicle: Vehicle) => {
    setEditingVehicleId(vehicle.id);
    setVehicleInitialForm({
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      chassis: vehicle.chassis || '',
      odometer: vehicle.odometer
    });
    setVehicleModalVisible(true);
  };

  const handleVehicleSubmit = async (form: any) => {
    let success = false;
    if (editingVehicleId) {
      success = await updateVehicle(editingVehicleId, {
        ...form,
        clientId: clientId
      });
      if (success) {
        Alert.alert('Sucesso', 'Veículo atualizado com sucesso!');
      }
    } else {
      const v = await addVehicle({
        ...form,
        clientId: clientId
      });
      success = !!v;
      if (success) {
        Alert.alert('Sucesso', 'Veículo cadastrado!');
      }
    }
    return success;
  };

  const handleDeleteClientClick = () => {
    Alert.alert(
      'Excluir Cliente',
      'Tem certeza que deseja excluir este cliente e todos os seus veículos associados?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteClient(clientId);
            if (success) {
              navigation.goBack();
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
      <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }}>
        <View style={styles.profileCard}>
        <View style={styles.profileHeaderRow}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <ArrowLeft size={16} color={theme.colors.primary} />
            <Text style={styles.backButtonText}>Voltar à Lista</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={handleOpenClientModalForEdit}
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

        <Text style={styles.profileClientName}>{client.name}</Text>
        <Text style={styles.profileDetailText}>Tel: {client.phone} | WhatsApp: {client.whatsapp || 'Não cadastrado'}</Text>
        <Text style={styles.profileDetailText}>E-mail: {client.email || 'Não informado'}</Text>
        <Text style={styles.profileDetailText}>Endereço: {client.address || 'Não informado'}</Text>

        {client.notes ? (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>OBSERVAÇÕES DO CLIENTE</Text>
            <Text style={styles.notesText}>{client.notes}</Text>
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
          <View>
            <View style={styles.tabSectionHeader}>
              <Text style={styles.sectionTitle}>FROTA VINCULADA</Text>
              <TouchableOpacity style={styles.actionButtonSmall} onPress={handleOpenVehicleModalForCreate}>
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
                      onPress={() => handleOpenVehicleModalForEdit(car)}
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
          </View>
        ) : (
          <View>
            <Text style={styles.sectionTitle}>HISTÓRICO COMPLETO</Text>
            {clientOSHistory.length === 0 ? (
              <Text style={styles.emptyTabMessage}>Nenhuma OS encontrada para este cliente.</Text>
            ) : (
              clientOSHistory.map(os => (
                <TouchableOpacity
                  key={os.id}
                  style={styles.osHistoryListItem}
                  onPress={() => {
                    navigation.navigate('OSTab', {
                      screen: 'OSDetail',
                      params: { osId: os.id }
                    });
                  }}
                >
                  <View>
                    <Text style={styles.osHistoryNum}>{os.osNumber}</Text>
                    <Text style={styles.osHistoryDate}>{formatDate(os.date)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.osHistoryTotal}>{formatCurrency(os.grandTotal)}</Text>
                    <Text style={styles.osHistoryStatus}>{os.status === 'Em andamento' ? 'Andamento' : os.status}</Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>

      <ClientModal 
        visible={clientModalVisible}
        editingClientId={clientId}
        initialForm={clientInitialForm}
        onClose={() => setClientModalVisible(false)}
        onSubmit={handleClientSubmit}
      />

      <VehicleModal 
        visible={vehicleModalVisible}
        editingVehicleId={editingVehicleId}
        initialForm={vehicleInitialForm}
        clientName={client.name}
        onClose={() => setVehicleModalVisible(false)}
        onSubmit={handleVehicleSubmit}
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
