-- FUNÇÕES PL/pgSQL E TRIGGERS DO POSTGRESQL - CORRIGIDO
-- AUTOMATIZAÇÕES DE NEGÓCIO NO BANCO DE DADOS (SUPABASE)

-- =====================================================================
-- 1. TRIGGER: NUMERAÇÃO AUTOMÁTICA DE ORDEM DE SERVIÇO (OS)
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_generate_os_number()
RETURNS TRIGGER AS $$
DECLARE
    v_next_num INT;
    v_pattern VARCHAR(50);
BEGIN
    -- Bloqueia a linha da oficina para evitar concorrência/duplicações no sequenciador
    SELECT next_os_number INTO v_next_num
    FROM workshops
    WHERE id = NEW.workshop_id
    FOR UPDATE;

    -- Monta a numeração formatada EX: OS-0005
    v_pattern := 'OS-' || LPAD(v_next_num::TEXT, 4, '0');
    
    NEW.os_number := v_pattern;

    -- Incrementa o sequenciador na tabela da oficina
    UPDATE workshops
    SET next_os_number = next_os_number + 1
    WHERE id = NEW.workshop_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ativa o trigger ANTES de salvar a OS
CREATE OR REPLACE TRIGGER tr_os_auto_numbering
    BEFORE INSERT ON work_orders
    FOR EACH ROW
    WHEN (NEW.os_number IS NULL OR NEW.os_number = '')
    EXECUTE FUNCTION fn_generate_os_number();


-- =====================================================================
-- 2. TRIGGER: DECREMENTAR ESTOQUE DE PEÇAS APÓS CADASTRO NA OS
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_reduce_stock_on_os_parts()
RETURNS TRIGGER AS $$
BEGIN
    -- Diminui a quantidade da peça cadastrada do estoque total da tabela "catalog_parts"
    UPDATE catalog_parts
    SET stock = GREATEST(0, stock - NEW.quantity)
    WHERE id = NEW.part_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ativa o trigger APÓS inserir um item de peça em alguma OS
CREATE OR REPLACE TRIGGER tr_os_parts_stock_reducer
    AFTER INSERT ON work_order_parts
    FOR EACH ROW
    EXECUTE FUNCTION fn_reduce_stock_on_os_parts();


-- =====================================================================
-- 3. TRIGGER: CRIAÇÃO AUTOMÁTICA DE COBRANÇA EM ABERTO AO FINALIZAR OS
-- =====================================================================

CREATE OR REPLACE FUNCTION fn_auto_create_billing_draft()
RETURNS TRIGGER AS $$
BEGIN
    -- Cria um registro de cobrança do tipo à vista (PIX) para vencimento imediato
    -- se a OS for salva diretamente como "Concluída" ou "Entregue" e não tiver fatura criada ainda
    IF (NEW.status = 'Concluída' OR NEW.status = 'Entregue') THEN
        -- Verifica se já não existe uma fatura criada para esta OS
        IF NOT EXISTS (SELECT 1 FROM billings WHERE os_id = NEW.id) THEN
            -- Inserção da cobrança principal
            INSERT INTO billings (workshop_id, os_id, amount, payment_method, status, due_date, installments, created_at)
            VALUES (
                NEW.workshop_id,
                NEW.id,
                NEW.grand_total,
                'PIX',
                'Pendente',
                NEW.date,
                json_build_array(
                    json_build_object(
                        'number', 1,
                        'amount', NEW.grand_total,
                        'dueDate', NEW.date::TEXT,
                        'status', 'Pendente'
                    )
                ),
                now()
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ativa o trigger APÓS inserir ou atualizar o status de uma Ordem de Serviço
CREATE OR REPLACE TRIGGER tr_os_billing_auto_generator
    AFTER INSERT OR UPDATE OF status ON work_orders
    FOR EACH ROW
    EXECUTE FUNCTION fn_auto_create_billing_draft();
