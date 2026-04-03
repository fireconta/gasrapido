import { ContactForm } from '@/components/ContactForm';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';

export default function Contact() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="py-16 bg-primary/5">
        <div className="container">
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Entre em Contato
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Tem dúvidas ou sugestões? Estamos aqui para ajudar! Preencha o formulário abaixo e entraremos em contato em breve.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-16">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border border-border/60 p-8 shadow-sm">
                <h2 className="text-2xl font-bold text-foreground mb-6">Envie sua mensagem</h2>
                <ContactForm />
              </div>
            </div>

            {/* Info */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Phone className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">Telefone</h3>
                    <p className="text-sm text-muted-foreground">(64) 3651-1874</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">WhatsApp</h3>
                    <p className="text-sm text-muted-foreground">(64) 98456-5616</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">Localização</h3>
                    <p className="text-sm text-muted-foreground">
                      Av. José Quintiliano Leão, 346 b<br />
                      Quirinópolis, GO
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-border/60 p-6 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-orange-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-foreground mb-1">Horário</h3>
                    <p className="text-sm text-muted-foreground">
                      Seg-Sáb: 07:00–19:00<br />
                      Dom: 08:00–12:00
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
