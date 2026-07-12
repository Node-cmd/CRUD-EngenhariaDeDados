const db = require('../../config/database');
const Estudante = require('../../models/rds/estudante');
const usuarioRepo = require('./usuarioRepo');
const vinculoRepo = require('./vinculoRepo');

async function listarTodos() {
    const pool = db.getDbAtivo();
    const sql = `SELECT e.mat_estudante, e.cpf, e.mc as mc, e.ano_ingresso, u.nome, u.login,
                 v.idvinculo as "idVinculo", v.curso, v.status, v.data_entrada, v.data_saida, c.nome as nome_curso
                 FROM universidade.estudante e
                 JOIN universidade.usuario u ON e.cpf = u.cpf
                 LEFT JOIN universidade.vinculo v ON e.mat_estudante = v.mat_estudante
                 LEFT JOIN universidade.curso c ON v.curso = c.idcurso
                 ORDER BY u.nome`;
    const res = await pool.query(sql);
    return res.rows;
}

async function inserir(dados) {
    const estudante = new Estudante(dados);
    estudante.validar();

    const pool = db.getDbAtivo();

    const dadosUsuario = {
        cpf: dados.cpf,
        nome: dados.nome || dados.usuarioNome || `Usuário ${estudante.matricula}`,
        data_nascimento: dados.data_nascimento || dados.dataNascimento || null,
        email: dados.email || [],
        telefone: dados.telefone || [],
        login: dados.login || (estudante.matricula ? estudante.matricula.toLowerCase() : null),
        senha: dados.senha || '123456'
    };

    if (!dados.curso && !dados.idCurso && !dados.idcurso) {
        throw new Error('Curso obrigatório para criar o vínculo do estudante.');
    }

    try {
        await usuarioRepo.inserir(dadosUsuario);
    } catch (erro) {
        if (!/duplicate key|already exists|violates unique constraint/i.test(erro.message)) {
            throw erro;
        }
        // CPF já existente = reaproveita o usuário já cadastrado ("usar usuário existente")
    }

    const sqlEstudante = `INSERT INTO universidade.estudante 
                         (mat_estudante, cpf, mc, ano_ingresso) 
                         VALUES ($1, $2::numeric, $3, $4)`;
    await pool.query(sqlEstudante, [
        estudante.matricula,
        estudante.cpf,
        estudante.mc ?? null,
        estudante.anoIngresso ?? null
    ]);

    await vinculoRepo.inserir({
        mat_estudante: estudante.matricula,
        curso: dados.curso || dados.idCurso || dados.idcurso || null,
        data_entrada: dados.data_entrada || dados.dataEntrada || null,
        status: dados.status || 'Ativo',
        data_saida: dados.data_saida || dados.dataSaida || null
    });
}

/**
 * Atualiza mc/ano_ingresso do estudante, os dados do usuário vinculado
 * (somente os campos enviados — nunca reatribui o cpf) e faz UPSERT do
 * vínculo mais recente: atualiza se já existir, cria um novo se o estudante
 * ainda não tiver nenhum. Antes, um UPDATE incondicional podia zerar
 * curso/status silenciosamente quando o formulário não enviava esses dados.
 */
async function atualizar(dados) {
    const estudante = new Estudante(dados);
    estudante.validar();

    const pool = db.getDbAtivo();
    await pool.query(
        `UPDATE universidade.estudante SET mc = $1, ano_ingresso = $2 WHERE mat_estudante = $3`,
        [estudante.mc ?? null, estudante.anoIngresso ?? null, estudante.matricula]
    );

    if (dados.nome || dados.login || dados.senha) {
        await pool.query(`UPDATE universidade.usuario
                          SET nome = COALESCE($1, nome), login = COALESCE($2, login), senha = COALESCE($3, senha)
                          WHERE cpf = $4::numeric`, [
            dados.nome  || null,
            dados.login || null,
            dados.senha || null, // vazio = mantém a senha atual (não zera mais para um valor padrão)
            estudante.cpf
        ]);
    }

    const curso       = dados.curso || dados.idCurso || dados.idcurso || null;
    const dataEntrada = dados.data_entrada || dados.dataEntrada || null;
    const status      = dados.status || null;
    const dataSaida    = dados.data_saida || dados.dataSaida || null;

    if (curso || status || dataEntrada || dataSaida) {
        const existente = await pool.query(
            'SELECT idvinculo FROM universidade.vinculo WHERE mat_estudante = $1 ORDER BY idvinculo DESC LIMIT 1',
            [estudante.matricula]
        );

        if (existente.rows[0]) {
            await pool.query(`UPDATE universidade.vinculo
                              SET curso = COALESCE($1, curso), data_entrada = COALESCE($2, data_entrada),
                                  status = COALESCE($3, status), data_saida = $4
                              WHERE idvinculo = $5`, [
                curso, dataEntrada, status, dataSaida, existente.rows[0].idvinculo
            ]);
        } else if (curso) {
            await pool.query(`INSERT INTO universidade.vinculo (mat_estudante, curso, data_entrada, status, data_saida)
                              VALUES ($1, $2, $3, $4, $5)`, [
                estudante.matricula, curso, dataEntrada, status || 'Ativo', dataSaida
            ]);
        }
    }
}

async function deletar(mat_estudante) {
    const pool = db.getDbAtivo();
    const res = await pool.query('SELECT cpf FROM universidade.estudante WHERE mat_estudante = $1', [mat_estudante]);

    await pool.query('DELETE FROM universidade.vinculo WHERE mat_estudante = $1', [mat_estudante]);
    await pool.query('DELETE FROM universidade.estudante WHERE mat_estudante = $1', [mat_estudante]);

    if (res.rows[0] && res.rows[0].cpf) {
        await usuarioRepo.deletar(res.rows[0].cpf);
    }
}

module.exports = { listarTodos, inserir, atualizar, deletar };
