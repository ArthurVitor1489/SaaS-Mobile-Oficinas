import React, { useState, useRef } from 'react';
import { 
  Building, Settings, Save, ShieldAlert, Download, Upload, 
  RefreshCw, Check, AlertOctagon, FileSpreadsheet, Eye, Info 
} from 'lucide-react';
import { useDatabase } from '../context/DatabaseContext';

export const BackupSettingsScreen: React.FC = () => {
  const { settings, updateSettings, resetDatabase, exportDatabaseJson, restoreBackup, workOrders, clients, vehicles } = useDatabase();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Profile Form State
  const [form, setForm] = useState({
    name: settings.name,
    cnpj: settings.cnpj,
    address: settings.address,
    phone: settings.phone,
    whatsapp: settings.whatsapp,
    email: settings.email,
    logoUrl: settings.logoUrl,
    autoSequence: settings.autoSequence,
    pdfNotes: settings.pdfNotes
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  // --- ACTIONS ---
  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(form);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2000);
  };

  const handleExportJson = () => {
    const jsonStr = exportDatabaseJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_mecanicapro_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const success = restoreBackup(text);
      if (success) {
        alert('Backup restaurado com sucesso! Recarregando configurações...');
        window.location.reload();
      } else {
        alert('Erro ao restaurar backup! Verifique se o arquivo JSON é válido.');
      }
    };
    reader.readAsText(file);
  };

  const handleExportCsv = () => {
    // Generate CSV of Work Orders
    let csv = '\uFEFF'; // UTF-8 BOM for Excel
    csv += 'Nº OS;Data;Cliente;Veículo;Placa;Serviços;Peças;Total;Status\n';

    workOrders.forEach(os => {
      const client = clients.find(c => c.id === os.clientId)?.name || '';
      const vehicle = vehicles.find(v => v.id === os.vehicleId);
      const vehicleStr = vehicle ? `${vehicle.brand} ${vehicle.model}` : '';
      const plate = vehicle?.plate || '';
      
      csv += `${os.osNumber};${os.date};"${client}";"${vehicleStr}";${plate};${os.servicesTotal};${os.partsTotal};${os.grandTotal};${os.status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_os_mecanicapro_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleReset = () => {
    if (confirm('ATENÇÃO: Isso irá apagar todos os dados cadastrados e redefinir a oficina para os valores originais de demonstração. Deseja continuar?')) {
      resetDatabase();
      alert('Banco de dados redefinido com sucesso!');
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col space-y-5 pb-16 animate-slide-up no-scrollbar overflow-y-auto max-h-full select-none">
      
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold text-slate-100 tracking-tight">Ajustes & Backup</h2>
        <p className="text-xs text-slate-400">Configure sua oficina mecânica e seus backups</p>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSaveSettings} className="bg-dark-900 border border-dark-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-dark-800 pb-2 flex-shrink-0">
          <Building size={16} className="text-brand-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Cadastro da Oficina</h3>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] uppercase font-bold text-dark-400">Nome Fantasia da Empresa *</label>
          <input
            type="text"
            required
            value={form.name}
            onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
            className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-dark-400">CNPJ da Oficina</label>
            <input
              type="text"
              value={form.cnpj}
              onChange={e => setForm(prev => ({ ...prev, cnpj: e.target.value }))}
              className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-dark-400">E-mail de Contato</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
              className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-dark-400">Telefone Comercial</label>
            <input
              type="text"
              value={form.phone}
              onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[9px] uppercase font-bold text-dark-400">WhatsApp Comercial</label>
            <input
              type="text"
              value={form.whatsapp}
              onChange={e => setForm(prev => ({ ...prev, whatsapp: e.target.value }))}
              className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] uppercase font-bold text-dark-400">Endereço Físico</label>
          <input
            type="text"
            value={form.address}
            onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))}
            className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[9px] uppercase font-bold text-dark-400">URL do Logotipo (.png/.jpg)</label>
          <input
            type="text"
            value={form.logoUrl}
            onChange={e => setForm(prev => ({ ...prev, logoUrl: e.target.value }))}
            className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between border-t border-dark-800/80 pt-3">
          <div className="space-y-0.5">
            <span className="text-xs font-semibold text-slate-300">Numeração de OS automática</span>
            <div className="text-[8px] text-dark-500 font-bold uppercase">Gera OS-0001, OS-0002 em sequência</div>
          </div>
          <button
            type="button"
            onClick={() => setForm(prev => ({ ...prev, autoSequence: !prev.autoSequence }))}
            className={`w-10 h-6 rounded-full p-0.5 transition-colors duration-200 ${form.autoSequence ? 'bg-brand-500 flex justify-end' : 'bg-dark-800 flex justify-start'}`}
          >
            <span className="w-5 h-5 rounded-full bg-white shadow-sm" />
          </button>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] uppercase font-bold text-dark-400">Termos de Garantia / Notas do PDF</label>
          <textarea
            value={form.pdfNotes}
            onChange={e => setForm(prev => ({ ...prev, pdfNotes: e.target.value }))}
            rows={3}
            className="w-full bg-dark-950 border border-dark-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 bg-brand-500 hover:bg-brand-600 text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-premium active:scale-98"
        >
          {saveSuccess ? <Check size={14} /> : <Save size={14} />}
          {saveSuccess ? 'Configurações Salvas!' : 'Salvar Configurações'}
        </button>
      </form>

      {/* Backup and Safety */}
      <div className="bg-dark-900 border border-dark-800 rounded-2xl p-4 space-y-4">
        <div className="flex items-center gap-2 border-b border-dark-800 pb-2">
          <ShieldAlert size={16} className="text-brand-400" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">Backup & Segurança</h3>
        </div>

        <p className="text-[10px] text-dark-400 leading-snug">
          Exporte seus cadastros de clientes, carros e finanças para segurança física offline, permitindo restaurar a qualquer momento.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {/* Export JSON */}
          <button
            onClick={handleExportJson}
            className="py-2.5 bg-dark-950 hover:bg-dark-850 border border-dark-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download size={14} className="text-brand-400" />
            Exportar JSON
          </button>

          {/* Import JSON */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="py-2.5 bg-dark-950 hover:bg-dark-850 border border-dark-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
          >
            <Upload size={14} className="text-brand-400" />
            Importar JSON
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportJson}
            className="hidden"
          />

          {/* Export Excel (CSV) */}
          <button
            onClick={handleExportCsv}
            className="col-span-2 py-2 bg-dark-950 hover:bg-dark-850 border border-dark-800 rounded-xl text-xs font-semibold text-slate-300 flex items-center justify-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet size={14} className="text-emerald-500" />
            Exportar Ordens (Excel .CSV)
          </button>
        </div>

        {/* Danger reset zone */}
        <div className="border-t border-dark-800/80 pt-3">
          <button
            type="button"
            onClick={handleReset}
            className="w-full py-2 bg-danger-600/10 hover:bg-danger-600 border border-danger-500/20 hover:border-danger-600 text-danger-500 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
          >
            <RefreshCw size={13} />
            Resetar Base de Dados (Limpar Tudo)
          </button>
        </div>
      </div>
    </div>
  );
};
