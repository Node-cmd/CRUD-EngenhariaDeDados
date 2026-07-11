/**
 * ================================================================
 *  MODEL: Curso
 * ================================================================
 *
 *  Mapeamento fiel do esquema SQL da universidade para MongoDB.
 *
 *  Tabela SQL de origem:
 *    CURSO(idCurso PK, nome NOT NULL, grau NOT NULL CHECK(...),
 *          turno NOT NULL CHECK(...), campus, nivel CHECK(...))
 *
 *  RESTRIÇÕES IMPLEMENTADAS:
 *
 *  ✅ Chave Primária  → _id automático do MongoDB
 *  ✅ NOT NULL        → required: true em nome, grau e turno
 *  ✅ Domínio grau    → enum: Bacharelado | Licenciatura | Tecnólogo
 *  ✅ Domínio turno   → enum: Matutino | Vespertino | Noturno | Integral
 *  ✅ Domínio nivel   → enum: Graduação | Pós-Graduação
 * ================================================================
 */

const mongoose = require('mongoose');

const cursoSchema = new mongoose.Schema(
    {
        nome: {
            type: String,
            required: [true, 'Nome do curso é obrigatório'],
            trim: true
        },
        grau: {
            type: String,
            required: [true, 'Grau é obrigatório'],
            enum: {
                values: ['Bacharelado', 'Licenciatura', 'Tecnólogo'],
                message: 'Grau inválido. Use: Bacharelado, Licenciatura ou Tecnólogo'
            }
        },
        turno: {
            type: String,
            required: [true, 'Turno é obrigatório'],
            enum: {
                values: ['Matutino', 'Vespertino', 'Noturno', 'Integral'],
                message: 'Turno inválido. Use: Matutino, Vespertino, Noturno ou Integral'
            }
        },
        campus: {
            type: String,
            default: null,
            trim: true
        },
        nivel: {
            type: String,
            enum: {
                values: ['Graduação', 'Pós-Graduação', null],
                message: 'Nível inválido. Use: Graduação ou Pós-Graduação'
            },
            default: null
        }
    },
    {
        timestamps: true,
        collection: 'cursos'
    }
);

module.exports = mongoose.model('Curso', cursoSchema);
