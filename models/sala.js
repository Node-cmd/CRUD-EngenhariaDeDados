const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const salaSchema = new Schema({
    descricao: { type: String }
}, { collection: 'salas', timestamps: true });

module.exports = mongoose.model('Sala', salaSchema);