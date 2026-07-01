import React, { useState } from 'react';
import { 
  Smartphone, Database, Users, ClipboardList, Wallet, Menu, Info, Settings, ChevronRight, Monitor
} from 'lucide-react';
import { DatabaseProvider, useDatabase } from './mobile-app/context/DatabaseContext';

// Import Mobile Screens
import { DashboardScreen } from './mobile-app/screens/DashboardScreen';
import { ClientsScreen } from './mobile-app/screens/ClientsScreen';
import { CatalogScreen } from './mobile-app/screens/CatalogScreen';
import { WorkOrdersScreen } from './mobile-app/screens/WorkOrdersScreen';
import { BillingScreen } from './mobile-app/screens/BillingScreen';
import { FinanceScreen } from './mobile-app/screens/FinanceScreen';
import { BackupSettingsScreen } from './mobile-app/screens/BackupSettingsScreen';

// --- MAIN PORTAL CONTROLLER ---

const MainPortal: React.FC = () => {
  const db = useDatabase();

  // Active Simulated Mobile Tab: 'dashboard' | 'clients' | 'os' | 'finance' | 'more'
  const [mobileTab, setMobileTab] = useState<'dashboard' | 'clients' | 'os' | 'finance' | 'more'>('dashboard');
  
  // Under 'more' menu sub-screens: null | 'catalog' | 'billing' | 'settings'
  const [activeSubScreen, setActiveSubScreen] = useState<null | 'catalog' | 'billing' | 'settings'>(null);

  // View mode for the entire web app: 'developer' | 'mobile-offline' | 'desktop-offline'
  const [viewMode, setViewMode] = useState<'developer' | 'mobile-offline' | 'desktop-offline'>('developer');

  // Real-time Database Inspector Table choice
  const [inspectTable, setInspectTable] = useState<'clients' | 'vehicles' | 'workOrders' | 'billings' | 'transactions'>('workOrders');

  // Render simulated mobile screen
  const renderMobileScreen = () => {
    if (mobileTab === 'dashboard') return <DashboardScreen />;
    if (mobileTab === 'clients') return <ClientsScreen />;
    if (mobileTab === 'os') return <WorkOrdersScreen />;
    if (mobileTab === 'finance') return <FinanceScreen />;
    
    // 'more' menu screen or sub-screens
    if (mobileTab === 'more') {
      if (activeSubScreen === 'catalog') return <CatalogScreen />;
      if (activeSubScreen === 'billing') return <BillingScreen />;
      if (activeSubScreen === 'settings') return <BackupSettingsScreen />;

      return (
        <div className="flex flex-col space-y-4 animate-slide-up pb-10">
          <div>
            <h2 className="text-xl font-bold text-slate-100 tracking-tight">Mais Opções</h2>
            <p className="text-xs text-slate-400">Recursos adicionais e configurações</p>
          </div>

          <div className="bg-dark-900 border border-dark-800 rounded-2xl overflow-hidden divide-y divide-dark-800">
            {/* Catalog */}
            <div 
              onClick={() => setActiveSubScreen('catalog')}
              className="p-3.5 flex items-center justify-between hover:bg-dark-850 cursor-pointer transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-slate-200">Catálogo de Serviços e Peças</div>
                <p className="text-[9px] text-dark-400 mt-0.5">Gerencie preços, mão de obra e estoque de peças</p>
              </div>
              <ChevronRight size={14} className="text-dark-500" />
            </div>

            {/* Billings */}
            <div 
              onClick={() => setActiveSubScreen('billing')}
              className="p-3.5 flex items-center justify-between hover:bg-dark-850 cursor-pointer transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-slate-200">Cobranças & Parcelamentos</div>
                <p className="text-[9px] text-dark-400 mt-0.5">Controle de recebimentos de OS e parcelas à vista/prazo</p>
              </div>
              <ChevronRight size={14} className="text-dark-500" />
            </div>

            {/* Settings & Backups */}
            <div 
              onClick={() => setActiveSubScreen('settings')}
              className="p-3.5 flex items-center justify-between hover:bg-dark-850 cursor-pointer transition-colors"
            >
              <div>
                <div className="text-xs font-bold text-slate-200">Cadastro de Oficina & Backups</div>
                <p className="text-[9px] text-dark-400 mt-0.5">Dados da oficina comercial, backups em JSON e Excel</p>
              </div>
              <ChevronRight size={14} className="text-dark-500" />
            </div>
          </div>
        </div>
      );
    }
    return <DashboardScreen />;
  };

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-[#0a0c10] font-sans">
      
      {/* LEFT/CENTER AREA: PHONE SIMULATOR PANEL */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0d0e12] border-r border-dark-900 p-4 lg:p-6 overflow-y-auto no-scrollbar">
        
        {/* VIEW MODE SELECTION BAR */}
        <div className="flex gap-2 mb-5 bg-dark-900 p-1.5 rounded-2xl border border-dark-850 z-50 shadow-md flex-shrink-0">
          <button 
            onClick={() => setViewMode('developer')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${viewMode === 'developer' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Database size={12} />
            Desenvolvedor
          </button>
          <button 
            onClick={() => setViewMode('mobile-offline')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${viewMode === 'mobile-offline' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Smartphone size={12} />
            Celular (Offline)
          </button>
          <button 
            onClick={() => setViewMode('desktop-offline')}
            className={`px-3.5 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center gap-1.5 ${viewMode === 'desktop-offline' ? 'bg-brand-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Monitor size={12} />
            Desktop (Offline)
          </button>
        </div>

        {/* Responsive Info Notice */}
        {viewMode === 'developer' && (
          <div className="hidden lg:flex items-center gap-2 bg-brand-950/60 border border-brand-900 text-brand-300 px-4 py-2.5 rounded-2xl text-[11px] max-w-sm mb-4 animate-fade-in font-medium select-none">
            <Smartphone size={16} className="text-brand-400 flex-shrink-0" />
            <span>Este é o **Simulador de Aplicativo**. Interaja clicando nas abas inferiores, cadastrando dados e salvando backups locais.</span>
          </div>
        )}

        {/* Smartphone Shell or Full Screen container */}
        <div className={viewMode === 'desktop-offline' 
          ? "w-full h-full max-w-6xl max-h-[88vh] bg-dark-950 rounded-3xl border border-dark-850 shadow-glass-dark relative overflow-hidden flex flex-col pulse-glow transition-all duration-300" 
          : "w-[375px] h-[780px] bg-dark-950 rounded-[44px] border-[12px] border-dark-800 shadow-glass-dark relative overflow-hidden flex flex-col flex-shrink-0 pulse-glow transition-all duration-300"
        }>
          
          {/* Hardware Notch: only in mobile view */}
          {viewMode !== 'desktop-offline' && (
            <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-5 w-32 bg-dark-800 rounded-b-2xl z-50 flex items-center justify-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-dark-950" />
              <span className="w-10 h-1 rounded-full bg-dark-950" />
            </div>
          )}

          {/* iOS/Android Status Bar: only in mobile view */}
          {viewMode !== 'desktop-offline' && (
            <div className="h-9 bg-dark-950 px-6 flex items-center justify-between text-[10px] text-slate-400 font-bold select-none z-40 flex-shrink-0">
              <span>09:41 AM</span>
              <div className="flex items-center gap-1.5">
                <span>5G</span>
                <span className="w-4 h-2.5 border border-dark-500 rounded-xs relative flex items-center p-0.25">
                  <span className="w-2.5 h-full bg-slate-300 rounded-2xs" />
                  <span className="w-0.5 h-1 bg-dark-500 absolute -right-0.5 rounded-2xs" />
                </span>
              </div>
            </div>
          )}

          {/* App Header (Workshop name & subscreen back controls) */}
          <div className="px-5 py-3.5 bg-dark-950 border-b border-dark-850 flex items-center justify-between flex-shrink-0 z-30 select-none">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-brand-500/10 flex items-center justify-center border border-brand-500/20 text-brand-400 font-black text-xs">
                {db.settings.name.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-black text-slate-100 uppercase tracking-wide leading-none max-w-[180px] truncate">
                {db.settings.name}
              </span>
            </div>

            {/* Back button for sub-screens under More tab */}
            {mobileTab === 'more' && activeSubScreen && (
              <button 
                onClick={() => setActiveSubScreen(null)}
                className="px-3 py-1 bg-brand-500/10 hover:bg-brand-500/20 text-brand-400 font-bold text-[9px] uppercase rounded-full transition-colors"
              >
                Voltar Menu
              </button>
            )}
          </div>

          {/* Active screen content renderer */}
          <div className="flex-1 bg-dark-950 p-5 overflow-y-auto no-scrollbar relative z-10">
            {renderMobileScreen()}
          </div>

          {/* Bottom navigation bar */}
          <div className="h-16 bg-dark-950 border-t border-dark-850 grid grid-cols-5 flex-shrink-0 z-40 select-none pb-2">
            <button
              onClick={() => { setMobileTab('dashboard'); setActiveSubScreen(null); }}
              className={`flex flex-col items-center justify-center gap-1 ${mobileTab === 'dashboard' ? 'text-brand-500' : 'text-dark-500 hover:text-slate-400'}`}
            >
              <Smartphone size={18} />
              <span className="text-[9px] font-bold uppercase tracking-wide">Painel</span>
            </button>

            <button
              onClick={() => { setMobileTab('clients'); setActiveSubScreen(null); }}
              className={`flex flex-col items-center justify-center gap-1 ${mobileTab === 'clients' ? 'text-brand-500' : 'text-dark-500 hover:text-slate-400'}`}
            >
              <Users size={18} />
              <span className="text-[9px] font-bold uppercase tracking-wide">Clientes</span>
            </button>

            <button
              onClick={() => { setMobileTab('os'); setActiveSubScreen(null); }}
              className={`flex flex-col items-center justify-center gap-1 ${mobileTab === 'os' ? 'text-brand-500' : 'text-dark-500 hover:text-slate-400'}`}
            >
              <ClipboardList size={18} />
              <span className="text-[9px] font-bold uppercase tracking-wide">Serviços</span>
            </button>

            <button
              onClick={() => { setMobileTab('finance'); setActiveSubScreen(null); }}
              className={`flex flex-col items-center justify-center gap-1 ${mobileTab === 'finance' ? 'text-brand-500' : 'text-dark-500 hover:text-slate-400'}`}
            >
              <Wallet size={18} />
              <span className="text-[9px] font-bold uppercase tracking-wide">Caixa</span>
            </button>

            <button
              onClick={() => { setMobileTab('more'); setActiveSubScreen(null); }}
              className={`flex flex-col items-center justify-center gap-1 ${mobileTab === 'more' ? 'text-brand-500' : 'text-dark-500 hover:text-slate-400'}`}
            >
              <Menu size={18} />
              <span className="text-[9px] font-bold uppercase tracking-wide">Mais</span>
            </button>
          </div>

        </div>
      </div>

      {/* RIGHT AREA: DEVELOPER DASHBOARD PORTAL */}
      {viewMode === 'developer' && (
        <div className="hidden lg:flex w-[550px] flex-col bg-[#0b0c10] border-l border-dark-900 overflow-hidden flex-shrink-0 animate-fade-in select-none">
          
          <div className="p-4 border-b border-dark-900 bg-dark-950/60 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-brand-500" />
              <h1 className="text-xs font-black uppercase tracking-wider text-slate-200">
                MecânicaPro SaaS <span className="text-[10px] text-dark-500 font-bold px-1.5 py-0.25 bg-dark-900 rounded">INSPECTOR</span>
              </h1>
            </div>
            <div className="text-[9px] text-slate-400 font-semibold flex items-center gap-1 bg-dark-900 px-2 py-0.5 rounded-full border border-dark-800">
              <span className="w-1.5 h-1.5 bg-success-500 rounded-full animate-ping" />
              <span>Modo Offline (LocalStorage)</span>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
            <div className="space-y-4 h-full flex flex-col">
              
              <div className="p-3 bg-dark-900/60 border border-dark-850 rounded-xl text-[10px] text-dark-400 flex items-start gap-2 select-text leading-snug">
                <Info size={14} className="text-brand-500 flex-shrink-0 mt-0.5" />
                <span>
                  Este inspetor exibe as tabelas armazenadas no **localStorage** do seu navegador. Qualquer alteração feita no simulador à esquerda é sincronizada instantaneamente nos JSONs abaixo!
                </span>
              </div>

              <div className="grid grid-cols-5 gap-1 border-b border-dark-900 pb-2">
                {[
                  { table: 'clients', label: 'Clientes' },
                  { table: 'vehicles', label: 'Veículos' },
                  { table: 'workOrders', label: 'OS' },
                  { table: 'billings', label: 'Cobranças' },
                  { table: 'transactions', label: 'Lançamentos' }
                ].map(item => (
                  <button
                    key={item.table}
                    onClick={() => setInspectTable(item.table as any)}
                    className={`py-1 text-[8px] font-bold uppercase border rounded-lg tracking-wide transition-all ${inspectTable === item.table ? 'bg-brand-500/10 border-brand-500 text-brand-400' : 'bg-dark-950 border-dark-850 text-dark-400 hover:text-slate-300'}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <div className="flex-1 bg-dark-950 border border-dark-850 rounded-xl p-3.5 overflow-auto font-mono text-[9px] leading-relaxed max-h-[500px]">
                {inspectTable === 'clients' && (
                  <pre className="text-slate-300 select-text">{JSON.stringify(db.clients, null, 2)}</pre>
                )}
                {inspectTable === 'vehicles' && (
                  <pre className="text-slate-300 select-text">{JSON.stringify(db.vehicles, null, 2)}</pre>
                )}
                {inspectTable === 'workOrders' && (
                  <pre className="text-slate-300 select-text">{JSON.stringify(db.workOrders, null, 2)}</pre>
                )}
                {inspectTable === 'billings' && (
                  <pre className="text-slate-300 select-text">{JSON.stringify(db.billings, null, 2)}</pre>
                )}
                {inspectTable === 'transactions' && (
                  <pre className="text-slate-300 select-text">{JSON.stringify(db.transactions, null, 2)}</pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default function App() {
  return (
    <DatabaseProvider>
      <MainPortal />
    </DatabaseProvider>
  );
}
