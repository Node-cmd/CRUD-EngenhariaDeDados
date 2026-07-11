const db = require('../../config/database');
const Estudante = require('../../models/rds/estudante');
const usuarioRepo = require('./usuarioRepo');
const vinculoRepo = require('./vinculoRepo');

async function listarTodos() {
    const pool = db.getDbAtivo();
    const sql = `SELECT e.mat_estudante, e.cpf, e.mc as mc, e.ano_ingresso, u.nome,
                 v.curso, v.status, v.data_entrada, v.data_saida, c.nome as nome_curso
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

async function atualizar(dados) {
    const estudante = new Estudante(dados);
    estudante.validar();

    const pool = db.getDbAtivo();
    const sql = `UPDATE universidade.estudante 
                 SET cpf = $1, mc = $2, ano_ingresso = $3 
                 WHERE mat_estudante = $4`;
    await pool.query(sql, [
        estudante.cpf,
        estudante.mc ?? null,
        estudante.anoIngresso ?? null,
        estudante.matricula
    ]);

    if (dados.cpf) {
        await pool.query(`UPDATE universidade.usuario
                          SET nome = COALESCE($1, nome), login = COALESCE($2, login), senha = COALESCE($3, senha)
                          WHERE cpf = $4::numeric`, [
            dados.nome || dados.usuarioNome || null,
            dados.login || null,
            dados.senha || null,
            dados.cpf
        ]);
    }

    const curso = dados.curso || dados.idCurso || dados.idcurso || null;
    const dataEntrada = dados.data_entrada || dados.dataEntrada || null;
    const status = dados.status || 'Ativo';
    const dataSaida = dados.data_saida || dados.dataSaida || null;

    await pool.query(`UPDATE universidade.vinculo
                      SET curso = $1, data_entrada = $2, status = $3, data_saida = $4
                      WHERE mat_estudante = $5`, [
        curso,
        dataEntrada,
        status,
        dataSaida,
        estudante.matricula
    ]);
}

async function deletar(mat_estudante) {
    const pool = db.getDbAtivo();
    const res = await pool.query('SELECT cpf FROM universidade.estudante WHERE mat_estudante = $1', [mat_estudante]);

    if (res.rows[0] && res.rows[0].cpf) {
        await usuarioRepo.deletar(res.rows[0].cpf);
    }

    await pool.query('DELETE FROM universidade.vinculo WHERE mat_estudante = $1', [mat_estudante]);
    await pool.query('DELETE FROM universidade.estudante WHERE mat_estudante = $1', [mat_estudante]);
}

module.exports = { listarTodos, inserir, atualizar, deletar };