import { useRef, useCallback, useEffect } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresIn: number; // em ms
}

interface UseCacheOptions {
  expiresIn?: number; // em ms, padrão 5 minutos
}

/**
 * Hook para gerenciar cache de dados com expiração automática
 */
export function useCache<T>(key: string, fetcher: () => Promise<T>, options?: UseCacheOptions) {
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());
  const expiresIn = options?.expiresIn ?? 5 * 60 * 1000; // 5 minutos padrão

  const get = useCallback((): T | null => {
    const entry = cacheRef.current.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.expiresIn;
    if (isExpired) {
      cacheRef.current.delete(key);
      return null;
    }

    return entry.data;
  }, [key, expiresIn]);

  const set = useCallback((data: T) => {
    cacheRef.current.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
    });
  }, [key, expiresIn]);

  const invalidate = useCallback(() => {
    cacheRef.current.delete(key);
  }, [key]);

  const fetch = useCallback(async (): Promise<T> => {
    const cached = get();
    if (cached) return cached;

    const data = await fetcher();
    set(data);
    return data;
  }, [get, set, fetcher]);

  const clear = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  return { get, set, fetch, invalidate, clear };
}

/**
 * Gerenciador de cache global
 */
class CacheManager {
  private cache = new Map<string, CacheEntry<any>>();

  set<T>(key: string, data: T, expiresIn: number = 5 * 60 * 1000) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresIn,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > entry.expiresIn;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    const isExpired = Date.now() - entry.timestamp > entry.expiresIn;
    if (isExpired) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string | RegExp) {
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const keys = Array.from(this.cache.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }

  getSize(): number {
    return this.cache.size;
  }
}

// Instância global
export const cacheManager = new CacheManager();

/**
 * Hook para usar o gerenciador de cache global
 */
export function useGlobalCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: UseCacheOptions
) {
  const expiresIn = options?.expiresIn ?? 5 * 60 * 1000;

  const fetch = useCallback(async (): Promise<T> => {
    const cached = cacheManager.get<T>(key);
    if (cached) return cached;

    const data = await fetcher();
    cacheManager.set(key, data, expiresIn);
    return data;
  }, [key, fetcher, expiresIn]);

  const invalidate = useCallback(() => {
    cacheManager.invalidate(key);
  }, [key]);

  const get = useCallback((): T | null => {
    return cacheManager.get<T>(key);
  }, [key]);

  return { fetch, invalidate, get };
}
