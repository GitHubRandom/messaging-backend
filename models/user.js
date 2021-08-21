const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userName: { type: String, unique: true },
    firstName: String,
    lastName: String,
    email: { type: String, lowercase: true, unique: true },
    password: String,
    verifiedEmail: Boolean,
    listOfContacts: [
        { type: String, unique: true }
    ],
    auth: {
        token: String,
        lastLogin: Date,
        twoFA: Boolean,
        twoFAToken: String
    }
});

module.exports = mongoose.model('User', userSchema)