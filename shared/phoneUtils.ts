/**
 * Utilitários para formatação e validação de telefone/WhatsApp
 */

/**
 * Remove caracteres não numéricos do telefone
 */
export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Formata telefone para o padrão (XX) 9XXXX-XXXX
 * Aceita: 11999999999, (11) 99999-9999, 11 99999-9999, etc.
 */
export function formatPhone(phone: string): string {
  const cleaned = cleanPhone(phone);

  // Se não tem 11 dígitos, retorna como está
  if (cleaned.length !== 11) {
    return phone;
  }

  // Formata: (XX) 9XXXX-XXXX
  return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
}

/**
 * Valida se o telefone é válido
 * Deve ter 11 dígitos e começar com 9 no segundo dígito (celular)
 */
export function isValidPhone(phone: string): boolean {
  const cleaned = cleanPhone(phone);

  // Deve ter exatamente 11 dígitos
  if (cleaned.length !== 11) {
    return false;
  }

  // Segundo dígito deve ser 9 (celular)
  if (cleaned[2] !== "9") {
    return false;
  }

  // Primeiro dígito deve ser entre 1-9
  if (cleaned[0] === "0") {
    return false;
  }

  return true;
}

/**
 * Formata telefone com validação
 * Retorna o telefone formatado se válido, senão retorna string vazia
 */
export function formatPhoneIfValid(phone: string): string {
  if (!isValidPhone(phone)) {
    return "";
  }
  return formatPhone(phone);
}

/**
 * Máscara de entrada para campo de telefone
 * Aplica formatação conforme o usuário digita
 */
export function applyPhoneMask(value: string): string {
  const cleaned = cleanPhone(value);

  // Limita a 11 dígitos
  const limited = cleaned.slice(0, 11);

  if (limited.length === 0) return "";
  if (limited.length <= 2) return `(${limited}`;
  if (limited.length <= 7) return `(${limited.slice(0, 2)}) ${limited.slice(2)}`;
  return `(${limited.slice(0, 2)}) ${limited.slice(2, 7)}-${limited.slice(7)}`;
}

/**
 * Gera link do WhatsApp com mensagem pré-preenchida
 */
export function getWhatsAppLink(phone: string, message?: string): string {
  const cleaned = cleanPhone(phone);
  const formattedPhone = `55${cleaned}`; // Adiciona código do Brasil

  if (message) {
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
  }

  return `https://wa.me/${formattedPhone}`;
}

/**
 * Extrai apenas números do telefone e adiciona código do Brasil
 */
export function getPhoneWithCountryCode(phone: string): string {
  const cleaned = cleanPhone(phone);
  return `55${cleaned}`;
}
