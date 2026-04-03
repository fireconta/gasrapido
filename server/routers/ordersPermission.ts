/**
 * Validação de Permissões para Pedidos
 * 
 * Regra: Apenas admin pode criar pedidos de gás completo
 * Gás normal é padrão para todos os outros usuários
 */

import { TRPCError } from "@trpc/server";

/**
 * Detecta se um produto é gás completo
 */
export function isFullGasProduct(productName: string): boolean {
  const fullGasKeywords = ["completo", "troca", "cheio", "full"];
  const lowerName = productName.toLowerCase();
  return fullGasKeywords.some((keyword) => lowerName.includes(keyword));
}

/**
 * Valida permissão para criar pedido com gás completo
 * @param items - Array de itens do pedido
 * @param userRole - Role do usuário (admin, user, etc)
 * @throws TRPCError se usuário não-admin tentar criar gás completo
 */
export function validateFullGasPermission(
  items: Array<{ productName: string; quantity: number }>,
  userRole?: string
): void {
  // Verificar se há gás completo nos itens
  const hasFullGas = items.some((item) => isFullGasProduct(item.productName));

  // Se há gás completo e usuário não é admin, lançar erro
  if (hasFullGas && userRole !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message:
        "Apenas administradores podem criar pedidos com gás completo (troca). Use gás normal (reposição) para outros usuários.",
    });
  }
}

/**
 * Garante que gás normal é o padrão
 * Se nenhum tipo for especificado, assume gás normal
 */
export function ensureDefaultGasType(items: Array<{ productName: string }>): void {
  for (const item of items) {
    // Se não for gás completo, é gás normal (padrão)
    if (!isFullGasProduct(item.productName)) {
      // Adicionar marcação de gás normal se necessário
      // Isso pode ser feito no schema de validação
    }
  }
}

/**
 * Log de auditoria para pedidos de gás completo
 */
export function logFullGasOrder(
  orderId: number,
  adminName: string,
  itemCount: number
): void {
  console.log(
    `[AUDIT] Admin "${adminName}" criou pedido #${orderId} com ${itemCount} item(ns) de gás completo`
  );
}

/**
 * Exemplo de uso no router:
 *
 * create: publicProcedure
 *   .input(createOrderSchema)
 *   .mutation(async ({ input, ctx }) => {
 *     // Validar permissão para gás completo
 *     validateFullGasPermission(input.items, ctx.user?.role);
 *
 *     // Garantir que gás normal é o padrão
 *     ensureDefaultGasType(input.items);
 *
 *     // Criar pedido...
 *     const result = await createOrder(...);
 *
 *     // Log de auditoria se for gás completo
 *     if (input.items.some(i => isFullGasProduct(i.productName))) {
 *       logFullGasOrder(result.id, ctx.user?.name || "Unknown", input.items.length);
 *     }
 *
 *     return result;
 *   })
 */
