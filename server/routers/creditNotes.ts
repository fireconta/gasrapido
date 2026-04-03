import { router, publicProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { creditNotes, creditNotePayments } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, type SQL } from "drizzle-orm";

export const creditNotesRouter = router({
  list: adminProcedure
    .input(
      z.object({
        status: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      
      const conditions: SQL[] = [];
      if (input.status && input.status !== "todos") {
        conditions.push(eq(creditNotes.status, input.status as any));
      }
      
      const query = db
        .select()
        .from(creditNotes)
        .orderBy(desc(creditNotes.createdAt));
      
      if (conditions.length > 0) {
        return query.where(and(...conditions));
      }
      return query;
    }),
  
  summary: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) {
      return {
        total: 0,
        overdue: 0,
        pending: 0,
        totalPending: 0,
        totalOverdue: 0,
        totalPaid: 0,
        pendingCount: 0,
        overdueCount: 0,
        paidCount: 0,
      };
    }
    
    const notes = await db.select().from(creditNotes);
    const now = new Date();
    
    let totalPending = 0;
    let totalOverdue = 0;
    let totalPaid = 0;
    let pendingCount = 0;
    let overdueCount = 0;
    let paidCount = 0;
    
    for (const note of notes) {
      const remaining = parseFloat(note.amount.toString()) - parseFloat(note.paidAmount.toString());
      
      if (note.status === "pago") {
        totalPaid += parseFloat(note.amount.toString());
        paidCount++;
      } else if (note.dueDate < now && remaining > 0) {
        totalOverdue += remaining;
        overdueCount++;
      } else if (remaining > 0) {
        totalPending += remaining;
        pendingCount++;
      }
    }
    
    return {
      total: totalPending + totalOverdue + totalPaid,
      overdue: totalOverdue,
      pending: totalPending,
      totalPending,
      totalOverdue,
      totalPaid,
      pendingCount,
      overdueCount,
      paidCount,
    };
  }),
  
  getById: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const noteId = parseInt(input.id);
      const note = await db
        .select()
        .from(creditNotes)
        .where(eq(creditNotes.id, noteId))
        .limit(1);
      
      if (!note.length) return null;
      
      const payments = await db
        .select()
        .from(creditNotePayments)
        .where(eq(creditNotePayments.creditNoteId, noteId));
      
      const noteData = note[0];
      const remaining = parseFloat(noteData.amount.toString()) - parseFloat(noteData.paidAmount.toString());
      
      return {
        id: noteData.id.toString(),
        customerName: noteData.customerName,
        customerPhone: noteData.customerPhone,
        amount: parseFloat(noteData.amount.toString()),
        remaining,
        dueDays: Math.ceil((noteData.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        status: noteData.status,
        dueDate: noteData.dueDate,
        payments: payments.map(p => ({
          id: p.id,
          amount: parseFloat(p.amount.toString()),
          paymentMethod: p.paymentMethod,
          createdAt: p.createdAt,
          notes: p.notes,
        })),
        description: noteData.description,
        orderNumber: noteData.orderNumber,
        createdAt: noteData.createdAt,
        paidAmount: parseFloat(noteData.paidAmount.toString()),
      };
    }),
  
  create: adminProcedure
    .input(
      z.object({
        customerName: z.string(),
        customerPhone: z.string(),
        amount: z.number(),
        dueDays: z.number(),
        description: z.string().optional(),
        orderNumber: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + input.dueDays);
      
      const result = await db.insert(creditNotes).values({
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        amount: input.amount.toString(),
        paidAmount: "0",
        dueDate,
        status: "pendente",
        description: input.description,
        orderNumber: input.orderNumber,
      });
      
      const insertId = (result as any)[0]?.insertId ?? (result as any).insertId;
      
      return {
        id: insertId?.toString() || "1",
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        amount: input.amount,
        dueDays: input.dueDays,
        description: input.description,
        orderNumber: input.orderNumber,
        createdAt: new Date(),
      };
    }),
  
  getDetail: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return null;
      
      const noteId = parseInt(input.id);
      const note = await db
        .select()
        .from(creditNotes)
        .where(eq(creditNotes.id, noteId))
        .limit(1);
      
      if (!note.length) return null;
      
      const payments = await db
        .select()
        .from(creditNotePayments)
        .where(eq(creditNotePayments.creditNoteId, noteId));
      
      const noteData = note[0];
      const remaining = parseFloat(noteData.amount.toString()) - parseFloat(noteData.paidAmount.toString());
      
      return {
        id: noteData.id.toString(),
        customerName: noteData.customerName,
        customerPhone: noteData.customerPhone,
        amount: parseFloat(noteData.amount.toString()),
        remaining,
        dueDays: Math.ceil((noteData.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)),
        status: noteData.status,
        dueDate: noteData.dueDate,
        payments: payments.map(p => ({
          id: p.id,
          amount: parseFloat(p.amount.toString()),
          paymentMethod: p.paymentMethod,
          createdAt: p.createdAt,
          notes: p.notes,
        })),
        description: noteData.description,
        orderNumber: noteData.orderNumber,
        createdAt: noteData.createdAt,
        paidAmount: parseFloat(noteData.paidAmount.toString()),
      };
    }),
  
  delete: adminProcedure
    .input(
      z.object({
        id: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      
      const noteId = parseInt(input.id);
      await db.delete(creditNotes).where(eq(creditNotes.id, noteId));
      
      return { success: true };
    }),
  
  addPayment: adminProcedure
    .input(
      z.object({
        creditNoteId: z.string(),
        amount: z.number(),
        method: z.string(),
        paymentMethod: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB not available");
      
      const noteId = parseInt(input.creditNoteId);
      const note = await db
        .select()
        .from(creditNotes)
        .where(eq(creditNotes.id, noteId))
        .limit(1);
      
      if (!note.length) throw new Error("Credit note not found");
      
      const noteData = note[0];
      const newPaidAmount = parseFloat(noteData.paidAmount.toString()) + input.amount;
      const totalAmount = parseFloat(noteData.amount.toString());
      
      // Determine new status
      let newStatus = noteData.status;
      if (newPaidAmount >= totalAmount) {
        newStatus = "pago";
      } else if (newPaidAmount > 0) {
        newStatus = "parcial";
      }
      
      // Add payment record
      await db.insert(creditNotePayments).values({
        creditNoteId: noteId,
        amount: input.amount.toString(),
        paymentMethod: (input.paymentMethod || input.method) as any,
        notes: input.notes,
      });
      
      // Update credit note
      await db
        .update(creditNotes)
        .set({
          paidAmount: newPaidAmount.toString(),
          status: newStatus as any,
          paidAt: newStatus === "pago" ? new Date() : noteData.paidAt,
        })
        .where(eq(creditNotes.id, noteId));
      
      const remaining = totalAmount - newPaidAmount;
      
      return {
        status: newStatus,
        remaining: Math.max(0, remaining),
      };
    }),
  
  checkAndNotifyDue: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) return { notified: 0 };
    
    const now = new Date();
    const notes = await db
      .select()
      .from(creditNotes)
      .where(
        and(
          lte(creditNotes.dueDate, now),
          eq(creditNotes.status, "pendente" as any)
        )
      );
    
    // Update status to vencido
    for (const note of notes) {
      if (!note.notifiedAt) {
        await db
          .update(creditNotes)
          .set({
            status: "vencido" as any,
            notifiedAt: new Date(),
          })
          .where(eq(creditNotes.id, note.id));
      }
    }
    
    return {
      notified: notes.length,
    };
  }),

  // Exportar notas de fiado em CSV
  exportCsv: adminProcedure
    .input(z.object({ status: z.string().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) return [];
      const conditions: SQL[] = [];
      if (input.status && input.status !== "todos") {
        conditions.push(eq(creditNotes.status, input.status as any));
      }
      const query = db.select().from(creditNotes).orderBy(desc(creditNotes.createdAt));
      const notes = conditions.length > 0 ? await query.where(and(...conditions)) : await query;
      return notes.map(n => ({
        id: n.id,
        customerName: n.customerName,
        customerPhone: n.customerPhone ?? "",
        amount: parseFloat(n.amount.toString()),
        paidAmount: parseFloat(n.paidAmount.toString()),
        remaining: parseFloat(n.amount.toString()) - parseFloat(n.paidAmount.toString()),
        status: n.status,
        dueDate: n.dueDate,
        description: n.description ?? "",
        orderNumber: n.orderNumber ?? "",
        createdAt: n.createdAt,
      }));
    }),
});
