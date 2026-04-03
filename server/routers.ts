import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, adminProcedure } from "./_core/trpc";
import { productsRouter } from "./routers/products";
import { ordersRouter } from "./routers/orders";
import { customersRouter } from "./routers/customers";
import { stockRouter } from "./routers/stock";
import { couponsRouter } from "./routers/coupons";
import { dashboardRouter } from "./routers/dashboard";
import { settingsRouter } from "./routers/settings";
import { uploadRouter } from "./routers/upload";
import { adminAuthRouter } from "./routers/adminAuth";
import { deliverersRouter } from "./routers/deliverers";
import { delivererAuthRouter } from "./routers/delivererAuth";
import { whatsappRouter } from "./routers/whatsapp";
import { gasCountRouter } from "./routers/gasCount";
import { creditNotesRouter } from "./routers/creditNotes";
import { truckDeliveryRouter } from "./routers/truckDelivery";
import { paymentDiscountRouter } from "./routers/paymentDiscount";
import { pushNotificationsRouter } from "./routers/pushNotifications";
import { trackingRouter } from "./routers/tracking";
import { contactRouter } from "./routers/contact";
import { auditRouter } from "./routers/audit";
import { backupsRouter } from "./routers/backups";
import { chatRouter } from "./routers/chat";
import { benefitsRouter } from "./routers/benefits";
import { gasVouchersRouter } from "./routers/gasVouchers";
import { promotionsRouter } from "./routers/promotions";
import { discountsRouter } from "./routers/discounts";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  products: productsRouter,
  orders: ordersRouter,
  customers: customersRouter,
  stock: stockRouter,
  coupons: couponsRouter,
  dashboard: dashboardRouter,
  settings: settingsRouter,
  upload: uploadRouter,
  adminAuth: adminAuthRouter,
  deliverers: deliverersRouter,
  delivererAuth: delivererAuthRouter,
  whatsapp: whatsappRouter,
  gasCount: gasCountRouter,
  creditNotes: creditNotesRouter,
  truckDelivery: truckDeliveryRouter,
  paymentDiscount: paymentDiscountRouter,
  pushNotifications: pushNotificationsRouter,
  tracking: trackingRouter,
  contact: contactRouter,
  audit: auditRouter,
  backups: backupsRouter,
  chat: chatRouter,
  benefits: benefitsRouter,
  gasVouchers: gasVouchersRouter,
  promotions: promotionsRouter,
  discounts: discountsRouter,
});

export type AppRouter = typeof appRouter;
