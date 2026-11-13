-- For existing MySQL/MariaDB databases. SQLite already accepts longer values
-- in VARCHAR columns, so its existing database requires no schema change.
ALTER TABLE produtos MODIFY COLUMN descricao VARCHAR(220) NOT NULL;
ALTER TABLE avaliacoes MODIFY COLUMN descricao VARCHAR(220) NOT NULL;
