const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userName: { type: String, unique: true },
    firstName: { type: String, maxLength: [ 50, "First name is too long" ] },
    lastName: { type: String, maxLength: [ 50, "Last name is too short" ] },
    email: { type: String, unique: true, lowercase: true },
    password: String,
    active: { type: Boolean, default: true },
    onlineStatus: { type: Boolean, default: false },
    listOfContacts: [{
        userName: String,
        lastMessaged: Date
    }],
    emailVerificationToken: String,
    auth: {
        loginToken: { type: String, default: "" },
        lastConnected: Date,
        twoFA: Boolean,
        twoFAToken: String
    },
    publicInfo: {
        profilePicture: String,
        bio: { type: String, maxLength: 100 }
    }
});

module.exports = mongoose.model('User', userSchema)