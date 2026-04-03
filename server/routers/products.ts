import { z } from "zod";
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import {
  getProducts,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
} from "../db";

export const productsRouter = router({
  list: publicProcedure
    .input(z.object({ search: z.string().optional(), category: z.string().optional() }).optional())
    .query(async ({ input }) => {
      try {
        return await getProducts(input?.search, input?.category);
      } catch (error) {
        console.error('[Products] Error in list:', error);
        throw error;
      }
    }),

  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getProductById(input.id)),

  lowStock: publicProcedure.query(() => getLowStockProducts()),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        price: z.string(),
        costPrice: z.string().optional(),
        imageUrl: z.string().optional(),
        // Categorias disponíveis: gas, agua, carvao, acessorio, vale_gas, promocao, outros
        category: z.string().optional(),
        unit: z.string().optional(),
        stockQty: z.number().int().min(0),
        // Para categoria 'gas': controle de cheios e vazios
        fullStockQty: z.number().int().min(0).optional(),
        emptyStockQty: z.number().int().min(0).optional(),
        minStock: z.number().int().min(0),
        isVisible: z.boolean().optional(),
      })
    )
    .mutation(({ input }) =>
      createProduct({
        name: input.name,
        description: input.description,
        price: input.price,
        costPrice: input.costPrice,
        imageUrl: input.imageUrl,
        category: input.category ?? "gas",
        unit: input.unit ?? "unidade",
        stockQty: input.stockQty,
        fullStockQty: input.fullStockQty ?? input.stockQty,
        emptyStockQty: input.emptyStockQty ?? 0,
        minStock: input.minStock,
        isActive: true,
        isVisible: input.isVisible ?? true,
      })
    ),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        price: z.string().optional(),
        costPrice: z.string().optional(),
        imageUrl: z.string().optional(),
        category: z.string().optional(),
        unit: z.string().optional(),
        stockQty: z.number().int().min(0).optional(),
        // Para categoria 'gas': controle de cheios e vazios
        fullStockQty: z.number().int().min(0).optional(),
        emptyStockQty: z.number().int().min(0).optional(),
        minStock: z.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
        isVisible: z.boolean().optional(),
      })
    )
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return updateProduct(id, data);
    }),

  toggleVisibility: adminProcedure
    .input(z.object({ id: z.number(), isVisible: z.boolean() }))
    .mutation(({ input }) => updateProduct(input.id, { isVisible: input.isVisible })),

  // Lista todos os produtos para o admin (incluindo ocultos da loja)
  listAll: adminProcedure
    .input(z.object({ search: z.string().optional(), category: z.string().optional() }).optional())
    .query(async ({ input }) => {
      try {
        return await getAllProducts(input?.search, input?.category);
      } catch (error) {
        console.error('[Products] Error in listAll:', error);
        throw error;
      }
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(({ input }) => deleteProduct(input.id)),
});
