// ─── Estado Global ────────────────────────────────────────────────────────────
let cacheDados = [];
let entidadeAtiva = 'usuario';
let idSelecionado = null;
let modoFormulario = 'ADD';
let bancoAtivo = null; // 'postgres' | 'mongo'
let configAtual = {}; // Configurações de host
let enumsDisponíveis = {}; // Enums carregados do servidor

// Caches das listas usadas para popular os dropdowns de chave estrangeira
// (curso, estudante, usuário) e seus painéis de "observação" (preview).
let cacheCursosFK = [];
let cacheEstudantesFK = [];
let cacheUsuariosFK = [];

// ─── Chave primária por entidade ──────────────────────────────────────────────
// IMPORTANTE: cada entidade tem sua própria lista de aliases de PK, checada
// SÓ dentro do escopo daquela entidade. Antes havia uma única lista
// compartilhada entre todas as entidades (ex.: ['cpf', 'idCurso', ...,
// 'mat_estudante', ..., 'idVinculo', ...]) — como uma linha de estudante
// também carrega o campo 'cpf' (do usuário) e uma linha de vínculo também
// carrega 'mat_estudante' (do estudante), o sistema pegava sempre o
// primeiro alias que batesse na lista global, e não o campo certo da
// própria entidade. Isso fazia editar/deletar estudante usar o CPF em vez
// da matrícula, e editar/deletar vínculo usar a matrícula em vez do ID real
// do vínculo — em ambos os bancos.
const PK_ALIASES = {
    usuario:   ['cpf'],
    curso:     ['idCurso', 'idcurso'],
    estudante: ['mat_estudante', 'matricula'],
    vinculo:   ['idVinculo', 'idvinculo']
};

function getIdDoItem(item) {
    const valor = getValorCampo(item, PK_ALIASES[entidadeAtiva] || [], '');
    return valor !== '' && valor !== null && valor !== undefined ? String(valor) : '';
}

// ─── Utilitários ──────────────────────────────────────────────────────────────
function normalizarLista(valor) {
    if (!valor) return [];
    if (Array.isArray(valor)) return valor;
    return String(valor).split(',').map(i => i.trim()).filter(Boolean);
}

function getIdSelecionado() {
    return idSelecionado !== null && idSelecionado !== undefined ? String(idSelecionado) : null;
}

function getValorCampo(item, aliases, fallback = '') {
    if (!item) return fallback;
    for (const alias of aliases) {
        const valor = item[alias];
        if (valor !== null && valor !== undefined && valor !== '') return valor;
    }
    return fallback;
}

function getValorCampoInput(id) {
    const el = document.getElementById(id);
    return el ? el.value : '';
}

// ─── Gerenciamento de Configurações (localStorage) ───────────────────────────

// Valores padrão de configuração
const CONFIG_DEFAULTS = {
    mongoHost: '192.168.1.1:27017',
    postgresHost: 'postgres-ufs-ed.crhmjqwbzcke.us-east-1.rds.amazonaws.com'
};

const STORAGE_KEY = 'crud-config';

/**
 * Carrega as configurações do localStorage
 */
function carregarConfigurações() {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        
        if (stored) {
            configAtual = JSON.parse(stored);
        } else {
            configAtual = { ...CONFIG_DEFAULTS };
        }
        
        // Preenche os campos com valores salvos
        document.getElementById('pg-host').value = configAtual.postgresHost || CONFIG_DEFAULTS.postgresHost;
        document.getElementById('mg-host').value = configAtual.mongoHost || CONFIG_DEFAULTS.mongoHost;
        
        console.log('✓ Configurações carregadas do localStorage');
    } catch (err) {
        console.warn('Erro ao carregar configurações:', err);
        configAtual = { ...CONFIG_DEFAULTS };
        document.getElementById('pg-host').value = CONFIG_DEFAULTS.postgresHost;
        document.getElementById('mg-host').value = CONFIG_DEFAULTS.mongoHost;
    }
}

/**
 * Salva as configurações no localStorage
 */
function salvarConfigurações() {
    const postgresHost = document.getElementById('pg-host').value.trim();
    const mongoHost = document.getElementById('mg-host').value.trim();

    if (!postgresHost || !mongoHost) {
        alert('⚠️ Preencha ambos os endereços de host para salvar as configurações.');
        return false;
    }

    try {
        const config = {
            postgresHost,
            mongoHost
        };
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        configAtual = config;
        
        alert('✓ Configurações salvas localmente!');
        console.log('✓ Configurações salvas no localStorage');
        return true;
    } catch (err) {
        alert('❌ Erro ao salvar: ' + err.message);
        return false;
    }
}

/**
 * Toggle para mostrar/ocultar campo de editar host PostgreSQL
 */
function toggleConfigPG() {
    const chk = document.getElementById('chk-editar-config-pg');
    const input = document.getElementById('pg-host');
    input.style.display = chk.checked ? 'block' : 'none';
    
    if (chk.checked) {
        input.focus();
    }
}

/**
 * Toggle para mostrar/ocultar campo de editar host MongoDB
 */
function toggleConfigMG() {
    const chk = document.getElementById('chk-editar-config-mg');
    const input = document.getElementById('mg-host');
    input.style.display = chk.checked ? 'block' : 'none';

    if (chk.checked) {
        input.focus();
    }
}

// ─── Gerenciamento de Enums ──────────────────────────────────────────────────

/**
 * Carrega os enums disponíveis do servidor
 */
async function carregarEnums() {
    try {
        const res = await fetch('/api/enums');
        if (res.ok) {
            const data = await res.json();
            enumsDisponíveis = data.enums || {};
            console.log('✓ Enums carregados:', enumsDisponíveis);
        }
    } catch (err) {
        console.warn('Erro ao carregar enums:', err);
    }
}


// ─── Seleção de Banco ─────────────────────────────────────────────────────────
function escolherBanco(tipo) {
    document.getElementById('tela-selecao').style.display = 'none';
    if (tipo === 'postgres') {
        document.getElementById('tela-login-postgres').style.display = 'flex';
        carregarConfigurações(); // Carrega as configurações salvas
    } else {
        document.getElementById('tela-login-mongo').style.display = 'flex';
        carregarConfigurações(); // Carrega as configurações salvas
    }
}

function voltarSelecao() {
    document.getElementById('tela-login-postgres').style.display = 'none';
    document.getElementById('tela-login-mongo').style.display = 'none';
    document.getElementById('chk-editar-config-pg').checked = false;
    document.getElementById('chk-editar-config-mg').checked = false;
    toggleConfigPG();
    toggleConfigMG();
    document.getElementById('tela-selecao').style.display = 'flex';
}

/**
 * Retorna à tela de seleção de banco após estar no dashboard
 * Limpa o estado da aplicação
 */
function trocarBancoDados() {
    // Limpa estado global
    cacheDados = [];
    entidadeAtiva = 'usuario';
    idSelecionado = null;
    modoFormulario = 'ADD';
    bancoAtivo = null;
    
    // Oculta dashboard e modal
    document.getElementById('tela-dashboard').style.display = 'none';
    document.getElementById('modal-formulario').style.display = 'none';
    
    // Limpa campos de login
    document.getElementById('pg-user').value = '';
    document.getElementById('pg-pass').value = '';
    document.getElementById('mg-user').value = '';
    document.getElementById('mg-pass').value = '';
    document.getElementById('mg-host').value = '';
    document.getElementById('pg-host').value = '';
    
    // Limpa checkboxes de configuração
    document.getElementById('chk-editar-config-pg').checked = false;
    document.getElementById('chk-editar-config-mg').checked = false;
    toggleConfigPG();
    toggleConfigMG();
    
    // Volta à seleção
    document.getElementById('tela-selecao').style.display = 'flex';
}

// ─── Conexão PostgreSQL ───────────────────────────────────────────────────────
document.getElementById('btn-conectar-postgres').addEventListener('click', async () => {
    const usuario = document.getElementById('pg-user').value.trim();
    const senha   = document.getElementById('pg-pass').value;
    const host    = document.getElementById('pg-host').value.trim();
    const editando = document.getElementById('chk-editar-config-pg').checked;

    if (!usuario || !senha) return alert('Preencha usuário e senha.');
    
    // Se está editando, salva a nova configuração no localStorage
    if (editando && host) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                postgresHost: host,
                mongoHost: configAtual.mongoHost || CONFIG_DEFAULTS.mongoHost
            }));
            console.log('✓ Configuração PostgreSQL salva');
        } catch (err) {
            return alert('Erro ao salvar configuração: ' + err.message);
        }
    }

    const res = await fetch('/api/conectar/postgres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha, host: host || configAtual.postgresHost })
    });

    if (res.ok) {
        bancoAtivo = 'postgres';
        document.getElementById('tela-login-postgres').style.display = 'none';
        document.getElementById('tela-dashboard').style.display = 'grid';
        document.getElementById('status-banco').innerHTML =
            `<span class="badge-postgres">🐘 PostgreSQL RDS</span> &nbsp; Usuário: ${usuario}`;
        carregarDados();
    } else {
        const err = await res.json();
        alert(err.mensagem || 'Falha ao conectar.');
    }
});

// ─── Conexão MongoDB ──────────────────────────────────────────────────────────
document.getElementById('btn-conectar-mongo').addEventListener('click', async () => {
    const usuario = document.getElementById('mg-user').value.trim();
    const senha   = document.getElementById('mg-pass').value;
    const host    = document.getElementById('mg-host').value.trim();
    const editando = document.getElementById('chk-editar-config-mg').checked;

    if (!usuario || !senha || !host) return alert('Preencha usuário, senha e endereço IPv4.');

    // Se está editando, salva a nova configuração no localStorage
    if (editando) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                postgresHost: configAtual.postgresHost || CONFIG_DEFAULTS.postgresHost,
                mongoHost: host
            }));
            console.log('✓ Configuração MongoDB salva');
        } catch (err) {
            return alert('Erro ao salvar configuração: ' + err.message);
        }
    }

    const res = await fetch('/api/conectar/mongo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha, host })
    });

    if (res.ok) {
        bancoAtivo = 'mongo';
        document.getElementById('tela-login-mongo').style.display = 'none';
        document.getElementById('tela-dashboard').style.display = 'grid';
        document.getElementById('status-banco').innerHTML =
            `<span class="badge-mongo">🍃 MongoDB</span> &nbsp; ${host}`;
        carregarDados();
    } else {
        const err = await res.json();
        alert(err.mensagem || 'Falha ao conectar.');
    }
});

// ─── Endpoints e Títulos ──────────────────────────────────────────────────────
function getEndpointEntidade() {
    return { usuario: '/api/usuario', curso: '/api/curso', estudante: '/api/estudante', vinculo: '/api/vinculo' }[entidadeAtiva] || '/api/usuario';
}

function getTituloEntidade() {
    return { usuario: 'Usuário', curso: 'Curso', estudante: 'Estudante', vinculo: 'Vínculo' }[entidadeAtiva] || 'Usuário';
}

// ─── Campos de Formulário ─────────────────────────────────────────────────────

/**
 * Mapeia IDs de formulário para nomes de campos de enum da entidade
 * (usado só por usuario/curso — estudante/vinculo resolvem o enum de status
 * diretamente via enumsDisponíveis.vinculo.status, pois esse enum pertence
 * à entidade Vínculo mesmo quando usado dentro do formulário de Estudante).
 */
function getMapaFormulario() {
    const mapa = {
        usuario: { 'form-cpf': 'cpf', 'form-nome': 'nome', 'form-data': 'data_nascimento',
                   'form-email': 'email', 'form-telefone': 'telefone', 'form-login': 'login', 'form-senha': 'senha' },
        curso:   { 'form-nome': 'nome', 'form-grau': 'grau', 'form-turno': 'turno',
                   'form-campus': 'campus', 'form-nivel': 'nivel' }
    };
    return mapa[entidadeAtiva] || mapa.usuario;
}

function getCampoEntidade(formId) {
    const mapa = getMapaFormulario();
    return mapa[formId] || formId;
}

function getOpcoesEnum(formId) {
    const nomeCampo = getCampoEntidade(formId);
    return (enumsDisponíveis[entidadeAtiva]?.[nomeCampo]) || [];
}

// Campos "simples" (sem FK) — apenas usuario e curso usam essa definição
// genérica. estudante e vinculo têm layout próprio (ver montarFormulário*)
// por causa dos seletores de chave estrangeira e do toggle de usuário.
function getCamposFormulario() {
    const campos = {
        usuario: [
            { id: 'form-cpf',      label: 'CPF',               type: 'text',     required: true, pk: true },
            { id: 'form-nome',     label: 'Nome',              type: 'text',     required: true },
            { id: 'form-data',     label: 'Data de Nascimento',type: 'date' },
            { id: 'form-email',    label: 'E-mails (vírgula)', type: 'text' },
            { id: 'form-telefone', label: 'Telefones (vírgula)',type: 'text' },
            { id: 'form-login',    label: 'Login',             type: 'text',     required: true },
            { id: 'form-senha',    label: 'Senha',             type: 'password', required: modoFormulario === 'ADD' }
        ],
        curso: [
            { id: 'form-nome',   label: 'Nome',  type: 'text', required: true },
            { id: 'form-grau',   label: 'Grau',  type: 'select', required: true },
            { id: 'form-turno',  label: 'Turno', type: 'select', required: true },
            { id: 'form-campus', label: 'Campus',type: 'text' },
            { id: 'form-nivel',  label: 'Nível', type: 'select' }
        ]
    };
    return campos[entidadeAtiva] || campos.usuario;
}

// ─── Helpers de dropdown de chave estrangeira (FK) com painel de observação ──

async function carregarListaFK(endpoint) {
    try {
        const res = await fetch(endpoint);
        if (!res.ok) return [];
        const dados = await res.json();
        return Array.isArray(dados) ? dados : [];
    } catch (err) {
        console.warn(`Erro ao carregar ${endpoint}:`, err);
        return [];
    }
}

/** Cria um <select> populado a partir de uma lista de itens (curso/estudante/usuário). */
function montarSelectFK({ id, itens, idAliases, labelFn, placeholder, required }) {
    const select = document.createElement('select');
    select.id = id;
    select.name = id;
    select.className = 'form-field';
    select.required = Boolean(required);

    const optVazia = document.createElement('option');
    optVazia.value = '';
    optVazia.textContent = placeholder;
    optVazia.disabled = true;
    optVazia.selected = true;
    select.appendChild(optVazia);

    itens.forEach(item => {
        const idItem = getValorCampo(item, idAliases, '');
        const opt = document.createElement('option');
        opt.value = String(idItem);
        opt.textContent = labelFn(item);
        select.appendChild(opt);
    });

    return select;
}

/** Cria o painel de observação (read-only) que mostra os dados do item referenciado. */
function montarPreviewFK(id) {
    const div = document.createElement('div');
    div.id = id;
    div.className = 'fk-preview';
    div.textContent = 'Selecione uma opção acima para ver os detalhes.';
    return div;
}

function atualizarPreviewFK(previewId, itens, idAliases, valorSelecionado, previewFn) {
    const div = document.getElementById(previewId);
    if (!div) return;
    const item = itens.find(i => String(getValorCampo(i, idAliases, '')) === String(valorSelecionado));
    div.textContent = item ? previewFn(item) : 'Nenhum item selecionado.';
}

const FK_CURSO = {
    idAliases: ['idCurso', 'idcurso'],
    labelFn: c => `${c.nome} — ${c.turno || 's/ turno'}${c.grau ? ' · ' + c.grau : ''}`,
    previewFn: c => `Turno: ${c.turno || '—'}  ·  Grau: ${c.grau || '—'}  ·  Campus: ${c.campus || '—'}  ·  Nível: ${c.nivel || '—'}`
};
const FK_ESTUDANTE = {
    idAliases: ['mat_estudante', 'matricula'],
    labelFn: e => `${e.mat_estudante || e.matricula} — ${e.nome || 's/ nome'}`,
    previewFn: e => `CPF: ${e.cpf || '—'}  ·  Ano de ingresso: ${e.ano_ingresso ?? e.anoIngresso ?? '—'}  ·  MC: ${e.mc ?? '—'}`
};
const FK_USUARIO = {
    idAliases: ['cpf'],
    labelFn: u => `${u.cpf} — ${u.nome}`,
    previewFn: u => `Login: ${u.login || '—'}  ·  E-mail: ${normalizarLista(u.email).join(', ') || '—'}`
};

// ─── Construção dos formulários de Estudante e Vínculo (com FKs) ─────────────

async function montarFormularioEstudante(container) {
    const editando = modoFormulario === 'EDIT';

    [cacheCursosFK, cacheUsuariosFK] = await Promise.all([
        carregarListaFK('/api/curso'),
        editando ? Promise.resolve([]) : carregarListaFK('/api/usuario')
    ]);

    // Matrícula — chave primária do estudante: editável só ao criar
    const lblMat = document.createElement('label');
    lblMat.textContent = 'Matrícula';
    const inputMat = document.createElement('input');
    inputMat.id = 'form-matricula'; inputMat.type = 'text'; inputMat.className = 'form-field';
    inputMat.placeholder = 'Matrícula'; inputMat.required = true;
    if (editando) { inputMat.readOnly = true; inputMat.classList.add('campo-readonly'); }
    container.append(lblMat, inputMat);

    if (!editando) {
        // Toggle "usar usuário existente" — só faz sentido ao cadastrar
        const toggleDiv = document.createElement('div');
        toggleDiv.className = 'config-toggle';
        toggleDiv.innerHTML = `<label><input type="checkbox" id="form-usar-usuario-existente"> Usar um usuário já cadastrado</label>`;
        container.appendChild(toggleDiv);

        const selectUsuario = montarSelectFK({
            id: 'form-usuario-existente', itens: cacheUsuariosFK, idAliases: FK_USUARIO.idAliases,
            labelFn: FK_USUARIO.labelFn, placeholder: 'Selecione o usuário existente', required: false
        });
        selectUsuario.style.display = 'none';
        const previewUsuario = montarPreviewFK('form-usuario-existente-preview');
        previewUsuario.style.display = 'none';
        container.append(selectUsuario, previewUsuario);

        selectUsuario.addEventListener('change', () => {
            atualizarPreviewFK('form-usuario-existente-preview', cacheUsuariosFK, FK_USUARIO.idAliases, selectUsuario.value, FK_USUARIO.previewFn);
            // Ao escolher um usuário existente, o CPF passa a ser o dele (somente leitura)
            const cpfInput = document.getElementById('form-cpf');
            if (cpfInput) { cpfInput.value = selectUsuario.value; cpfInput.readOnly = true; cpfInput.classList.add('campo-readonly'); }
        });

        toggleDiv.querySelector('input[type="checkbox"]').addEventListener('change', e => {
            const usando = e.target.checked;
            selectUsuario.style.display = usando ? 'block' : 'none';
            previewUsuario.style.display = usando ? 'block' : 'none';
            ['form-cpf', 'form-nome', 'form-login', 'form-senha'].forEach(id => {
                const el = document.getElementById(id);
                if (!el) return;
                if (usando) {
                    el.disabled = (id !== 'form-cpf'); // cpf fica readonly (preenchido pelo select), os demais desabilitados
                    el.required = false;
                    if (id !== 'form-cpf') el.value = '';
                    if (id === 'form-cpf') { el.readOnly = true; el.classList.add('campo-readonly'); el.value = ''; }
                } else {
                    el.disabled = false;
                    el.readOnly = false;
                    el.classList.remove('campo-readonly');
                    el.required = (id === 'form-cpf' || id === 'form-nome' || id === 'form-login' || id === 'form-senha');
                }
            });
        });
    }

    // CPF / Nome / Login / Senha do usuário associado
    const camposUsuario = [
        { id: 'form-cpf',   label: 'CPF',   type: 'text',     required: true },
        { id: 'form-nome',  label: 'Nome',  type: 'text',     required: true },
        { id: 'form-login', label: 'Login', type: 'text',     required: true },
        { id: 'form-senha', label: editando ? 'Nova Senha (deixe em branco para manter)' : 'Senha', type: 'password', required: !editando }
    ];
    camposUsuario.forEach(campo => {
        const input = document.createElement('input');
        input.id = campo.id; input.type = campo.type; input.placeholder = campo.label;
        input.required = Boolean(campo.required); input.className = 'form-field';
        if (editando && campo.id === 'form-cpf') { input.readOnly = true; input.classList.add('campo-readonly'); }
        container.appendChild(input);
    });

    // MC / Ano de Ingresso
    ['form-mc', 'form-ano'].forEach(id => {
        const input = document.createElement('input');
        input.id = id; input.className = 'form-field';
        if (id === 'form-mc') { input.type = 'text'; input.placeholder = 'MC (0 a 10)'; }
        else { input.type = 'number'; input.placeholder = 'Ano de Ingresso'; }
        container.appendChild(input);
    });

    // Curso — dropdown + preview (em vez de ID digitado)
    const lblCurso = document.createElement('label');
    lblCurso.textContent = 'Curso';
    const selectCurso = montarSelectFK({
        id: 'form-curso', itens: cacheCursosFK, idAliases: FK_CURSO.idAliases,
        labelFn: FK_CURSO.labelFn, placeholder: 'Selecione o curso', required: true
    });
    const previewCurso = montarPreviewFK('form-curso-preview');
    selectCurso.addEventListener('change', () =>
        atualizarPreviewFK('form-curso-preview', cacheCursosFK, FK_CURSO.idAliases, selectCurso.value, FK_CURSO.previewFn));
    container.append(lblCurso, selectCurso, previewCurso);

    // Status do vínculo — select alimentado pelo mesmo enum de Vínculo
    const lblStatus = document.createElement('label');
    lblStatus.textContent = 'Status do Vínculo';
    const selectStatus = document.createElement('select');
    selectStatus.id = 'form-status'; selectStatus.className = 'form-field'; selectStatus.required = true;
    const optVazia = document.createElement('option');
    optVazia.value = ''; optVazia.textContent = 'Selecione o status'; optVazia.disabled = true; optVazia.selected = true;
    selectStatus.appendChild(optVazia);
    (enumsDisponíveis.vinculo?.status || []).forEach(op => {
        const opt = document.createElement('option'); opt.value = op.value; opt.textContent = op.label;
        selectStatus.appendChild(opt);
    });
    container.append(lblStatus, selectStatus);
}

async function montarFormularioVinculo(container) {
    [cacheEstudantesFK, cacheCursosFK] = await Promise.all([
        carregarListaFK('/api/estudante'),
        carregarListaFK('/api/curso')
    ]);

    // Estudante — dropdown + preview (em vez de matrícula digitada)
    const lblEst = document.createElement('label');
    lblEst.textContent = 'Estudante';
    const selectEst = montarSelectFK({
        id: 'form-matricula', itens: cacheEstudantesFK, idAliases: FK_ESTUDANTE.idAliases,
        labelFn: FK_ESTUDANTE.labelFn, placeholder: 'Selecione o estudante', required: true
    });
    const previewEst = montarPreviewFK('form-matricula-preview');
    selectEst.addEventListener('change', () =>
        atualizarPreviewFK('form-matricula-preview', cacheEstudantesFK, FK_ESTUDANTE.idAliases, selectEst.value, FK_ESTUDANTE.previewFn));
    container.append(lblEst, selectEst, previewEst);

    // Curso — dropdown + preview (em vez de ID digitado)
    const lblCurso = document.createElement('label');
    lblCurso.textContent = 'Curso';
    const selectCurso = montarSelectFK({
        id: 'form-curso', itens: cacheCursosFK, idAliases: FK_CURSO.idAliases,
        labelFn: FK_CURSO.labelFn, placeholder: 'Selecione o curso', required: true
    });
    const previewCurso = montarPreviewFK('form-curso-preview');
    selectCurso.addEventListener('change', () =>
        atualizarPreviewFK('form-curso-preview', cacheCursosFK, FK_CURSO.idAliases, selectCurso.value, FK_CURSO.previewFn));
    container.append(lblCurso, selectCurso, previewCurso);

    // Status
    const lblStatus = document.createElement('label');
    lblStatus.textContent = 'Status';
    const selectStatus = document.createElement('select');
    selectStatus.id = 'form-status'; selectStatus.className = 'form-field'; selectStatus.required = true;
    const optVazia = document.createElement('option');
    optVazia.value = ''; optVazia.textContent = 'Selecione o status'; optVazia.disabled = true; optVazia.selected = true;
    selectStatus.appendChild(optVazia);
    (enumsDisponíveis.vinculo?.status || []).forEach(op => {
        const opt = document.createElement('option'); opt.value = op.value; opt.textContent = op.label;
        selectStatus.appendChild(opt);
    });
    container.append(lblStatus, selectStatus);

    // Datas
    [['form-data-entrada', 'Data de Entrada'], ['form-data-saida', 'Data de Saída']].forEach(([id, label]) => {
        const lbl = document.createElement('label'); lbl.textContent = label;
        const input = document.createElement('input');
        input.id = id; input.type = 'date'; input.className = 'form-field';
        container.append(lbl, input);
    });
}

async function renderizarFormulario() {
    const container = document.getElementById('campos-formulario');
    if (!container) return;
    container.innerHTML = '';

    if (entidadeAtiva === 'estudante') return montarFormularioEstudante(container);
    if (entidadeAtiva === 'vinculo')   return montarFormularioVinculo(container);

    // usuario / curso — layout genérico simples (sem FK)
    getCamposFormulario().forEach(campo => {
        if (campo.type === 'select') {
            const select = document.createElement('select');
            select.id = campo.id;
            select.name = campo.id;
            select.required = Boolean(campo.required);
            select.className = 'form-field';

            const optionVazia = document.createElement('option');
            optionVazia.value = '';
            optionVazia.textContent = `Selecione ${campo.label.toLowerCase()}`;
            optionVazia.disabled = true;
            optionVazia.selected = true;
            select.appendChild(optionVazia);

            getOpcoesEnum(campo.id).forEach(opcao => {
                const option = document.createElement('option');
                option.value = opcao.value;
                option.textContent = opcao.label;
                select.appendChild(option);
            });

            container.appendChild(select);
        } else {
            const input = document.createElement('input');
            input.id = campo.id;
            input.name = campo.id;
            input.type = campo.type;
            input.placeholder = campo.label;
            input.required = Boolean(campo.required);
            input.className = 'form-field';
            if (campo.pk && modoFormulario === 'EDIT') {
                input.readOnly = true;
                input.classList.add('campo-readonly');
            }
            container.appendChild(input);
        }
    });
}

function preencherFormulario(item) {
    const aliasesPorCampo = {
        'form-cpf':         ['cpf'],
        'form-nome':        ['nome', 'usuarioNome'],
        'form-data':        ['data_nascimento', 'dataNascimento'],
        'form-email':       ['email'],
        'form-telefone':    ['telefone'],
        'form-login':       ['login'],
        'form-senha':       [], // senha nunca é pré-preenchida (deixe em branco = mantém a atual)
        'form-grau':        ['grau'],
        'form-turno':       ['turno'],
        'form-campus':      ['campus'],
        'form-nivel':       ['nivel'],
        'form-matricula':   ['mat_estudante', 'matricula'],
        'form-mc':          ['mc', 'MC'],
        'form-ano':         ['ano_ingresso', 'anoIngresso'],
        'form-curso':       ['curso', 'idCurso', 'idcurso'],
        'form-status':      ['status'],
        'form-data-entrada':['data_entrada', 'dataIngresso'],
        'form-data-saida':  ['data_saida', 'dataSaida']
    };

    Object.keys(aliasesPorCampo).forEach(id => {
        const input = document.getElementById(id);
        if (!input) return;
        const valor = getValorCampo(item, aliasesPorCampo[id], '');
        if (input.tagName === 'SELECT') {
            input.value = valor || '';
        } else if (input.type === 'date' && valor) {
            input.value = String(valor).substring(0, 10);
        } else {
            input.value = Array.isArray(valor) ? valor.join(', ') : (valor || '');
        }
    });

    // Atualiza os painéis de observação das FKs já preenchidas
    if (entidadeAtiva === 'estudante' || entidadeAtiva === 'vinculo') {
        atualizarPreviewFK('form-curso-preview', cacheCursosFK, FK_CURSO.idAliases, getValorCampoInput('form-curso'), FK_CURSO.previewFn);
    }
    if (entidadeAtiva === 'vinculo') {
        atualizarPreviewFK('form-matricula-preview', cacheEstudantesFK, FK_ESTUDANTE.idAliases, getValorCampoInput('form-matricula'), FK_ESTUDANTE.previewFn);
    }
}

function getPayloadFormulario() {
    const usandoUsuarioExistente = entidadeAtiva === 'estudante' &&
        document.getElementById('form-usar-usuario-existente')?.checked;

    const payloads = {
        usuario: {
            cpf:             getValorCampoInput('form-cpf').trim(),
            nome:            getValorCampoInput('form-nome').trim(),
            data_nascimento: getValorCampoInput('form-data') || null,
            dataNascimento:  getValorCampoInput('form-data') || null,
            email:           normalizarLista(getValorCampoInput('form-email')),
            telefone:        normalizarLista(getValorCampoInput('form-telefone')),
            login:           getValorCampoInput('form-login').trim(),
            // Em branco = mantém a senha atual (a API ignora a chave quando ausente)
            ...(getValorCampoInput('form-senha') ? { senha: getValorCampoInput('form-senha') } : {})
        },
        curso: {
            nome:   getValorCampoInput('form-nome').trim(),
            grau:   getValorCampoInput('form-grau').trim() || null,
            turno:  getValorCampoInput('form-turno').trim() || null,
            campus: getValorCampoInput('form-campus').trim() || null,
            // Campo opcional: select vazio manda "" — precisa virar null, pois
            // o Mongo só aceita os valores do enum ou null, nunca string vazia.
            nivel:  getValorCampoInput('form-nivel').trim() || null
        },
        estudante: {
            matricula:     getValorCampoInput('form-matricula').trim(),
            mat_estudante: getValorCampoInput('form-matricula').trim(),
            cpf:           getValorCampoInput('form-cpf').trim(),
            mc:            getValorCampoInput('form-mc') || null,
            ano_ingresso:  getValorCampoInput('form-ano') || null,
            anoIngresso:   getValorCampoInput('form-ano') || null,
            nome:          getValorCampoInput('form-nome').trim(),
            login:         getValorCampoInput('form-login').trim(),
            // Em branco = mantém a senha atual (nunca mais reseta para um valor padrão sozinho).
            // Só cai no padrão '123456' ao CRIAR um estudante novo sem usuário existente.
            ...(getValorCampoInput('form-senha')
                ? { senha: getValorCampoInput('form-senha') }
                : (modoFormulario === 'ADD' && !usandoUsuarioExistente ? { senha: '123456' } : {})),
            curso:    getValorCampoInput('form-curso') || null,
            idCurso:  getValorCampoInput('form-curso') || null,
            status:   getValorCampoInput('form-status').trim() || null
        },
        vinculo: {
            mat_estudante: getValorCampoInput('form-matricula').trim(),
            matricula:     getValorCampoInput('form-matricula').trim(),
            curso:         getValorCampoInput('form-curso') || null,
            idCurso:       getValorCampoInput('form-curso') || null,
            data_entrada:  getValorCampoInput('form-data-entrada') || null,
            status:        getValorCampoInput('form-status').trim() || null,
            data_saida:    getValorCampoInput('form-data-saida') || null
        }
    };
    return payloads[entidadeAtiva] || payloads.usuario;
}

// ─── Renderização da Tabela ───────────────────────────────────────────────────
const corpoTabela    = document.getElementById('corpo-tabela');
const cabecalhoTabela= document.getElementById('cabecalho-tabela');

async function carregarDados() {
    idSelecionado = null;
    
    // Carrega enums para preencher os selects corretamente
    await carregarEnums();
    
    try {
        const res = await fetch(getEndpointEntidade());
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.mensagem || `Erro ao carregar ${getTituloEntidade().toLowerCase()}.`);
        }
        const dados = await res.json();
        cacheDados = Array.isArray(dados) ? dados : [];
    } catch (err) {
        cacheDados = [];
        corpoTabela.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#c0392b;">${err.message}</td></tr>`;
        return;
    }

    const headers = {
        usuario:   ['CPF', 'NOME', 'NASCIMENTO', 'EMAIL', 'TELEFONE', 'LOGIN'],
        curso:     ['ID', 'NOME', 'GRAU', 'TURNO', 'CAMPUS', 'NÍVEL'],
        estudante: ['MATRÍCULA', 'CPF', 'NOME', 'CURSO', 'STATUS', 'MC', 'ANO DE INGRESSO'],
        vinculo:   ['ID', 'ESTUDANTE', 'CURSO', 'DATA DE ENTRADA', 'STATUS', 'DATA DE SAÍDA']
    };

    cabecalhoTabela.innerHTML = headers[entidadeAtiva].map(h => `<th>${h}</th>`).join('');
    renderizarLinhas(cacheDados);
}

function renderizarLinhas(lista) {
    corpoTabela.innerHTML = '';
    lista.forEach(item => {
        const tr = document.createElement('tr');
        const itemId = getIdDoItem(item);
        let conteudo = '';

        if (entidadeAtiva === 'usuario') {
            const dataFormt = item.data_nascimento ? new Date(item.data_nascimento).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '';
            conteudo = `
                <td>${item.cpf || ''}</td>
                <td>${item.nome || ''}</td>
                <td>${dataFormt}</td>
                <td>${normalizarLista(item.email).join(', ')}</td>
                <td>${normalizarLista(item.telefone).join(', ')}</td>
                <td>${item.login || ''}</td>`;
        } else if (entidadeAtiva === 'curso') {
            conteudo = `
                <td>${getValorCampo(item, ['idCurso', 'idcurso'], '')}</td>
                <td>${item.nome || ''}</td>
                <td>${item.grau || ''}</td>
                <td>${item.turno || ''}</td>
                <td>${item.campus || ''}</td>
                <td>${item.nivel || ''}</td>`;
        } else if (entidadeAtiva === 'estudante') {
            conteudo = `
                <td>${getValorCampo(item, ['mat_estudante', 'matricula'], '')}</td>
                <td>${item.cpf || ''}</td>
                <td>${item.nome || ''}</td>
                <td>${item.nome_curso || item.curso || ''}</td>
                <td>${item.status || ''}</td>
                <td>${item.mc ?? ''}</td>
                <td>${item.ano_ingresso ?? item.anoIngresso ?? ''}</td>`;
        } else if (entidadeAtiva === 'vinculo') {
            conteudo = `
                <td>${getValorCampo(item, ['idVinculo', 'idvinculo'], '')}</td>
                <td>${item.nome_estudante || item.mat_estudante || ''}</td>
                <td>${item.nome_curso || item.curso || ''}</td>
                <td>${item.data_entrada ? new Date(item.data_entrada).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : ''}</td>
                <td>${item.status || ''}</td>
                <td>${item.data_saida ? new Date(item.data_saida).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : ''}</td>`;
        }

        tr.innerHTML = conteudo;
        tr.addEventListener('click', () => {
            document.querySelectorAll('#corpo-tabela tr').forEach(r => r.classList.remove('selecionado'));
            tr.classList.add('selecionado');
            idSelecionado = String(itemId || '');
        });
        corpoTabela.appendChild(tr);
    });
}

// ─── Filtro em tempo real ─────────────────────────────────────────────────────
document.getElementById('txt-busca').addEventListener('input', e => {
    const termo = e.target.value.toLowerCase();
    renderizarLinhas(cacheDados.filter(item => JSON.stringify(item).toLowerCase().includes(termo)));
});

// ─── Seleção de Entidade ──────────────────────────────────────────────────────
function selecionarEntidade(novaEntidade) {
    entidadeAtiva = novaEntidade;
    document.querySelectorAll('.sidebar button').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.entidade === novaEntidade));
    document.getElementById('modal-titulo').innerText = `Cadastrar Novo ${getTituloEntidade()}`;
    carregarDados();
}

// ─── Modal: Abrir / Fechar ────────────────────────────────────────────────────
const form  = document.getElementById('form-usuario');
const modal = document.getElementById('modal-formulario');

document.getElementById('open-add-modal').addEventListener('click', async () => {
    modoFormulario = 'ADD';
    document.getElementById('modal-titulo').innerText = `Cadastrar Novo ${getTituloEntidade()}`;
    form.reset();
    await renderizarFormulario();
    modal.style.display = 'flex';
});

document.getElementById('open-edit-modal').addEventListener('click', async () => {
    if (!getIdSelecionado()) return alert(`Selecione um ${getTituloEntidade().toLowerCase()} na tabela primeiro!`);
    modoFormulario = 'EDIT';
    document.getElementById('modal-titulo').innerText = `Editar ${getTituloEntidade()} Existente`;
    const item = cacheDados.find(d => getIdDoItem(d) === getIdSelecionado());
    if (!item) return alert(`${getTituloEntidade()} não encontrado no cache local.`);
    await renderizarFormulario();
    preencherFormulario(item);
    modal.style.display = 'flex';
});

document.getElementById('close-modal').addEventListener('click', () => modal.style.display = 'none');

// Botão de trocar banco de dados
document.getElementById('btn-trocar-banco').addEventListener('click', () => {
    if (confirm('Deseja retornar à seleção de banco de dados? Os dados não salvos serão perdidos.')) {
        trocarBancoDados();
    }
});

// ─── Formulário: Salvar / Atualizar ──────────────────────────────────────────
form.addEventListener('submit', async e => {
    e.preventDefault();
    const payload = getPayloadFormulario();
    const url     = modoFormulario === 'ADD' ? getEndpointEntidade() : `${getEndpointEntidade()}/${idSelecionado}`;
    const metodo  = modoFormulario === 'ADD' ? 'POST' : 'PUT';

    const res = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        modal.style.display = 'none';
        carregarDados();
    } else {
        const err = await res.json();
        alert('Erro: ' + (err.mensagem || 'Requisição falhou.'));
    }
});

// ─── Excluir ──────────────────────────────────────────────────────────────────
document.getElementById('execute-delete').addEventListener('click', async () => {
    if (!idSelecionado) return alert(`Selecione um ${getTituloEntidade().toLowerCase()} para remover!`);
    if (!confirm(`Tem certeza que deseja deletar o ${getTituloEntidade().toLowerCase()} selecionado?`)) return;

    const res = await fetch(`${getEndpointEntidade()}/${idSelecionado}`, { method: 'DELETE' });
    if (res.ok) {
        carregarDados();
    } else {
        const err = await res.json();
        alert('Erro ao deletar: ' + (err.mensagem || 'Falha na requisição.'));
    }
});
