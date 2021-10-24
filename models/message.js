const mongoose = require('mongoose');
const User = require('./user')

class MessageInvalidError extends Error {
    constructor(message) {
        super(message)
        this.name = "MessageInvalidError"
    }
}

const messageSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: [ 'text', 'image', 'video', 'document', 'file', 'link' ],
    },
    content: mongoose.Schema.Types.Mixed,
    from: { type: String, required: true},
    to: { type: String, required: true },
    caption: String,
    replyTo: {
        type: String,
        content: String,
        caption: String,
        from: String
    },
    dateSent: { type: Date, default: Date.now },
    read: { type: Boolean, default: false }
});

messageSchema.pre('save', function(next) {
    if (this.type === 'text') {
        if (!this.content || this.content === "") {
            throw new MessageInvalidError("You cannot send empty message")
        }
        this.content = this.content.replace(/^\s+/, '')
        next()
    } else {
        next()
    }
})

messageSchema.post('save', async message => {
    await User.updateOne({ userName: message.to },
        { $set: { "listOfContacts.$[contact].lastMessaged": message.dateSent } },
        { arrayFilters: [ { "contact.userName": message.from } ] })
    await User.updateOne({ userName: message.from },
        { $set: { "listOfContacts.$[contact].lastMessaged": message.dateSent } },
        { arrayFilters: [ { "contact.userName": message.to } ] })    
})

module.exports = mongoose.model('Message', messageSchema)