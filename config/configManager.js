const fs = require('fs');
const path = require('path');

const CONFIG_FILE = path.join(__dirname, '../config.txt');

// Configurações padrão
const DEFAULT_CONFIG = {
    mongoHost: '192.168.1.1:27017',      // IPv4 padrão do MongoDB
    postgresHost: 'postgres-ufs-ed.crhmjqwbzcke.us-east-1.rds.amazonaws.com'
};

/**
 * Lê as configurações do arquivo config.txt
 * @returns {Object} Objeto com mongoHost e postgresHost
 */
function lerConfig() {
    try {
        if (!fs.existsSync(CONFIG_FILE)) {
            // Se arquivo não existe, cria com valores padrão
            salvarConfig(DEFAULT_CONFIG);
            return DEFAULT_CONFIG;
        }

        const conteudo = fs.readFileSync(CONFIG_FILE, 'utf8').trim();
        const linhas = conteudo.split('\n');
        const config = { ...DEFAULT_CONFIG };

        linhas.forEach(linha => {
            linha = linha.trim();
            if (linha.startsWith('MONGO_HOST=')) {
                config.mongoHost = linha.substring('MONGO_HOST='.length).trim();
            } else if (linha.startsWith('POSTGRES_HOST=')) {
                config.postgresHost = linha.substring('POSTGRES_HOST='.length).trim();
            }
        });

        return config;
    } catch (err) {
        console.error('Erro ao ler config.txt:', err.message);
        return DEFAULT_CONFIG;
    }
}

/**
 * Salva as configurações no arquivo config.txt
 * @param {Object} config - Objeto com mongoHost e postgresHost
 */
function salvarConfig(config) {
    try {
        const conteudo = `MONGO_HOST=${config.mongoHost || DEFAULT_CONFIG.mongoHost}
POSTGRES_HOST=${config.postgresHost || DEFAULT_CONFIG.postgresHost}`;

        fs.writeFileSync(CONFIG_FILE, conteudo, 'utf8');
        console.log('✓ Configurações salvas em config.txt');
        return true;
    } catch (err) {
        console.error('Erro ao salvar config.txt:', err.message);
        return false;
    }
}

/**
 * Obtém apenas o host do MongoDB
 */
function getMongoHost() {
    return lerConfig().mongoHost;
}

/**
 * Obtém apenas o host do PostgreSQL
 */
function getPostgresHost() {
    return lerConfig().postgresHost;
}

/**
 * Atualiza apenas o host do MongoDB
 */
function setMongoHost(host) {
    const config = lerConfig();
    config.mongoHost = host;
    return salvarConfig(config);
}

/**
 * Atualiza apenas o host do PostgreSQL
 */
function setPostgresHost(host) {
    const config = lerConfig();
    config.postgresHost = host;
    return salvarConfig(config);
}

module.exports = {
    lerConfig,
    salvarConfig,
    getMongoHost,
    getPostgresHost,
    setMongoHost,
    setPostgresHost
};
