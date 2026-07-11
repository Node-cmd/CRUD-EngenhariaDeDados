const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const cursaSchema = new Schema({
    estudante: { type: Schema.Types.ObjectId, ref: 'Estudante', required: true },
    turma: { type: Schema.Types.ObjectId, ref: 'Turma', required: true },
    nota: { type: Number, default: null }
}, { collection: 'cursa', timestamps: true });

// Garantir a PK composta do SQL
cursaSchema.index({ estudante: 1, turma: 1 }, { unique: true });

module.exports = mongoose.model('Cursa', cursaSchema);