const db = require('../../config/database');
const Usuario = require('../../models/rds/usuario');

async function listarTodos() {
    const pool = db.getDbAtivo();
    const res = await pool.query('SELECT * FROM universidade.usuario ORDER BY nome');
    return res.rows;
}

async function inserir(dados) {
    const usuario = new Usuario(dados);
    usuario.validar();

    const pool = db.getDbAtivo();
    const sql = `INSERT INTO universidade.usuario 
                 (cpf, nome, data_nascimento, email, telefone, login, senha) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7)`;

    const valores = [
        usuario.cpf,
        usuario.nome,
        usuario.dataNascimento || null,
        usuario.email || [],
        usuario.telefone || [],
        usuario.login,
        usuario.senha
    ];

    await pool.query(sql, valores);
}

async function atualizar(dados) {
    const usuario = new Usuario(dados);
    usuario.validar();

    const pool = db.getDbAtivo();
    const sql = `UPDATE universidade.usuario 
                 SET nome = $1, data_nascimento = $2, email = $3, telefone = $4, login = $5, senha = $6 
                 WHERE cpf = $7`;

    const valores = [
        usuario.nome,
        usuario.dataNascimento || null,
        usuario.email || [],
        usuario.telefone || [],
        usuario.login,
        usuario.senha,
        usuario.cpf
    ];

    await pool.query(sql, valores);
}

async function deletar(cpf) {
    const pool = db.getDbAtivo();
    await pool.query('DELETE FROM universidade.usuario WHERE cpf = $1::numeric', [cpf]);
}

module.exports = { listarTodos, inserir, atualizar, deletar };