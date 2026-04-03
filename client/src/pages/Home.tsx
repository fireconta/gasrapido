/**
 * Design: Brutalismo Tipográfico
 * - Fundo branco puro, texto preto intenso
 * - Acento laranja-fogo para urgência e energia
 * - Tipografia condensada em caixa-alta para o nome (Oswald)
 * - Separadores em negrito, sem ornamentos
 * - Estático, direto, sem animações
 */

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-black font-sans">
      {/* Cabeçalho */}
      <header className="border-b-4 border-black px-6 py-6">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-5xl font-black uppercase tracking-tight leading-none" style={{ fontFamily: "'Oswald', sans-serif", color: "#E84A00" }}>
            Gás Rápido
          </h1>
          <p className="mt-1 text-sm font-bold uppercase tracking-widest text-gray-500">
            Entrega de gás a domicílio
          </p>
        </div>
      </header>

      {/* Conteúdo principal */}
      <main className="max-w-2xl mx-auto px-6 py-10 space-y-10">

        {/* Chamada principal */}
        <section>
          <h2 className="text-3xl font-black uppercase leading-tight mb-3" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Gás na sua porta, rápido e sem complicação
          </h2>
          <p className="text-base leading-relaxed text-gray-800">
            Somos uma empresa especializada em entrega de botijões de gás diretamente na sua residência ou comércio. Atendemos com agilidade, segurança e preço justo.
          </p>
        </section>

        <hr className="border-t-2 border-black" />

        {/* Serviços */}
        <section>
          <h2 className="text-xl font-black uppercase mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Nossos Serviços
          </h2>
          <ul className="space-y-2 text-gray-800 text-base">
            <li className="flex items-start gap-2">
              <span className="font-black text-orange-600 mt-0.5">—</span>
              <span>Entrega de botijão P13 (13 kg)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-black text-orange-600 mt-0.5">—</span>
              <span>Entrega de botijão P45 (45 kg)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-black text-orange-600 mt-0.5">—</span>
              <span>Atendimento residencial e comercial</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="font-black text-orange-600 mt-0.5">—</span>
              <span>Entrega em até 40 minutos</span>
            </li>
          </ul>
        </section>

        <hr className="border-t-2 border-black" />

        {/* Por que nos escolher */}
        <section>
          <h2 className="text-xl font-black uppercase mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Por que escolher o Gás Rápido?
          </h2>
          <p className="text-base leading-relaxed text-gray-800 mb-3">
            Trabalhamos com fornecedores certificados e garantimos a qualidade e segurança em cada entrega. Nossa equipe é treinada para atender com rapidez e cortesia.
          </p>
          <p className="text-base leading-relaxed text-gray-800">
            Operamos todos os dias da semana, incluindo feriados, para que você nunca fique sem gás quando mais precisar.
          </p>
        </section>

        <hr className="border-t-2 border-black" />

        {/* Contato */}
        <section>
          <h2 className="text-xl font-black uppercase mb-4" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Fale Conosco
          </h2>
          <div className="space-y-1 text-base text-gray-800">
            <p>
              <span className="font-bold">Telefone:</span> (11) 99999-0000
            </p>
            <p>
              <span className="font-bold">WhatsApp:</span> (11) 99999-0000
            </p>
            <p>
              <span className="font-bold">Horário:</span> Todos os dias, das 7h às 22h
            </p>
            <p>
              <span className="font-bold">E-mail:</span> contato@gasrapido.com.br
            </p>
          </div>
        </section>

      </main>

      {/* Rodapé */}
      <footer className="border-t-4 border-black px-6 py-5 mt-10">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row sm:justify-between gap-2 text-sm text-gray-600">
          <span className="font-bold uppercase tracking-wide" style={{ fontFamily: "'Oswald', sans-serif" }}>
            Gás Rápido
          </span>
          <span>© {new Date().getFullYear()} — Todos os direitos reservados</span>
        </div>
      </footer>
    </div>
  );
}
