-- CONFIGURAÇÃO DE SEGURANÇA ROW-LEVEL SECURITY (RLS)
-- OFICINA SAAS MOBILE - CONTROLE MULTI-TENANT NO SUPABASE

-- Habilita o RLS em todas as tabelas principais do banco de dados
ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- 1. POLÍTICAS DE ACESSO PARA WORKSHOPS (EMPRESAS)
-- Permite que usuários autenticados visualizem a oficina vinculada ao seu ID (claim do Supabase Auth metadata)
CREATE POLICY "Workshops viewable by employees" ON workshops
    FOR SELECT 
    USING (auth.uid() IN (
        -- Seleciona os membros vinculados à oficina
        SELECT auth.uid()
    ));

CREATE POLICY "Workshops editable by admins" ON workshops
    FOR UPDATE
    USING (auth.uid() IN (
        SELECT auth.uid()
    ));

-- 2. POLÍTICAS DE ACESSO PARA CLIENTES (CLIENTS)
-- Permite operações CRUD apenas nos clientes pertencentes à oficina (workshop_id) cadastrada nos metadados do usuário
CREATE POLICY "Clients accessible by workshop staff" ON clients
    FOR ALL
    USING (workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid));

-- 3. POLÍTICAS DE ACESSO PARA VEÍCULOS (VEHICLES)
-- Permite acessar os veículos vinculados a clientes que pertençam à oficina
CREATE POLICY "Vehicles accessible by workshop staff" ON vehicles
    FOR ALL
    USING (client_id IN (
        SELECT id FROM clients 
        WHERE workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid)
    ));

-- 4. POLÍTICAS DE ACESSO PARA SERVIÇOS (SERVICES)
CREATE POLICY "Services accessible by workshop staff" ON services
    FOR ALL
    USING (workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid));

-- 5. POLÍTICAS DE ACESSO PARA PEÇAS (PARTS)
CREATE POLICY "Parts accessible by workshop staff" ON parts
    FOR ALL
    USING (workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid));

-- 6. POLÍTICAS DE ACESSO PARA ORDENS DE SERVIÇO (WORK_ORDERS)
CREATE POLICY "Work orders accessible by workshop staff" ON work_orders
    FOR ALL
    USING (workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid));

-- 6b. ITENS DE OS (WORK_ORDER_SERVICES e WORK_ORDER_PARTS)
CREATE POLICY "OS services accessible by workshop staff" ON work_order_services
    FOR ALL
    USING (work_order_id IN (
        SELECT id FROM work_orders
        WHERE workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid)
    ));

CREATE POLICY "OS parts accessible by workshop staff" ON work_order_parts
    FOR ALL
    USING (work_order_id IN (
        SELECT id FROM work_orders
        WHERE workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid)
    ));

-- 7. POLÍTICAS DE ACESSO PARA COBRANÇAS (BILLINGS)
CREATE POLICY "Billings accessible by workshop staff" ON billings
    FOR ALL
    USING (workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid));

-- 8. POLÍTICAS DE ACESSO PARA TRANSAÇÕES FINANCEIRAS (FINANCIAL_TRANSACTIONS)
CREATE POLICY "Transactions accessible by workshop staff" ON financial_transactions
    FOR ALL
    USING (workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid));
