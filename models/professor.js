const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const professorSchema = new Schema({
    mat_professor: { type: String, required: true, unique: true },
    // FK -> Usuario (Dados pessoais)
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    // FK -> Departamento (Alocação)
    departamento: { type: Schema.Types.ObjectId, ref: 'Departamento', default: null },
    formacao: { 
        type: String, 
        enum: ['Graduação', 'Especialização', 'Mestrado', 'Doutorado'] 
    },
    data_admissao: { type: Date },
    tipo_jornada_trabalho: { 
        type: String, 
        enum: ['20h', '40h', 'DE'] 
    },
    salario: { type: Number }
}, { collection: 'professores', timestamps: true });

module.exports = mongoose.model('Professor', professorSchema);