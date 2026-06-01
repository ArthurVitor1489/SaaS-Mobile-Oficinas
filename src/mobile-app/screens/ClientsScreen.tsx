import React, { useState } from 'react';
import { Search, Plus, UserPlus, Car, History, ChevronRight, X, ArrowLeft, Phone, Mail, MapPin, Trash2, Edit2, Check } from 'lucide-react';
import { useDatabase, Client, Vehicle, WorkOrder } from '../context/DatabaseContext';

export const ClientsScreen: React.FC = () => {
  const { 
    clients, vehicles, workOrders, 
    addClient, updateClient, deleteClient,
    addVehicle, deleteVehicle 
  } = useDatabase();

  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [activeTab, setActiveTab] = useState<'vehicles' | 'history'>('vehicles');
  
  // Modals / Overlay States
  const [isAddingClient, setIsAddingClient] = useState(false);
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);

  // New Client Form State
  const [clientForm, setClientForm] = useState({
    name: '', cpfCnpj: '', phone: '', whatsapp: '', email: '', address: '', notes: ''
  });

  // New Vehicle Form State
  const [vehicleForm, setVehicleForm] = useState({
    plate: '', brand: '', model: '', year: '', chassis: '', odometer: ''
  });

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // --- FILTERS ---
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.cpfCnpj.includes(search) ||
    c.phone.includes(search) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  // Vehicles for selected client
  const clientVehicles = selectedClient 
    ? vehicles.filter(v => v.clientId === selectedClient.id) 
    : [];

  // Work Orders for selected client
  const clientWorkOrders = selectedClient 
    ? workOrders.filter(o => o.clientId === selectedClient.id) 
    : [];

  // Total spent by client
  const totalSpent = clientWorkOrders.reduce((acc, o) => acc + o.grandTotal, 0);

  // --- ACTIONS ---
  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name || !clientForm.phone) return alert('Por favor, insira o nome e telefone!');
    
    // Autofill whatsapp if empty
    const clientData = {
      ...clientForm,
      whatsapp: clientForm.whatsapp || clientForm.phone
    };

    const newClient = addClient(clientData);
    setIsAddingClient(false);
    setClientForm({ name: '', cpfCnpj: '', phone: '', whatsapp: '', email: '', address: '', notes: '' });
    setSelectedClient(newClient); // Direct open new client profile
  };

  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient) return;
    if (!vehicleForm.plate || !vehicleForm.model || !vehicleForm.brand) {
      return alert('Preencha os campos obrigatórios (Placa, Marca, Modelo)!');
    }

    addVehicle({
      clientId: selectedClient.id,
      plate: vehicleForm.plate.toUpperCase(),
      brand: vehicleForm.brand,
      model: vehicleForm.model,
      year: vehicleForm.year || new Date().getFullYear().toString(),
      chassis: vehicleForm.chassis,
      odometer: vehicleForm.odometer || '0'
    });

    setIsAddingVehicle(false);
    setVehicleForm({ plate: '', brand: '', model: '', year: '', chassis: '', odometer: '' });
  };

  const handleDeleteClient = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este cliente? Todos os veículos associados serão excluídos.')) {
      deleteClient(id);
      setSelectedClient(null);
    }
  };

  return (
    <div className="relative flex flex-col h-full overflow-hidden select-none">
      
      {/* 1. MAIN SCREEN: CLIENTS DIRECTORY */}
      {!selectedClient && !isAddingClient && (
        <div className="flex flex-col space-y-4 h-full animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-100 font-sans tracking-tight">Clientes</h2>
              <p className="text-xs text-slate-400">Gerencie a carteira de clientes e veículos</p>
            </div>
            <button
              onClick={() => setIsAddingClient(true)}
              className="p-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-premium flex items-center justify-center gap-1 text-xs font-semibold transition-all active:scale-95"
            >
              <UserPlus size={15} />
              Novo
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-dark-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Buscar por nome, placa, CPF ou tel..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-dark-500 hover:text-white">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Clients List */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-2 pb-16">
            {filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <span className="text-3xl">👥</span>
                <h4 className="text-xs font-bold text-slate-300 mt-2">Nenhum cliente encontrado</h4>
                <p className="text-[10px] text-dark-500 mt-1 max-w-[200px]">Crie um novo cadastro usando o botão "Novo" acima.</p>
              </div>
            ) : (
              filteredClients.map(client => {
                const totalCars = vehicles.filter(v => v.clientId === client.id).length;
                return (
                  <div
                    key={client.id}
                    onClick={() => {
                      setSelectedClient(client);
                      setActiveTab('vehicles');
                    }}
                    className="bg-dark-900 border border-dark-800 rounded-xl p-3 flex items-center justify-between hover:border-dark-700 cursor-pointer transition-colors active:bg-dark-800/50"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-xs text-slate-200">{client.name}</div>
                      <div className="text-[10px] text-dark-400 flex items-center gap-2">
                        <span>{client.phone}</span>
                        <span className="w-1 h-1 rounded-full bg-dark-600" />
                        <span className="text-brand-400 font-semibold">{totalCars} {totalCars === 1 ? 'carro' : 'carros'}</span>
                      </div>
                    </div>
                    <ChevronRight size={14} className="text-dark-500" />
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. OVERLAY FORM: ADD NEW CLIENT */}
      {isAddingClient && (
        <div className="flex flex-col h-full bg-dark-950 animate-slide-in-right">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-dark-800 pb-3 mb-4">
            <button onClick={() => setIsAddingClient(false)} className="p-1 hover:bg-dark-800 text-slate-300 rounded-lg transition-colors">
              <ArrowLeft size={16} />
            </button>
            <h3 className="text-sm font-bold text-slate-100">Cadastrar Novo Cliente</h3>
          </div>

          {/* Form */}
          <form onSubmit={handleCreateClient} className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-20">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-dark-400">Nome Completo *</label>
              <input
                type="text"
                required
                placeholder="Ex: João da Silva"
                value={clientForm.name}
                onChange={e => setClientForm(prev => ({ ...prev, name: e.target.value }))}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-dark-400">CPF / CNPJ</label>
                <input
                  type="text"
                  placeholder="Ex: 123.456.789-00"
                  value={clientForm.cpfCnpj}
                  onChange={e => setClientForm(prev => ({ ...prev, cpfCnpj: e.target.value }))}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-dark-400">E-mail</label>
                <input
                  type="email"
                  placeholder="Ex: joao@email.com"
                  value={clientForm.email}
                  onChange={e => setClientForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-dark-400">Telefone Fixo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: (11) 4000-0000"
                  value={clientForm.phone}
                  onChange={e => setClientForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-dark-400">WhatsApp (Celular)</label>
                <input
                  type="text"
                  placeholder="Ex: (11) 99999-9999"
                  value={clientForm.whatsapp}
                  onChange={e => setClientForm(prev => ({ ...prev, whatsapp: e.target.value }))}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-dark-400">Endereço Residencial</label>
              <input
                type="text"
                placeholder="Ex: Rua das Flores, 123 - Centro"
                value={clientForm.address}
                onChange={e => setClientForm(prev => ({ ...prev, address: e.target.value }))}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-dark-400">Observações Internas</label>
              <textarea
                placeholder="Notas sobre prazos, faturamento, comportamento..."
                value={clientForm.notes}
                onChange={e => setClientForm(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-colors resize-none"
              />
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingClient(false)}
                className="flex-1 py-2.5 text-xs bg-dark-800 hover:bg-dark-700 text-slate-300 font-semibold rounded-xl transition-colors"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 text-xs bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl shadow-premium transition-all active:scale-98"
              >
                Salvar Cliente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. PROFILE SCREEN: CLIENT DETAILED PROFILE (WITH TABS) */}
      {selectedClient && !isAddingVehicle && (
        <div className="flex flex-col h-full bg-dark-950 animate-slide-in-right overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-dark-800 pb-3 mb-3">
            <button onClick={() => setSelectedClient(null)} className="p-1 hover:bg-dark-800 text-slate-300 rounded-lg flex items-center gap-1 text-xs transition-colors">
              <ArrowLeft size={16} />
              Voltar
            </button>
            <button
              onClick={() => handleDeleteClient(selectedClient.id)}
              className="p-1.5 hover:bg-danger-500/10 text-danger-500 hover:text-danger-600 rounded-lg transition-colors"
            >
              <Trash2 size={15} />
            </button>
          </div>

          {/* Quick Info card */}
          <div className="bg-dark-900 border border-dark-800 rounded-xl p-3.5 space-y-2 mb-3">
            <h3 className="text-sm font-bold text-slate-100">{selectedClient.name}</h3>
            <div className="text-[10px] text-dark-300 space-y-1 font-medium">
              <div className="flex items-center gap-2"><Phone size={12} className="text-dark-500" /> {selectedClient.phone} {selectedClient.whatsapp && <span className="text-[9px] px-1 bg-emerald-500/10 text-emerald-500 rounded">Whats</span>}</div>
              <div className="flex items-center gap-2"><Mail size={12} className="text-dark-500" /> {selectedClient.email || 'Nenhum e-mail cadastrado'}</div>
              <div className="flex items-center gap-2"><MapPin size={12} className="text-dark-500" /> <span className="line-clamp-1">{selectedClient.address || 'Sem endereço'}</span></div>
            </div>
            {selectedClient.notes && (
              <div className="bg-dark-950/60 p-2 rounded-lg border border-dark-800 text-[9px] text-dark-400 mt-2 italic">
                Obs: "{selectedClient.notes}"
              </div>
            )}
            <div className="border-t border-dark-800 pt-2 flex justify-between items-center text-[9px]">
              <span className="text-dark-400 font-bold uppercase">Consumo Total:</span>
              <span className="font-extrabold text-brand-400">{formatCurrency(totalSpent)}</span>
            </div>
          </div>

          {/* Sliding Tabs Switcher */}
          <div className="flex border-b border-dark-800 mb-3 bg-dark-900 rounded-lg p-0.75 gap-0.5">
            <button
              onClick={() => setActiveTab('vehicles')}
              className={`flex-1 py-1.5 rounded-md font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all ${activeTab === 'vehicles' ? 'bg-brand-500 text-white shadow-premium' : 'text-dark-400 hover:text-slate-200'}`}
            >
              <Car size={13} />
              Veículos ({clientVehicles.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-1.5 rounded-md font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all ${activeTab === 'history' ? 'bg-brand-500 text-white shadow-premium' : 'text-dark-400 hover:text-slate-200'}`}
            >
              <History size={13} />
              Histórico ({clientWorkOrders.length})
            </button>
          </div>

          {/* Tab Content Box */}
          <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
            {/* 3a. VEICULOS TAB */}
            {activeTab === 'vehicles' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Carros Registrados</span>
                  <button
                    onClick={() => setIsAddingVehicle(true)}
                    className="py-1 px-2.5 bg-brand-500/10 hover:bg-brand-500 text-brand-400 hover:text-white rounded-lg text-[9px] font-bold flex items-center gap-1 transition-all"
                  >
                    <Plus size={10} />
                    Adicionar Veículo
                  </button>
                </div>

                {clientVehicles.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 bg-dark-900 border border-dark-800 border-dashed rounded-xl text-center">
                    <span className="text-2xl">🚗</span>
                    <h5 className="text-[10px] font-bold text-slate-400 mt-2">Nenhum carro cadastrado</h5>
                    <p className="text-[9px] text-dark-500 mt-1 max-w-[150px]">Cadastre o primeiro carro deste cliente acima.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clientVehicles.map(veh => (
                      <div key={veh.id} className="bg-dark-900 border border-dark-800 rounded-xl p-3 flex justify-between items-center relative overflow-hidden group">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-slate-100">{veh.brand} {veh.model}</span>
                            <span className="text-[9px] font-black bg-slate-200 text-dark-900 px-1.5 py-0.25 rounded border border-dark-700 tracking-wider">
                              {veh.plate}
                            </span>
                          </div>
                          <div className="text-[9px] text-dark-400 font-medium">
                            Ano: {veh.year} • Km: {Number(veh.odometer).toLocaleString('pt-BR')} km
                          </div>
                          {veh.chassis && (
                            <div className="text-[8px] text-dark-500 font-mono">
                              Chassi: {veh.chassis}
                            </div>
                          )}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Excluir este veículo?')) deleteVehicle(veh.id);
                          }}
                          className="p-1 text-dark-500 hover:text-danger-500 transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3b. HISTORICO TAB */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider block">Histórico de Consertos</span>
                
                {clientWorkOrders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 bg-dark-900 border border-dark-800 border-dashed rounded-xl text-center">
                    <span className="text-2xl">📋</span>
                    <h5 className="text-[10px] font-bold text-slate-400 mt-2">Nenhum serviço realizado</h5>
                    <p className="text-[9px] text-dark-500 mt-1 max-w-[150px]">Abra a primeira Ordem de Serviço deste cliente na aba de OS.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {clientWorkOrders.map(os => {
                      const veh = vehicles.find(v => v.id === os.vehicleId);
                      return (
                        <div key={os.id} className="bg-dark-900 border border-dark-800 rounded-xl p-3 space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-xs text-brand-400">{os.osNumber}</span>
                            <span className="text-[9px] text-dark-400 font-medium">{os.date.split('-').reverse().join('/')}</span>
                          </div>
                          <div className="text-[10px] text-slate-300 font-semibold leading-tight">
                            Veículo: <span className="text-slate-200 font-bold">{veh?.brand} {veh?.model} ({veh?.plate})</span>
                          </div>
                          
                          {/* Services/Parts items lists */}
                          <div className="space-y-1 bg-dark-950/60 p-2 rounded-lg border border-dark-800/80 text-[8px] text-dark-400">
                            {os.services.map(s => (
                              <div key={s.id} className="flex justify-between">
                                <span className="flex items-center gap-1.5 flex-wrap">
                                  <span>{s.name}</span>
                                  {s.code && (
                                    <span className="text-[7px] font-mono bg-dark-950 border border-dark-800 text-dark-500 px-1 py-0.25 rounded uppercase">
                                      {s.code}
                                    </span>
                                  )}
                                </span>
                                <span className="font-semibold text-slate-300">{formatCurrency(s.price)}</span>
                              </div>
                            ))}
                            {os.parts.map(p => (
                              <div key={p.id} className="flex justify-between">
                                <span>{p.name} (x{p.quantity})</span>
                                <span className="font-semibold text-slate-300">{formatCurrency(p.salePrice * p.quantity)}</span>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex justify-between items-center pt-1 border-t border-dark-800 text-[10px] font-bold">
                            <span className="text-dark-400">STATUS: {os.status.toUpperCase()}</span>
                            <span className="text-slate-200">{formatCurrency(os.grandTotal)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. OVERLAY FORM: ADD NEW VEHICLE */}
      {selectedClient && isAddingVehicle && (
        <div className="flex flex-col h-full bg-dark-950 animate-slide-in-right">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-dark-800 pb-3 mb-4">
            <button onClick={() => setIsAddingVehicle(false)} className="p-1 hover:bg-dark-800 text-slate-300 rounded-lg transition-colors">
              <ArrowLeft size={16} />
            </button>
            <h3 className="text-sm font-bold text-slate-100">Novo Veículo para {selectedClient.name}</h3>
          </div>

          {/* Form */}
          <form onSubmit={handleCreateVehicle} className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-20">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-dark-400">Placa *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: ABC1234 ou ABC1A23"
                  value={vehicleForm.plate}
                  onChange={e => setVehicleForm(prev => ({ ...prev, plate: e.target.value }))}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-colors uppercase"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-dark-400">Ano Modelo</label>
                <input
                  type="text"
                  placeholder="Ex: 2021"
                  value={vehicleForm.year}
                  onChange={e => setVehicleForm(prev => ({ ...prev, year: e.target.value }))}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-dark-400">Marca *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Toyota"
                  value={vehicleForm.brand}
                  onChange={e => setVehicleForm(prev => ({ ...prev, brand: e.target.value }))}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-dark-400">Modelo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Corolla XEi"
                  value={vehicleForm.model}
                  onChange={e => setVehicleForm(prev => ({ ...prev, model: e.target.value }))}
                  className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-dark-400">Quilometragem Atual (Odomêtro)</label>
              <input
                type="number"
                placeholder="Ex: 42000"
                value={vehicleForm.odometer}
                onChange={e => setVehicleForm(prev => ({ ...prev, odometer: e.target.value }))}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-dark-400">Código do Chassi (VIN)</label>
              <input
                type="text"
                placeholder="Ex: 9BR1234567..."
                value={vehicleForm.chassis}
                onChange={e => setVehicleForm(prev => ({ ...prev, chassis: e.target.value }))}
                className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 transition-colors uppercase"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddingVehicle(false)}
                className="flex-1 py-2.5 text-xs bg-dark-800 hover:bg-dark-700 text-slate-300 font-semibold rounded-xl transition-colors"
              >
                Voltar
              </button>
              <button
                type="submit"
                className="flex-1 py-2.5 text-xs bg-brand-500 hover:bg-brand-600 text-white font-semibold rounded-xl shadow-premium transition-all active:scale-98"
              >
                Salvar Veículo
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
