const db = require('../../config/database');
const Curso = require('../../models/rds/curso');

async function listarTodos() {
    const pool = db.getDbAtivo();
    const res = await pool.query('SELECT * FROM universidade.curso ORDER BY nome');
    return res.rows;
}

async function inserir(dados) {
    const curso = new Curso(dados);
    curso.validar();

    const pool = db.getDbAtivo();
    const sql = `INSERT INTO universidade.curso (nome, grau, turno, campus, nivel) 
                 VALUES ($1, $2, $3, $4, $5)`;
    await pool.query(sql, [curso.nome, curso.grau, curso.turno, curso.campus, curso.nivel]);
}

async function atualizar(dados) {
    const curso = new Curso(dados);
    curso.validar();

    const pool = db.getDbAtivo();
    const sql = `UPDATE universidade.curso SET nome = $1, grau = $2, turno = $3, campus = $4, nivel = $5 
                 WHERE idCurso = $6`;
    await pool.query(sql, [curso.nome, curso.grau, curso.turno, curso.campus, curso.nivel, curso.idCurso]);
}

async function deletar(idCurso) {
    const pool = db.getDbAtivo();
    await pool.query('DELETE FROM universidade.curso WHERE idCurso = $1', [idCurso]);
}

module.exports = { listarTodos, inserir, atualizar, deletar };