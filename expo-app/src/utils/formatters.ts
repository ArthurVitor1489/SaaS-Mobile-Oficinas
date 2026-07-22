export const formatCurrency = (val: number | string) => {
  const num = typeof val === 'number' ? val : parseFloat(val) || 0;
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

export const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  // Se for formato AAAA-MM-DD
  if (dateStr.includes('-')) {
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return dateStr;
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
