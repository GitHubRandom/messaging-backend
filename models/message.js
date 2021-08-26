const mongoose = require('mongoose');
const User = require('./user')

const messageSchema = new mongoose.Schema({
    type: { type: String, required: true, enum: [ 'text', 'image', 'video', 'document', 'file', 'link' ] },
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

messageSchema.post('save', async message => {
    await User.updateOne({ userName: message.to },
        { $set: { "listOfContacts.$[contact].lastMessaged": message.dateSent } },
        { arrayFilters: [ { "contact.userName": message.from } ] })
    await User.updateOne({ userName: message.from },
        { $set: { "listOfContacts.$[contact].lastMessaged": message.dateSent } },
        { arrayFilters: [ { "contact.userName": message.to } ] })    
})

module.exports = mongoose.model('Message', messageSchema)