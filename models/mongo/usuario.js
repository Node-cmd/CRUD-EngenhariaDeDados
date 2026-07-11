/**
 * ================================================================
 *  MODEL: Usuario
 * ================================================================
 *
 *  Mapeamento fiel do esquema SQL da universidade para MongoDB.
 *
 *  Tabela SQL de origem:
 *    USUARIO(cpf PK, nome NOT NULL, dataNascimento, login UNIQUE NOT NULL,
 *            senha NOT NULL, email[], telefone[])
 *
 *  RESTRIÇÕES IMPLEMENTADAS:
 *
 *  ✅ Chave Primária  → _id automático + cpf com unique: true
 *  ✅ NOT NULL        → required: true nos campos obrigatórios
 *  ✅ Domínio CPF     → regex de 11 dígitos numéricos
 *  ✅ Domínio e-mail  → validação de formato em cada item do array
 * ================================================================
 */

const mongoose = require('mongoose');

const usuarioSchema = new mongoose.Schema(
    {
        cpf: {
            type: String,
            required: [true, 'CPF é obrigatório'],
            unique: true,
            match: [/^\d{11}$/, 'CPF deve conter exatamente 11 dígitos numéricos']
        },
        nome: {
            type: String,
            required: [true, 'Nome é obrigatório'],
            trim: true
        },
        dataNascimento: {
            type: Date,
            default: null
        },
        // Array de e-mails — equivalente à tabela associativa EMAIL no SQL
        email: {
            type: [String],
            validate: {
                validator: arr => arr.every(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)),
                message: 'Um ou mais e-mails possuem formato inválido'
            },
            default: []
        },
        // Array de telefones — equivalente à tabela associativa TELEFONE no SQL
        telefone: {
            type: [String],
            default: []
        },
        login: {
            type: String,
            required: [true, 'Login é obrigatório'],
            unique: true,
            trim: true
        },
        senha: {
            type: String,
            required: [true, 'Senha é obrigatória']
        }
    },
    {
        timestamps: true,
        collection: 'usuarios'
    }
);

module.exports = mongoose.model('Usuario', usuarioSchema);
