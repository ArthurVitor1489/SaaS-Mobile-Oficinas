-- LIMPEZA DE ESTRUTURAS ANTERIORES (EVITA ERRO DE RELAÇÃO JÁ EXISTENTE)
DROP TABLE IF EXISTS financial_transactions CASCADE;
DROP TABLE IF EXISTS billing_installments CASCADE;
DROP TABLE IF EXISTS billings CASCADE;
DROP TABLE IF EXISTS work_order_parts CASCADE;
DROP TABLE IF EXISTS work_order_services CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;
DROP TABLE IF EXISTS catalog_parts CASCADE;
DROP TABLE IF EXISTS catalog_services CASCADE;
DROP TABLE IF EXISTS parts CASCADE;
DROP TABLE IF EXISTS services CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS clients CASCADE;
DROP TABLE IF EXISTS workshops CASCADE;
DROP TYPE IF EXISTS os_status_enum CASCADE;
DROP TYPE IF EXISTS billing_status_enum CASCADE;
DROP TYPE IF EXISTS payment_method_enum CASCADE;
DROP TYPE IF EXISTS transaction_type_enum CASCADE;
DROP TYPE IF EXISTS transaction_category_enum CASCADE;

-- SCHEMA DE BANCO DE DADOS POSTGRESQL (SUPABASE) - CORRIGIDO
-- OFICINA SAAS MOBILE - COMPATÍVEL COM O CÓDIGO FONTE DO APLICATIVO

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. TABELA DE EMPRESAS / OFICINAS (TENANTS DO SAAS)
CREATE TABLE workshops (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20) UNIQUE,
    address TEXT,
    phone VARCHAR(20),
    whatsapp VARCHAR(20),
    email VARCHAR(255),
    logo_url TEXT,
    auto_sequence BOOLEAN DEFAULT TRUE,
    next_os_number INT DEFAULT 1,
    pdf_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE CLIENTES
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    cpf_cnpj VARCHAR(20),
    phone VARCHAR(20) NOT NULL,
    whatsapp VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE VEÍCULOS
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
    plate VARCHAR(10) NOT NULL,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(150) NOT NULL,
    year VARCHAR(4) NOT NULL,
    chassis VARCHAR(50),
    odometer VARCHAR(50) DEFAULT '0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA DE SERVIÇOS DO CATÁLOGO
CREATE TABLE catalog_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    code VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA DE PEÇAS EM ESTOQUE
CREATE TABLE catalog_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    supplier VARCHAR(255),
    purchase_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    sale_price DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    stock INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. TABELA DE ORDENS DE SERVIÇO
CREATE TYPE os_status_enum AS ENUM ('Aberta', 'Em andamento', 'Concluída', 'Entregue');

CREATE TABLE work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES clients(id) ON DELETE RESTRICT NOT NULL,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE RESTRICT NOT NULL,
    os_number VARCHAR(50) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    status os_status_enum NOT NULL DEFAULT 'Aberta',
    services_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    parts_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    grand_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    signature TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6b. ITENS DE SERVIÇO NA OS
CREATE TABLE work_order_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    os_id UUID REFERENCES work_orders(id) ON DELETE CASCADE NOT NULL,
    service_id UUID REFERENCES catalog_services(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    code VARCHAR(100)
);

-- 6c. ITENS DE PEÇA NA OS
CREATE TABLE work_order_parts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    os_id UUID REFERENCES work_orders(id) ON DELETE CASCADE NOT NULL,
    part_id UUID REFERENCES catalog_parts(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    sale_price DECIMAL(10, 2) NOT NULL,
    quantity INT NOT NULL DEFAULT 1
);

-- 7. TABELA DE COBRANÇAS FINANCEIRAS
CREATE TYPE billing_status_enum AS ENUM ('Pendente', 'Parcialmente pago', 'Pago', 'Cancelado');
CREATE TYPE payment_method_enum AS ENUM ('PIX', 'Dinheiro', 'Débito', 'Crédito', 'Boleto');

CREATE TABLE billings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
    os_id UUID REFERENCES work_orders(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method payment_method_enum NOT NULL DEFAULT 'PIX',
    status billing_status_enum NOT NULL DEFAULT 'Pendente',
    due_date DATE NOT NULL,
    installments JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7b. PARCELAS DA COBRANÇA
CREATE TABLE billing_installments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    billing_id UUID REFERENCES billings(id) ON DELETE CASCADE NOT NULL,
    number INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pendente',
    paid_at VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. TABELA DO FLUXO FINANCEIRO DA OFICINA
CREATE TYPE transaction_type_enum AS ENUM ('Entrada', 'Saída');
CREATE TYPE transaction_category_enum AS ENUM ('Pagamento OS', 'Compra Peças', 'Salário', 'Operacional', 'Outros');

CREATE TABLE financial_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE NOT NULL,
    type transaction_type_enum NOT NULL,
    category transaction_category_enum NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    description VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ÍNDICES
CREATE INDEX idx_clients_workshop ON clients(workshop_id);
CREATE INDEX idx_vehicles_client ON vehicles(client_id);
CREATE INDEX idx_work_orders_workshop ON work_orders(workshop_id);
CREATE INDEX idx_billings_os ON billings(os_id);
CREATE INDEX idx_installments_billing ON billing_installments(billing_id);
CREATE INDEX idx_transactions_workshop ON financial_transactions(workshop_id);
