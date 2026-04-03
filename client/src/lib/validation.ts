/**
 * Utilitários de validação para formulários
 */

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11;
}

export function isValidCep(cep: string): boolean {
  const digits = cep.replace(/\D/g, '');
  return digits.length === 8;
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidCpf(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{10}$/.test(digits)) return false;
  
  // Calcular primeiro dígito verificador
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * (10 - i);
  }
  let remainder = sum % 11;
  let firstDigit = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(digits[9]) !== firstDigit) return false;
  
  // Calcular segundo dígito verificador
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(digits[i]) * (11 - i);
  }
  remainder = sum % 11;
  let secondDigit = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(digits[10]) === secondDigit;
}

export function isValidCnpj(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  
  // Verificar se todos os dígitos são iguais
  if (/^(\d)\1{13}$/.test(digits)) return false;
  
  // Calcular primeiro dígito verificador
  let sum = 0;
  let multiplier = 5;
  for (let i = 0; i < 8; i++) {
    sum += parseInt(digits[i]) * multiplier;
    multiplier = multiplier === 2 ? 9 : multiplier - 1;
  }
  let remainder = sum % 11;
  let firstDigit = remainder < 2 ? 0 : 11 - remainder;
  
  if (parseInt(digits[8]) !== firstDigit) return false;
  
  // Calcular segundo dígito verificador
  sum = 0;
  multiplier = 6;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(digits[i]) * multiplier;
    multiplier = multiplier === 2 ? 9 : multiplier - 1;
  }
  remainder = sum % 11;
  let secondDigit = remainder < 2 ? 0 : 11 - remainder;
  
  return parseInt(digits[9]) === secondDigit;
}

export function isValidAddress(street: string, number: string): boolean {
  return street.trim().length > 0 && number.trim().length > 0;
}

export function isValidName(name: string): boolean {
  return name.trim().length >= 3;
}

/**
 * Validar múltiplos campos de uma vez
 */
export function validateForm(fields: Record<string, any>): Record<string, string> {
  const errors: Record<string, string> = {};
  
  Object.entries(fields).forEach(([key, value]) => {
    switch (key) {
      case 'phone':
        if (value && !isValidPhone(value)) {
          errors[key] = 'Telefone inválido';
        }
        break;
      case 'cep':
        if (value && !isValidCep(value)) {
          errors[key] = 'CEP inválido';
        }
        break;
      case 'email':
        if (value && !isValidEmail(value)) {
          errors[key] = 'Email inválido';
        }
        break;
      case 'cpf':
        if (value && !isValidCpf(value)) {
          errors[key] = 'CPF inválido';
        }
        break;
      case 'cnpj':
        if (value && !isValidCnpj(value)) {
          errors[key] = 'CNPJ inválido';
        }
        break;
      case 'name':
        if (!isValidName(value)) {
          errors[key] = 'Nome deve ter pelo menos 3 caracteres';
        }
        break;
    }
  });
  
  return errors;
}
