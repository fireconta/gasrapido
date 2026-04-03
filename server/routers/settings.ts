import { z } from "zod";
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { getAllSettings, setSettings } from "../db";
import { invalidateTimezoneCache } from "../timezone";

const settingsSchema = z.object({
  storeName: z.string().optional(),
  phone: z.string().optional(),
  whatsapp: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  openingHours: z.string().optional(),
  deliveryFee: z.string().optional(),
  minOrderValue: z.string().optional(),
  deliveryRadius: z.string().optional(),
  adminEmail: z.string().optional(),
  lowStockThreshold: z.string().optional(),
  pixKey: z.string().optional(),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  timezone: z.string().optional(),
});

export const settingsRouter = router({
  get: publicProcedure.query(async () => {
    try {
      return await getAllSettings();
    } catch (error) {
      console.error('[Settings] Error in get:', error);
      throw error;
    }
  }),
  getAll: publicProcedure.query(async () => {
    try {
      return await getAllSettings();
    } catch (error) {
      console.error('[Settings] Error in getAll:', error);
      throw error;
    }
  }),

  saveAll: adminProcedure
    .input(settingsSchema)
    .mutation(({ input }) => {
      const data: Record<string, string> = {};
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) data[key] = value;
      }
      // Invalidar cache de timezone se foi alterado
      if (input.timezone) invalidateTimezoneCache();
      return setSettings(data);
    }),

  update: adminProcedure
    .input(settingsSchema)
    .mutation(({ input }) => {
      const data: Record<string, string> = {};
      for (const [key, value] of Object.entries(input)) {
        if (value !== undefined) data[key] = value;
      }
      return setSettings(data);
    }),
});
