const express = require('express');
const path = require('path');
const db = require('./config/database');
const enumsConfig = require('./config/enums');

// Repositories PostgreSQL (RDS) — Parte 1
const pgUsuarioRepo  = require('./repositories/rds/usuarioRepo');
const pgCursoRepo    = require('./repositories/rds/cursoRepo');
const pgEstudanteRepo= require('./repositories/rds/estudanteRepo');
const pgVinculoRepo  = require('./repositories/rds/vinculoRepo');

// Repositories MongoDB — Parte 2
const mgUsuarioRepo  = require('./repositories/mongo/usuarioRepo');
const mgCursoRepo    = require('./repositories/mongo/cursoRepo');
const mgEstudanteRepo= require('./repositories/mongo/estudanteRepo');
const mgVinculoRepo  = require('./repositories/mongo/vinculoRepo');

const app = express();
const PORT = process.env.PORT || 3000;
const publicPath = path.join(__dirname, 'public');

app.use(express.json());
app.use(express.static(publicPath));

app.get('/', (req, res) => res.sendFile(path.join(publicPath, 'index.html')));

// ─── Helpers ────────────────────────────────────────────────────────────────

function getTipo() {
    return db.getTipo();
}

function repos() {
    const tipo = getTipo();
    if (tipo === 'postgres') return {
        usuario:  pgUsuarioRepo,
        curso:    pgCursoRepo,
        estudante:pgEstudanteRepo,
        vinculo:  pgVinculoRepo
    };
    if (tipo === 'mongo') return {
        usuario:  mgUsuarioRepo,
        curso:    mgCursoRepo,
        estudante:mgEstudanteRepo,
        vinculo:  mgVinculoRepo
    };
    throw new Error('Nenhum banco de dados ativo. Conecte-se primeiro.');
}

function statusCode(mensagem) {
    return mensagem && /Nenhum banco|connect|não está conectado/i.test(mensagem) ? 503 : 500;
}

function erro(res, err) {
    res.status(statusCode(err.message)).json({ status: 'erro', mensagem: err.message || 'Erro inesperado.' });
}

// ─── Normalização de dados do Mongo para o formato esperado pelo front ───────

function normalizarListaMongo(lista, entidade) {
    if (!Array.isArray(lista)) return lista;
    return lista.map(item => {
        const obj = item.toObject ? item.toObject() : { ...item };
        if (entidade === 'usuario') {
            return {
                cpf:              obj.cpf,
                nome:             obj.nome,
                data_nascimento:  obj.dataNascimento,
                email:            obj.email || [],
                telefone:         obj.telefone || [],
                login:            obj.login
            };
        }
        if (entidade === 'curso') {
            return {
                idCurso: String(obj._id),
                nome:    obj.nome,
                grau:    obj.grau,
                turno:   obj.turno,
                campus:  obj.campus,
                nivel:   obj.nivel
            };
        }
        if (entidade === 'estudante') {
            const u = obj.usuario || {};
            return {
                mat_estudante: obj.matricula,
                matricula:     obj.matricula,
                cpf:           u.cpf || obj.cpf,
                nome:          u.nome || obj.nome,
                mc:            obj.mc,
                ano_ingresso:  obj.anoIngresso,
                status:        null,
                nome_curso:    null
            };
        }
        if (entidade === 'vinculo') {
            const est = obj.estudante || {};
            const u   = est.usuario  || {};
            const cur = obj.curso    || {};
            return {
                idVinculo:      String(obj._id),
                mat_estudante:  est.matricula || '',
                nome_estudante: u.nome || '',
                curso:          String(cur._id || ''),
                nome_curso:     cur.nome || '',
                data_entrada:   obj.dataIngresso,
                status:         obj.status,
                data_saida:     obj.dataSaida
            };
        }
        return obj;
    });
}

// ─── Rota de Conexão ─────────────────────────────────────────────────────────

// PostgreSQL (RDS)
app.post('/api/conectar/postgres', async (req, res) => {
    const { usuario, senha, host } = req.body;
    if (!usuario || !senha) return res.status(400).json({ status: 'erro', mensagem: 'Usuário e senha são obrigatórios.' });
    if (!host) return res.status(400).json({ status: 'erro', mensagem: 'Host PostgreSQL é obrigatório.' });
    try {
        const pool = db.conectarPostgres(usuario, senha, host);
        await pool.query('SELECT 1');
        db.ativarPostgres(pool);
        res.json({ status: 'sucesso', mensagem: 'Conectado ao PostgreSQL (AWS RDS) com sucesso.', tipo: 'postgres' });
    } catch (err) {
        res.status(401).json({ status: 'erro', mensagem: 'Erro de autenticação: ' + err.message });
    }
});

// MongoDB
app.post('/api/conectar/mongo', async (req, res) => {
    const { usuario, senha, host } = req.body;
    if (!usuario || !senha || !host) return res.status(400).json({ status: 'erro', mensagem: 'Usuário, senha e endereço IPv4 são obrigatórios.' });
    try {
        await db.conectarMongo(usuario, senha, host);
        res.json({ status: 'sucesso', mensagem: 'Conectado ao MongoDB com sucesso.', tipo: 'mongo' });
    } catch (err) {
        res.status(401).json({ status: 'erro', mensagem: 'Erro de conexão: ' + err.message });
    }
});

// Status do banco
app.get('/api/status', (req, res) => {
    res.json({ tipo: getTipo(), ativo: db.estaAtiva() });
});

// ─── Enums (Validações de Campo) ──────────────────────────────────────────────

// Obter todos os enums disponíveis
app.get('/api/enums', (req, res) => {
    try {
        const enums = enumsConfig.getEnumsFormatados();
        res.json({
            status: 'sucesso',
            enums: enums
        });
    } catch (err) {
        res.status(500).json({ status: 'erro', mensagem: 'Erro ao obter enums.' });
    }
});

// ─── CRUD de Usuários ─────────────────────────────────────────────────────────

app.get('/api/usuario', async (req, res) => {
    try {
        let dados = await repos().usuario.listarTodos();
        if (getTipo() === 'mongo') dados = normalizarListaMongo(dados, 'usuario');
        res.json(dados);
    } catch (err) { erro(res, err); }
});

app.post('/api/usuario', async (req, res) => {
    try {
        await repos().usuario.inserir(req.body);
        res.json({ status: 'sucesso', mensagem: 'Usuário inserido!' });
    } catch (err) { erro(res, err); }
});

app.put('/api/usuario/:cpf', async (req, res) => {
    try {
        await repos().usuario.atualizar({ ...req.body, cpf: req.params.cpf });
        res.json({ status: 'sucesso', mensagem: 'Usuário atualizado!' });
    } catch (err) { erro(res, err); }
});

app.delete('/api/usuario/:cpf', async (req, res) => {
    try {
        await repos().usuario.deletar(req.params.cpf);
        res.json({ status: 'sucesso', mensagem: 'Usuário removido!' });
    } catch (err) { erro(res, err); }
});

// ─── CRUD de Cursos ───────────────────────────────────────────────────────────

app.get('/api/curso', async (req, res) => {
    try {
        let dados = await repos().curso.listarTodos();
        if (getTipo() === 'mongo') dados = normalizarListaMongo(dados, 'curso');
        res.json(dados);
    } catch (err) { erro(res, err); }
});

app.post('/api/curso', async (req, res) => {
    try {
        await repos().curso.inserir(req.body);
        res.json({ status: 'sucesso', mensagem: 'Curso inserido!' });
    } catch (err) { erro(res, err); }
});

app.put('/api/curso/:id', async (req, res) => {
    try {
        await repos().curso.atualizar({ ...req.body, idCurso: req.params.id });
        res.json({ status: 'sucesso', mensagem: 'Curso atualizado!' });
    } catch (err) { erro(res, err); }
});

app.delete('/api/curso/:id', async (req, res) => {
    try {
        await repos().curso.deletar(req.params.id);
        res.json({ status: 'sucesso', mensagem: 'Curso removido!' });
    } catch (err) { erro(res, err); }
});

// ─── CRUD de Estudantes ───────────────────────────────────────────────────────

app.get('/api/estudante', async (req, res) => {
    try {
        let dados = await repos().estudante.listarTodos();
        if (getTipo() === 'mongo') dados = normalizarListaMongo(dados, 'estudante');
        res.json(dados);
    } catch (err) { erro(res, err); }
});

app.post('/api/estudante', async (req, res) => {
    try {
        await repos().estudante.inserir(req.body);
        res.json({ status: 'sucesso', mensagem: 'Estudante inserido!' });
    } catch (err) { erro(res, err); }
});

app.put('/api/estudante/:mat', async (req, res) => {
    try {
        await repos().estudante.atualizar({ ...req.body, matricula: req.params.mat });
        res.json({ status: 'sucesso', mensagem: 'Estudante atualizado!' });
    } catch (err) { erro(res, err); }
});

app.delete('/api/estudante/:mat', async (req, res) => {
    try {
        await repos().estudante.deletar(req.params.mat);
        res.json({ status: 'sucesso', mensagem: 'Estudante removido!' });
    } catch (err) { erro(res, err); }
});

// ─── CRUD de Vínculos ─────────────────────────────────────────────────────────

app.get('/api/vinculo', async (req, res) => {
    try {
        let dados = await repos().vinculo.listarTodos();
        if (getTipo() === 'mongo') dados = normalizarListaMongo(dados, 'vinculo');
        res.json(dados);
    } catch (err) { erro(res, err); }
});

app.post('/api/vinculo', async (req, res) => {
    try {
        // Para mongo, precisamos do _id do estudante e do curso
        if (getTipo() === 'mongo') {
            const est = await mgEstudanteRepo.buscarPorMatricula(req.body.mat_estudante || req.body.matricula);
            const cur = await mgCursoRepo.buscarPorId(req.body.curso || req.body.idCurso);
            await repos().vinculo.inserir({
                estudanteId:  String(est._id),
                cursoId:      String(cur._id),
                dataIngresso: req.body.data_entrada || req.body.dataIngresso || null,
                status:       req.body.status || 'Ativo',
                dataSaida:    req.body.data_saida || req.body.dataSaida || null
            });
        } else {
            await repos().vinculo.inserir(req.body);
        }
        res.json({ status: 'sucesso', mensagem: 'Vínculo inserido!' });
    } catch (err) { erro(res, err); }
});

app.put('/api/vinculo/:id', async (req, res) => {
    try {
        if (getTipo() === 'mongo') {
            await repos().vinculo.atualizar({
                idVinculo:    req.params.id,
                cursoId:      req.body.curso || req.body.idCurso || undefined,
                status:       req.body.status,
                dataIngresso: req.body.data_entrada || req.body.dataIngresso || undefined,
                dataSaida:    req.body.data_saida   || req.body.dataSaida   || undefined
            });
        } else {
            await repos().vinculo.atualizar({ ...req.body, idVinculo: req.params.id });
        }
        res.json({ status: 'sucesso', mensagem: 'Vínculo atualizado!' });
    } catch (err) { erro(res, err); }
});

app.delete('/api/vinculo/:id', async (req, res) => {
    try {
        await repos().vinculo.deletar(req.params.id);
        res.json({ status: 'sucesso', mensagem: 'Vínculo removido!' });
    } catch (err) { erro(res, err); }
});

if (require.main === module) {
    app.listen(PORT, () => console.log(`Servidor unificado rodando em http://localhost:${PORT}`));
}

module.exports = app;
