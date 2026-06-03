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
DECLARE
    v_billing_id UUID;
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
            )
            RETURNING id INTO v_billing_id;

            -- Inserção da parcela correspondente na tabela billing_installments
            INSERT INTO billing_installments (billing_id, number, amount, due_date, status)
            VALUES (
                v_billing_id,
                1,
                NEW.grand_total,
                NEW.date,
                'Pendente'
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


-- =====================================================================
-- 4. FUNÇÕES DE TRANSAÇÃO ATÔMICA (RPC) PARA OPERAÇÕES FINANCEIRAS
-- =====================================================================

-- 4a. Pagar/Baixar uma Parcela específica (com transação no DB)
CREATE OR REPLACE FUNCTION pay_billing_installment(
  p_billing_id UUID,
  p_installment_number INT,
  p_paid_at VARCHAR(100),
  p_transaction_date DATE,
  p_transaction_description VARCHAR(255)
) RETURNS JSONB AS $$
DECLARE
  v_installment_id UUID;
  v_installment_amount DECIMAL(10, 2);
  v_workshop_id UUID;
  v_total_installments INT;
  v_paid_installments INT;
  v_new_billing_status billing_status_enum;
  v_transaction_id UUID;
  v_transaction_created_at TIMESTAMP WITH TIME ZONE;
  v_result JSONB;
BEGIN
  -- 1. Buscar a parcela
  SELECT id, amount 
  INTO v_installment_id, v_installment_amount
  FROM billing_installments
  WHERE billing_id = p_billing_id AND number = p_installment_number;

  IF v_installment_id IS NULL THEN
    RAISE EXCEPTION 'Parcela não encontrada';
  END IF;

  -- 2. Buscar o workshop_id correspondente
  SELECT workshop_id
  INTO v_workshop_id
  FROM billings
  WHERE id = p_billing_id;

  IF v_workshop_id IS NULL THEN
    RAISE EXCEPTION 'Cobrança não encontrada';
  END IF;

  -- Controle Multi-Tenant: Valida se o usuário autenticado tem acesso a esta oficina
  IF v_workshop_id::TEXT != (auth.jwt() -> 'user_metadata' ->> 'workshop_id') THEN
    RAISE EXCEPTION 'Acesso não autorizado';
  END IF;

  -- 3. Atualizar a parcela para 'Pago'
  UPDATE billing_installments
  SET status = 'Pago', paid_at = p_paid_at
  WHERE id = v_installment_id;

  -- 4. Calcular o novo status da cobrança
  SELECT COUNT(*) INTO v_total_installments
  FROM billing_installments
  WHERE billing_id = p_billing_id;

  SELECT COUNT(*) INTO v_paid_installments
  FROM billing_installments
  WHERE billing_id = p_billing_id AND status = 'Pago';

  IF v_paid_installments = v_total_installments THEN
    v_new_billing_status := 'Pago'::billing_status_enum;
  ELSIF v_paid_installments > 0 THEN
    v_new_billing_status := 'Parcialmente pago'::billing_status_enum;
  ELSE
    v_new_billing_status := 'Pendente'::billing_status_enum;
  END IF;

  -- 5. Criar registro de transação financeira
  INSERT INTO financial_transactions (workshop_id, type, category, amount, date, description)
  VALUES (v_workshop_id, 'Entrada', 'Pagamento OS', v_installment_amount, p_transaction_date, p_transaction_description)
  RETURNING id, created_at INTO v_transaction_id, v_transaction_created_at;

  -- 6. Atualizar a tabela de cobrança com o novo status e reconstruir o JSONB de parcelas
  UPDATE billings
  SET 
    status = v_new_billing_status,
    installments = (
      SELECT jsonb_agg(
        jsonb_build_object(
          'number', number,
          'amount', amount,
          'dueDate', due_date,
          'status', status,
          'paidAt', paid_at
        ) ORDER BY number ASC
      )
      FROM billing_installments
      WHERE billing_id = p_billing_id
    )
  WHERE id = p_billing_id;

  -- 7. Retornar dados da transação criada para sincronização local
  v_result := jsonb_build_object(
    'success', true,
    'new_status', v_new_billing_status,
    'amount', v_installment_amount,
    'transaction_id', v_transaction_id,
    'transaction_created_at', v_transaction_created_at
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 4b. Criar cobrança customizada (com transação no DB)
CREATE OR REPLACE FUNCTION create_billing_transaction(
  p_os_id UUID,
  p_amount DECIMAL(10, 2),
  p_payment_method VARCHAR(50),
  p_status VARCHAR(50),
  p_due_date DATE,
  p_installments JSONB
) RETURNS JSONB AS $$
DECLARE
  v_billing_id UUID;
  v_workshop_id UUID;
  v_inst RECORD;
  v_os_number VARCHAR(50);
  v_created_at TIMESTAMP WITH TIME ZONE;
  v_result JSONB;
  v_transactions JSONB := '[]'::JSONB;
  v_trans_id UUID;
  v_trans_created_at TIMESTAMP WITH TIME ZONE;
  v_trans_item JSONB;
BEGIN
  -- 1. Buscar a oficina e o número da OS
  SELECT workshop_id, os_number
  INTO v_workshop_id, v_os_number
  FROM work_orders
  WHERE id = p_os_id;

  IF v_workshop_id IS NULL THEN
    RAISE EXCEPTION 'Ordem de serviço não encontrada';
  END IF;

  -- Controle Multi-Tenant: Valida se o usuário autenticado tem acesso a esta oficina
  IF v_workshop_id::TEXT != (auth.jwt() -> 'user_metadata' ->> 'workshop_id') THEN
    RAISE EXCEPTION 'Acesso não autorizado';
  END IF;

  -- 2. Limpar qualquer rascunho de cobrança gerado automaticamente pelo trigger
  DELETE FROM billings WHERE os_id = p_os_id;

  -- 3. Inserir a nova cobrança customizada
  INSERT INTO billings (workshop_id, os_id, amount, payment_method, status, due_date, installments)
  VALUES (v_workshop_id, p_os_id, p_amount, p_payment_method::payment_method_enum, p_status::billing_status_enum, p_due_date, p_installments)
  RETURNING id, created_at INTO v_billing_id, v_created_at;

  -- 4. Percorrer a lista de parcelas para inseri-las no banco e criar transações financeiras para as já pagas
  FOR v_inst IN SELECT * FROM jsonb_to_recordset(p_installments) AS x(
    number INT, 
    amount DECIMAL(10,2), 
    "dueDate" DATE, 
    status VARCHAR(50), 
    "paidAt" VARCHAR(100)
  ) LOOP
    -- Inserir parcela na tabela billing_installments
    INSERT INTO billing_installments (billing_id, number, amount, due_date, status, paid_at)
    VALUES (v_billing_id, v_inst.number, v_inst.amount, v_inst."dueDate", v_inst.status, v_inst."paidAt");

    -- Se a parcela for salva já no status 'Pago', criar Entrada no fluxo de caixa
    IF v_inst.status = 'Pago' THEN
      INSERT INTO financial_transactions (workshop_id, type, category, amount, date, description)
      VALUES (
        v_workshop_id, 
        'Entrada', 
        'Pagamento OS', 
        v_inst.amount, 
        COALESCE(SPLIT_PART(v_inst."paidAt", 'T', 1)::DATE, CURRENT_DATE),
        'Parcela ' || v_inst.number || '/' || jsonb_array_length(p_installments) || ' da ' || COALESCE(v_os_number, 'OS')
      )
      RETURNING id, created_at INTO v_trans_id, v_trans_created_at;

      -- Adicionar detalhes da transação gerada ao payload de retorno
      v_trans_item := jsonb_build_object(
        'id', v_trans_id,
        'type', 'Entrada',
        'category', 'Pagamento OS',
        'amount', v_inst.amount,
        'date', COALESCE(SPLIT_PART(v_inst."paidAt", 'T', 1), CURRENT_DATE::TEXT),
        'description', 'Parcela ' || v_inst.number || '/' || jsonb_array_length(p_installments) || ' da ' || COALESCE(v_os_number, 'OS'),
        'createdAt', v_trans_created_at
      );
      v_transactions := v_transactions || v_trans_item;
    END IF;
  END LOOP;

  -- 5. Retornar dados da cobrança e transações criadas para sincronização local
  v_result := jsonb_build_object(
    'success', true,
    'billing_id', v_billing_id,
    'created_at', v_created_at,
    'transactions', v_transactions
  );
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================================
-- 5. SCRIPT DE CORREÇÃO/REPARO PARA DADOS ANTERIORES INCONSISTENTES
-- =====================================================================
-- Restaura e reconstrói as linhas faltantes na tabela billing_installments
-- a partir do histórico salvo na coluna JSONB installments da tabela billings.
INSERT INTO billing_installments (billing_id, number, amount, due_date, status, paid_at)
SELECT 
  b.id as billing_id,
  (inst->>'number')::int as number,
  (inst->>'amount')::decimal(10,2) as amount,
  (inst->>'dueDate')::date as due_date,
  (inst->>'status')::varchar(50) as status,
  inst->>'paidAt' as paid_at
FROM billings b
CROSS JOIN LATERAL jsonb_array_elements(b.installments) inst
WHERE NOT EXISTS (
  SELECT 1 FROM billing_installments bi WHERE bi.billing_id = b.id
);
