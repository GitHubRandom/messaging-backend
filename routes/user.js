if (process?.env?.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express')
const router = express.Router()
const User = require('../models/user')
const Message = require('../models/message')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { validateWithMinLength, validateWithMaxLength, validatePassword, validateEmail } = require('../utils/validators')

const verifyUser = (req, res, next) => {
    const authHeader = req.headers["Authorization"]
    const authToken = authHeader?.split(' ') || req.cookies.lt
    if (!authToken) {
        return res.status(403).json({
            status: 403,
            message: "You are not authenticated, please login"
        })
    }
    try {
        const user = jwt.verify(authToken, process.env.JWT_TOKEN)
        console.log(user)
        req.user = user
        return next()
    } catch (error) {
        console.error(error)
        return res.status(401).json({
            status: 401,
            message: "Invalid token"
        })
    }
}

router.post('/register', async (req, res) => {
    var { username, firstname, lastname, email, password, confirmpassword } = req.body || {}

    // Validating user name
    if (validateWithMinLength(username, 3)) {
        const userNameTaken = await User.findOne({ userName: username })
        if (userNameTaken) {
            return res.status(409).json({
                status: 409,
                field: 'username',
                message: "This username is already taken Please try another one"
            })
        }
    } else {
        return res.status(422).json({
            status: 422,
            field: 'username',
            message: !username ? "You must specify a username" : "Username is too short. Must be at least 3 characters"
        })
    }

    // Validating first name
    if (!validateWithMaxLength(firstname, 50)) {
        return res.status(422).json({
            status: 422,
            field: 'firstname',
            message: !firstname ? "You must specify a first name" : "First name is too long. Must not exceed 50 characters"
        })
    }

    // Validating last name
    if (!validateWithMaxLength(lastname, 50)) {
        return res.status(422).json({
            status: 422,
            field: 'lastname',
            message: !lastname ? "You must specify a last name" : "Last name is too long. Must not exceed 50 characters"
        })
    }

    // Validating email
    if (validateEmail(email)) {
        email = email.toLowerCase()
        const emailTaken = await User.findOne({ email })
        if (emailTaken) {
            return res.status(409).json({
                status: 409,
                field: 'email',
                message: "This email is already taken, please try another one"
            })
        }
    } else {
        return res.status(422).json({
            status: 422,
            field: 'email',
            message: !email ? "Please set an email" : "This email is invalid"
        })
    }

    // Validating password
    if (validatePassword(password) && validatePassword(confirmpassword)) {
        // Check if password & confirmpassword match
        if (password != confirmpassword) {
            return res.status(422).json({
                status: 422,
                field: 'confirmpassword',
                message: "Password confirmation must be the same"
            })
        }
        // Encrypting password
        password = await bcrypt.hash(password, 10)
    } else {
        return res.status(422).json({
            status: 422,
            field: 'password',
            message: !password ? "Please set a password" : "Password is too short. Must be at least 8 characters long."
        })
    }

    try {
        // Create user and set login token
        const user = await User.create({
            userName: username,
            firstName: firstname,
            lastName: lastname,
            email,
            password,
            active: false,
            publicInfo: {
                profilePicture: "/static/images/default-picture.png"
            }
        })
    
        const token = jwt.sign({
            user_id: user._id,
            username
        }, process.env.JWT_TOKEN, {
            expiresIn: '3h'
        })
        user.listOfContacts = [ user._id ]
        user.auth = { loginToken: token, twoFA: false, twoFAToken: '' }
        await user.save()

        res.status(201).json({
            status: 201,
            message: "User has been successfully registered"
        })    
    } catch (error) {
        console.error(error)
        res.status(500).json({
            status: 500,
            message: "Could not create user"
        })    
    }
})

router.post('/login', async (req, res) => {
    const { username, password } = req.body || {}

    if (!(username && password)) {
        // If one of the credentials is not specified
        return res.status(400).json({
            status: 400,
            message: "Please specify credentials"
        })
    } else {
        // Find user
        const user = await User.findOne({ userName: username })
        if (!user) {
            return res.status(401).json({
                status: 401,
                message: "Invalid credentials"
            })
        }
        const newToken = jwt.sign({
            user_id: user._id,
            username
        }, process.env.JWT_TOKEN, {
            expiresIn: '3h'
        })
        // Check password
        if (await bcrypt.compare(password, user.password)) {
            user.auth.loginToken = newToken
            res.cookie('lt', newToken, { maxAge: 3600 * 3, secure: true, httpOnly: true, sameSite: "none" })
            return res.status(200).json({
                status: 200,
                message: "Login successful"
            })
        } else {
            return res.status(401).json({
                status: 401,
                message: "Invalid credentials"
            })
        }
    }
})

router.get('/logout', verifyUser, async (req, res) => {
    const userName = req.user.username
    const user = await User.find({ userName })
    user.token = ''
    await user.save()
    return res.status(200).json({
        status: 200,
        message: "Successfully logged out"
    })
})

router.get('/messages', verifyUser, async (req, res) => {
    const sender = req.query.from // Username of messages sender
    const user = res.user.username
    if (sender) { // If no sender is specified
        return res.status(422).json({
            status: 422,
            message: "You must specify the sender"
        })
    }
    // Retrive messages sent by sender or sent by user
    const messages = await Message
                            .find({ $or: [{ from: sender, to: user }, { to: sender, from: user }] })
                            .sort({ dateSent: 1 })
    if (messages) {
        return res.status(200).json({
            status: 200,
            messages
        })
    } else {
        return res.status(404).json({
            status: 404,
            message: "No message found"
        })
    }
})

router.get('/contacts', verifyUser, async (req, res) => {
    const userName = req.user.username
    const user = await User.findOne({ userName })
    const contacts = await User.find({ _id: { $in: user.listOfContacts } }, { userName: 1, firstName: 1, lastName: 1, publicInfo: 1, _id: 0 })
    return res.status(200).json({
        status: 200,
        contacts
    })
})

router.post('/contacts', verifyUser, async (req, res) => {
    const userName = req.user.username
    const { contact } = req.body || {}
    if (!contact) {
        return res.status(422).json({
            status: 422,
            message: "You must specify contact's username to add"
        })
    }
    try {
        const user = await User.findOne({ userName })
        const contactToAdd = await User.findOne({ userName: contact })
        if (!contactToAdd) {
            return res.status(404).json({
                status: 404,
                message: "Could not find contact"
            })
        }
        if (user.listOfContacts.includes(contactToAdd._id)) {
            return res.status(409).json({
                status: 409,
                message: "Contact already exists"
            })
        }
        user.listOfContacts.push(contactToAdd._id)
        await user.save()
        return res.status(200).json({
            status: 200,
            message: "Contact added successfully"
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            status: 500,
            message: "Could not add to contacts"
        })
    }
})

router.delete('/contacts', verifyUser, async (req, res) => {
    const userName = req.user.username
    const { contactsUserNames } = res.body || {}
    if (!contactsUserNames) {
        return res.status(422).json({
            status: 422,
            message: "You must specify contacts' usernames to delete"
        })
    }
    try {
        const user = await User.findOne({ userName })
        user.listOfContacts = user.listOfContacts.filter(contact => !contactsUserNames.includes(contact))
        await user.save()
        return res.status(200).json({
            status: 200,
            message: "Removed from contacts successfully"
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            status: 500,
            message: "Could not remove from contacts"
        })
    }
})

module.exports = router