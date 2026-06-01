import React, { useState } from 'react';
import { 
  Smartphone, Database, Terminal, FileCode, Play, Users, Car, ClipboardList, 
  Wallet, HelpCircle, ArrowRight, CheckCircle2, ChevronRight, Copy, Check, Menu, Info, Settings, ShieldCheck 
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

  // Active Developer Panel Tab: 'database' | 'sql' | 'expo' | 'quickstart'
  const [devTab, setDevTab] = useState<'database' | 'sql' | 'expo' | 'quickstart'>('database');

  // Real-time Database Inspector Table choice
  const [inspectTable, setInspectTable] = useState<'clients' | 'vehicles' | 'workOrders' | 'billings' | 'transactions'>('workOrders');

  // Copy status indicators
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const triggerCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

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

  // Supabase SQL Scripts definitions to show in dev panel
  const sqlSchema = `-- TABELAS RELACIONAIS (POSTGRESQL / SUPABASE)
CREATE TABLE workshops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(20) UNIQUE,
  address TEXT,
  phone VARCHAR(20),
  whatsapp VARCHAR(20),
  email VARCHAR(255),
  logo_url TEXT,
  auto_sequence BOOLEAN DEFAULT TRUE,
  next_os_number INT DEFAULT 1,
  pdf_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(20),
  phone VARCHAR(20) NOT NULL,
  whatsapp VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  plate VARCHAR(10) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(150) NOT NULL,
  year VARCHAR(4) NOT NULL,
  chassis VARCHAR(50),
  odometer VARCHAR(50) DEFAULT '0'
);

CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE RESTRICT NOT NULL,
  os_number VARCHAR(50) NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status os_status_enum NOT NULL DEFAULT 'Aberta',
  services_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  parts_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  grand_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  signature TEXT -- Base64 digital signature
);`;

  const sqlSecurity = `-- POLÍTICAS DE ROW LEVEL SECURITY (RLS) MULTI-TENANT
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE billings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients isolation by workshop_id" ON clients
  FOR ALL USING (workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid));

CREATE POLICY "Vehicles isolation by clients workshop" ON vehicles
  FOR ALL USING (client_id IN (
    SELECT id FROM clients WHERE workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid)
  ));`;

  const expoCodePreview = `// src/screens/DashboardScreen.tsx - Código nativo TypeScript + NativeWind
import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { useDatabase } from '../context/DatabaseContext';
import { Wallet, CheckCircle, Clock } from 'lucide-react-native';

export default function DashboardScreen() {
  const { workOrders } = useDatabase();
  const osAbertas = workOrders.filter(o => o.status === 'Aberta').length;

  return (
    <ScrollView className="flex-1 bg-slate-950 p-5">
      <View className="bg-blue-600 rounded-3xl p-5 shadow-lg relative overflow-hidden">
        <Text className="text-[10px] text-blue-200 uppercase font-extrabold tracking-wider">Faturamento do Mês</Text>
        <Text className="text-3xl font-black text-white mt-1">R$ 2.525,00</Text>
      </View>
      
      <View className="flex-row gap-3 mt-4">
        <View className="flex-1 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <Text className="text-xl font-bold text-white">{osAbertas}</Text>
          <Text className="text-[10px] text-slate-400 mt-1">Abertas</Text>
        </View>
      </View>
    </ScrollView>
  );
}`;

  return (
    <div className="flex flex-col lg:flex-row h-screen w-screen overflow-hidden bg-[#0a0c10] font-sans">
      
      {/* LEFT/CENTER AREA: PHONE SIMULATOR PANEL */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[#0d0e12] border-r border-dark-900 p-4 lg:p-6 overflow-y-auto no-scrollbar">
        
        {/* Responsive Info Notice */}
        <div className="hidden lg:flex items-center gap-2 bg-brand-950/60 border border-brand-900 text-brand-300 px-4 py-2.5 rounded-2xl text-[11px] max-w-sm mb-4 animate-fade-in font-medium">
          <Smartphone size={16} className="text-brand-400 flex-shrink-0" />
          <span>Este é o **Simulador do Aplicativo Móvel**. Interaja clicando nas abas inferiores, abrindo OS, dando baixa em parcelas e assinando.</span>
        </div>

        {/* Real Smartphone Shell */}
        <div className="w-[320px] h-[640px] bg-dark-950 rounded-[40px] border-[10px] border-dark-800 shadow-glass-dark relative overflow-hidden flex flex-col flex-shrink-0 pulse-glow">
          
          {/* Hardware Notch / Ear Speaker & Camera */}
          <div className="absolute top-0 left-1/2 transform -translate-x-1/2 h-5 w-28 bg-dark-800 rounded-b-2xl z-50 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-dark-950" />
            <span className="w-8 h-1 rounded-full bg-dark-950" />
          </div>

          {/* iOS/Android Simulated Status Bar */}
          <div className="h-9 bg-dark-950 px-5 flex items-center justify-between text-[9px] text-slate-400 font-bold select-none z-40 flex-shrink-0">
            <span>09:41 AM</span>
            <div className="flex items-center gap-1">
              <span>5G</span>
              <span className="w-3.5 h-2 border border-dark-500 rounded-sm relative flex items-center p-0.25">
                <span className="w-2 h-full bg-slate-300 rounded-2xs" />
                <span className="w-0.5 h-0.75 bg-dark-500 absolute -right-0.5 rounded-2xs" />
              </span>
            </div>
          </div>

          {/* App Header (Workshop name & settings indicators) */}
          <div className="px-4 py-2.5 bg-dark-950 border-b border-dark-850 flex items-center justify-between flex-shrink-0 z-30 select-none">
            <div className="flex items-center gap-2">
              <img 
                src={db.settings.logoUrl} 
                alt="Logo" 
                className="w-5 h-5 rounded-md object-cover border border-dark-800"
              />
              <span className="text-[10px] font-black text-slate-100 uppercase tracking-wide leading-none max-w-[140px] truncate">
                {db.settings.name}
              </span>
            </div>

            {/* Back button for Mais sub-screens */}
            {mobileTab === 'more' && activeSubScreen && (
              <button 
                onClick={() => setActiveSubScreen(null)}
                className="px-2 py-0.5 bg-brand-500/10 text-brand-400 font-bold text-[8px] uppercase rounded-full"
              >
                Voltar Menu
              </button>
            )}
          </div>

          {/* Phone active screen rendering container */}
          <div className="flex-1 bg-dark-950 p-4 overflow-y-auto no-scrollbar relative z-10">
            {renderMobileScreen()}
          </div>

          {/* Bottom 5-Tab Navigation Bar */}
          <div className="h-14 bg-dark-950 border-t border-dark-850 grid grid-cols-5 flex-shrink-0 z-40 select-none">
            {/* Tab: Dashboard */}
            <button
              onClick={() => {
                setMobileTab('dashboard');
                setActiveSubScreen(null);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 ${mobileTab === 'dashboard' ? 'text-brand-500' : 'text-dark-500 hover:text-slate-400'}`}
            >
              <Smartphone size={16} />
              <span className="text-[7px] font-bold uppercase tracking-wide">Painel</span>
            </button>

            {/* Tab: Clientes */}
            <button
              onClick={() => {
                setMobileTab('clients');
                setActiveSubScreen(null);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 ${mobileTab === 'clients' ? 'text-brand-500' : 'text-dark-500 hover:text-slate-400'}`}
            >
              <Users size={16} />
              <span className="text-[7px] font-bold uppercase tracking-wide">Clientes</span>
            </button>

            {/* Tab: OS */}
            <button
              onClick={() => {
                setMobileTab('os');
                setActiveSubScreen(null);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 ${mobileTab === 'os' ? 'text-brand-500' : 'text-dark-500 hover:text-slate-400'}`}
            >
              <ClipboardList size={16} />
              <span className="text-[7px] font-bold uppercase tracking-wide">Serviços</span>
            </button>

            {/* Tab: Financeiro */}
            <button
              onClick={() => {
                setMobileTab('finance');
                setActiveSubScreen(null);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 ${mobileTab === 'finance' ? 'text-brand-500' : 'text-dark-500 hover:text-slate-400'}`}
            >
              <Wallet size={16} />
              <span className="text-[7px] font-bold uppercase tracking-wide">Caixa</span>
            </button>

            {/* Tab: Mais */}
            <button
              onClick={() => {
                setMobileTab('more');
                setActiveSubScreen(null);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 ${mobileTab === 'more' ? 'text-brand-500' : 'text-dark-500 hover:text-slate-400'}`}
            >
              <Menu size={16} />
              <span className="text-[7px] font-bold uppercase tracking-wide">Mais</span>
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT AREA: DEVELOPER DASHBOARD PORTAL */}
      <div className="hidden lg:flex w-[550px] flex-col bg-[#0b0c10] border-l border-dark-900 overflow-hidden flex-shrink-0 animate-fade-in select-none">
        
        {/* Dev Panel Header */}
        <div className="p-4 border-b border-dark-900 bg-dark-950/60 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Database size={16} className="text-brand-500" />
            <h1 className="text-xs font-black uppercase tracking-wider text-slate-200">
              MecânicaPro SaaS <span className="text-[10px] text-dark-500 font-bold px-1.5 py-0.25 bg-dark-900 rounded">DEV PORTAL</span>
            </h1>
          </div>
          <div className="text-[9px] text-slate-400 font-semibold flex items-center gap-1 bg-dark-900 px-2 py-0.5 rounded-full border border-dark-800">
            <span className="w-1.5 h-1.5 bg-success-500 rounded-full animate-ping" />
            <span>Simulador Online (DB local)</span>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex border-b border-dark-900 bg-dark-950/40 p-1 flex-shrink-0 select-none">
          <button
            onClick={() => setDevTab('database')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all ${devTab === 'database' ? 'text-brand-400 border-brand-500 bg-brand-500/5' : 'text-dark-400 border-transparent hover:text-slate-200'}`}
          >
            <Database size={12} />
            Dados do Banco
          </button>
          <button
            onClick={() => setDevTab('sql')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all ${devTab === 'sql' ? 'text-brand-400 border-brand-500 bg-brand-500/5' : 'text-dark-400 border-transparent hover:text-slate-200'}`}
          >
            <Terminal size={12} />
            Supabase SQL
          </button>
          <button
            onClick={() => setDevTab('expo')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all ${devTab === 'expo' ? 'text-brand-400 border-brand-500 bg-brand-500/5' : 'text-dark-400 border-transparent hover:text-slate-200'}`}
          >
            <FileCode size={12} />
            Código Expo App
          </button>
          <button
            onClick={() => setDevTab('quickstart')}
            className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 border-b-2 transition-all ${devTab === 'quickstart' ? 'text-brand-400 border-brand-500 bg-brand-500/5' : 'text-dark-400 border-transparent hover:text-slate-200'}`}
          >
            <Play size={12} />
            Início Rápido
          </button>
        </div>

        {/* Tab Contents */}
        <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
          
          {/* TAB 1: DYNAMIC STATE DATABASE INSPECTOR (Tabelas do Banco) */}
          {devTab === 'database' && (
            <div className="space-y-4 h-full flex flex-col">
              
              {/* Info banner */}
              <div className="p-3 bg-dark-900/60 border border-dark-850 rounded-xl text-[10px] text-dark-400 flex items-start gap-2 select-text leading-snug">
                <Info size={14} className="text-brand-500 flex-shrink-0 mt-0.5" />
                <span>
                  Este painel lê o **estado em tempo real** do simulador local. Cadastre clientes, adicione carros ou dê baixa em parcelas na tela à esquerda e veja a sincronização instantânea das linhas abaixo!
                </span>
              </div>

              {/* Select inspector tables */}
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

              {/* Inspector Content */}
              <div className="flex-1 bg-dark-950 border border-dark-850 rounded-xl p-3.5 overflow-auto font-mono text-[9px] leading-relaxed max-h-[360px]">
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
          )}

          {/* TAB 2: SUPABASE POSTGRESQL SCHEMA CODE VIEWER */}
          {devTab === 'sql' && (
            <div className="space-y-4 select-text animate-fade-in">
              <div className="flex justify-between items-center flex-shrink-0">
                <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">Modelagem de Tabelas & RLS</span>
                <button
                  onClick={() => triggerCopy(`${sqlSchema}\n\n${sqlSecurity}`, 'sql')}
                  className="py-1 px-2.5 bg-dark-900 hover:bg-dark-800 border border-dark-800 text-slate-300 text-[9px] font-semibold rounded-lg flex items-center gap-1 transition-all"
                >
                  {copiedId === 'sql' ? <Check size={11} className="text-success-500" /> : <Copy size={11} />}
                  {copiedId === 'sql' ? 'Copiado!' : 'Copiar SQL'}
                </button>
              </div>

              {/* Code blocks */}
              <div className="space-y-3">
                <div>
                  <span className="text-[9px] font-bold text-dark-500 uppercase tracking-wider block mb-1">Tabelas Relacionais (schema.sql)</span>
                  <div className="bg-dark-950 border border-dark-850 rounded-xl p-3 max-h-56 overflow-auto font-mono text-[9px] leading-snug text-slate-300">
                    <pre>{sqlSchema}</pre>
                  </div>
                </div>

                <div>
                  <span className="text-[9px] font-bold text-dark-500 uppercase tracking-wider block mb-1">Segurança Row-Level (security.sql)</span>
                  <div className="bg-dark-950 border border-dark-850 rounded-xl p-3 max-h-40 overflow-auto font-mono text-[9px] leading-snug text-slate-300">
                    <pre>{sqlSecurity}</pre>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: EXPO REACT NATIVE TSX CODE VIEWER */}
          {devTab === 'expo' && (
            <div className="space-y-4 select-text animate-fade-in">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-dark-400 uppercase tracking-wider">React Native (Expo + NativeWind)</span>
                <button
                  onClick={() => triggerCopy(expoCodePreview, 'expo')}
                  className="py-1 px-2.5 bg-dark-900 hover:bg-dark-800 border border-dark-800 text-slate-300 text-[9px] font-semibold rounded-lg flex items-center gap-1 transition-all"
                >
                  {copiedId === 'expo' ? <Check size={11} className="text-success-500" /> : <Copy size={11} />}
                  {copiedId === 'expo' ? 'Copiado!' : 'Copiar Código'}
                </button>
              </div>

              <div className="space-y-2">
                <span className="text-[9px] font-bold text-dark-500 uppercase tracking-wider block">Código do Componente Mobile (src/screens/DashboardScreen.tsx)</span>
                <div className="bg-dark-950 border border-dark-850 rounded-xl p-3 max-h-96 overflow-auto font-mono text-[9px] leading-snug text-slate-300">
                  <pre>{expoCodePreview}</pre>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: QUICKSTART GUIDANCE */}
          {devTab === 'quickstart' && (
            <div className="space-y-4 select-text text-slate-300 text-[11px] leading-relaxed animate-fade-in pr-2">
              <div className="bg-dark-900/60 border border-dark-850 rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-slate-100 flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-success-500" />
                  Próximos Passos (Código Expo de Produção)
                </h3>
                <p className="text-[10px] text-dark-400 leading-snug">
                  Os arquivos reais de produção do aplicativo móvel foram gerados e estruturados com sucesso na subpasta `/expo-app` da pasta do projeto. Siga as etapas abaixo para rodá-los no seu dispositivo físico:
                </p>

                <ol className="list-decimal pl-4 space-y-2 text-[10px] text-slate-300">
                  <li>
                    <strong>Abrir o projeto móvel:</strong> Acesse o diretório `/expo-app` através de um terminal PowerShell.
                    <div className="bg-dark-950 p-1.5 rounded border border-dark-800 font-mono text-[9px] mt-1 select-text">
                      cd C:\Users\arthu\.gemini\antigravity\scratch\oficina-saas-mobile\expo-app
                    </div>
                  </li>
                  <li>
                    <strong>Instalar Dependências:</strong> Instale o Expo CLI, NativeWind e Supabase client.
                    <div className="bg-dark-950 p-1.5 rounded border border-dark-800 font-mono text-[9px] mt-1 select-text">
                      npm install
                    </div>
                  </li>
                  <li>
                    <strong>Rodar a Aplicação:</strong> Inicie o servidor do Expo.
                    <div className="bg-dark-950 p-1.5 rounded border border-dark-800 font-mono text-[9px] mt-1 select-text">
                      npm run start
                    </div>
                  </li>
                  <li>
                    <strong>Conectar no Celular:</strong> Baixe o app <strong>Expo Go</strong> na Google Play ou Apple App Store e escaneie o QR Code gerado no terminal!
                  </li>
                </ol>
              </div>

              <div className="bg-dark-900/60 border border-dark-850 rounded-xl p-4 space-y-2 text-[10px]">
                <h4 className="font-bold text-slate-100 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-brand-400" />
                  Conexão Real do Supabase no Código Nativo
                </h4>
                <p className="text-dark-400 leading-snug">
                  Os arquivos nativos na pasta `/expo-app/src/services/supabase.ts` já estão prontos para autenticação e escuta PostgreSQL do Supabase. Basta configurar seu `.env` com a sua URL e Anon Key!
                </p>
              </div>
            </div>
          )}

        </div>
      </div>
      
    </div>
  );
};

// --- APP COMPONENT WRAPPER ---

export default function App() {
  return (
    <DatabaseProvider>
      <MainPortal />
    </DatabaseProvider>
  );
}
