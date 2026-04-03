# Dados Extraídos do Backup SQL - Gás Rápido

**Data do Backup:** 02 de Abril de 2026  
**Arquivo:** gas_rapido_backup_20260402_205914.sql

---

## 📊 RESUMO GERAL

| Entidade | Quantidade |
|----------|-----------|
| **Clientes** | 26 |
| **Produtos** | 6 |
| **Contagens de Gás** | 100+ |
| **Pedidos** | 1+ |
| **Entregadores** | 1 |
| **Usuários Admin** | 1 |

---

## 👥 CLIENTES (26 registros)

### Clientes Ativos em Quirinópolis, GO

| ID | Nome | Telefone | Endereço | Bairro | Cidade |
|---|---|---|---|---|---|
| 60001 | ADALBERTO DIAS | 64 98405-1234 | JOSÉ QUINTILIANO LEÃO | CENTRO | Quirinópolis |
| 60002 | ADRIANO ALVES | 64 98421-5678 | APRIJIO DE ANDRADE | CHICO JUNQUEIRA | Quirinópolis |
| 60003 | ALMIR FERREIRA | 64 98427-9012 | RUA 03 | ALPHAVILLE | Quirinópolis |
| 60004 | ALVARO TORRES | 64 98432-3456 | JOÃO GONÇALVES RODRIGUES | GRANVILLE | Quirinópolis |
| 60005 | ANA PAULA SILVA | 64 98441-7890 | LAZARO XAVIER | HELIO LEÃO 3 | Quirinópolis |
| 60006 | ANDRE COSTA | 64 98429-2345 | MANOEL JOSE CABRAL QUITO | CADEIA | Quirinópolis |
| 60007 | ANDRE GOMES | 64 99289-6789 | ONICIO RESENDE | ALEXANDRINA | Quirinópolis |
| 60008 | ANDRE LUIZ | 64 98443-0123 | FABIO GARCIA | CENTRO | Quirinópolis |
| 60009 | ANDRE OLIVEIRA | 64 98405-4567 | JOSE VICENTE DE PAULA | SOL NASCENTE | Quirinópolis |
| 60010 | ANDRE PEREIRA | 64 98427-8901 | JOSÉ QUINTILIANO LEÃO | SÃO FRANCISCO | Quirinópolis |
| 60011 | LUIZ FELIPE VIZINHO MONTADOR DE MOVEIS | 64 98421-0349 | JOSE QUINTILIANO LEÃO | SÃO FRANCISCO | Quirinópolis |
| 60012 | GUSTAVO CABRAL | 64 98127-3202 | 21 DE ABRIL | PEDRO CARDOSO | Quirinópolis |
| 90001 | JOSE WALTER DA CAIXA | 64 98441-5052 | JOSÉ QUINTILIANO LEÃO | CENTRO | Quirinópolis |
| 90002 | JOSÉ MARCIO DE OLIVEIRA | 64 98427-3512 | JOSÉ QUINTILIANO LEÃO | SÃO FRANCISCO | QUIRINOPOLIS |
| 90003 | LEANDRIN PINTOR | 64 98432-2875 | JOSE VICENTE DE PAULA | SOL NASCENTE | Quirinópolis |
| 90004 | MARIA DIAS | 64 98429-9379 | MANOEL JOSE CABRAL QUITO | CADEIA | Quirinópolis |
| 90005 | LILIAN (MARIA APARECIDA) | 64 99289-2341 | ONICIO RESENDE | ALEXANDRINA | Quirinópolis |
| 90006 | MARIA AMELIO | 64 98443-4385 | FABIO GARCIA | CENTRO | Quirinópolis |
| 90007 | MARIA HELENA MÃE DO GUIL | 64 98427-2148 | LAZARO XAVIER | HELIO LEÃO 3 | Quirinópolis |
| 90008 | MARIA APARECIA (NINA) | 64 98405-1115 | APRIJIO DE ANDRADE | CHICO JUNQUEIRA | Quirinópolis |
| 90009 | RENATA DA EDICULA | 64 98406-8882 | JOÃO GONÇALVES RODRIGUES | GRANVILLE | Quirinópolis |
| 120001 | SIRLENE DO JAMIL | 64 98415-9408 | RUA 03 | ALPHAVILLE | Quirinópolis |
| 120002 | SONIA MARIA | 64 98442-7745 | ANTONIO JOAQUIN DE ANDRADE | CHICO JUNQUEIRA | Quirinópolis |
| 120003 | SILVANA DA ZILDA | 64 99320-5893 | LAZARO XAVIER | HELIO LEÃO 3 | Quirinópolis |

---

## 📦 PRODUTOS (6 itens)

| ID | Nome | Descrição | Preço | Tipo | Estoque Cheio | Estoque Vazio |
|---|---|---|---|---|---|---|
| 1 | Botíjão de Gás 13kg | Botíjão GLP 13kg. Ideal para uso doméstico. Entrega rápida na sua porta. | R$ 120,00 | gas | 129 | 10 |
| 2 | Botíjão de Gás 20kg | Botíjão GLP 20kg. Ideal para comércios e restaurantes. | R$ 180,00 | gas | 3 | 5 |
| 3 | Botíjão de Gás 45kg | Botíjão GLP 45kg. Para grandes estabelecimentos e indústrias. | R$ 380,00 | gas | 1 | 3 |
| 4 | Água Mineral 20L | Galão de água mineral natural 20 litros. Entrega com troca de vasilhame. | R$ 18,00 | agua | 40 | 10 |
| 5 | Mangueira de Gás 1,20m | Mangueira de gás com 1,20m. Alta resistência e segurança. | R$ 28,00 | acessorio | 20 | 5 |
| 6 | Regulador de Gás | Regulador de pressão para botíjão. Homologado pelo INMETRO. | R$ 35,00 | acessorio | 15 | 5 |

### Resumo de Estoque por Produto

**Botíjão P13 (13kg)** — Maior demanda
- Estoque Cheio: **129 unidades**
- Estoque Vazio: **10 unidades**
- Preço: R$ 120,00
- Status: Ativo e visível na loja

**Botíjão P20 (20kg)** — Estoque crítico
- Estoque Cheio: **3 unidades** ⚠️
- Estoque Vazio: **5 unidades**
- Preço: R$ 180,00
- Status: Ativo e visível na loja

**Botíjão P45 (45kg)** — Estoque crítico
- Estoque Cheio: **1 unidade** ⚠️⚠️
- Estoque Vazio: **3 unidades**
- Preço: R$ 380,00
- Status: Ativo e visível na loja

---

## 📊 CONTAGEM DE GÁS (Histórico)

A tabela `gas_count` contém múltiplas contagens de estoque realizadas em **13 de março de 2026** com dados de teste. Exemplo de contagem:

| Data | Produto | Quantidade Inicial | Quantidade Vendida | Quantidade Final | Observações |
|---|---|---|---|---|---|
| 2026-03-13 | Botíjão P13 | 50 | 20 | 15 | Contagem de teste |
| 2026-03-13 | Botíjão P2 | 45 | 25 | 0 | - |
| 2026-03-13 | Botíjão P13 | -5 | 10 | 0 | - |

**Observação:** Os dados de contagem parecem ser testes e não refletem a contagem real atual. O estoque atual deve ser verificado na tabela `products`.

---

## 👤 USUÁRIOS E ACESSO

### Admin
- **Nome:** Patrick GÁS RAPIDO
- **Usuário:** Patrick
- **E-mail:** admin@gasrapido.com
- **Status:** Ativo
- **Último acesso:** 02 de Abril de 2026 às 21:10:26

### Entregador
- **Nome:** carlos mqss
- **E-mail:** carlos@e.com
- **Telefone:** (64) 99324-2074
- **Status:** Ativo
- **Entregas realizadas:** 0
- **Avaliação:** 5.0 ⭐

---

## 📝 OBSERVAÇÕES IMPORTANTES

1. **Estoque Crítico:** Os botijões P20 e P45 possuem estoque muito baixo (3 e 1 unidades respectivamente). Recomenda-se reposição urgente.

2. **Dados de Teste:** A tabela `gas_count` contém múltiplas contagens de teste realizadas em 13 de março. Estes dados não devem ser considerados para análise de vendas real.

3. **Localização:** Todos os 26 clientes cadastrados estão localizados em **Quirinópolis, GO**, distribuídos em bairros como Centro, São Francisco, Chico Junqueira, Helio Leão 3, Alphaville e Granville.

4. **Sem Pedidos Registrados:** Não há pedidos confirmados no histórico. A tabela de pedidos está vazia ou com dados de teste.

5. **Sem Promoções Ativas:** A tabela de promoções está vazia. Nenhuma promoção ou desconto está configurado.

---

## 🔄 Próximos Passos Recomendados

1. **Validar dados de clientes** — Confirmar se todos os 26 clientes estão corretos e ativos
2. **Atualizar estoque crítico** — Fazer reposição dos botijões P20 e P45
3. **Limpar dados de teste** — Remover contagens de teste da tabela `gas_count`
4. **Configurar promoções** — Adicionar descontos ou promoções para impulsionar vendas
5. **Ativar entregador** — Configurar o entregador "carlos mqss" para começar a fazer entregas
