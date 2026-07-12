const Estudante   = require('../../models/mongo/estudante');
const Usuario     = require('../../models/mongo/usuario');
const Curso       = require('../../models/mongo/curso');
const Vinculo     = require('../../models/mongo/vinculo');
const usuarioRepo = require('./usuarioRepo');
const vinculoRepo = require('./vinculoRepo');

const SELECT_USUARIO = 'nome cpf dataNascimento email telefone login';

/**
 * Cria o estudante e, junto, o vínculo inicial com o curso informado —
 * espelha o comportamento do repositories/rds/estudanteRepo.js, que também
 * exige um curso para criar o vínculo no momento do cadastro.
 */
async function inserir(dados) {
    const cursoId = dados.curso || dados.idCurso || dados.idcurso || null;
    if (!cursoId) {
        throw new Error('Curso obrigatório para criar o vínculo do estudante.');
    }
    const curso = await Curso.findById(cursoId);
    if (!curso) throw new Error(`Curso com id "${cursoId}" não encontrado.`);

    // Reaproveita um usuário já existente com esse CPF (opção "usar usuário
    // existente" do formulário), ou cria um novo caso ainda não exista.
    let usuario = await Usuario.findOne({ cpf: dados.cpf });
    if (!usuario) {
        usuario = await usuarioRepo.inserir({
            cpf:            dados.cpf,
            nome:           dados.nome,
            dataNascimento: dados.dataNascimento || null,
            email:          dados.email    || [],
            telefone:       dados.telefone || [],
            login:          dados.login    || String(dados.matricula || '').toLowerCase(),
            senha:          dados.senha    || '123456'
        });
    }

    const estudante = new Estudante({
        matricula:   dados.matricula,
        usuario:     usuario._id,
        mc:          dados.mc ?? null,
        anoIngresso: dados.anoIngresso || dados.ano_ingresso
    });
    await estudante.save();

    await vinculoRepo.inserir({
        estudanteId:  String(estudante._id),
        cursoId:      String(curso._id),
        dataIngresso: dados.data_entrada || dados.dataIngresso || null,
        status:       dados.status || 'Ativo',
        dataSaida:    dados.data_saida || dados.dataSaida || null
    });

    return estudante;
}

/**
 * Lista todos os estudantes, já com o vínculo mais recente de cada um
 * (curso/status) embutido em `vinculoAtivo` — usado por normalizarListaMongo
 * no server.js para preencher curso/status/nome_curso na tabela e no
 * formulário de edição (antes esses campos vinham sempre nulos no Mongo).
 */
async function listarTodos() {
    const estudantes = await Estudante
        .find()
        .populate('usuario', SELECT_USUARIO)
        .sort({ matricula: 1 });

    const ids = estudantes.map(e => e._id);
    const vinculos = await Vinculo
        .find({ estudante: { $in: ids } })
        .populate('curso', 'nome')
        .sort({ dataIngresso: -1 });

    // Mantém apenas o vínculo mais recente de cada estudante (primeiro da
    // lista ordenada desc por dataIngresso).
    const vinculoPorEstudante = new Map();
    for (const v of vinculos) {
        const chave = String(v.estudante);
        if (!vinculoPorEstudante.has(chave)) vinculoPorEstudante.set(chave, v);
    }

    return estudantes.map(e => {
        const doc = e.toObject();
        const vinculo = vinculoPorEstudante.get(String(e._id));
        doc.vinculoAtivo = vinculo ? {
            idVinculo:  String(vinculo._id),
            curso:      vinculo.curso ? String(vinculo.curso._id) : null,
            nomeCurso:  vinculo.curso ? vinculo.curso.nome : null,
            status:     vinculo.status
        } : null;
        return doc;
    });
}

async function buscarPorMatricula(matricula) {
    const estudante = await Estudante
        .findOne({ matricula })
        .populate('usuario', SELECT_USUARIO);
    if (!estudante) throw new Error(`Estudante com matrícula "${matricula}" não encontrado.`);
    return estudante;
}

/**
 * Atualiza dados do estudante/usuário e, se curso/status/datas forem
 * enviados, atualiza (ou cria, se ainda não existir) o vínculo mais recente
 * — espelha o UPSERT feito em repositories/rds/estudanteRepo.js.
 */
async function atualizar(dados) {
    const estudante = await Estudante.findOne({ matricula: dados.matricula });
    if (!estudante) throw new Error(`Estudante com matrícula "${dados.matricula}" não encontrado.`);

    await Estudante.findByIdAndUpdate(
        estudante._id,
        { $set: {
            ...(dados.mc          !== undefined && { mc:          dados.mc }),
            ...(dados.anoIngresso !== undefined && { anoIngresso: dados.anoIngresso }),
            ...(dados.ano_ingresso !== undefined && { anoIngresso: dados.ano_ingresso })
        }},
        { new: true, runValidators: true }
    );

    // Nota: cpf NÃO é reatribuível aqui — ele é a ligação com o usuário e o
    // front-end trata esse campo como somente leitura na edição.
    const camposUsuario = {};
    if (dados.nome)           camposUsuario.nome           = dados.nome;
    if (dados.dataNascimento) camposUsuario.dataNascimento = dados.dataNascimento;
    if (dados.email)          camposUsuario.email          = dados.email;
    if (dados.telefone)       camposUsuario.telefone       = dados.telefone;
    if (dados.login)          camposUsuario.login          = dados.login;
    if (dados.senha)          camposUsuario.senha          = dados.senha; // vazio = mantém a senha atual

    if (Object.keys(camposUsuario).length > 0) {
        await Usuario.findByIdAndUpdate(estudante.usuario, { $set: camposUsuario }, { runValidators: true });
    }

    const cursoId     = dados.curso || dados.idCurso || dados.idcurso || null;
    const status      = dados.status || undefined;
    const dataIngresso= dados.data_entrada || dados.dataIngresso || undefined;
    const dataSaida   = dados.data_saida   || dados.dataSaida;

    if (cursoId || status || dataIngresso || dataSaida !== undefined) {
        const vinculoExistente = await Vinculo.findOne({ estudante: estudante._id }).sort({ dataIngresso: -1 });
        if (vinculoExistente) {
            await vinculoRepo.atualizar({
                idVinculo:    vinculoExistente._id,
                cursoId:      cursoId || undefined,
                status,
                dataIngresso,
                dataSaida
            });
        } else if (cursoId) {
            await vinculoRepo.inserir({
                estudanteId:  String(estudante._id),
                cursoId:      String(cursoId),
                dataIngresso: dataIngresso || null,
                status:       status || 'Ativo',
                dataSaida:    dataSaida || null
            });
        }
    }

    return await buscarPorMatricula(dados.matricula);
}

/**
 * Remove o estudante e, junto (cascata manual, igual ao RDS), os vínculos
 * associados e o usuário vinculado — em vez de bloquear a remoção quando
 * existem vínculos.
 */
async function deletar(matricula) {
    const estudante = await Estudante.findOne({ matricula });
    if (!estudante) throw new Error(`Estudante com matrícula "${matricula}" não encontrado.`);

    await Vinculo.deleteMany({ estudante: estudante._id });
    await Estudante.findByIdAndDelete(estudante._id);
    await Usuario.findByIdAndDelete(estudante.usuario);

    return { mensagem: `Estudante "${matricula}", seus vínculos e seu usuário foram removidos com sucesso.` };
}

module.exports = { inserir, listarTodos, buscarPorMatricula, atualizar, deletar };
