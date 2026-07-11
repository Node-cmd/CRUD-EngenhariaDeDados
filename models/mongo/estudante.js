/**
 * ================================================================
 *  MODEL: Estudante
 * ================================================================
 *
 *  Mapeamento fiel do esquema SQL da universidade para MongoDB.
 *
 *  Tabela SQL de origem:
 *    ESTUDANTE(matricula PK, cpf FK→USUARIO NOT NULL,
 *              anoIngresso NOT NULL, mc CHECK(0<=mc<=10))
 *
 *  No modelo relacional, Estudante é uma especialização de Usuario
 *  (herança). No MongoDB, representamos isso com uma referência
 *  (ObjectId ref) para a coleção usuarios — equivalente à FK de cpf.
 *
 *  RESTRIÇÕES IMPLEMENTADAS:
 *
 *  ✅ Chave Primária  → matricula com unique: true
 *  ✅ NOT NULL        → matricula, usuario (ref), anoIngresso obrigatórios
 *  ✅ Domínio matricula → apenas letras maiúsculas e números
 *  ✅ Domínio mc      → número entre 0 e 10 (Média de Conclusão)
 *  ✅ Domínio ano     → ano de 4 dígitos entre 1900 e 2100
 *  ✅ Integridade Ref → campo usuario aponta para coleção 'usuarios'
 * ================================================================
 */

const mongoose = require('mongoose');

const estudanteSchema = new mongoose.Schema(
    {
        matricula: {
            type: String,
            required: [true, 'Matrícula é obrigatória'],
            unique: true,
            match: [/^[A-Z0-9]+$/, 'Matrícula deve conter apenas letras maiúsculas e números']
        },

        // INTEGRIDADE REFERENCIAL: equivalente à FK cpf → USUARIO no SQL
        // Armazena o _id do documento Usuario correspondente a este estudante
        usuario: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Usuario',
            required: [true, 'Referência ao usuário é obrigatória']
        },

        // MC = Média de Conclusão (coeficiente acadêmico)
        // Presente no esquema SQL: mc NUMERIC CHECK(mc >= 0 AND mc <= 10)
        mc: {
            type: Number,
            min: [0, 'MC não pode ser negativa'],
            max: [10, 'MC não pode ultrapassar 10'],
            default: null
        },

        // Ano de ingresso na universidade
        anoIngresso: {
            type: Number,
            required: [true, 'Ano de ingresso é obrigatório'],
            min: [1900, 'Ano de ingresso inválido'],
            max: [2100, 'Ano de ingresso inválido']
        }
    },
    {
        timestamps: true,
        collection: 'estudantes'
    }
);

module.exports = mongoose.model('Estudante', estudanteSchema);
