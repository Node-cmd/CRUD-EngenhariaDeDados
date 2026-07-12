/**
 * ================================================================
 *  MODEL: Curso
 * ================================================================
 *
 *  Mapeamento fiel do esquema SQL da universidade para MongoDB.
 *
 *  Tabela SQL de origem:
 *    CURSO(idCurso PK, nome NOT NULL, grau tipo_grau, turno tipo_turno NOT NULL,
 *          campus, nivel tipo_nivel)
 *
 *  Os valores de enum abaixo replicam EXATAMENTE os tipos criados no dump
 *  (Src/database/universidade-dump-engdados.sql):
 *    CREATE TYPE universidade.tipo_grau  AS ENUM ('Bacharelado', 'Licenciatura Plena');
 *    CREATE TYPE universidade.tipo_turno AS ENUM ('Matutino', 'Vespertino', 'Noturno', 'Turno Indefinido');
 *    CREATE TYPE universidade.tipo_nivel AS ENUM ('Graduação', 'Mestrado', 'Doutorado', 'Lato');
 *  (mesmos valores usados em Src/config/enums.js, que alimenta os dropdowns)
 *
 *  RESTRIÇÕES IMPLEMENTADAS:
 *
 *  ✅ Chave Primária  → _id automático do MongoDB
 *  ✅ NOT NULL        → required: true em nome e turno (grau é opcional no SQL)
 *  ✅ Domínio grau    → enum: Bacharelado | Licenciatura Plena
 *  ✅ Domínio turno   → enum: Matutino | Vespertino | Noturno | Turno Indefinido
 *  ✅ Domínio nivel   → enum: Graduação | Mestrado | Doutorado | Lato
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
            enum: {
                values: ['Bacharelado', 'Licenciatura Plena', null],
                message: 'Grau inválido. Use: Bacharelado ou Licenciatura Plena'
            },
            default: null
        },
        turno: {
            type: String,
            required: [true, 'Turno é obrigatório'],
            enum: {
                values: ['Matutino', 'Vespertino', 'Noturno', 'Turno Indefinido'],
                message: 'Turno inválido. Use: Matutino, Vespertino, Noturno ou Turno Indefinido'
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
                values: ['Graduação', 'Mestrado', 'Doutorado', 'Lato', null],
                message: 'Nível inválido. Use: Graduação, Mestrado, Doutorado ou Lato'
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
