export const formatCurrency = (val: number | string) => {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  // Se já for DD/MM/AAAA
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return dateStr;
  // Se for formato AAAA-MM-DD ou ISO
  if (dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateStr;
};

/**
 * Retorna a data de hoje no formato brasileiro DD/MM/AAAA
 */
export const getTodayBR = (): string => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Aplica máscara de data brasileira enquanto o usuário digita (DD/MM/AAAA)
 */
export const maskDate = (val: string): string => {
  const cleaned = val.replace(/\D/g, '').slice(0, 8);
  if (cleaned.length <= 2) return cleaned;
  if (cleaned.length <= 4) return `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
  return `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4)}`;
};

/**
 * Converte data DD/MM/AAAA ou ISO para ISO AAAA-MM-DD para armazenamento
 */
export const parseDateToISO = (dateStr: string): string => {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  const trimmed = dateStr.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    return `${year}-${month}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.split('T')[0];
  }
  return trimmed;
};

/**
 * Valida se uma string representa uma data válida no formato DD/MM/AAAA (ou AAAA-MM-DD)
 */
export const isValidDateBR = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const trimmed = dateStr.trim();
  
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [dayStr, monthStr, yearStr] = trimmed.split('/');
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    if (month < 1 || month > 12) return false;
    if (year < 1900 || year > 2100) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    return day >= 1 && day <= daysInMonth;
  }
  
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [yearStr, monthStr, dayStr] = trimmed.split('-');
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);
    const year = parseInt(yearStr, 10);
    if (month < 1 || month > 12) return false;
    if (year < 1900 || year > 2100) return false;
    const daysInMonth = new Date(year, month, 0).getDate();
    return day >= 1 && day <= daysInMonth;
  }
  
  return false;
};

/**
 * Adiciona dias a uma data (aceita DD/MM/AAAA ou ISO) e retorna no formato DD/MM/AAAA
 */
export const addDaysToBRDate = (baseDateStr: string, days: number): string => {
  let date: Date;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(baseDateStr)) {
    const [d, m, y] = baseDateStr.split('/').map(Number);
    date = new Date(y, m - 1, d);
  } else if (baseDateStr && baseDateStr.includes('-')) {
    const [y, m, d] = baseDateStr.split('T')[0].split('-').map(Number);
    date = new Date(y, m - 1, d);
  } else {
    date = new Date();
  }
  
  date.setDate(date.getDate() + days);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatPhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length <= 10) {
    // Fixo: (XX) XXXX-XXXX
    return cleaned.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  // Celular: (XX) XXXXX-XXXX
  return cleaned.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
};

export const validateEmail = (email: string) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
};

export const validatePlate = (plate: string) => {
  const cleaned = plate.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (cleaned.length !== 7) return false;
  
  // Placa tradicional: Três letras seguidas de 4 números (AAA-9999)
  const traditional = /^[A-Z]{3}[0-9]{4}$/;
  // Placa Mercosul: Três letras, um número, uma letra, dois números (AAA9A99)
  const mercosul = /^[A-Z]{3}[0-9]{1}[A-Z]{1}[0-9]{2}$/;
  
  return traditional.test(cleaned) || mercosul.test(cleaned);
};

export const validateCpfCnpj = (val: string) => {
  // Desabilitada a validação rígida de CPF/CNPJ conforme solicitado pelo usuário
  return true;
};

export const validatePhone = (phone: string) => {
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 11;
};

export const containsInjection = (str: string): boolean => {
  if (!str) return false;
  const pattern = /(<script|javascript:|UNION\s+SELECT|xp_cmdshell|--|\/\*|\*\/)/i;
  return pattern.test(str);
};
