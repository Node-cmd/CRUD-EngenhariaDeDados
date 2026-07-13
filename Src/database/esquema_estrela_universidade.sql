-- =====================================================================
-- ESQUEMA ESTRELA AJUSTADO
-- Parte 3.1 - Trabalho Prático de Engenharia de Dados
-- =====================================================================
-- Deve ser executado no PostgreSQL hospedado no RDS.
-- =====================================================================

DROP SCHEMA IF EXISTS dw_universidade CASCADE;
CREATE SCHEMA dw_universidade;

-- =====================================================================
-- DIMENSÕES
-- =====================================================================

-- ---------------------------------------------------------------------
-- Dimensão Tempo (semestre)
-- ---------------------------------------------------------------------
CREATE TABLE dw_universidade.dim_tempo (
    sk_tempo     SERIAL PRIMARY KEY,
    ano          SMALLINT NOT NULL,
    periodo      SMALLINT NOT NULL,          -- 1 ou 2
    CONSTRAINT uq_dim_tempo UNIQUE (ano, periodo)
);

-- ---------------------------------------------------------------------
-- Dimensão Departamento
-- ---------------------------------------------------------------------
CREATE TABLE dw_universidade.dim_departamento (
    sk_departamento    SERIAL PRIMARY KEY,
    cod_departamento   VARCHAR(10) NOT NULL,
    nome_departamento  VARCHAR(120) NOT NULL,
    CONSTRAINT uq_dim_departamento UNIQUE (cod_departamento)
);

-- ---------------------------------------------------------------------
-- Dimensão Campus
-- ---------------------------------------------------------------------
CREATE TABLE dw_universidade.dim_campus (
    sk_campus    SERIAL PRIMARY KEY,
    nome_campus  VARCHAR(100) NOT NULL,
    CONSTRAINT uq_dim_campus UNIQUE (nome_campus)
);

-- ---------------------------------------------------------------------
-- Dimensão Disciplina
-- ---------------------------------------------------------------------
CREATE TABLE dw_universidade.dim_disciplina (
    sk_disciplina     SERIAL PRIMARY KEY,
    cod_disciplina    VARCHAR(20) NOT NULL,
    nome_disciplina   VARCHAR(150) NOT NULL,
    cr_total          SMALLINT,
    cod_depto_origem  VARCHAR(10),           -- atributo descritivo (degenerado)
    CONSTRAINT uq_dim_disciplina UNIQUE (cod_disciplina)
);

-- ---------------------------------------------------------------------
-- Dimensão Professor
-- ---------------------------------------------------------------------
CREATE TABLE dw_universidade.dim_professor (
    sk_professor                SERIAL PRIMARY KEY,
    nome_professor              VARCHAR(100) NOT NULL,
    tipo_jornada_trabalho       VARCHAR(30),   -- 'dedicação exclusiva'...
    formacao                    VARCHAR(20),   -- Graduação, Especialização, Mestrado, Doutorado
    nome_departamento_lotacao   VARCHAR(120), 
    CONSTRAINT uq_dim_professor UNIQUE (nome_professor)
);

-- ---------------------------------------------------------------------
-- Linhas "Não informado" (boas práticas de DW: FK da fato nunca fica nula)
-- ---------------------------------------------------------------------
INSERT INTO dw_universidade.dim_tempo (ano, periodo)
    VALUES (0, 0);

INSERT INTO dw_universidade.dim_departamento (cod_departamento, nome_departamento)
    VALUES ('N/D', 'Não informado');

INSERT INTO dw_universidade.dim_campus (nome_campus)
    VALUES ('Não informado');

INSERT INTO dw_universidade.dim_disciplina (cod_disciplina, nome_disciplina, cr_total, cod_depto_origem)
    VALUES ('N/D', 'Não informado', NULL, NULL);

INSERT INTO dw_universidade.dim_professor (nome_professor, tipo_jornada_trabalho, formacao, nome_departamento_lotacao)
    VALUES ('Não informado', NULL, NULL, NULL);

-- =====================================================================
-- FATO
-- =====================================================================

CREATE TABLE dw_universidade.fato_turma (
    sk_turma           SERIAL PRIMARY KEY,
    sk_professor       INT NOT NULL REFERENCES dw_universidade.dim_professor(sk_professor),
    sk_disciplina      INT NOT NULL REFERENCES dw_universidade.dim_disciplina(sk_disciplina),
    sk_departamento    INT NOT NULL REFERENCES dw_universidade.dim_departamento(sk_departamento),
    sk_tempo           INT NOT NULL REFERENCES dw_universidade.dim_tempo(sk_tempo),
    sk_campus          INT NOT NULL REFERENCES dw_universidade.dim_campus(sk_campus),
    numero_turma       VARCHAR(20),           -- dimensão degenerada: turmas paralelas
    qtd_matriculados   INT NOT NULL,
    media_notas        NUMERIC(4,2),          -- nulo quando não disponível
    qtd_aprovados      INT,                   -- nulo quando não disponível
    qtd_reprovados     INT,                   -- nulo quando não disponível
    CONSTRAINT uq_fato_turma UNIQUE (sk_professor, sk_disciplina, sk_departamento, sk_tempo, sk_campus, numero_turma)
);

-- Índices para acelerar consultas analíticas (joins pelas FKs)
CREATE INDEX idx_fato_turma_professor    ON dw_universidade.fato_turma(sk_professor);
CREATE INDEX idx_fato_turma_disciplina   ON dw_universidade.fato_turma(sk_disciplina);
CREATE INDEX idx_fato_turma_departamento ON dw_universidade.fato_turma(sk_departamento);
CREATE INDEX idx_fato_turma_tempo        ON dw_universidade.fato_turma(sk_tempo);
CREATE INDEX idx_fato_turma_campus       ON dw_universidade.fato_turma(sk_campus);

-- =====================================================================
-- USUÁRIO DE INTEGRAÇÃO
-- =====================================================================
GRANT USAGE ON SCHEMA dw_universidade TO etl_hop;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA dw_universidade TO etl_hop;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA dw_universidade TO etl_hop;

ALTER DEFAULT PRIVILEGES IN SCHEMA dw_universidade
    GRANT SELECT, INSERT, UPDATE ON TABLES TO etl_hop;
ALTER DEFAULT PRIVILEGES IN SCHEMA dw_universidade
    GRANT USAGE, SELECT ON SEQUENCES TO etl_hop;