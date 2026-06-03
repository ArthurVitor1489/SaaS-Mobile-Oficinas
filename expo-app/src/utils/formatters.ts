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
  const cleaned = val.replace(/\D/g, '');
  if (cleaned.length === 11) {
    if (/^(\d)\1{10}$/.test(cleaned)) return false;
    
    let sum = 0;
    let remainder;
    for (let i = 1; i <= 9; i++) {
      sum = sum + parseInt(cleaned.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.substring(9, 10))) return false;
    
    sum = 0;
    for (let i = 1; i <= 10; i++) {
      sum = sum + parseInt(cleaned.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.substring(10, 11))) return false;
    
    return true;
  } else if (cleaned.length === 14) {
    if (/^(\d)\1{13}$/.test(cleaned)) return false;
    
    let length = cleaned.length - 2;
    let numbers = cleaned.substring(0, length);
    const digits = cleaned.substring(length);
    let sum = 0;
    let pos = length - 7;
    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(0))) return false;
    
    length = length + 1;
    numbers = cleaned.substring(0, length);
    sum = 0;
    pos = length - 7;
    for (let i = length; i >= 1; i--) {
      sum += parseInt(numbers.charAt(length - i)) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - (sum % 11);
    if (result !== parseInt(digits.charAt(1))) return false;
    
    return true;
  }
  return false;
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
