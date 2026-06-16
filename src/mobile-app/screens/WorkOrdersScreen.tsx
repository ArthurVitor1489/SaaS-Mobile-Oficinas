import React, { useState } from 'react';
import { 
  Search, Plus, ClipboardCheck, ArrowLeft, ChevronRight, CheckCircle, 
  Clock, Play, AlertCircle, Eye, FileText, PenTool, Check, DollarSign, AlertTriangle, X, Edit2, Trash2 
} from 'lucide-react';
import { useDatabase, WorkOrder, Client, Vehicle, OSStatus, OSItemService, OSItemPart } from '../context/DatabaseContext';
import { SignaturePad } from '../components/SignaturePad';
import { PDFViewer } from '../components/PDFViewer';

export const WorkOrdersScreen: React.FC = () => {
  const { 
    workOrders, clients, vehicles, services: serviceCatalog, parts: partCatalog, settings, billings,
    addWorkOrder, updateWorkOrder, updateWorkOrderStatus, saveWorkOrderSignature, addBilling, deleteWorkOrder 
  } = useDatabase();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<OSStatus | 'Todos'>('Todos');
  
  // OS Detailed View State
  const [selectedOS, setSelectedOS] = useState<WorkOrder | null>(null);
  
  // Overlays / Sub-States
  const [isCreatingOS, setIsCreatingOS] = useState(false);
  const [editingOSId, setEditingOSId] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [showPDF, setShowPDF] = useState(false);
  const [showBillingPanel, setShowBillingPanel] = useState(false);

  // New OS Wizard Steps: 1 = Client/Vehicle, 2 = Services, 3 = Parts, 4 = Review
  const [wizardStep, setWizardStep] = useState(1);
  
  // New OS Form State
  const [newOSClientId, setNewOSClientId] = useState('');
  const [newOSVehicleId, setNewOSVehicleId] = useState('');
  const [newOSServices, setNewOSServices] = useState<OSItemService[]>([]);
  const [newOSParts, setNewOSParts] = useState<OSItemPart[]>([]);
  const [newOSNotes, setNewOSNotes] = useState('');

  // Billing Panel Form State
  const [billingForm, setBillingForm] = useState({
    paymentMethod: 'PIX' as any,
    installmentsCount: '1'
  });

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateStr: string) => {
    return dateStr.split('-').reverse().join('/');
  };

  // --- FILTERS ---
  const filteredOS = workOrders.filter(os => {
    const client = clients.find(c => c.id === os.clientId);
    const vehicle = vehicles.find(v => v.id === os.vehicleId);
    
    const matchesSearch = 
      os.osNumber.toLowerCase().includes(search.toLowerCase()) ||
      client?.name.toLowerCase().includes(search.toLowerCase()) ||
      vehicle?.plate.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === 'Todos' || os.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Client list for selection in wizard step 1
  const [clientSearch, setClientSearch] = useState('');
  const filteredSelectionClients = clients.filter(c => 
    c.name.toLowerCase().includes(clientSearch.toLowerCase()) || c.cpfCnpj.includes(clientSearch)
  );

  // Vehicles list for wizard step 1 (filtered by selected client)
  const selectionVehicles = newOSClientId 
    ? vehicles.filter(v => v.clientId === newOSClientId) 
    : [];

  // Services catalog list for wizard step 2
  const [serviceSearch, setServiceSearch] = useState('');
  const filteredCatalogServices = serviceCatalog.filter(s => 
    s.name.toLowerCase().includes(serviceSearch.toLowerCase())
  );

  // Parts catalog list for wizard step 3
  const [partSearch, setPartSearch] = useState('');
  const filteredCatalogParts = partCatalog.filter(p => 
    p.name.toLowerCase().includes(partSearch.toLowerCase())
  );

  // --- WIZARD LIVE CALCULATIONS ---
  const servicesTotal = newOSServices.reduce((acc, s) => acc + (s.price * (s.quantity || 1)), 0);
  const partsTotal = newOSParts.reduce((acc, p) => acc + (p.salePrice * p.quantity), 0);
  const grandTotal = servicesTotal + partsTotal;

  // --- ACTIONS ---
  const handleToggleService = (item: any) => {
    const exists = newOSServices.find(s => s.id === item.id);
    if (exists) {
      setNewOSServices(prev => prev.filter(s => s.id !== item.id));
    } else {
      setNewOSServices(prev => [...prev, { id: item.id, name: item.name, price: item.price, quantity: 1 }]);
    }
  };

  const handleUpdateServiceQty = (item: any, qty: number) => {
    if (qty <= 0) {
      setNewOSServices(prev => prev.filter(s => s.id !== item.id));
      return;
    }
    const exists = newOSServices.find(s => s.id === item.id);
    if (exists) {
      setNewOSServices(prev => prev.map(s => s.id === item.id ? { ...s, quantity: qty } : s));
    } else {
      setNewOSServices(prev => [...prev, { id: item.id, name: item.name, price: item.price, quantity: qty }]);
    }
  };

  const handleUpdatePartQty = (item: any, qty: number) => {
    if (qty <= 0) {
      setNewOSParts(prev => prev.filter(p => p.id !== item.id));
      return;
    }

    const exists = newOSParts.find(p => p.id === item.id);
    if (exists) {
      setNewOSParts(prev => prev.map(p => p.id === item.id ? { ...p, quantity: qty } : p));
    } else {
      setNewOSParts(prev => [...prev, {
        id: item.id, name: item.name, code: item.code, salePrice: item.salePrice, quantity: qty
      }]);
    }
  };

  const handleStartEditOS = () => {
    if (!selectedOS) return;
    setEditingOSId(selectedOS.id);
    setNewOSClientId(selectedOS.clientId);
    setNewOSVehicleId(selectedOS.vehicleId);
    setNewOSServices(selectedOS.services);
    setNewOSParts(selectedOS.parts);
    setNewOSNotes(selectedOS.notes);
    setIsCreatingOS(true);
    setWizardStep(1);
  };

  const handleDeleteOS = () => {
    if (!selectedOS) return;
    if (window.confirm('Tem certeza que deseja excluir permanentemente esta ordem de serviço? Esta ação não pode ser desfeita.')) {
      deleteWorkOrder(selectedOS.id);
      setSelectedOS(null);
    }
  };

  const handleSaveOS = () => {
    if (!newOSClientId || !newOSVehicleId) return alert('Cliente e veículo são obrigatórios!');
    
    if (editingOSId) {
      updateWorkOrder(editingOSId, {
        clientId: newOSClientId,
        vehicleId: newOSVehicleId,
        services: newOSServices,
        parts: newOSParts,
        notes: newOSNotes
      });
      
      // Fetch and update selectedOS view
      const servicesTotal = newOSServices.reduce((acc, s) => acc + (s.price * (s.quantity || 1)), 0);
      const partsTotal = newOSParts.reduce((acc, p) => acc + (p.salePrice * p.quantity), 0);
      const grandTotal = servicesTotal + partsTotal;
      
      setSelectedOS(prev => prev ? {
        ...prev,
        clientId: newOSClientId,
        vehicleId: newOSVehicleId,
        services: newOSServices,
        parts: newOSParts,
        notes: newOSNotes,
        servicesTotal,
        partsTotal,
        grandTotal
      } : null);
      
      setEditingOSId(null);
    } else {
      const os = addWorkOrder({
        date: new Date().toISOString().split('T')[0],
        clientId: newOSClientId,
        vehicleId: newOSVehicleId,
        services: newOSServices,
        parts: newOSParts,
        notes: newOSNotes,
        status: 'Aberta'
      });
      setSelectedOS(os);
    }

    // Reset wizard
    setIsCreatingOS(false);
    setWizardStep(1);
    setNewOSClientId('');
    setNewOSVehicleId('');
    setNewOSServices([]);
    setNewOSParts([]);
    setNewOSNotes('');
  };

  const handleFaturarOS = () => {
    if (!selectedOS) return;

    const amount = selectedOS.grandTotal;
    const installmentsCount = parseInt(billingForm.installmentsCount);
    
    // Generate installments array
    const installments = [];
    const baseVal = Math.floor((amount / installmentsCount) * 100) / 100;
    let diff = Math.round((amount - (baseVal * installmentsCount)) * 100) / 100;

    for (let i = 1; i <= installmentsCount; i++) {
      const d = new Date();
      d.setDate(d.getDate() + (30 * (i - 1)));
      
      // Pad exact cents diff to last installment
      const instAmount = i === installmentsCount ? (baseVal + diff) : baseVal;

      installments.push({
        number: i,
        amount: instAmount,
        dueDate: d.toISOString().split('T')[0],
        status: 'Pendente' as const
      });
    }

    addBilling({
      osId: selectedOS.id,
      amount,
      paymentMethod: billingForm.paymentMethod,
      status: 'Pendente',
      installments,
      dueDate: installments[0].dueDate
    });

    setShowBillingPanel(false);
    alert('Ordem de serviço faturada com sucesso!');
  };

  // Get active OS Billing info
  const activeOSBilling = selectedOS ? billings.find(b => b.osId === selectedOS.id) : null;

  return (
    <div className="relative flex flex-col h-full overflow-hidden select-none">
      
      {/* 1. LIST SCREEN */}
      {!selectedOS && !isCreatingOS && (
        <div className="flex flex-col space-y-5 h-full animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-black text-slate-100 tracking-tight">Ordens de Serviço</h2>
              <p className="text-sm text-slate-400">Controle de manutenções e reparos</p>
            </div>
            <button
              onClick={() => setIsCreatingOS(true)}
              className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-premium flex items-center justify-center gap-1.5 text-sm font-bold transition-all active:scale-95"
            >
              <Plus size={16} />
              Nova OS
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-4.5 flex items-center text-slate-400">
              <Search size={18} />
            </span>
            <input
              type="text"
              placeholder="Buscar por OS, cliente, placa..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-12 pr-4.5 py-3 h-12 text-sm text-slate-200 placeholder-dark-500 focus:outline-none focus:border-brand-500 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute inset-y-0 right-0 pr-4.5 flex items-center text-dark-500 hover:text-white">
                <X size={18} />
              </button>
            )}
          </div>

          {/* Horizontal OS Status Slider filter */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-1.5 select-none flex-shrink-0">
            {['Todos', 'Aberta', 'Em andamento', 'Concluída', 'Entregue'].map(st => {
              const isActive = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st as any)}
                  className={`px-4 py-2 rounded-full text-[11px] font-bold uppercase transition-all flex-shrink-0 border ${isActive ? 'bg-brand-500 text-white border-brand-500 shadow-premium' : 'bg-dark-900 text-dark-400 border-dark-800 hover:text-slate-200'}`}
                >
                  {st}
                </button>
              );
            })}
          </div>

          {/* OS Cards List */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-3.5 pb-20">
            {filteredOS.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center text-dark-500">
                <span className="text-4xl">📋</span>
                <h4 className="text-sm font-bold text-slate-400 mt-2.5">Nenhuma Ordem de Serviço</h4>
                <p className="text-xs text-dark-500 mt-1.5 max-w-[240px]">Crie uma nova clicando em "Nova OS".</p>
              </div>
            ) : (
              filteredOS.map(os => {
                const client = clients.find(c => c.id === os.clientId);
                const vehicle = vehicles.find(v => v.id === os.vehicleId);
                const billing = billings.find(b => b.osId === os.id);
                
                let statusColor = 'bg-brand-500/10 text-brand-400 border-brand-500/30';
                let statusGlow = 'border-brand-500/20 shadow-[0_0_12px_rgba(59,102,255,0.04)]';
                if (os.status === 'Em andamento') {
                  statusColor = 'bg-warning-500/10 text-warning-500 border-warning-500/30';
                  statusGlow = 'border-warning-500/20 shadow-[0_0_12px_rgba(245,158,11,0.04)]';
                } else if (os.status === 'Concluída') {
                  statusColor = 'bg-success-500/10 text-success-500 border-success-500/30';
                  statusGlow = 'border-success-500/20 shadow-[0_0_12px_rgba(16,185,129,0.04)]';
                } else if (os.status === 'Entregue') {
                  statusColor = 'bg-dark-800 text-slate-400 border-dark-700';
                  statusGlow = 'border-dark-800 shadow-none';
                }

                return (
                  <div
                    key={os.id}
                    onClick={() => setSelectedOS(os)}
                    className={`bg-dark-900 border-2 ${statusGlow} rounded-2xl p-4.5 flex flex-col space-y-3.5 hover:border-brand-500/40 cursor-pointer transition-all active:bg-dark-800/50`}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2.5">
                        <span className="font-black text-sm text-brand-400">{os.osNumber}</span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 border rounded-full uppercase ${statusColor}`}>
                          {os.status}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">{formatDate(os.date)}</span>
                    </div>

                    <div className="text-xs text-slate-350 leading-relaxed font-semibold">
                      <div className="text-slate-100 font-bold">{client?.name}</div>
                      <div className="text-slate-400 font-normal mt-0.5">{vehicle?.brand} {vehicle?.model} • Placa: <span className="font-bold text-slate-300 uppercase">{vehicle?.plate}</span></div>
                    </div>

                    <div className="flex justify-between items-center border-t border-dark-800 pt-3 text-xs">
                      <div className="text-[10px] font-bold uppercase flex items-center gap-1.5">
                        {billing ? (
                          <span className={`px-2 py-0.5 rounded-md ${billing.status === 'Pago' ? 'bg-success-500/10 text-success-500' : 'bg-warning-500/10 text-warning-500'}`}>
                            💰 {billing.status.toUpperCase()}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-danger-500/10 text-danger-500 rounded-md">
                            💸 NÃO FATURADA
                          </span>
                        )}
                      </div>
                      <span className="font-black text-sm text-slate-100">{formatCurrency(os.grandTotal)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 2. OS DETAILED OVERVIEW */}
      {selectedOS && !isCreatingOS && (
        <div className="flex flex-col h-full bg-dark-950 animate-slide-in-right overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-dark-800 pb-3 mb-4">
            <div className="flex items-center gap-1.5">
              <button onClick={() => setSelectedOS(null)} className="p-1.5 hover:bg-dark-800 text-slate-300 rounded-lg flex items-center gap-1.5 text-sm font-bold transition-colors">
                <ArrowLeft size={18} />
                Voltar
              </button>
              <button 
                onClick={handleStartEditOS}
                className="p-1.5 hover:bg-dark-800 text-brand-400 rounded-lg flex items-center gap-1 text-sm font-bold transition-colors"
              >
                <Edit2 size={15} />
                Editar
              </button>
              <button 
                onClick={handleDeleteOS}
                className="p-1.5 hover:bg-dark-800 text-red-400 rounded-lg flex items-center gap-1 text-sm font-bold transition-colors"
              >
                <Trash2 size={15} />
                Excluir
              </button>
            </div>
            
            {/* Status dropdown selector */}
            <div className="flex items-center gap-2">
              <label className="text-[10px] uppercase font-bold text-slate-400">Status:</label>
              <select
                value={selectedOS.status}
                onChange={e => {
                  updateWorkOrderStatus(selectedOS.id, e.target.value as OSStatus);
                  setSelectedOS(prev => prev ? { ...prev, status: e.target.value as OSStatus } : null);
                }}
                className="bg-dark-900 border border-dark-800 text-xs text-slate-200 font-bold rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-brand-500 h-9"
              >
                <option value="Aberta">Aberta</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Concluída">Concluída</option>
                <option value="Entregue">Entregue</option>
              </select>
            </div>
          </div>

          {/* Details Body */}
          <div className="flex-1 overflow-y-auto no-scrollbar space-y-5 pb-20 select-text">
            {/* Card info */}
            <div className="bg-dark-900 border border-dark-800 rounded-2xl p-4.5 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-black text-base text-brand-400">{selectedOS.osNumber}</span>
                <span className="text-xs text-slate-400 font-bold">{formatDate(selectedOS.date)}</span>
              </div>
              
              <div className="border-t border-dark-800 pt-3 text-xs space-y-2 leading-relaxed">
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Cliente:</span>{' '}
                  <span className="text-slate-100 font-extrabold">
                    {clients.find(c => c.id === selectedOS.clientId)?.name}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider">Veículo:</span>{' '}
                  <span className="text-slate-100 font-extrabold text-xs">
                    {(() => {
                      const v = vehicles.find(veh => veh.id === selectedOS.vehicleId);
                      return v ? `${v.brand} ${v.model} (${v.plate})` : '';
                    })()}
                  </span>
                </div>
              </div>
            </div>

            {/* List Services */}
            {selectedOS.services.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Serviços Executados</span>
                <div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden divide-y divide-dark-800">
                  {selectedOS.services.map(s => {
                    const qty = s.quantity || 1;
                    return (
                      <div key={s.id} className="p-4 flex justify-between items-center text-sm">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-slate-200 font-bold">{s.name}</span>
                            {s.code && (
                              <span className="text-[10px] font-mono bg-dark-950 border border-dark-800 text-slate-400 px-1.5 py-0.5 rounded uppercase">
                                {s.code}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-extrabold text-white">{formatCurrency(s.price * qty)}</span>
                          {qty > 1 && (
                            <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{qty}x {formatCurrency(s.price)}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* List Parts */}
            {selectedOS.parts.length > 0 && (
              <div className="space-y-2.5">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Peças Substituídas</span>
                <div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden divide-y divide-dark-800">
                  {selectedOS.parts.map(p => (
                    <div key={p.id} className="p-4 flex justify-between items-center text-sm">
                      <div>
                        <div className="text-slate-200 font-bold">{p.name}</div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase mt-1 block">Código: {p.code}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-white">{formatCurrency(p.salePrice * p.quantity)}</span>
                        <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{p.quantity}x {formatCurrency(p.salePrice)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Summary totals */}
            <div className="bg-dark-900 border border-dark-800 rounded-2xl p-4.5 space-y-3 text-sm">
              <div className="flex justify-between text-slate-400 text-xs">
                <span>Total de Serviços:</span>
                <span className="font-bold text-slate-200">{formatCurrency(selectedOS.servicesTotal)}</span>
              </div>
              <div className="flex justify-between text-slate-400 text-xs">
                <span>Total de Peças:</span>
                <span className="font-bold text-slate-200">{formatCurrency(selectedOS.partsTotal)}</span>
              </div>
              <div className="flex justify-between border-t border-dark-800 pt-3 font-black text-xs text-brand-500 uppercase tracking-wider">
                <span className="text-slate-100 text-sm font-extrabold">Valor Total:</span>
                <span className="text-base text-white font-black">{formatCurrency(selectedOS.grandTotal)}</span>
              </div>
            </div>

            {/* Observations */}
            {selectedOS.notes && (
              <div className="space-y-2.5">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Observações do Mecânico</span>
                <div className="bg-dark-900 border border-dark-800 rounded-2xl p-4 text-xs text-slate-300 leading-relaxed">
                  {selectedOS.notes}
                </div>
              </div>
            )}

            {/* Signature Box */}
            {selectedOS.signature ? (
              <div className="space-y-2.5">
                <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Assinatura Digital</span>
                <div className="bg-dark-900 border border-dark-800 rounded-2xl p-5 flex flex-col items-center justify-center">
                  <img src={selectedOS.signature} alt="Assinatura" className="h-16 object-contain bg-white/5 rounded p-1.5" />
                  <span className="text-[10px] text-slate-500 uppercase font-bold mt-2">Assinado em conformidade</span>
                </div>
              </div>
            ) : (
              !isSigning && (
                <button
                  onClick={() => setIsSigning(true)}
                  className="w-full py-3 bg-dark-900 hover:bg-dark-800 border border-dark-800 rounded-xl text-sm font-bold text-slate-350 flex items-center justify-center gap-2 transition-colors h-12"
                >
                  <PenTool size={16} className="text-brand-400" />
                  Coletar Assinatura do Cliente
                </button>
              )
            )}

            {/* Signature canvas drawer overlay */}
            {isSigning && (
              <SignaturePad
                onSave={(base64) => {
                  saveWorkOrderSignature(selectedOS.id, base64);
                  setSelectedOS(prev => prev ? { ...prev, signature: base64 } : null);
                  setIsSigning(false);
                }}
                onClose={() => setIsSigning(false)}
              />
            )}

            {/* Bottom Actions Drawer */}
            <div className="pt-3 flex flex-col gap-3">
              <button
                onClick={() => setShowPDF(true)}
                className="w-full py-3.5 bg-brand-500 hover:bg-brand-600 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-all shadow-premium active:scale-98 h-12"
              >
                <FileText size={16} />
                Gerar Recibo / PDF
              </button>

              {!activeOSBilling && (
                <button
                  onClick={() => setShowBillingPanel(true)}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors h-12"
                >
                  <DollarSign size={16} />
                  Faturar Ordem de Serviço
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2a. PDF VIEWER OVERLAY */}
      {showPDF && selectedOS && (
        <PDFViewer
          os={selectedOS}
          client={clients.find(c => c.id === selectedOS.clientId)!}
          vehicle={vehicles.find(v => v.id === selectedOS.vehicleId)!}
          settings={settings}
          onClose={() => setShowPDF(false)}
        />
      )}

      {/* 2b. BILLING OPTION PANEL (FATURAR OS MODAL) */}
      {showBillingPanel && selectedOS && (
        <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-dark-900 border border-dark-800 rounded-t-3xl w-full p-5 space-y-4 shadow-glass animate-slide-up">
            <div className="flex justify-between items-center pb-2 border-b border-dark-800">
              <h3 className="text-xs uppercase font-extrabold text-slate-200">Faturamento da OS</h3>
              <button onClick={() => setShowBillingPanel(false)} className="text-xs text-dark-500 hover:text-slate-200">Fechar</button>
            </div>

            <div className="space-y-3">
              <div>
                <span className="text-[8px] text-dark-400 uppercase font-bold">Valor Total a Faturar:</span>
                <div className="text-lg font-extrabold text-emerald-500">{formatCurrency(selectedOS.grandTotal)}</div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-dark-400">Forma de Pagamento</label>
                <select
                  value={billingForm.paymentMethod}
                  onChange={e => setBillingForm(prev => ({ ...prev, paymentMethod: e.target.value as any }))}
                  className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="PIX">PIX</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Débito">Cartão de Débito</option>
                  <option value="Crédito">Cartão de Crédito</option>
                  <option value="Boleto">Boleto Bancário</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold text-dark-400">Parcelamento</label>
                <select
                  value={billingForm.installmentsCount}
                  onChange={e => setBillingForm(prev => ({ ...prev, installmentsCount: e.target.value }))}
                  className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
                >
                  <option value="1">À vista (1x)</option>
                  <option value="2">2 parcelas (30/60 dias)</option>
                  <option value="3">3 parcelas (30/60/90 dias)</option>
                  <option value="4">4 parcelas</option>
                  <option value="5">5 parcelas</option>
                  <option value="6">6 parcelas</option>
                  <option value="10">10 parcelas</option>
                  <option value="12">12 parcelas</option>
                </select>
              </div>

              {/* Installment preview list */}
              <div className="bg-dark-950/60 p-2.5 rounded-xl border border-dark-800 text-[9px] text-dark-400 max-h-24 overflow-y-auto no-scrollbar space-y-1">
                <span className="font-bold uppercase text-dark-500 block mb-1">Prévia das Parcelas</span>
                {(() => {
                  const arr = [];
                  const count = parseInt(billingForm.installmentsCount);
                  const baseVal = selectedOS.grandTotal / count;
                  for (let i = 1; i <= count; i++) {
                    const d = new Date();
                    d.setDate(d.getDate() + (30 * (i - 1)));
                    arr.push(
                      <div key={i} className="flex justify-between font-mono">
                        <span>Parcela {i}:</span>
                        <span>{formatCurrency(baseVal)} • Venc: {d.toLocaleDateString('pt-BR')}</span>
                      </div>
                    );
                  }
                  return arr;
                })()}
              </div>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                onClick={() => setShowBillingPanel(false)}
                className="flex-1 py-2 text-xs bg-dark-800 hover:bg-dark-700 text-slate-300 font-semibold rounded-xl"
              >
                Voltar
              </button>
              <button
                onClick={handleFaturarOS}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-premium"
              >
                Confirmar Faturamento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. NEW WORK ORDER CREATION WIZARD */}
      {isCreatingOS && (
        <div className="flex flex-col h-full bg-dark-950 animate-slide-in-right overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 border-b border-dark-800 pb-3 mb-3 flex-shrink-0">
            <button
              onClick={() => {
                if (wizardStep === 1) {
                  setIsCreatingOS(false);
                  setEditingOSId(null);
                } else {
                  setWizardStep(prev => prev - 1);
                }
              }}
              className="p-1 hover:bg-dark-800 text-slate-300 rounded-lg transition-colors"
            >
              <ArrowLeft size={16} />
            </button>
            <h3 className="text-sm font-bold text-slate-100">
              {editingOSId ? 'Editar OS' : 'Nova OS'} - Passo {wizardStep} de 4
            </h3>
          </div>

          {/* Stepper indicator line */}
          <div className="flex gap-1 h-1 w-full bg-dark-800 mb-4 rounded-full flex-shrink-0">
            <div className={`h-full rounded-full transition-all duration-300 ${wizardStep >= 1 ? 'bg-brand-500' : 'bg-transparent'}`} style={{ width: '25%' }} />
            <div className={`h-full rounded-full transition-all duration-300 ${wizardStep >= 2 ? 'bg-brand-500' : 'bg-transparent'}`} style={{ width: '25%' }} />
            <div className={`h-full rounded-full transition-all duration-300 ${wizardStep >= 3 ? 'bg-brand-500' : 'bg-transparent'}`} style={{ width: '25%' }} />
            <div className={`h-full rounded-full transition-all duration-300 ${wizardStep >= 4 ? 'bg-brand-500' : 'bg-transparent'}`} style={{ width: '25%' }} />
          </div>

          {/* Wizard Body Panels */}
          <div className="flex-1 overflow-y-auto no-scrollbar pb-20">
            
            {/* STEP 1: CLIENT & VEHICLE SELECTION */}
            {wizardStep === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <span className="text-[10px] uppercase font-bold text-dark-400 tracking-wider">1. Selecionar Cliente</span>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-dark-500">
                      <Search size={13} />
                    </span>
                    <input
                      type="text"
                      placeholder="Filtrar por nome ou CPF..."
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                    />
                  </div>
                  
                  <div className="bg-dark-900 border border-dark-800 rounded-xl max-h-40 overflow-y-auto no-scrollbar divide-y divide-dark-850">
                    {filteredSelectionClients.map(c => {
                      const isSelected = newOSClientId === c.id;
                      return (
                        <div
                          key={c.id}
                          onClick={() => {
                            setNewOSClientId(c.id);
                            setNewOSVehicleId(''); // Reset vehicle selection
                          }}
                          className={`p-2.5 flex justify-between items-center text-xs cursor-pointer transition-colors ${isSelected ? 'bg-brand-500/10 border-l-2 border-brand-500 font-semibold' : 'hover:bg-dark-800/40 text-slate-300'}`}
                        >
                          <div>
                            <div>{c.name}</div>
                            <span className="text-[8px] text-dark-400 font-bold uppercase">CPF: {c.cpfCnpj}</span>
                          </div>
                          {isSelected && <Check size={14} className="text-brand-500" />}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {newOSClientId && (
                  <div className="space-y-2 animate-slide-up">
                    <span className="text-[10px] uppercase font-bold text-dark-400 tracking-wider">2. Selecionar Veículo</span>
                    
                    {selectionVehicles.length === 0 ? (
                      <div className="p-3 bg-dark-900 border border-dark-800 border-dashed rounded-xl text-center text-dark-500 text-[10px]">
                        Nenhum veículo cadastrado para este cliente. Vá no menu "Clientes" e adicione um veículo primeiro.
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {selectionVehicles.map(v => {
                          const isSelected = newOSVehicleId === v.id;
                          return (
                            <div
                              key={v.id}
                              onClick={() => setNewOSVehicleId(v.id)}
                              className={`p-3 border rounded-xl flex flex-col justify-between items-start cursor-pointer transition-all ${isSelected ? 'bg-brand-500/10 border-brand-500 shadow-premium' : 'bg-dark-900 border-dark-800 hover:border-dark-750 text-slate-300'}`}
                            >
                              <div className="font-extrabold text-xs text-slate-100 leading-tight">{v.brand} {v.model}</div>
                              <span className="text-[8px] font-black bg-slate-200 text-dark-900 px-1 py-0.25 rounded border border-dark-800 mt-2 tracking-wider">
                                {v.plate}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={() => setWizardStep(2)}
                  disabled={!newOSClientId || !newOSVehicleId}
                  className="w-full py-2.5 mt-4 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:bg-dark-900 disabled:text-dark-500 font-semibold text-xs text-white rounded-xl flex items-center justify-center gap-1 transition-all"
                >
                  Avançar Serviços
                  <ChevronRight size={13} />
                </button>
              </div>
            )}

            {/* STEP 2: SELECT SERVICES */}
            {wizardStep === 2 && (
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-bold text-dark-400 tracking-wider block">Adicionar Serviços ao Orçamento</span>
                
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-dark-500">
                    <Search size={13} />
                  </span>
                  <input
                    type="text"
                    placeholder="Filtrar serviços..."
                    value={serviceSearch}
                    onChange={e => setServiceSearch(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="bg-dark-900 border border-dark-800 rounded-xl divide-y divide-dark-850 max-h-72 overflow-y-auto no-scrollbar">
                  {filteredCatalogServices.map(s => {
                    const osServiceItem = newOSServices.find(srv => srv.id === s.id);
                    const qty = osServiceItem ? (osServiceItem.quantity || 1) : 0;
                    const isSelected = qty > 0;
                    return (
                      <div
                        key={s.id}
                        className={`p-3 flex justify-between items-center transition-colors ${isSelected ? 'bg-brand-500/10 font-medium' : 'hover:bg-dark-800/40 text-slate-300'}`}
                      >
                        <div 
                          className="flex-1 pr-4 cursor-pointer"
                          onClick={() => handleToggleService(s)}
                        >
                          <div className="text-xs text-slate-200 font-bold flex items-center gap-1.5 flex-wrap">
                            <span>{s.name}</span>
                            {s.code && (
                              <span className="text-[8px] font-mono bg-dark-950 border border-dark-800 text-dark-400 px-1 py-0.25 rounded uppercase">
                                {s.code}
                              </span>
                            )}
                          </div>
                          {s.description && <p className="text-[8px] text-dark-400 leading-snug line-clamp-1 mt-0.5">{s.description}</p>}
                        </div>
                        
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <span className="font-extrabold text-xs text-brand-400">{formatCurrency(s.price)}</span>
                            {qty > 1 && (
                              <div className="text-[8px] text-dark-400 font-bold uppercase">{qty}x {formatCurrency(s.price)}</div>
                            )}
                          </div>
                          
                          {/* Quantity adjustments counter */}
                          <div className="flex items-center bg-dark-950 border border-dark-800 rounded-lg p-0.5 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateServiceQty(s, qty - 1)}
                              className="w-5 h-5 flex items-center justify-center bg-dark-900 border border-dark-800 text-slate-300 font-bold rounded hover:bg-dark-850 transition-colors"
                            >
                              -
                            </button>
                            <span className="w-4 text-center font-mono font-bold text-[10px] text-slate-200">{qty}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateServiceQty(s, qty + 1)}
                              className="w-5 h-5 flex items-center justify-center bg-dark-900 border border-dark-800 text-slate-300 font-bold rounded hover:bg-dark-850 transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-dark-900 border border-dark-800 rounded-xl p-3 flex justify-between text-[10px] font-bold">
                  <span className="text-dark-400">Total em Serviços:</span>
                  <span className="text-slate-200">{formatCurrency(servicesTotal)}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setWizardStep(1)}
                    className="flex-1 py-2 text-xs bg-dark-800 hover:bg-dark-700 text-slate-300 font-semibold rounded-xl"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setWizardStep(3)}
                    className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-all"
                  >
                    Avançar Peças
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: SELECT PARTS */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-bold text-dark-400 tracking-wider block">Adicionar Peças ao Orçamento</span>

                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-dark-500">
                    <Search size={13} />
                  </span>
                  <input
                    type="text"
                    placeholder="Filtrar peças..."
                    value={partSearch}
                    onChange={e => setPartSearch(e.target.value)}
                    className="w-full bg-dark-900 border border-dark-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="bg-dark-900 border border-dark-800 rounded-xl divide-y divide-dark-850 max-h-72 overflow-y-auto no-scrollbar">
                  {filteredCatalogParts.map(p => {
                    const osPartItem = newOSParts.find(opt => opt.id === p.id);
                    const qty = osPartItem ? osPartItem.quantity : 0;
                    
                    // Show stock warning badge if out of stock
                    const outOfStock = p.stock === 0;
                    const stockLow = p.stock <= 5;
                    const isOverStock = qty > p.stock;

                    return (
                      <div
                        key={p.id}
                        className="p-3 flex justify-between items-center text-xs"
                      >
                        <div className="pr-4 space-y-1">
                          <div className="font-bold text-slate-200">{p.name}</div>
                          <div className="flex gap-2 items-center flex-wrap">
                            <span className="text-[8px] font-bold text-brand-400 font-mono">{p.code}</span>
                            <span className={`text-[7px] font-extrabold px-1 rounded ${outOfStock ? 'bg-danger-500/10 text-danger-500' : stockLow ? 'bg-warning-500/10 text-warning-500' : 'bg-success-500/10 text-success-500'}`}>
                              Estoque: {p.stock}
                            </span>
                          </div>
                          {isOverStock && (
                            <div className="text-[7px] font-bold text-warning-500 flex items-center gap-0.5 uppercase">
                              <AlertTriangle size={8} /> Estoque insuficiente (compras sob-demanda)
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-right">
                            <span className="font-extrabold text-xs text-brand-400">{formatCurrency(p.salePrice)}</span>
                          </div>
                          
                          {/* Quantity adjustments counter */}
                          <div className="flex items-center bg-dark-950 border border-dark-800 rounded-lg p-0.5 gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleUpdatePartQty(p, qty - 1)}
                              className="w-5 h-5 flex items-center justify-center bg-dark-900 border border-dark-800 text-slate-300 font-bold rounded hover:bg-dark-850"
                            >
                              -
                            </button>
                            <span className="w-4 text-center font-mono font-bold text-[10px] text-slate-200">{qty}</span>
                            <button
                              type="button"
                              onClick={() => handleUpdatePartQty(p, qty + 1)}
                              className="w-5 h-5 flex items-center justify-center bg-dark-900 border border-dark-800 text-slate-300 font-bold rounded hover:bg-dark-850"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-dark-900 border border-dark-800 rounded-xl p-3 flex justify-between text-[10px] font-bold">
                  <span className="text-dark-400">Total em Peças:</span>
                  <span className="text-slate-200">{formatCurrency(partsTotal)}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setWizardStep(2)}
                    className="flex-1 py-2 text-xs bg-dark-800 hover:bg-dark-700 text-slate-300 font-semibold rounded-xl"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={() => setWizardStep(4)}
                    className="flex-1 py-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1 transition-all"
                  >
                    Avançar Revisão
                    <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: REVIEW & FINALIZE */}
            {wizardStep === 4 && (
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-bold text-dark-400 tracking-wider block">Observações e Revisão Geral</span>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold text-dark-400">Problemas / Notas do Mecânico</label>
                  <textarea
                    placeholder="Ruídos suspensão dianteira, vazamento óleo carter, etc..."
                    value={newOSNotes}
                    onChange={e => setNewOSNotes(e.target.value)}
                    rows={4}
                    className="w-full bg-dark-900 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 resize-none"
                  />
                </div>

                {/* Totals Summary */}
                <div className="bg-dark-900 border border-dark-800 rounded-xl p-3 space-y-2 text-xs">
                  <div className="font-bold border-b border-dark-800 pb-1.5 uppercase text-[9px] text-brand-400 tracking-wider">
                    Revisão de Custos
                  </div>
                  
                  <div className="flex justify-between text-dark-400">
                    <span>Mão de Obra (Serviços):</span>
                    <span className="font-semibold">{formatCurrency(servicesTotal)}</span>
                  </div>
                  <div className="flex justify-between text-dark-400">
                    <span>Peças Substituídas:</span>
                    <span className="font-semibold">{formatCurrency(partsTotal)}</span>
                  </div>
                  
                  <div className="flex justify-between border-t border-dark-800 pt-2 font-extrabold text-sm text-slate-100">
                    <span>VALOR ESTIMADO:</span>
                    <span className="text-brand-400">{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setWizardStep(3)}
                    className="flex-1 py-2 text-xs bg-dark-800 hover:bg-dark-700 text-slate-300 font-semibold rounded-xl"
                  >
                    Voltar
                  </button>
                  <button
                    onClick={handleSaveOS}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-premium flex items-center justify-center gap-1.5 transition-all"
                  >
                    <ClipboardCheck size={14} />
                    Abrir Ordem de Serviço
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
