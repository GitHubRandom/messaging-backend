const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    userName: {
        type: String,
        unique: true,
        require: true,
        minLength: [ 2, "Username must be at least 2 characters long"],
        maxLength: [ 15, "Username must be less than 15 characters long" ]
    },
    firstName: {
        type: String,
        required: true,
        maxLength: [ 50, "First name is too long" ]
    },
    lastName: {
        type: String,
        maxLength: [ 50, "Last name is too short" ]
    },
    email: {
        type: String,
        unique: true,
        required: true,
        lowercase: true,
        match: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*$/
    },
    password: String,
    active: { type: Boolean, default: false },
    onlineStatus: { type: Boolean, default: false },
    listOfContacts: [{
        who: {
            type: mongoose.SchemaTypes.ObjectId,
            ref: 'User'
        },
        lastMessage: {
            type: mongoose.SchemaTypes.ObjectId,
            ref: 'Message'
        },
        _id: false
    }],
    emailVerificationToken: String,
    auth: {
        loginToken: { type: String, default: "" },
        lastConnected: Date,
        twoFA: {type: Boolean, default: false},
        twoFAToken: { type: String, default: "" }
    },
    publicInfo: {
        profilePicture: { type: String, default: "/static/public/images/default-picture.png" },
        bio: { type: String, maxLength: 100, default: "" }
    }
});

userSchema.pre('save', function(next) {
    const user = this
    if (user.isNew) {
        bcrypt.hash(user.password, 10, function(error, hash) {
            if (error) {
                return next(error)
            }
            user.password = hash
            next()
        })    
    } else {
        next()
    }
})

userSchema.statics.getPublicProjection = () => ({
    userName: 1,
    firstName: 1,
    lastName: 1,
    publicInfo: 1,
    _id: 0
})

userSchema.methods.checkPassword = function(passwordToCheck) {
    return bcrypt.compareSync(passwordToCheck, this.password)
}

module.exports = mongoose.model('User', userSchema)