-- =====================================================================
-- CORREÇÃO DE SEGURANÇA: MIGRAÇÃO DE user_metadata PARA tabela profiles
-- RESOLVE O ALERTA: "RLS references user metadata"
-- =====================================================================

-- 1. CRIAÇÃO DA TABELA DE PERFIS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workshop_id UUID REFERENCES public.workshops(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Ativa RLS na tabela de perfis
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- =====================================================================
-- 2. FUNÇÃO HELPER DE SEGURANÇA (STABLE & SECURITY DEFINER)
-- =====================================================================
-- Esta função é executada com privilégios do criador do banco (ignora RLS local)
-- para obter com segurança o workshop_id correspondente ao usuário logado.
CREATE OR REPLACE FUNCTION get_user_workshop_id()
RETURNS UUID AS $$
    SELECT workshop_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- =====================================================================
-- 3. MIGRAÇÃO DE USUÁRIOS EXISTENTES
-- Mapeia os dados salvos em user_metadata de auth.users para a tabela profiles.
-- =====================================================================
INSERT INTO public.profiles (id, workshop_id)
SELECT id, (raw_user_meta_data->>'workshop_id')::uuid
FROM auth.users
WHERE raw_user_meta_data->>'workshop_id' IS NOT NULL
ON CONFLICT (id) DO NOTHING;

-- =====================================================================
-- 4. REMOÇÃO DAS POLÍTICAS ANTIGAS E CRIAÇÃO DAS POLÍTICAS SEGURAS
-- =====================================================================

-- 4.1 CLIENTES
DROP POLICY IF EXISTS "Clients accessible by workshop staff" ON public.clients;
CREATE POLICY "Clients accessible by workshop staff" ON public.clients
    FOR ALL USING (workshop_id = get_user_workshop_id());

-- 4.2 VEÍCULOS
DROP POLICY IF EXISTS "Vehicles accessible by workshop staff" ON public.vehicles;
CREATE POLICY "Vehicles accessible by workshop staff" ON public.vehicles
    FOR ALL USING (
        client_id IN (
            SELECT id FROM public.clients 
            WHERE workshop_id = get_user_workshop_id()
        )
    );

-- 4.3 SERVIÇOS DO CATÁLOGO
DROP POLICY IF EXISTS "Services accessible by workshop staff" ON public.catalog_services;
CREATE POLICY "Services accessible by workshop staff" ON public.catalog_services
    FOR ALL USING (workshop_id = get_user_workshop_id());

-- 4.4 PEÇAS DO CATÁLOGO
DROP POLICY IF EXISTS "Parts accessible by workshop staff" ON public.catalog_parts;
CREATE POLICY "Parts accessible by workshop staff" ON public.catalog_parts
    FOR ALL USING (workshop_id = get_user_workshop_id());

-- 4.5 ORDENS DE SERVIÇO
DROP POLICY IF EXISTS "Work orders accessible by workshop staff" ON public.work_orders;
CREATE POLICY "Work orders accessible by workshop staff" ON public.work_orders
    FOR ALL USING (workshop_id = get_user_workshop_id());

-- 4.6 ITENS DE SERVIÇO NA OS
DROP POLICY IF EXISTS "OS services accessible by workshop staff" ON public.work_order_services;
CREATE POLICY "OS services accessible by workshop staff" ON public.work_order_services
    FOR ALL USING (
        os_id IN (
            SELECT id FROM public.work_orders
            WHERE workshop_id = get_user_workshop_id()
        )
    );

-- 4.7 ITENS DE PEÇA NA OS
DROP POLICY IF EXISTS "OS parts accessible by workshop staff" ON public.work_order_parts;
CREATE POLICY "OS parts accessible by workshop staff" ON public.work_order_parts
    FOR ALL USING (
        os_id IN (
            SELECT id FROM public.work_orders
            WHERE workshop_id = get_user_workshop_id()
        )
    );

-- 4.8 COBRANÇAS (BILLINGS)
DROP POLICY IF EXISTS "Billings accessible by workshop staff" ON public.billings;
CREATE POLICY "Billings accessible by workshop staff" ON public.billings
    FOR ALL USING (workshop_id = get_user_workshop_id());

-- 4.9 PARCELAS DA COBRANÇA
DROP POLICY IF EXISTS "Billing installments accessible by workshop staff" ON public.billing_installments;
CREATE POLICY "Billing installments accessible by workshop staff" ON public.billing_installments
    FOR ALL USING (
        billing_id IN (
            SELECT id FROM public.billings
            WHERE workshop_id = get_user_workshop_id()
        )
    );

-- 4.10 TRANSAÇÕES FINANCEIRAS
DROP POLICY IF EXISTS "Transactions accessible by workshop staff" ON public.financial_transactions;
CREATE POLICY "Transactions accessible by workshop staff" ON public.financial_transactions
    FOR ALL USING (workshop_id = get_user_workshop_id());
