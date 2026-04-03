import { z } from 'zod';
import { publicProcedure, router } from '../_core/trpc';
import { notifyOwner } from '../_core/notification';

const contactSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  phone: z.string().min(10, 'Telefone inválido'),
  subject: z.string().min(5, 'Assunto deve ter pelo menos 5 caracteres'),
  message: z.string().min(10, 'Mensagem deve ter pelo menos 10 caracteres'),
});

export const contactRouter = router({
  submit: publicProcedure
    .input(contactSchema)
    .mutation(async ({ input }) => {
      try {
        // Enviar notificação ao proprietário
        const success = await notifyOwner({
          title: `📬 Novo Contato: ${input.subject}`,
          content: `De: ${input.name} (${input.email})\nTelefone: ${input.phone}\n\nMensagem:\n${input.message}`,
        });

        if (!success) {
          console.warn('[Contact] Notificação não foi entregue, mas mensagem foi recebida');
        }

        return {
          success: true,
          message: 'Mensagem enviada com sucesso! Entraremos em contato em breve.',
        };
      } catch (error) {
        console.error('[Contact] Erro ao enviar mensagem:', error);
        throw new Error('Erro ao enviar mensagem. Tente novamente mais tarde.');
      }
    }),
});
