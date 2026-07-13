# CRUD Engenharia de Dados — Universidade

Trabalho prático da disciplina de Engenharia de Dados: uma aplicação Node.js/Express que implementa **CRUD sobre PostgreSQL (AWS RDS) e MongoDB** para o mesmo domínio de dados universitário, além do **mapeamento completo do esquema relacional para o MongoDB** e da **integração de dados em um esquema estrela** via pipelines do Apache Hop.

O trabalho foi dividido em três partes, e a organização do repositório segue exatamente essa divisão — veja [Estrutura do repositório](#estrutura-do-repositório).

## Sumário

- [Visão geral](#visão-geral)
- [Estrutura do repositório](#estrutura-do-repositório)
- [Parte 1 — CRUD Relacional (PostgreSQL / AWS RDS)](#parte-1--crud-relacional-postgresql--aws-rds)
- [Parte 2 — CRUD NoSQL (MongoDB)](#parte-2--crud-nosql-mongodb)
- [Parte 3 — Integração de Dados (Esquema Estrela + ETL)](#parte-3--integração-de-dados-esquema-estrela--etl)
- [Tecnologias utilizadas](#tecnologias-utilizadas)
- [Pré-requisitos](#pré-requisitos)
- [Instalação e execução](#instalação-e-execução)
- [Como usar a aplicação](#como-usar-a-aplicação)
- [API — endpoints disponíveis](#api--endpoints-disponíveis)

## Visão geral

A aplicação é um único servidor Express (`Src/server.js`) que serve tanto a API REST quanto uma interface web estática (`Src/public/`). Ao abrir a aplicação, o usuário escolhe e se conecta a **um** dos dois bancos (PostgreSQL ou MongoDB); a partir daí, a mesma tela de CRUD passa a operar sobre as tabelas/coleções de **usuário, estudante, vínculo e curso**, seja qual for o banco ativo.

As credenciais de conexão informadas na tela ficam salvas no `localStorage` do navegador (não em nenhum arquivo do servidor), para facilitar reconexões futuras sem precisar redigitar host/usuário a cada vez.

## Estrutura do repositório

```
CRUD-EngenhariaDeDados-main/
├── Src/
│   ├── server.js                  # Servidor Express único: rotas da API + troca de banco ativo
│   │
│   ├── config/
│   │   ├── database.js            # Conexão/troca entre PostgreSQL e MongoDB
│   │   └── enums.js               # Enums canônicos (grau, turno, nível, status) usados nos dropdowns do front
│   │
│   ├── models/
│   │   ├── rds/                   # ── Parte 1 ── Models do esquema relacional (PostgreSQL)
│   │   │   ├── usuario.js
│   │   │   ├── estudante.js
│   │   │   ├── vinculo.js
│   │   │   └── curso.js
│   │   └── mongo/                 # ── Parte 2 ── Schemas Mongoose das 4 entidades do CRUD
│   │       ├── usuario.js
│   │       ├── estudante.js
│   │       ├── vinculo.js
│   │       └── curso.js
│   │
│   ├── repositories/
│   │   ├── rds/                   # ── Parte 1 ── Acesso a dados via `pg` (PostgreSQL)
│   │   │   ├── usuarioRepo.js
│   │   │   ├── estudanteRepo.js
│   │   │   ├── vinculoRepo.js
│   │   │   └── cursoRepo.js
│   │   └── mongo/                 # ── Parte 2 ── Acesso a dados via Mongoose (MongoDB)
│   │       ├── usuarioRepo.js
│   │       ├── estudanteRepo.js
│   │       ├── vinculoRepo.js
│   │       └── cursoRepo.js
│   │
│   ├── database/
│   │   ├── universidade-dump-engdados.sql       # ── Parte 1 ── Dump do esquema relacional (fonte da verdade)
│   │   ├── mapeamento-mongodb-completo.js       # ── Parte 2 ── Documentação: mapeamento das 16 tabelas do dump
│   │   │                                        #               para o MongoDB (só as 4 do CRUD são realmente usadas
│   │   │                                        #               pela aplicação — o restante é material de estudo)
│   │   ├── instanciar-colecoes.js               # ── Parte 2 ── Utilitário avulso para criar as 16 coleções/índices
│   │   │                                        #               no MongoDB a partir do mapeamento acima
│   │   └── esquema_estrela_universidade.sql     # ── Parte 3 ── DDL do esquema estrela (dimensões + fato)
│   │
│   ├── Pipelines/
│   │   └── Projeto-Universidade/                # ── Parte 3 ── Pipelines de ETL (Apache Hop)
│   │       ├── DW-universidade.hwf              #   Workflow que orquestra todos os pipelines abaixo
│   │       ├── Periodos.hpl                      #   Popula dim_tempo
│   │       ├── Departamentos.hpl                 #   Popula dim_departamento
│   │       ├── Campus.hpl                        #   Popula dim_campus
│   │       ├── Disciplinas.hpl                   #   Popula dim_disciplina
│   │       ├── Docentes.hpl                      #   Popula dim_professor
│   │       ├── Turmas.hpl                        #   Popula fato_turma (usa as dimensões acima)
│   │       └── *.csv                             #   Fontes abertas do dados.ufs.br (Unidades Acadêmicas,
│   │                                              #   Componentes Curriculares, Docentes, Turmas)
│   │
│   └── public/                    # Front-end estático (usado pelas Partes 1 e 2)
│       ├── index.html
│       ├── app.js                 # Lógica da SPA: conexão, CRUD, dropdowns de FK, enums
│       └── style.css
│
├── package.json
└── package-lock.json
```

> **Por que "models" e "repositories" têm subpastas `rds/` e `mongo/`?**
> Cada banco tem sua própria representação da mesma entidade (ex.: `estudante` é uma tabela relacional em `models/rds/` e um schema Mongoose em `models/mongo/`) e sua própria forma de acessar os dados (`pg` vs `mongoose`). Separar em subpastas deixa explícito, só pela estrutura de pastas, o que pertence à Parte 1 e o que pertence à Parte 2 — `server.js` importa dos dois lados e decide qual repository chamar de acordo com o banco atualmente conectado.

## Parte 1 — CRUD Relacional (PostgreSQL / AWS RDS)

- **Banco**: PostgreSQL hospedado na AWS RDS.
- **Esquema**: `universidade` (tabelas `usuario`, `estudante`, `vinculo`, `curso`, entre outras do domínio completo) — dump em [`Src/database/universidade-dump-engdados.sql`](Src/database/universidade-dump-engdados.sql).
- **Código**: `Src/models/rds/` (validação dos dados) + `Src/repositories/rds/` (SQL puro via `pg`).
- O CRUD cobre `usuario`, `estudante`, `vinculo` e `curso`, incluindo a criação do vínculo inicial (curso + status) junto com o cadastro de um novo estudante.

## Parte 2 — CRUD NoSQL (MongoDB)

- **Banco**: MongoDB hospedado na AWS.
- **Mapeamento lógico**: como o professor pede que **todas as tabelas** do esquema relacional sejam representadas no NoSQL (não só as 4 do CRUD), esse mapeamento completo das 16 tabelas do dump fica documentado, isolado do código que realmente roda, em [`Src/database/mapeamento-mongodb-completo.js`](Src/database/mapeamento-mongodb-completo.js). Esse arquivo **não é importado por `server.js`** — é material de consulta/avaliação.
- Para efetivamente criar essas 16 coleções (com os índices únicos correspondentes às chaves do esquema relacional) no banco, existe o utilitário avulso [`Src/database/instanciar-colecoes.js`](Src/database/instanciar-colecoes.js), executado manualmente:
  ```bash
  node Src/database/instanciar-colecoes.js <usuario> <senha> <host>
  ```
- **CRUD ativo**: apenas as 4 entidades usadas pela aplicação (`usuario`, `estudante`, `vinculo`, `curso`) têm schema Mongoose "de verdade" em `Src/models/mongo/` e repository em `Src/repositories/mongo/`, com os mesmos domínios/enums e as mesmas restrições de integridade referencial do relacional original.

## Parte 3 — Integração de Dados (Esquema Estrela + ETL)

- **Modelagem**: esquema estrela de turmas de graduação — dimensões `dim_tempo` (semestre), `dim_departamento`, `dim_campus`, `dim_disciplina` e `dim_professor`, e a tabela fato `fato_turma` (matriculados, média de notas, aprovados, reprovados). DDL completo em [`Src/database/esquema_estrela_universidade.sql`](Src/database/esquema_estrela_universidade.sql), a ser executado no schema `dw_universidade` do mesmo servidor RDS.
- **ETL**: pipelines do **Apache Hop** em [`Src/Pipelines/Projeto-Universidade/`](Src/Pipelines/Projeto-Universidade/), um por dimensão (`Periodos.hpl`, `Departamentos.hpl`, `Campus.hpl`, `Disciplinas.hpl`, `Docentes.hpl`) mais o pipeline da fato (`Turmas.hpl`), todos orquestrados pelo workflow `DW-universidade.hwf`.
- **Fontes**: o banco relacional da Parte 1 (via JDBC) e os CSVs públicos do grupo *Ensino* do [dados.ufs.br](https://dados.ufs.br/group/ensino) — Unidades Acadêmicas, Componentes Curriculares, Docentes e Turmas (2019–2025), incluídos na mesma pasta dos pipelines.

## Tecnologias utilizadas

| Camada             | Tecnologia                          |
|--------------------|--------------------------------------|
| Back-end           | Node.js + Express                   |
| Banco relacional   | PostgreSQL (AWS RDS) via `pg`       |
| Banco NoSQL        | MongoDB (AWS) via `mongoose`/`mongodb` |
| Front-end          | HTML + CSS + JavaScript puro (SPA)  |
| ETL                | Apache Hop                          |

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior e npm
- Acesso de rede a uma instância PostgreSQL (AWS RDS) e/ou a uma instância MongoDB já provisionadas
- Para a Parte 3: [Apache Hop](https://hop.apache.org/) instalado, com o schema `dw_universidade` já criado no mesmo RDS

## Instalação e execução

```bash
git clone <url-deste-repositório>
cd CRUD-EngenhariaDeDados-main
npm install
npm start
```

O servidor sobe em `http://localhost:3000` (ou na porta definida em `process.env.PORT`).

## Como usar a aplicação

1. Abra `http://localhost:3000` no navegador.
2. Escolha o banco (PostgreSQL ou MongoDB) e informe host/usuário/senha na tela de conexão — esses dados ficam salvos no `localStorage` do navegador para os próximos acessos.
3. Depois de conectado, navegue entre as abas **Usuário**, **Estudante**, **Vínculo** e **Curso** para listar, cadastrar, editar e remover registros — o CRUD funciona da mesma forma independentemente do banco escolhido.
4. Use **"Trocar banco de dados"** para desconectar e escolher o outro banco sem reiniciar o servidor.

## API — endpoints disponíveis

| Método | Rota                     | Descrição                                  |
|--------|--------------------------|---------------------------------------------|
| POST   | `/api/conectar/postgres` | Conecta ao PostgreSQL (AWS RDS)             |
| POST   | `/api/conectar/mongo`    | Conecta ao MongoDB                          |
| GET    | `/api/status`            | Retorna o banco atualmente ativo            |
| GET    | `/api/enums`             | Retorna os enums (grau, turno, nível, status) para os dropdowns |
| GET    | `/api/usuario`           | Lista usuários                              |
| POST   | `/api/usuario`           | Cria usuário                                |
| PUT    | `/api/usuario/:cpf`      | Atualiza usuário                            |
| DELETE | `/api/usuario/:cpf`      | Remove usuário                              |
| GET    | `/api/curso`             | Lista cursos                                |
| POST   | `/api/curso`             | Cria curso                                  |
| PUT    | `/api/curso/:id`         | Atualiza curso                              |
| DELETE | `/api/curso/:id`         | Remove curso                                |
| GET    | `/api/estudante`         | Lista estudantes (com curso/status do vínculo mais recente) |
| POST   | `/api/estudante`         | Cria estudante + vínculo inicial            |
| PUT    | `/api/estudante/:mat`    | Atualiza estudante e seu vínculo mais recente |
| DELETE | `/api/estudante/:mat`    | Remove estudante, seus vínculos e seu usuário |
| GET    | `/api/vinculo`           | Lista vínculos                              |
| POST   | `/api/vinculo`           | Cria vínculo                                |
| PUT    | `/api/vinculo/:id`       | Atualiza vínculo                            |
| DELETE | `/api/vinculo/:id`       | Remove vínculo                              |

Todas as rotas de CRUD (exceto as duas de conexão e `/api/status`/`/api/enums`) exigem que um banco já esteja ativo (retornam `503` caso contrário).
