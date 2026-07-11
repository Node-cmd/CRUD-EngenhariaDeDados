const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const disciplinaSchema = new Schema({
    cod_disc: { type: String, required: true, unique: true, maxlength: 8 },
    nome: { type: String, required: true, maxlength: 40 },
    // FK -> Auto-relacionamento (Disciplina que é pré-requisito)
    pre_req: { type: Schema.Types.ObjectId, ref: 'Disciplina', default: null },
    creditos: { 
        type: Number, 
        min: 1, 
        max: 11 
    },
    // FK -> Departamento Responsável
    depto_responsavel: { type: Schema.Types.ObjectId, ref: 'Departamento', default: null }
}, { collection: 'disciplinas', timestamps: true });

module.exports = mongoose.model('Disciplina', disciplinaSchema);