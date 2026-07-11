/**
 * ================================================================
 * ENUMS CONFIGURATION
 * ================================================================
 * 
 * Mapeia todos os campos com restrição de enum do sistema.
 * Sincroniza com schemas PostgreSQL e MongoDB.
 * 
 * Estrutura: { entidade: { campo: [...valores] } }
 * ================================================================
 */

const ENUMS = {
    curso: {
        grau: ['Bacharelado', 'Licenciatura Plena'],
        turno: ['Matutino', 'Vespertino', 'Noturno', 'Turno Indefinido'],
        nivel: ['Graduação', 'Mestrado', 'Doutorado', 'Lato']
    },
    
    vinculo: {
        status: ['Ativo', 'Cancelada', 'Formando', 'Graduado']
    },
    
    usuario: {
        // Usuários não possuem campos com enum atualmente
    },
    
    estudante: {
        // Estudantes não possuem campos com enum atualmente
    }
};

/**
 * Obtém as opções de enum para um campo específico
 * @param {string} entidade - Nome da entidade (usuario, curso, estudante, vinculo)
 * @param {string} campo - Nome do campo
 * @returns {Array} Array com os valores válidos ou [] se não houver enum
 */
function getEnumValores(entidade, campo) {
    if (!ENUMS[entidade]) return [];
    return ENUMS[entidade][campo] || [];
}

/**
 * Verifica se um campo possui restrição de enum
 * @param {string} entidade - Nome da entidade
 * @param {string} campo - Nome do campo
 * @returns {boolean}
 */
function temEnum(entidade, campo) {
    return getEnumValores(entidade, campo).length > 0;
}

/**
 * Retorna todos os enums para uma entidade
 * @param {string} entidade - Nome da entidade
 * @returns {Object} Objeto { campo: [...valores] }
 */
function getEnumsDaEntidade(entidade) {
    return ENUMS[entidade] || {};
}

/**
 * Retorna estrutura completa formatada para o frontend
 * Útil para popular dropdowns dinamicamente
 */
function getEnumsFormatados() {
    const resultado = {};
    
    for (const [entidade, campos] of Object.entries(ENUMS)) {
        resultado[entidade] = {};
        for (const [campo, valores] of Object.entries(campos)) {
            if (valores.length > 0) {
                resultado[entidade][campo] = valores.map(v => ({
                    label: v,
                    value: v
                }));
            }
        }
    }
    
    return resultado;
}

module.exports = {
    ENUMS,
    getEnumValores,
    temEnum,
    getEnumsDaEntidade,
    getEnumsFormatados
};
