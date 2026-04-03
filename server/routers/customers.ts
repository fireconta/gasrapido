import { z } from "zod";
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { getCustomers, getCustomerById, createCustomer, updateCustomer, getOrdersByCustomer } from "../db";

export const customersRouter = router({
  list: adminProcedure
    .input(z.object({ search: z.string().optional() }))
    .query(({ input }) => getCustomers(input.search)),

  // Busca pública para o checkout — retorna apenas campos de endereço/contato
  search: publicProcedure
    .input(z.object({ search: z.string().min(2) }))
    .query(async ({ input }) => {
      const results = await getCustomers(input.search);
      return results.slice(0, 8).map((c) => ({
        id: c.id,
        name: c.name,
        phone: c.phone ?? null,
        whatsapp: c.whatsapp ?? null,
        address: c.address ?? null,
        addressNumber: (c as any).addressNumber ?? null,
        complement: (c as any).complement ?? null,
        neighborhood: c.neighborhood ?? null,
      }));
    }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getCustomerById(input.id)),

  // Corrigido: busca os pedidos do cliente específico
  getHistory: adminProcedure
    .input(z.object({ customerId: z.number() }))
    .query(({ input }) => getOrdersByCustomer(input.customerId, 50)),

  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1),
        cpf: z.string().optional(),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        addressNumber: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(({ input }) => createCustomer(input)),

  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().optional(),
        cpf: z.string().optional(),
        phone: z.string().optional(),
        whatsapp: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
        addressNumber: z.string().optional(),
        neighborhood: z.string().optional(),
        city: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(({ input }) => {
      const { id, ...data } = input;
      return updateCustomer(id, data);
    }),

  // Exportar lista de clientes em CSV
  exportCsv: adminProcedure.query(async () => {
    const all = await getCustomers();
    return all.map((c) => ({
      id: c.id,
      name: c.name,
      cpf: (c as any).cpf ?? "",
      phone: c.phone ?? "",
      whatsapp: c.whatsapp ?? "",
      email: c.email ?? "",
      address: c.address ?? "",
      addressNumber: (c as any).addressNumber ?? "",
      neighborhood: c.neighborhood ?? "",
      city: c.city ?? "",
      notes: c.notes ?? "",
      totalOrders: c.totalOrders ?? 0,
      totalSpent: c.totalSpent ?? "0.00",
      createdAt: c.createdAt,
    }));
  }),
});
