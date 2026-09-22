# 🚗 MecânicaPro — Sistema Mobile & Offline-First para Gestão de Oficinas Mecânicas

[![React Native](https://img.shields.io/badge/React_Native-Expo_52-61DAFB?logo=react&logoColor=black&style=for-the-badge)](https://reactnative.dev/)
[![NestJS](https://img.shields.io/badge/NestJS-11.0+-E0234E?logo=nestjs&logoColor=white&style=for-the-badge)](https://nestjs.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma_ORM-5.22+-2D3748?logo=prisma&logoColor=white&style=for-the-badge)](https://www.prisma.io/)
[![Turso LibSQL](https://img.shields.io/badge/Turso-LibSQL_Cloud-00E599?logo=sqlite&logoColor=white&style=for-the-badge)](https://turso.tech/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178C6?logo=typescript&logoColor=white&style=for-the-badge)](https://www.typescriptlang.org/)

**MecânicaPro** é um sistema completo e moderno desenvolvido sob medida para a rotina ágil de oficinas mecânicas, auto elétricas e centros automotivos. Projetado com arquitetura **Mobile-First** e **Offline-First**, o app permite que gestores e mecânicos realizem cadastros, abram ordens de serviço, controlem o faturamento e emitam comprovantes mesmo em ambientes sem conectividade com a internet.

---

## ⚡ Principais Funcionalidades

### 📋 1. Ordens de Serviço Orientadas a Faturamento
- **Abertura Ágil**: Ao abrir a O.S., os serviços e peças são lançados imediatamente e o atendimento já se inicia de forma automática, sem burocracias de status manuais.
- **Controle por Faturamento**: Acompanhamento direto da situação da OS:
  - 🟡 **A Faturar**: Serviços em execução prontos para cobrança.
  - 🟠 **Faturada**: Cobrança gerada, aguardando liquidação das parcelas.
  - 🟢 **Paga**: Todas as parcelas e pagamentos quitados.
- **Assinatura Digital no Dispositivo**: Coleta de assinatura do cliente na própria tela do celular via SignaturePad.
- **Geração e Impressão de PDF**: Emissão instantânea de comprovantes formatados de Ordem de Serviço e Recibo de Entrega.

### 💰 2. Gestão Financeira & Boletos com Datas Customizadas
- **Múltiplas Formas de Pagamento**: PIX, Dinheiro, Cartão de Débito, Cartão de Crédito e Boleto Bancário.
- **Parcelamento Inteligente & Boletos Personalizados**: Suporte a parcelamento com edição de datas de vencimento individuais para cada parcela e baixa manual individual.
- **Fluxo de Caixa em Tempo Real**: Métricas consolidadas de faturamento mensal, recebimentos à vista/parcelas e saldo a receber.

### 💬 3. Integração com WhatsApp
- **Envio Formatado de O.S.**: Envio em 1 clique do resumo completo dos serviços, peças e valores diretamente para o WhatsApp do cliente.
- **Suporte ao Gestor**: Canal de suporte integrado no menu principal para auxílio técnico.

### 🔄 4. Arquitetura Offline-First & Sincronização em Nuvem
- **Latência Zero na UI**: Estado local gerenciado por **Zustand + AsyncStorage**, garantindo respostas instantâneas na tela.
- **Motor de Sincronização (`syncEngine`)**: Fila resiliente de requisições que detecta a reconexão à internet e replica automaticamente as alterações locais para o banco de dados em nuvem.
- **Banco de Dados em Nuvem (Turso LibSQL)**: Persistência de alta performance na borda (edge database), com replicação distribuída e suporte a multi-inquilinos.

### 🔒 5. Segurança, LGPD & Conformidade com a Google Play Store
- **Exclusão Completa de Conta e Dados**: Endpoint nativo `DELETE /tenant/account` que executa a exclusão definitiva em cascata de todos os dados da oficina no servidor e no dispositivo, em total conformidade com as diretrizes do Google Play.
- **Termos de Uso e Política de Privacidade**: Modal interativo com cláusulas alinhadas à LGPD (Lei Geral de Proteção de Dados - Lei nº 13.709/2018).
- **Onboarding de Boas-Vindas**: Guia "Primeiros Passos" no Dashboard para configuração da oficina, primeiro cliente e primeira OS em base zerada.

---

## 🛠️ Stack Tecnológica

### 📲 Mobile (`expo-app`)
- **Framework**: React Native 0.76+ com Expo SDK 52 (TypeScript)
- **State Management**: Zustand com persistência local assíncrona
- **Navegação**: React Navigation (Bottom Tabs & Native Stack)
- **UI & Ícones**: Lucide React Native, React Native SVG
- **Documentos & Mídia**: Expo Print, Expo Sharing

### 💻 Backend API (`backend`)
- **Framework**: NestJS 11 (TypeScript)
- **Banco de Dados & ORM**: Prisma ORM 5.22 integrado ao Turso Cloud (LibSQL)
- **Autenticação**: Passport JWT, bcrypt
- **Arquitetura**: Multi-Tenant com isolamento lógico via `tenantId` e decorators customizados

---

## 📁 Estrutura do Repositório

```text
├── /backend            # API RESTful em NestJS, schemas do Prisma e controllers
│   ├── /prisma         # Schema Prisma configurado para Turso LibSQL
│   └── /src            # Módulos: auth, tenant, clients, vehicles, orders, finance...
├── /expo-app           # Aplicativo móvel React Native (Expo)
│   ├── /src/components # Modais, SignaturePad, Wizard de OS, Termos LGPD
│   ├── /src/context    # DatabaseContext com métodos CRUD
│   ├── /src/screens    # Dashboard, Clientes, O.S., Financeiro, Boletos, Configurações
│   ├── /src/services   # API Axios, polyfills e SyncEngine offline-first
│   └── /src/store      # useAppStore (Zustand com persistência)
└── README.md
```

---

## ⚡ Instalação e Execução Local

### 1. Pré-requisitos
- Node.js v20+
- Gerenciador de pacotes `npm`

### 2. Configurando o Backend API
Acesse a pasta do backend:
```bash
cd backend
npm install
```

Crie o arquivo `.env` na raiz da pasta `backend`:
```ini
PORT=3001
DATABASE_URL="libsql://mecanica-pro-db-tinywen.aws-us-east-1.turso.io?authToken=SEU_TOKEN_AQUI"
JWT_SECRET="seu_jwt_secret_seguro"
JWT_REFRESH_SECRET="seu_jwt_refresh_secret_seguro"
```

Compile e execute o servidor:
```bash
npm run build
node dist/main.js
# Ou para desenvolvimento com hot-reload:
# npm run start:dev
```
O servidor estará disponível em: `http://localhost:3001`.

### 3. Configurando o Aplicativo Mobile (Expo)
Abra outro terminal e acesse a pasta `expo-app`:
```bash
cd expo-app
npm install
```

Crie o arquivo `.env` na raiz de `expo-app` (substitua pelo IP da sua máquina na rede local se for testar no aparelho físico):
```ini
EXPO_PUBLIC_API_URL=http://localhost:3001
```

Inicie o servidor de desenvolvimento do Expo:
```bash
npx expo start
```
- Pressione **`a`** para abrir no Emulador Android.
- Pressione **`w`** para abrir no navegador Web.
- Ou escaneie o QR Code com o aplicativo **Expo Go** no seu smartphone.

---

## 🧪 Verificação e Qualidade de Código

Para verificar a integridade da tipagem TypeScript e compilação:

```bash
# Validar aplicativo mobile:
cd expo-app
npx tsc --noEmit

# Validar compilação do backend:
cd ../backend
npm run build
```

---

## 📄 Licença

Este projeto está sob licença comercial privada. Desenvolvido para uso profissional em centros automotivos e oficinas mecânicas.
