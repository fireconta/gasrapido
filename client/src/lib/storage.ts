/**
 * Utilitários para gerenciar armazenamento local com expiração
 */

interface StorageItem<T> {
  value: T;
  expiresAt?: number;
}

export const storage = {
  /**
   * Salvar item no localStorage com expiração opcional
   */
  set<T>(key: string, value: T, expirationMinutes?: number): void {
    const item: StorageItem<T> = {
      value,
      expiresAt: expirationMinutes
        ? Date.now() + expirationMinutes * 60000
        : undefined,
    };
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.error('Erro ao salvar no localStorage:', error);
    }
  },

  /**
   * Obter item do localStorage
   */
  get<T>(key: string): T | null {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;

      const parsed: StorageItem<T> = JSON.parse(item);

      // Verificar expiração
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem(key);
        return null;
      }

      return parsed.value;
    } catch (error) {
      console.error('Erro ao ler do localStorage:', error);
      return null;
    }
  },

  /**
   * Remover item do localStorage
   */
  remove(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Erro ao remover do localStorage:', error);
    }
  },

  /**
   * Limpar todo o localStorage
   */
  clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Erro ao limpar localStorage:', error);
    }
  },

  /**
   * Verificar se uma chave existe
   */
  has(key: string): boolean {
    try {
      const item = localStorage.getItem(key);
      if (!item) return false;

      const parsed: StorageItem<any> = JSON.parse(item);

      // Verificar expiração
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        localStorage.removeItem(key);
        return false;
      }

      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Obter todas as chaves
   */
  keys(): string[] {
    try {
      return Object.keys(localStorage);
    } catch (error) {
      return [];
    }
  },
};

/**
 * Hook para usar storage com sincronização
 */
export function useStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = React.useState<T>(() => {
    return storage.get<T>(key) ?? initialValue;
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      storage.set(key, valueToStore);
    } catch (error) {
      console.error('Erro ao atualizar storage:', error);
    }
  };

  return [storedValue, setValue] as const;
}

// Importar React para o hook
import React from 'react';
