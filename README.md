# 🚗 MecânicaPro — Sistema SaaS Multi-Tenant & Offline-First para Gestão de Oficinas

[![React Native](https://img.shields.io/badge/React_Native-0.74+-61DAFB?logo=react&logoColor=black&style=for-the-badge)](https://reactnative.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0+-E0234E?logo=nestjs&logoColor=white&style=for-the-badge)](https://nestjs.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma_ORM-5.22+-2D3748?logo=prisma&logoColor=white&style=for-the-badge)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white&style=for-the-badge)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Compatible-2496ED?logo=docker&logoColor=white&style=for-the-badge)](https://www.docker.com/)

**MecânicaPro** é uma plataforma de nível empresarial (enterprise-grade) desenvolvida para gerenciar oficinas mecânicas e centros automotivos de ponta a ponta. O projeto foi projetado com uma arquitetura moderna **SaaS Multi-Tenant** e opera sob o conceito de **Offline-First**, garantindo que mecânicos e gestores possam continuar trabalhando sem sinal de internet de forma reativa e segura.

Este projeto é um excelente demonstrativo de engenharia de software aplicada, abordando desafios de **sincronização de dados, segurança multi-tenant, integração com gateways de pagamento (Asaas) e resiliência offline**.

---

## 💡 Destaques de Engenharia e Arquitetura de Software

Esta plataforma foi desenvolvida utilizando as melhores práticas do mercado, demonstrando domínio nos seguintes conceitos:

* **Arquitetura Multi-Tenant com Isolamento Físico/Lógico**: Separação total de dados e configurações de cada oficina inquilina (`tenantId`) a nível de banco de dados e aplicação. Proteção contra vazamento de dados (*data leakage*) garantida via NestJS Guards.
* **Motor de Sincronização Offline-First Reativo**:
  * Utilização de **Zustand + AsyncStorage** para persistência e atualizações instantâneas de UI com latência zero.
  * Fila de replicação sequencial cronológica (`syncEngine`) que reenvia as alterações locais para a API quando a rede estabiliza.
  * **Resiliência a Falhas de Validação**: Descarte automático de payloads inconsistentes (erros 400/404) para evitar o travamento permanente da fila.
* **Geração de UUIDs RFC4122 v4 Resiliente**: Fallback em JavaScript puro para ambientes de testes locais (HTTP/sem HTTPS) onde as APIs nativas de criptografia de navegadores/dispositivos móveis estão indisponíveis.
* **Segurança e Fluxo de Autenticação Robusto**:
  * Autenticação baseada em **JWT (Access & Refresh Tokens)** criptografados com senhas hashed via **bcrypt**.
  * Decoplagem de chamadas externas de faturamento Asaas fora das transações do PostgreSQL, prevenindo o esgotamento do pool de conexões sob alta carga.
* **Bloqueios Inteligentes de Inadimplência**:
  * **SubscriptionGuard**: NestJS Guard que bloqueia chamadas de escrita (`POST`, `PATCH`, `DELETE`) em endpoints de negócio caso o faturamento do cliente esteja suspenso.
  * **Modo Leitura Liberado**: Mantém rotas de leitura (`GET`), histórico de ordens e exportação de backups sempre acessíveis, em total conformidade com a legislação de retenção de dados do cliente.
  * **Banners Reativos**: A UI móvel atualiza banners laranja (carência de 7 dias de atraso) e vermelhos (bloqueio ativo) com atalhos dinâmicos de pagamento.

---

## 🛠️ Stack Tecnológica

### 📲 Aplicativo Móvel (Multiplataforma)
* **Framework**: React Native & Expo (TypeScript)
* **Gerenciamento de Estado**: Zustand (Persistência Offline reativa)
* **Ícones & Estilização**: Lucide React Native & TailwindCSS / Custom Themes
* **Navegação**: React Navigation (Bottom Tabs & Stack Navigators)

### 💻 Backend (API RESTful)
* **Framework**: NestJS (TypeScript)
* **ORM / Banco de Dados**: Prisma ORM & PostgreSQL (Hospedado no Supabase)
* **Criptografia & Sessão**: Passport JWT & bcrypt
* **Integração de Pagamentos**: Asaas API (PIX, Boleto e Cartão de Crédito)

### 🐳 DevOps & Deploy
* **Docker / Docker Compose**: Automação multi-stage para subir o banco PostgreSQL local e a API com um único comando (`docker compose up -d`).
* **EAS Build**: Perfis de compilação configurados em `eas.json` para geração automática de APKs (testes) e AABs (produção na Google Play Store).

---

## 📁 Estrutura do Repositório

```bash
├── /backend            # API NestJS, Prisma Schema, Migrations e Dockerfiles
├── /expo-app           # Aplicativo React Native (Expo) com motor de sincronização offline
├── /src                # Landing Page promocional e Simulador Web interativo
```

---

## ⚡ Instalação e Execução Local

### 1. Pré-requisitos
* Node.js v20+
* Docker e Docker Compose (caso queira rodar localmente via contêiner)

### 2. Configurando o Servidor (Backend)
Clone o repositório e acesse a pasta do backend:
```bash
git clone https://github.com/ArthurVitor1489/SaaS-Mobile-Oficinas.git
cd SaaS-Mobile-Oficinas/backend
```

Crie um arquivo `.env` com as variáveis de conexão:
```ini
PORT=3001
DATABASE_URL="postgresql://USUARIO:SENHA@HOST:PORTA/DATABASE?schema=mecanicapro_saas"
JWT_SECRET="seu_jwt_secret_aqui"
JWT_REFRESH_SECRET="seu_jwt_refresh_secret_aqui"
ASAAS_API_URL="https://sandbox.asaas.com/api/v3"
ASAAS_API_KEY="sua_chave_do_asaas_aqui"
```

Execute as migrações do banco e inicie em modo desenvolvimento:
```bash
npm install
npx prisma db push
npm run start:dev
```

### 3. Configurando o Aplicativo Móvel (Expo App)
Abra um novo terminal e acesse a pasta `expo-app`:
```bash
cd ../expo-app
npm install
```

Crie um arquivo `.env` na raiz do app móvel definindo o IP do seu backend:
```ini
EXPO_PUBLIC_API_URL=http://localhost:3001
```

Inicie o Metro Bundler:
```bash
npx expo start
```
* Pressione a tecla **`a`** para abrir o app no Emulador Android.
* Pressione a tecla **`w`** para abrir o simulador na Web.

---

## 🐳 Executando com Docker Compose (Notebook / PC Antigo)

O projeto está totalmente preparado para rodar em servidores caseiros ou VPS com um único comando. Na pasta `/backend`, execute:

```bash
sudo docker compose up -d --build
```

Isso fará o download e inicialização automática:
1. Do contêiner **PostgreSQL (Porta 5432)** persistido em volume Docker.
2. Da **API NestJS (Porta 3001)** compilada através de uma build multi-stage leve em Alpine Linux.
3. Executará automaticamente o sincronismo de tabelas do Prisma no banco de dados local.
