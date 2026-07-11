/**
 * ================================================================================
 *  UTILITÁRIO (avulso): instanciar todas as coleções do mapeamento completo
 * ================================================================================
 *
 *  Este script NÃO faz parte do servidor (server.js) e não é chamado por ele.
 *  É uma ferramenta de administração para rodar manualmente, uma vez, contra
 *  o MongoDB hospedado na AWS — serve para comprovar o mapeamento completo do
 *  esquema relacional (Parte 2), criando as 16 coleções vazias com os nomes e
 *  índices corretos, mesmo as que o CRUD não manipula.
 *
 *  O que ele faz, para cada uma das 16 entidades de
 *  mapeamento-mongodb-completo.js:
 *   1. Registra um model Mongoose temporário a partir do schema.
 *   2. Chama Model.createCollection() -> cria a coleção vazia no banco
 *      (com o nome definido em `collection:` de cada schema).
 *   3. Chama Model.syncIndexes() -> cria de imediato os índices únicos
 *      (simples e compostos) que representam as chaves primárias/uniques
 *      do esquema SQL original, em vez de esperar a primeira inserção.
 *
 *  IMPORTANTE: assim como o mapeamento em si, este script cria apenas a
 *  ESTRUTURA (coleções + índices). Ele não insere nenhum documento — quem
 *  faz isso é o CRUD (para usuario/curso/estudante/vinculo) ou, futuramente,
 *  os pipelines de ETL da Parte 3.
 *
 *  Uso:
 *    node Src/database/instanciar-colecoes.js <usuario> <senha> <host>
 *
 *  Exemplo:
 *    node Src/database/instanciar-colecoes.js admin minhaSenha meu-host:27017
 * ================================================================================
 */

const mongoose = require('mongoose');
const schemas = require('./mapeamento-mongodb-completo');

// Nome do model Mongoose para cada schema (só para registrar/criar a coleção)
const ENTIDADES = [
    ['Usuario',      schemas.usuarioSchema],
    ['Professor',    schemas.professorSchema],
    ['Departamento', schemas.departamentoSchema],
    ['Curso',        schemas.cursoSchema],
    ['Estudante',    schemas.estudanteSchema],
    ['Vinculo',      schemas.vinculoSchema],
    ['Projeto',      schemas.projetoSchema],
    ['Plano',        schemas.planoSchema],
    ['Disciplina',   schemas.disciplinaSchema],
    ['Semestre',     schemas.semestreSchema],
    ['Sala',         schemas.salaSchema],
    ['Horario',      schemas.horarioSchema],
    ['Turma',        schemas.turmaSchema],
    ['Leciona',      schemas.lecionaSchema],
    ['Alocacao',     schemas.alocacaoSchema],
    ['Cursa',        schemas.cursaSchema]
];

async function main() {
    const [, , usuario, senha, host] = process.argv;

    if (!usuario || !senha || !host) {
        console.error('Uso: node Src/database/instanciar-colecoes.js <usuario> <senha> <host>');
        process.exit(1);
    }

    const uri = `mongodb://${encodeURIComponent(usuario)}:${encodeURIComponent(senha)}@${host.trim()}/universidade?authSource=admin`;

    console.log('Conectando ao MongoDB...');
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
    console.log('✓ Conectado.\n');

    for (const [nome, schema] of ENTIDADES) {
        const Model = mongoose.model(nome, schema);

        try {
            await Model.createCollection();
            console.log(`✓ Coleção criada/confirmada: ${Model.collection.name}`);
        } catch (err) {
            console.error(`✗ Erro ao criar a coleção de ${nome}:`, err.message);
            continue;
        }

        try {
            await Model.syncIndexes();
            console.log(`  ↳ índices sincronizados para ${Model.collection.name}`);
        } catch (err) {
            console.error(`  ↳ Erro ao sincronizar índices de ${nome}:`, err.message);
        }
    }

    await mongoose.disconnect();
    console.log('\n✓ Concluído. Conexão encerrada.');
}

main().catch(err => {
    console.error('Falha ao instanciar as coleções:', err.message);
    process.exit(1);
});
