/**
 * Utilitários de máscara para campos de formulário
 */

/** Remove todos os caracteres não numéricos */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Máscara de telefone/celular brasileiro
 * Formatos: (64) 9999-9999 ou (64) 99999-9999
 */
export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length <= 10) {
    // Telefone fixo: (64) 3651-1874
    return digits
      .replace(/^(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d)/, "$1-$2");
  }
  // Celular: (64) 99999-9999
  return digits
    .replace(/^(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d)/, "$1-$2");
}

/**
 * Máscara de CEP: 75900-000
 */
export function maskCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, "$1-$2");
}

/**
 * Hook-style handler para campos de telefone
 * Uso: onChange={(e) => setValue(handlePhoneChange(e))}
 */
export function handlePhoneChange(
  e: React.ChangeEvent<HTMLInputElement>
): string {
  return maskPhone(e.target.value);
}

/**
 * Hook-style handler para campos de CEP
 */
export function handleCepChange(
  e: React.ChangeEvent<HTMLInputElement>
): string {
  return maskCep(e.target.value);
}

/**
 * Componente de input com máscara de telefone - props extras
 */
export const phoneInputProps = {
  placeholder: "(64) 99999-9999",
  maxLength: 15,
  inputMode: "tel" as const,
  type: "tel" as const,
};

export const cepInputProps = {
  placeholder: "75900-000",
  maxLength: 9,
  inputMode: "numeric" as const,
};

/**
 * Máscara de valor monetário: R$ 1.234,56
 */
export function maskCurrency(value: string): string {
  const digits = onlyDigits(value);
  const numericValue = parseInt(digits || '0', 10);
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue / 100);
}

/**
 * Máscara de valor sem símbolo: 1.234,56
 */
export function maskDecimal(value: string): string {
  const digits = onlyDigits(value);
  if (!digits) return '0,00';
  const numericValue = parseInt(digits, 10);
  return (numericValue / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Máscara de CPF: 999.999.999-99
 */
export function maskCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

/**
 * Máscara de CNPJ: 99.999.999/9999-99
 */
export function maskCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

/**
 * Converte string formatada em moeda para número
 * Ex: "R$ 10,00" → 10.00 | "1.234,56" → 1234.56 | "0,00" → 0
 */
export function parseCurrency(value: string | null | undefined): number {
  if (!value) return 0;
  const cleaned = value
    .replace(/R\$\s*/g, '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
    .trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Handler para campos de valor monetário
 */
export function handleCurrencyChange(
  e: React.ChangeEvent<HTMLInputElement>
): string {
  return maskCurrency(e.target.value);
}

/**
 * Handler para campos de valor decimal
 */
export function handleDecimalChange(
  e: React.ChangeEvent<HTMLInputElement>
): string {
  return maskDecimal(e.target.value);
}

export const currencyInputProps = {
  placeholder: "R$ 0,00",
  maxLength: 18,
  inputMode: "decimal" as const,
};

export const decimalInputProps = {
  placeholder: "0,00",
  maxLength: 10,
  inputMode: "decimal" as const,
};

export const cpfInputProps = {
  placeholder: "999.999.999-99",
  maxLength: 14,
  inputMode: "numeric" as const,
};

export const cnpjInputProps = {
  placeholder: "99.999.999/9999-99",
  maxLength: 18,
  inputMode: "numeric" as const,
};
