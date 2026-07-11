const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const lecionaSchema = new Schema({
    turma: { type: Schema.Types.ObjectId, ref: 'Turma', required: true },
    professor: { type: Schema.Types.ObjectId, ref: 'Professor', required: true }
}, { collection: 'leciona', timestamps: true });

// Garantir a PK composta do SQL
lecionaSchema.index({ turma: 1, professor: 1 }, { unique: true });

module.exports = mongoose.model('Leciona', lecionaSchema);