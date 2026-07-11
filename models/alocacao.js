const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const alocacaoSchema = new Schema({
    turma: { type: Schema.Types.ObjectId, ref: 'Turma', required: true },
    horario: { type: Schema.Types.ObjectId, ref: 'Horario', required: true },
    sala: { type: Schema.Types.ObjectId, ref: 'Sala', required: true }
}, { collection: 'alocacoes', timestamps: true });

// Garantir as chaves únicas do SQL
alocacaoSchema.index({ turma: 1, horario: 1 }, { unique: true });
alocacaoSchema.index({ horario: 1, sala: 1 }, { unique: true });

module.exports = mongoose.model('Alocacao', alocacaoSchema);