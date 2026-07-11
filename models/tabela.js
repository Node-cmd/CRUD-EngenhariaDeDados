const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const planoSchema = new Schema({
    projeto: { type: Schema.Types.ObjectId, ref: 'Projeto', required: true },
    professor: { type: Schema.Types.ObjectId, ref: 'Professor', default: null },
    estudante: { type: Schema.Types.ObjectId, ref: 'Estudante', default: null },
    ano: { type: Number, required: true }
}, { collection: 'planos', timestamps: true });

module.exports = mongoose.model('Plano', planoSchema);