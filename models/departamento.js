const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const departamentoSchema = new Schema({
    cod_depto: { type: String, required: true, unique: true, maxlength: 5 },
    nome: { type: String, required: true, maxlength: 50 },
    // FK -> Professor (Chefe do departamento)
    chefe: { type: Schema.Types.ObjectId, ref: 'Professor', default: null },
    orcamento: { type: Number, min: [0, 'Orçamento deve ser maior que zero'] },
    comissal: { type: Number, default: 0 }
}, { collection: 'departamentos', timestamps: true });

module.exports = mongoose.model('Departamento', departamentoSchema);