# 🚗 MecânicaPro — Sistema de Gestão para Oficinas

MecânicaPro é um software profissional para gerenciamento de oficinas mecânicas, auto elétricas, lava-jatos e centros automotivos. O projeto é composto por um **aplicativo móvel nativo** e um **portal web com simulador e site de vendas integrado**.

O sistema opera no modelo **100% offline (offline-first)**, armazenando todas as informações (clientes, veículos, ordens de serviço, finanças e catálogo) no próprio dispositivo do usuário através de persistência local segura (AsyncStorage no celular e LocalStorage na Web).

---

## 📁 Estrutura do Repositório

* **`/expo-app`**: Código-fonte do aplicativo nativo multiplataforma (Android/iOS) desenvolvido com React Native, Expo e TypeScript.
* **`/src`**: Código-fonte do portal web desenvolvido com React, Vite e Tailwind CSS, contendo:
  * **Site de Vendas (Landing Page)**: Página promocional otimizada com calculadora de retorno financeiro interativa (ROI).
  * **Simulador Embarcado**: Simulador interativo com moldura de celular e visualização expandida de desktop.

---

## ⚡ Como Hospedar o Site de Vendas Grátis (Vercel)

A forma mais fácil de publicar o site de vendas na internet gratuitamente é utilizando a **Vercel**. Cada vez que você enviar um código para a branch `main` do GitHub, o site atualizará de forma automática.

### Passo a Passo:
1. Acesse [vercel.com](https://vercel.com/) e crie uma conta gratuita (clique em "Sign Up" e selecione "Continue with GitHub").
2. No painel inicial da Vercel, clique no botão **"Add New..."** e selecione **"Project"**.
3. Importe o repositório `SaaS-Mobile-Oficinas`.
4. Nas configurações do projeto, a Vercel detectará automaticamente que é um projeto **Vite**.
5. Clique em **"Deploy"**.
6. Pronto! Em menos de 1 minuto seu site estará no ar com um link gratuito (ex: `nome-do-projeto.vercel.app`).

Se preferir, você também pode clicar no botão abaixo para iniciar a importação direta:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FArthurVitor1489%2FSaaS-Mobile-Oficinas)

---

## 🛠️ Como Executar Localmente

### Portal Web
1. Instale as dependências na raiz do projeto:
   ```bash
   npm install
   ```
2. Inicie o servidor de desenvolvimento local:
   ```bash
   npm run dev
   ```

### Aplicativo Móvel (Expo App)
1. Navegue até a pasta do app:
   ```bash
   cd expo-app
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Execute o servidor de desenvolvimento do Expo:
   ```bash
   npx expo start
   ```
