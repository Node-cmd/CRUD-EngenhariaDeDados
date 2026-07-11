const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const projetoSchema = new Schema({
    id_projeto: { type: Number, required: true, unique: true },
    descricao: { type: String }
}, { collection: 'projetos', timestamps: true });

module.exports = mongoose.model('Projeto', projetoSchema);