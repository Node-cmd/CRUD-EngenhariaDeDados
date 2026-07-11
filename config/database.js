const { Pool } = require('pg');
const mongoose = require('mongoose');

let postgresPool = null;
let activeDb = null; // 'postgres' ou 'mongo'

function conectarPostgres(user, password, host) {
    if (!user || !password) {
        throw new Error('Usuário e senha são obrigatórios para conexão PostgreSQL.');
    }
    
    if (!host) {
        throw new Error('Host PostgreSQL é obrigatório para conexão.');
    }

    const pool = new Pool({
        user,
        password,
        host: host,
        database: 'BancoUFS',
        port: 5432,
        ssl: { rejectUnauthorized: false }
    });

    return pool;
}

function ativarPostgres(pool) {
    postgresPool = pool;
    activeDb = 'postgres';
}

async function conectarMongo(user, password, host) {
    if (!user || !password || !host) {
        throw new Error('Usuário, senha e endereço IPv4 são obrigatórios para conexão MongoDB.');
    }

    const encodedUser = encodeURIComponent(user);
    const encodedPassword = encodeURIComponent(password);
    const trimmedHost = host.trim();
    const uri = `mongodb://admin:senha_projeto_321@18.215.74.236:27017/universidade?authSource=admin`;

    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    activeDb = 'mongo';
    return mongoose.connection;
}

function estaAtiva() {
    if (activeDb === 'postgres') return !!postgresPool;
    if (activeDb === 'mongo') return mongoose.connection.readyState === 1;
    return false;
}

function getTipo() {
    return activeDb;
}

function getDbAtivo() {
    if (activeDb === 'postgres') return postgresPool;
    if (activeDb === 'mongo') return mongoose.connection;
    throw new Error('Nenhuma conexão de banco de dados ativa. Conecte-se antes de usar a API.');
}

async function verificarPostgres() {
    if (!postgresPool) throw new Error('PostgreSQL não está conectado.');
    await postgresPool.query('SELECT 1');
}

module.exports = {
    conectarPostgres,
    ativarPostgres,
    conectarMongo,
    getTipo,
    getDbAtivo,
    estaAtiva,
    verificarPostgres
};
