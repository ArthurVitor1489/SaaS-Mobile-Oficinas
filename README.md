# 🚗 Voltruck / MecânicaPro — Sistema de Gestão SaaS para Oficinas

**Voltruck (MecânicaPro)** é um ecossistema de software premium completo para gerenciamento de oficinas mecânicas, auto elétricas, centros automotivos, lava-jatos e funilarias. O sistema é estruturado como um **SaaS Multi-Tenant** moderno, possuindo um aplicativo móvel nativo resiliente a falhas de rede (offline-first) e um portal de vendas interativo.

---

## 🛠️ Arquitetura do Sistema V2 SaaS

Esta versão traz uma reformulação arquitetural completa voltada para escalabilidade comercial, segurança e robustez offline:

### 1. Backend Multi-Tenant (NestJS & Prisma)
* **Isolamento de Dados**: Separação total de dados entre oficinas utilizando esquemas isolados PostgreSQL (`voltruck_saas`).
* **Segurança e JWT**: Controle de sessões com Access e Refresh Tokens JWT, validando e vinculando cada requisição à respectiva oficina (`tenantId`).
* **Compilação e Docker**: Preparado com um `Dockerfile` multi-stage otimizado para produção e configurações prontas para deploy em nuvem (Render/Railway) ou self-hosting.

### 2. Motor de Sincronização Offline (Zustand & Sync Engine)
* **Offline-First Reativo**: O aplicativo armazena e lê dados localmente via Zustand e AsyncStorage instantaneamente.
* **Fila de Replicação Resiliente**: Ações de escrita executadas sem sinal de internet são enfileiradas de forma cronológica e replicadas automaticamente para o servidor no momento em que a rede for restabelecida.
* **Resiliência a Erros**: O motor descarta erros de validação (rejeições 400/404) evitando o travamento da fila e trata inteligentemente quedas de conexão no meio da sincronização.
* **UUIDs RFC4122 v4**: Geração local segura de identificadores únicos compatível com contextos não-HTTPS.

### 3. Integração Financeira (Gateway Asaas)
* **Assinatura Automática**: Ao se cadastrar, o cliente (oficina) é registrado no Asaas de forma assíncrona, gerando a cobrança (PIX, boleto ou cartão) em ambiente Sandbox/Produção.
* **Webhooks de Faturamento**: Endpoint público que recebe confirmações de pagamento (`PAYMENT_RECEIVED`) e atrasos (`PAYMENT_OVERDUE`), reativando ou suspendendo o status do inquilino em tempo real.

### 4. Regras de Carência e Bloqueio de Escritas (`SubscriptionGuard`)
* **Carência de 7 dias**: Oficinas inadimplentes recebem banners informativos de aviso amigáveis, mantendo a operação de cadastro liberada por uma semana.
* **Bloqueio Parcial (Modo Leitura)**: Expirado o prazo, o `SubscriptionGuard` bloqueia todas as rotas de escrita (`POST`, `PATCH`, `DELETE`), mas mantém a leitura (`GET`) e exportação de backups totalmente liberadas.

---

## 📁 Estrutura do Repositório

* **`/backend`**: API REST escrita em NestJS com TypeScript, persistência Prisma ORM, configurações Docker e script de automação Compose.
* **`/expo-app`**: Código-fonte do aplicativo nativo multiplataforma (Android/iOS) desenvolvido com React Native, Expo, Zustand, Axios e TailwindCSS.
* **`/src`**: Portal web comercial com site de vendas (Landing Page), simulador e calculadora interativa de ROI.

---

## ⚡ Como Hospedar no seu Notebook/PC Antigo (Self-Hosting)

Se você tem um notebook antigo ou computador extra em casa, você pode usá-lo como servidor de produção totalmente de graça!

### Pré-requisitos
Instale o **Docker** e o **Docker Compose** na sua máquina servidora (recomendamos instalar o sistema leve **Ubuntu Server 24.04 LTS** no PC antigo).

### Passo a Passo
1. Acesse o seu servidor via terminal/SSH.
2. Clone este repositório:
   ```bash
   git clone https://github.com/ArthurVitor1489/SaaS-Mobile-Oficinas.git
   ```
3. Navegue até a pasta do backend:
   ```bash
   cd SaaS-Mobile-Oficinas/backend
   ```
4. Suba o banco de dados PostgreSQL e o servidor NestJS juntos com um único comando:
   ```bash
   sudo docker compose up -d --build
   ```
5. **Pronto!** O banco estará rodando na porta `5432` e a API respondendo na porta `3001` no IP da sua máquina local (ex: `http://192.168.1.79:3001`).

---

## 🚀 Como Executar Localmente em Modo Desenvolvimento

### 1. Iniciar o Backend
```bash
cd backend
npm install
npx prisma generate
npm run start:dev
```

### 2. Iniciar o App Móvel (Expo)
Crie um arquivo `.env` dentro da pasta `expo-app` contendo a URL da API do seu backend local:
```ini
EXPO_PUBLIC_API_URL=http://localhost:3001
```
E execute:
```bash
cd expo-app
npm install
npx expo start
```
* Aperte **`a`** para rodar no Emulador Android.
* Aperte **`w`** para rodar na Web.

### 3. Iniciar o Portal Web de Vendas
```bash
npm install
npm run dev
```
👉 Acesse no seu navegador: **`http://localhost:5173`**
