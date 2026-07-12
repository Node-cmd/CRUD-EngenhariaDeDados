/**
 * ================================================================
 *  MODEL: Vinculo  (tabela associativa Estudante ↔ Curso)
 * ================================================================
 *
 *  Mapeamento fiel do esquema SQL da universidade para MongoDB.
 *
 *  Tabela SQL de origem:
 *    VINCULO(idVinculo PK, mat_estudante FK→ESTUDANTE, curso FK→CURSO,
 *            data_entrada, status status_estudante, data_saida)
 *
 *  O enum abaixo replica EXATAMENTE o tipo criado no dump
 *  (Src/database/universidade-dump-engdados.sql):
 *    CREATE TYPE universidade.status_estudante AS ENUM ('Ativo', 'Cancelada', 'Formando', 'Graduado');
 *  (mesmos valores usados em Src/config/enums.js, que alimenta o dropdown)
 *
 *  RESTRIÇÕES IMPLEMENTADAS:
 *
 *  ✅ Chave Primária  → _id automático do MongoDB
 *  ✅ NOT NULL        → estudante e curso obrigatórios (status tem default)
 *  ✅ Domínio status  → enum: Ativo | Cancelada | Formando | Graduado
 *  ✅ Integridade Ref → estudante ref 'estudantes', curso ref 'cursos'
 *                       Verificação explícita feita no vinculoRepo
 * ================================================================
 */

const mongoose = require('mongoose');

const vinculoSchema = new mongoose.Schema(
    {
        // FK → ESTUDANTE (via ObjectId)
        estudante: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Estudante',
            required: [true, 'Referência ao estudante é obrigatória']
        },

        // FK → CURSO (via ObjectId)
        curso: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Curso',
            required: [true, 'Referência ao curso é obrigatória']
        },

        dataIngresso: {
            type: Date,
            default: Date.now
        },

        // Domínio: os quatro estados possíveis de um vínculo acadêmico
        status: {
            type: String,
            required: [true, 'Status é obrigatório'],
            enum: {
                values: ['Ativo', 'Cancelada', 'Formando', 'Graduado'],
                message: 'Status inválido. Use: Ativo, Cancelada, Formando ou Graduado'
            },
            default: 'Ativo'
        },

        dataSaida: {
            type: Date,
            default: null
        }
    },
    {
        timestamps: true,
        collection: 'vinculos'
    }
);

module.exports = mongoose.model('Vinculo', vinculoSchema);
