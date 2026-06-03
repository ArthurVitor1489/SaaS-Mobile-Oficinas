import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Search, X, UserPlus, ChevronRight } from 'lucide-react-native';
import { useDatabase } from '../context/DatabaseContext';
import { theme } from '../styles/theme';
import { useNavigation } from '@react-navigation/native';
import ClientModal from '../components/ClientModal';

export default function ClientsListScreen() {
  const navigation = useNavigation<any>();
  const { clients, vehicles, addClient } = useDatabase();
  const [clientTabSearch, setClientTabSearch] = useState('');
  const [clientModalVisible, setClientModalVisible] = useState(false);

  const filteredClients = useMemo(() => {
    return clients.filter(c =>
      c.name.toLowerCase().includes(clientTabSearch.toLowerCase()) ||
      (c.phone && c.phone.toLowerCase().includes(clientTabSearch.toLowerCase())) ||
      (c.email && c.email.toLowerCase().includes(clientTabSearch.toLowerCase())) ||
      (c.cpfCnpj && c.cpfCnpj.includes(clientTabSearch))
    );
  }, [clients, clientTabSearch]);

  const handleOpenClientModalForCreate = () => {
    setClientModalVisible(true);
  };

  const handleClientSubmit = async (form: any) => {
    const client = await addClient(form);
    return !!client;
  };

  return (
    <View style={styles.screenContainer}>
      <View style={styles.screenHeader}>
        <Text style={styles.tabTitle}>Clientes e Veículos</Text>
        <TouchableOpacity style={styles.actionButton} onPress={handleOpenClientModalForCreate}>
          <UserPlus size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Novo Cliente</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flex: 1 }}>
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
                    navigation.navigate('ClientDetail', { clientId: client.id });
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

      <ClientModal 
        visible={clientModalVisible}
        editingClientId={null}
        initialForm={null}
        onClose={() => setClientModalVisible(false)}
        onSubmit={handleClientSubmit}
      />
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
});
