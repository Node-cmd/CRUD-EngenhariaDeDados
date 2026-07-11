const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const turmaSchema = new Schema({
    id_turma: { type: Number, required: true, unique: true },
    // FK -> Disciplina
    disciplina: { type: Schema.Types.ObjectId, ref: 'Disciplina', required: true },
    numero: { type: Number },
    ano: { type: Number },
    semestre: { type: Number }
}, { collection: 'turmas', timestamps: true });

module.exports = mongoose.model('Turma', turmaSchema);