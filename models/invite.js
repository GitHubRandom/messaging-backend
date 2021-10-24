const mongoose = require('mongoose')

const inviteSchema = new mongoose.Schema({
    from: String,
    to: String,
    accepted: { type: Boolean, default: false },
    refused: { type: Boolean, default: false },
    dateSent: { type: Date, default: Date.now }
})

module.exports = mongoose.model('Invite', inviteSchema)