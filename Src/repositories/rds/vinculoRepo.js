const db = require('../../config/database');
const Vinculo = require('../../models/rds/vinculo');

async function listarTodos() {
    const pool = db.getDbAtivo();
    const sql = `SELECT v.idvinculo as idVinculo, v.mat_estudante, v.curso, v.data_entrada, v.status, v.data_saida,
                 c.nome as nome_curso, u.nome as nome_estudante
                 FROM universidade.vinculo v
                 LEFT JOIN universidade.curso c ON v.curso = c.idCurso
                 LEFT JOIN universidade.estudante e ON v.mat_estudante = e.mat_estudante
                 LEFT JOIN universidade.usuario u ON e.cpf = u.cpf
                 ORDER BY v.idvinculo`;
    const res = await pool.query(sql);
    return res.rows;
}

async function inserir(dados) {
    const vinculo = new Vinculo(dados);
    vinculo.validar();

    const pool = db.getDbAtivo();
    const sql = `INSERT INTO universidade.vinculo 
                 (mat_estudante, curso, data_entrada, status, data_saida) 
                 VALUES ($1, $2, $3, $4, $5)`;

    const valores = [
        vinculo.matricula,
        vinculo.idCurso ?? null,
        vinculo.dataIngresso || null,
        vinculo.status || 'Ativo',
        vinculo.dataSaida || null
    ];

    await pool.query(sql, valores);
}

async function atualizar(dados) {
    const vinculo = new Vinculo(dados);
    vinculo.validar();

    const pool = db.getDbAtivo();
    const sql = `UPDATE universidade.vinculo 
                 SET mat_estudante = $1, curso = $2, data_entrada = $3, status = $4, data_saida = $5 
                 WHERE idvinculo = $6`;

    const valores = [
        vinculo.matricula,
        vinculo.idCurso ?? null,
        vinculo.dataIngresso || null,
        vinculo.status,
        vinculo.dataSaida || null,
        vinculo.idVinculo
    ];

    await pool.query(sql, valores);
}

async function deletar(idVinculo) {
    const pool = db.getDbAtivo();
    await pool.query('DELETE FROM universidade.vinculo WHERE idvinculo = $1', [idVinculo]);
}

module.exports = { listarTodos, inserir, atualizar, deletar };