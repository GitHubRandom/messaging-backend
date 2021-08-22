const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userName: { type: String, unique: true },
    firstName: String,
    lastName: String,
    email: { type: String, unique: true },
    password: String,
    verifiedEmail: Boolean,
    onlineStatus: Boolean,
    listOfContacts: [String],
    auth: {
        loginToken: String,
        lastLogin: Date,
        twoFA: Boolean,
        twoFAToken: String
    },
    settings: {
        profilePicture: String,
        bio: String
    }
});

module.exports = mongoose.model('User', userSchema)