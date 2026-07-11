/**
 * ================================================================================
 *  MAPEAMENTO COMPLETO DO ESQUEMA RELACIONAL (RDS) PARA O MONGODB
 * ================================================================================
 *
 *  ESTE ARQUIVO É APENAS DOCUMENTAÇÃO. Ele NÃO é importado/requerido por
 *  nenhuma parte do código (server.js, repositories, etc.) e não deve ser.
 *
 *  Ele é apenas uma representação de como as tebelas do esquema SQL da 1° parte foram
 *  mapeados para o esquema NOSQL MongoDB da 2° parte 
 *
 *  Legenda das estratégias de mapeamento relacional → NoSQL usadas abaixo:
 *  - Chave primária composta (SQL)      → índice composto `unique: true` no Mongo
 *  - Chave estrangeira (SQL)             → `ObjectId` com `ref` para a coleção
 *                                           relacionada (integridade referencial
 *                                           fica sob responsabilidade da
 *                                           aplicação/repository, não do banco)
 *  - Domínio / CHECK / ENUM (SQL)         → `enum` ou `min`/`max` do Mongoose
 *  - NOT NULL (SQL)                       → `required: true`
 * ================================================================================
 */

const mongoose = require('mongoose');
const { Schema } = mongoose;

// ── usuario ─────────────────────────────────────────────────────────────────
// SQL: USUARIO(cpf PK, nome NOT NULL, data_nascimento, email[], telefone[],
//              login UNIQUE, senha)
// ⚠️ Entidade ATIVA no CRUD — schema real está em Src/models/mongo/usuario.js
const usuarioSchema = new Schema({
    cpf:             { type: String, required: true, unique: true, match: /^\d{11}$/ },
    nome:            { type: String, required: true, trim: true },
    dataNascimento:  { type: Date, default: null },
    email:           { type: [String], default: [] },
    telefone:        { type: [String], default: [] },
    login:           { type: String, required: true, unique: true, trim: true },
    senha:           { type: String, required: true }
}, { collection: 'usuarios', timestamps: true });

// ── professor ────────────────────────────────────────────────────────────────
// SQL: PROFESSOR(mat_professor PK, cpf FK→USUARIO UNIQUE,
//                departamento FK→DEPARTAMENTO, formacao ENUM,
//                data_admissao, tipo_jornada_trabalho ENUM, salario)
const professorSchema = new Schema({
    matProfessor:  { type: String, required: true, unique: true },
    usuario:       { type: Schema.Types.ObjectId, ref: 'Usuario', required: true, unique: true },
    departamento:  { type: Schema.Types.ObjectId, ref: 'Departamento', default: null },
    formacao:      { type: String, enum: ['Graduação', 'Especialização', 'Mestrado', 'Doutorado'] },
    dataAdmissao:  { type: Date, default: null },
    tipoJornada:   { type: String, enum: ['20h', '40h', 'DE'] },
    salario:       { type: Number, default: null }
}, { collection: 'professores', timestamps: true });

// ── departamento ─────────────────────────────────────────────────────────────
// SQL: DEPARTAMENTO(cod_depto PK, nome NOT NULL, chefe FK→PROFESSOR,
//                    orcamento CHECK(> 0), comissal)
const departamentoSchema = new Schema({
    codDepto:   { type: String, required: true, unique: true, maxlength: 5 },
    nome:       { type: String, required: true, maxlength: 50 },
    chefe:      { type: Schema.Types.ObjectId, ref: 'Professor', default: null },
    orcamento:  { type: Number, min: [0.01, 'Orçamento deve ser maior que zero'], default: null },
    comissal:   { type: Number, default: 0 }
}, { collection: 'departamentos', timestamps: true });

// ── curso ────────────────────────────────────────────────────────────────────
// SQL: CURSO(idCurso PK, nome NOT NULL, grau ENUM, turno ENUM NOT NULL,
//            campus, nivel ENUM)
// ⚠️ Entidade ATIVA no CRUD — schema real está em Src/models/mongo/curso.js
const cursoSchema = new Schema({
    nome:    { type: String, required: true, trim: true },
    grau:    { type: String, enum: ['Bacharelado', 'Licenciatura Plena'] },
    turno:   { type: String, required: true, enum: ['Matutino', 'Vespertino', 'Noturno', 'Turno Indefinido'] },
    campus:  { type: String, default: null, trim: true },
    nivel:   { type: String, enum: ['Graduação', 'Mestrado', 'Doutorado', 'Lato', null], default: null }
}, { collection: 'cursos', timestamps: true });

// ── estudante ────────────────────────────────────────────────────────────────
// SQL: ESTUDANTE(mat_estudante PK, cpf FK→USUARIO UNIQUE, mc, ano_ingresso)
// ⚠️ Entidade ATIVA no CRUD — schema real está em Src/models/mongo/estudante.js
const estudanteSchema = new Schema({
    matricula:    { type: String, required: true, unique: true, match: /^[A-Z0-9]+$/ },
    usuario:      { type: Schema.Types.ObjectId, ref: 'Usuario', required: true, unique: true },
    mc:           { type: Number, min: 0, max: 10, default: null },
    anoIngresso:  { type: Number, required: true, min: 1900, max: 2100 }
}, { collection: 'estudantes', timestamps: true });

// ── vinculo ──────────────────────────────────────────────────────────────────
// SQL: VINCULO(idVinculo PK, mat_estudante FK→ESTUDANTE, curso FK→CURSO,
//              data_entrada, status ENUM, data_saida)
// ⚠️ Entidade ATIVA no CRUD — schema real está em Src/models/mongo/vinculo.js
const vinculoSchema = new Schema({
    estudante:     { type: Schema.Types.ObjectId, ref: 'Estudante', required: true },
    curso:         { type: Schema.Types.ObjectId, ref: 'Curso', required: true },
    dataIngresso:  { type: Date, default: Date.now },
    status:        { type: String, required: true, enum: ['Ativo', 'Cancelada', 'Formando', 'Graduado'], default: 'Ativo' },
    dataSaida:     { type: Date, default: null }
}, { collection: 'vinculos', timestamps: true });

// ── projeto ──────────────────────────────────────────────────────────────────
// SQL: PROJETO(id_projeto PK, descricao)
const projetoSchema = new Schema({
    idProjeto:  { type: Number, required: true, unique: true },
    descricao:  { type: String, default: null }
}, { collection: 'projetos', timestamps: true });

// ── plano ────────────────────────────────────────────────────────────────────
// SQL: PLANO(id_projeto FK→PROJETO, mat_professor FK→PROFESSOR,
//            mat_estudante FK→ESTUDANTE, ano; PK composta (mat_estudante, ano))
const planoSchema = new Schema({
    projeto:    { type: Schema.Types.ObjectId, ref: 'Projeto', required: true },
    professor:  { type: Schema.Types.ObjectId, ref: 'Professor', default: null },
    estudante:  { type: Schema.Types.ObjectId, ref: 'Estudante', required: true },
    ano:        { type: Number, required: true }
}, { collection: 'planos', timestamps: true });
planoSchema.index({ estudante: 1, ano: 1 }, { unique: true }); // PK composta do SQL

// ── disciplina ───────────────────────────────────────────────────────────────
// SQL: DISCIPLINA(cod_disc PK, nome NOT NULL, pre_req FK→DISCIPLINA (auto-relac.),
//                 creditos CHECK(1..11), depto_responsavel FK→DEPARTAMENTO)
const disciplinaSchema = new Schema({
    codDisc:           { type: String, required: true, unique: true, maxlength: 8 },
    nome:              { type: String, required: true, maxlength: 40 },
    preRequisito:      { type: Schema.Types.ObjectId, ref: 'Disciplina', default: null },
    creditos:          { type: Number, min: 1, max: 11, default: null },
    deptoResponsavel:  { type: Schema.Types.ObjectId, ref: 'Departamento', default: null }
}, { collection: 'disciplinas', timestamps: true });

// ── semestre ─────────────────────────────────────────────────────────────────
// SQL: SEMESTRE(ano, semestre, data_inicio, data_fom; PK composta (ano, semestre))
// ⚠️ Única tabela do dump que ainda não tinha um schema mapeado — adicionada
//    aqui para fechar as 16 tabelas de universidade.* do dump SQL.
const semestreSchema = new Schema({
    ano:         { type: Number, required: true },
    semestre:    { type: Number, required: true },
    dataInicio:  { type: Date, default: null },
    dataFim:     { type: Date, default: null }
}, { collection: 'semestres', timestamps: true });
semestreSchema.index({ ano: 1, semestre: 1 }, { unique: true }); // PK composta do SQL

// ── sala ─────────────────────────────────────────────────────────────────────
// SQL: SALA(id_sala PK, descricao)
const salaSchema = new Schema({
    descricao: { type: String, default: null }
}, { collection: 'salas', timestamps: true });

// ── horario ──────────────────────────────────────────────────────────────────
// SQL: HORARIO(id_horario PK, dia NOT NULL, slot NOT NULL)
const horarioSchema = new Schema({
    dia:   { type: String, required: true, maxlength: 15 },
    slot:  { type: Number, required: true }
}, { collection: 'horarios', timestamps: true });

// ── turma ────────────────────────────────────────────────────────────────────
// SQL: TURMA(id_turma PK, cod_disc FK→DISCIPLINA NOT NULL, numero, ano,
//            semestre; FK composta (ano, semestre)→SEMESTRE;
//            UNIQUE(cod_disc, numero, semestre, ano))
const turmaSchema = new Schema({
    disciplina:  { type: Schema.Types.ObjectId, ref: 'Disciplina', required: true },
    semestre:    { type: Schema.Types.ObjectId, ref: 'Semestre', required: true },
    numero:      { type: Number, default: null },
    ano:         { type: Number, default: null }
}, { collection: 'turmas', timestamps: true });
turmaSchema.index({ disciplina: 1, numero: 1, semestre: 1 }, { unique: true }); // UNIQUE do SQL

// ── leciona (associativa Professor ↔ Turma) ──────────────────────────────────
// SQL: LECIONA(id_turma FK→TURMA, mat_professor FK→PROFESSOR;
//              PK composta (id_turma, mat_professor))
const lecionaSchema = new Schema({
    turma:      { type: Schema.Types.ObjectId, ref: 'Turma', required: true },
    professor:  { type: Schema.Types.ObjectId, ref: 'Professor', required: true }
}, { collection: 'leciona', timestamps: true });
lecionaSchema.index({ turma: 1, professor: 1 }, { unique: true }); // PK composta do SQL

// ── alocacao (associativa Turma ↔ Horário ↔ Sala) ────────────────────────────
// SQL: ALOCACAO(id_turma, id_horario, id_sala; PK composta (id_turma, id_horario);
//               UNIQUE(id_horario, id_sala))
const alocacaoSchema = new Schema({
    turma:    { type: Schema.Types.ObjectId, ref: 'Turma', required: true },
    horario:  { type: Schema.Types.ObjectId, ref: 'Horario', required: true },
    sala:     { type: Schema.Types.ObjectId, ref: 'Sala', required: true }
}, { collection: 'alocacoes', timestamps: true });
alocacaoSchema.index({ turma: 1, horario: 1 }, { unique: true });   // PK composta do SQL
alocacaoSchema.index({ horario: 1, sala: 1 }, { unique: true });    // UNIQUE do SQL

// ── cursa (associativa Estudante ↔ Turma) ────────────────────────────────────
// SQL: CURSA(mat_estudante FK→ESTUDANTE, id_turma FK→TURMA, nota;
//            PK composta (mat_estudante, id_turma))
const cursaSchema = new Schema({
    estudante:  { type: Schema.Types.ObjectId, ref: 'Estudante', required: true },
    turma:      { type: Schema.Types.ObjectId, ref: 'Turma', required: true },
    nota:       { type: Number, default: null }
}, { collection: 'cursa', timestamps: true });
cursaSchema.index({ estudante: 1, turma: 1 }, { unique: true }); // PK composta do SQL

/**
 * NOTA SOBRE `tabela.js` (arquivo antigo removido):
 * A versão anterior do projeto tinha um arquivo `models/tabela.js` que era uma
 * cópia colada por engano de `plano.js` (mesmo schema, mesmo nome de model
 * 'Plano'). Ele não representava nenhuma tabela real do dump e foi descartado
 * nesta consolidação — o que faltava de verdade era o mapeamento de
 * `semestre`, que foi adicionado acima.
 */

module.exports = {
    usuarioSchema,
    professorSchema,
    departamentoSchema,
    cursoSchema,
    estudanteSchema,
    vinculoSchema,
    projetoSchema,
    planoSchema,
    disciplinaSchema,
    semestreSchema,
    salaSchema,
    horarioSchema,
    turmaSchema,
    lecionaSchema,
    alocacaoSchema,
    cursaSchema
};
