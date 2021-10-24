const mongoose = require('mongoose')

const inviteSchema = new mongoose.Schema({
    from: { type: mongoose.SchemaTypes.ObjectId, ref: 'User' },
    to: { type: mongoose.SchemaTypes.ObjectId, ref: 'User' },
    accepted: { type: Boolean, default: false },
    refused: { type: Boolean, default: false },
    seen: { type: Boolean, default: false },
    dateSent: { type: Date, default: Date.now }
})

inviteSchema.index({ from: 1, to: 1 }, { unique: true })

module.exports = mongoose.model('Invite', inviteSchema)