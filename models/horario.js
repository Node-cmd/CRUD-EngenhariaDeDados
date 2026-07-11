const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const horarioSchema = new Schema({
    dia: { type: String, required: true, maxlength: 15 },
    slot: { type: Number, required: true }
}, { collection: 'horarios', timestamps: true });

module.exports = mongoose.model('Horario', horarioSchema);