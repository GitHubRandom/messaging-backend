const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    type: String, // text - attachment
    content: mongoose.Schema.Types.Mixed,
    from: String,
    to: String,
    dateSent: { type: Date, default: Date.now },
    read: Boolean
});

module.exports = mongoose.model('Message', messageSchema)