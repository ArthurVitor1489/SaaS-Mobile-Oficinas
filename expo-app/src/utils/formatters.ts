export const formatCurrency = (val: number | string) => {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

/**
 * Aplica máscara monetária em tempo real (R$) baseada em centavos (padrão brasileiro).
 * Ex: '1' -> '0,01', '15' -> '0,15', '150' -> '1,50', '15000' -> '150,00'
 */
export const maskCurrencyInput = (val: string): string => {
  const digits = val.replace(/\D/g, '');
  if (!digits) return '';
  const num = parseInt(digits, 10) / 100;
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

/**
 * Converte valor em formato monetário (ex: '150,00', '1.250,50' ou '0,30') para número float
 */
export const parseCurrencyToNumber = (val: string): number => {
  if (!val) return 0;
  const cleaned = val
    .replace(/\s/g, '')
    .replace(/R\$/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
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
 * Retorna a data local de hoje no formato brasileiro DD/MM/AAAA
 */
export const getTodayBR = (): string => {
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Retorna a data local de hoje no formato ISO AAAA-MM-DD (sem desvio de fuso horário UTC).
 * Ex: Às 22h no Brasil, retorna a data de hoje e não o dia seguinte em UTC.
 */
export const getTodayISO = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Retorna o mês local atual no formato AAAA-MM (sem desvio de fuso horário UTC).
 */
export const getCurrentMonthISO = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
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
 * Converte data DD/MM/AAAA ou ISO para ISO AAAA-MM-DD para armazenamento,
 * respeitando o horário local.
 */
export const parseDateToISO = (dateStr: string): string => {
  if (!dateStr) return getTodayISO();
  const trimmed = dateStr.trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(trimmed)) {
    const [day, month, year] = trimmed.split('/');
    return `${year}-${month}-${day}`;
  }
  if (trimmed.includes('T')) {
    // Converte timestamp ISO para data local do dispositivo
    try {
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        const y = parsed.getFullYear();
        const m = String(parsed.getMonth() + 1).padStart(2, '0');
        const d = String(parsed.getDate()).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {}
    return trimmed.split('T')[0];
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.substring(0, 10);
  }
  return trimmed;
};

/**
 * Normaliza qualquer formato de data para YYYY-MM-DD puro local
 */
export const normalizeDateToISO = (dateStr: string): string => {
  return parseDateToISO(dateStr);
};

/**
 * Verifica se uma data corresponde ao dia de hoje (no horário local)
 */
export const isDateToday = (dateStr: string): boolean => {
  if (!dateStr) return false;
  return parseDateToISO(dateStr) === getTodayISO();
};

/**
 * Verifica se uma data pertence à semana corrente (domingo a sábado, horário local)
 */
export const isDateThisWeek = (dateStr: string): boolean => {
  if (!dateStr) return false;
  const iso = parseDateToISO(dateStr);
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3) return false;
  const [y, m, d] = parts;
  if (!y || !m || !d) return false;

  const targetDate = new Date(y, m - 1, d, 12, 0, 0);
  const now = new Date();
  const startOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay(), 0, 0, 0, 0);
  const endOfWeek = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay() + 6, 23, 59, 59, 999);

  return targetDate >= startOfWeek && targetDate <= endOfWeek;
};

/**
 * Verifica se uma data pertence ao mês corrente (no horário local)
 */
export const isDateThisMonth = (dateStr: string): boolean => {
  if (!dateStr) return false;
  return parseDateToISO(dateStr).startsWith(getCurrentMonthISO());
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

/**
 * Máscara dinâmica em tempo real para CPF (11 dígitos) e CNPJ (14 dígitos)
 */
export const maskCpfCnpj = (val: string): string => {
  const digits = val.replace(/\D/g, '').slice(0, 14);
  if (digits.length <= 11) {
    // CPF: 000.000.000-00
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  }
  // CNPJ: 00.000.000/0000-00
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
};

/**
 * Máscara dinâmica em tempo real para Telefone / WhatsApp
 */
export const maskPhone = (val: string): string => {
  const digits = val.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
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

/**
 * Normaliza um texto para busca:
 * - Remove acentos / diacríticos (ex: "João" -> "joao", "óleo" -> "oleo", "Mecânica" -> "mecanica")
 * - Converte para minúsculo
 * - Remove espaços duplicados nas extremidades
 */
export const normalizeSearchText = (text: string | null | undefined): string => {
  if (!text) return '';
  try {
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  } catch {
    return text.toString().toLowerCase().trim();
  }
};

/**
 * Remove qualquer caractere que não seja letra ou número.
 * Essencial para buscar placas com/sem hífen e telefones com/sem máscara.
 */
export const cleanAlphaNumeric = (text: string | null | undefined): string => {
  if (!text) return '';
  return text.toString().replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
};

/**
 * Compara se um termo de busca corresponde a uma lista de campos alvos.
 * Suporta:
 * 1. Insensibilidade a acentos (ex: "joa" encontra "João", "oleo" encontra "Óleo")
 * 2. Case-insensitive
 * 3. Busca por múltiplos termos/palavras (ex: "joao palio" encontra João que tem Palio)
 * 4. Correspondência alfanumérica limpa para placas, telefones e CPF/CNPJ
 */
export const matchesSearch = (
  targets: (string | null | undefined)[],
  query: string | null | undefined
): boolean => {
  if (!query || !query.trim()) return true;

  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);
  const cleanQuery = cleanAlphaNumeric(query);

  const normalizedTargets = targets
    .filter(Boolean)
    .map(t => normalizeSearchText(t));
  const fullTargetString = normalizedTargets.join(' ');

  // 1. Verifica se todos os tokens da busca estão presentes nos campos consolidados
  const allTokensMatch = queryTokens.length > 0 && queryTokens.every(token => fullTargetString.includes(token));
  if (allTokensMatch) return true;

  // 2. Busca alfanumérica limpa (placas ex: "ABC-1234" com "abc12", fones sem máscara, etc)
  if (cleanQuery.length >= 2) {
    const cleanTargets = targets
      .filter(Boolean)
      .map(t => cleanAlphaNumeric(t))
      .join(' ');
    if (cleanTargets.includes(cleanQuery)) {
      return true;
    }
  }

  return false;
};
