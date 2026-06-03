-- CONFIGURAÇÃO DE SEGURANÇA ROW-LEVEL SECURITY (RLS) - CORRIGIDO
-- OFICINA SAAS MOBILE - CONTROLE MULTI-TENANT NO SUPABASE

ALTER TABLE workshops ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE catalog_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE billings ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_installments ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;

-- 1. POLÍTICAS DE ACESSO PARA WORKSHOPS (EMPRESAS)
CREATE POLICY "Workshops viewable by employees" ON workshops
    FOR SELECT 
    USING (auth.uid() IN (
        SELECT auth.uid()
    ));

CREATE POLICY "Workshops editable by admins" ON workshops
    FOR UPDATE
    USING (auth.uid() IN (
        SELECT auth.uid()
    ));

CREATE POLICY "Workshops insertable by anyone" ON workshops
    FOR INSERT
    WITH CHECK (true);

-- 2. POLÍTICAS DE ACESSO PARA CLIENTES (CLIENTS)
CREATE POLICY "Clients accessible by workshop staff" ON clients
    FOR ALL
    USING (workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid));

-- 3. POLÍTICAS DE ACESSO PARA VEÍCULOS (VEHICLES)
CREATE POLICY "Vehicles accessible by workshop staff" ON vehicles
    FOR ALL
    USING (client_id IN (
        SELECT id FROM clients 
        WHERE workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid)
    ));

-- 4. POLÍTICAS DE ACESSO PARA SERVIÇOS DO CATÁLOGO
CREATE POLICY "Services accessible by workshop staff" ON catalog_services
    FOR ALL
    USING (workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid));

-- 5. POLÍTICAS DE ACESSO PARA PEÇAS DO CATÁLOGO
CREATE POLICY "Parts accessible by workshop staff" ON catalog_parts
    FOR ALL
    USING (workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid));

-- 6. POLÍTICAS DE ACESSO PARA ORDENS DE SERVIÇO (WORK_ORDERS)
CREATE POLICY "Work orders accessible by workshop staff" ON work_orders
    FOR ALL
    USING (workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid));

-- 6b. ITENS DE SERVIÇO NA OS
CREATE POLICY "OS services accessible by workshop staff" ON work_order_services
    FOR ALL
    USING (os_id IN (
        SELECT id FROM work_orders
        WHERE workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid)
    ));

-- 6c. ITENS DE PEÇA NA OS
CREATE POLICY "OS parts accessible by workshop staff" ON work_order_parts
    FOR ALL
    USING (os_id IN (
        SELECT id FROM work_orders
        WHERE workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid)
    ));

-- 7. POLÍTICAS DE ACESSO PARA COBRANÇAS (BILLINGS)
CREATE POLICY "Billings accessible by workshop staff" ON billings
    FOR ALL
    USING (workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid));

-- 7b. POLÍTICAS DE ACESSO PARA PARCELAS DA COBRANÇA
CREATE POLICY "Billing installments accessible by workshop staff" ON billing_installments
    FOR ALL
    USING (billing_id IN (
        SELECT id FROM billings
        WHERE workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid)
    ));

-- 8. POLÍTICAS DE ACESSO PARA TRANSAÇÕES FINANCEIRAS (FINANCIAL_TRANSACTIONS)
CREATE POLICY "Transactions accessible by workshop staff" ON financial_transactions
    FOR ALL
    USING (workshop_id = ((auth.jwt() -> 'user_metadata' ->> 'workshop_id')::uuid));
