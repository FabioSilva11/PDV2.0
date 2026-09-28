-- 002: `raw_data` em payments e cash_transactions.
--
-- O repositório guarda o objeto original em JSON para nenhum campo do
-- snapshot se perder. As duas tabelas nasceram sem essa coluna, então toda
-- gravação de pagamento/movimento de caixa falhava com
-- "table ... has no column named raw_data" — o que impedia a migração de
-- concluir e quebrava o fechamento de caixa.
--
-- SQLite não tem "ADD COLUMN IF NOT EXISTS": em bancos já corrigidos a
-- segunda execução acusa "duplicate column name", tratado como sucesso.

ALTER TABLE payments ADD COLUMN `raw_data` TEXT;
ALTER TABLE cash_transactions ADD COLUMN `raw_data` TEXT;
