const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userName: { type: String, unique: true },
    firstName: String,
    lastName: String,
    email: { type: String, unique: true },
    password: String,
    active: Boolean,
    onlineStatus: Boolean,
    listOfContacts: [mongoose.Schema.Types.ObjectId],
    emailVerificationToken: String,
    auth: {
        loginToken: String,
        lastLogin: Date,
        twoFA: Boolean,
        twoFAToken: String
    },
    publicInfo: {
        profilePicture: String,
        bio: String
    }
});

module.exports = mongoose.model('User', userSchema)