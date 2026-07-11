/**
 * ================================================================
 *  MODEL: Vinculo  (tabela associativa Estudante ↔ Curso)
 * ================================================================
 *
 *  Mapeamento fiel do esquema SQL da universidade para MongoDB.
 *
 *  Tabela SQL de origem:
 *    VINCULO(idVinculo PK,
 *            matricula FK→ESTUDANTE NOT NULL,
 *            idCurso   FK→CURSO     NOT NULL,
 *            dataIngresso, status NOT NULL CHECK(...), dataSaida)
 *
 *  RESTRIÇÕES IMPLEMENTADAS:
 *
 *  ✅ Chave Primária  → _id automático do MongoDB
 *  ✅ NOT NULL        → estudante, curso e status obrigatórios
 *  ✅ Domínio status  → enum: Ativo | Trancado | Concluído
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

        // Domínio: os três estados possíveis de um vínculo acadêmico
        status: {
            type: String,
            required: [true, 'Status é obrigatório'],
            enum: {
                values: ['Ativo', 'Trancado', 'Concluído'],
                message: 'Status inválido. Use: Ativo, Trancado ou Concluído'
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
