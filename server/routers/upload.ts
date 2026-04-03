import { z } from "zod";
import { publicProcedure, adminProcedure, router } from "../_core/trpc";
import { storagePut } from "../storage";

function randomSuffix() {
  return Math.random().toString(36).substring(2, 10);
}

export const uploadRouter = router({
  productImage: adminProcedure
    .input(
      z.object({
        base64: z.string(),
        filename: z.string(),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const buffer = Buffer.from(input.base64, "base64");
      const ext = input.filename.split(".").pop() ?? "jpg";
      const key = `products/${randomSuffix()}-${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);
      return { url };
    }),
});
