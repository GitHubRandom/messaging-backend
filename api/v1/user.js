if (process?.env?.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express')
const router = express.Router()
const User = require('../../models/user')
const Message = require('../../models/message')
const Invite = require('../../models/invite')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { validateWithMinLength, validateWithMaxLength, validatePassword, validateEmail } = require('../../utils/validators')

const verifyUser = (req, res, next) => {
    const authHeader = req.headers.authorization || ""
    const authToken = authHeader.split(' ')[1]
    if (!authToken) {
        return res.status(403).json({
            message: "You are not authenticated, please login"
        })
    }
    try {
        req.user = jwt.verify(authToken, process.env.JWT_TOKEN)
        return next()
    } catch (error) {
        console.error(error)
        return res.status(401).json({
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
                field: 'username',
                message: "This username is already taken, please try another one"
            })
        }
    } else {
        return res.status(422).json({
            field: 'username',
            message: !username ? "You must specify a username" : "Username must be between 3 and 50 characters"
        })
    }

    // Validating first name
    if (!validateWithMaxLength(firstname, 50)) {
        return res.status(422).json({
            field: 'firstname',
            message: !firstname ? "You must specify a first name" : "First name must not exceed 50 characters"
        })
    }

    // Validating last name
    if (!validateWithMaxLength(lastname, 50)) {
        return res.status(422).json({
            field: 'lastname',
            message: !lastname ? "You must specify a last name" : "Last name must not exceed 50 characters"
        })
    }

    // Validating email
    if (validateEmail(email)) {
        email = email.toLowerCase()
        const emailTaken = await User.findOne({ email })
        if (emailTaken) {
            return res.status(409).json({
                field: 'email',
                message: "This email is already taken, please try another one"
            })
        }
    } else {
        return res.status(422).json({
            field: 'email',
            message: !email ? "Please set an email" : "This email is invalid"
        })
    }

    // Validating password
    if (validatePassword(password) && validatePassword(confirmpassword)) {
        // Check if password & confirmpassword match
        if (password !== confirmpassword) {
            return res.status(422).json({
                field: 'confirmpassword',
                message: "Password confirmation must be the same"
            })
        }
    } else {
        return res.status(422).json({
            field: 'password',
            message: !password ? "Please set a password" : "Password must be between 8 and 300 characters long."
        })
    }

    try {
        // Create user and set login token
        await User.create({
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

        res.status(201).json({
            message: "User has been successfully registered"
        })    
    } catch (error) {
        console.error(error)
        res.status(500).json({
            message: "Could not create user"
        })    
    }
})

router.post('/login', async (req, res) => {
    const { username, password } = req.body || {}

    if (!(username && password)) {
        // If one of the credentials is not specified
        return res.status(400).json({
            message: "Please specify credentials"
        })
    } else {
        // Find user
        const user = await User.findOne({ userName: username })
        if (!user) {
            return res.status(401).json({
                message: "Invalid credentials"
            })
        }
        // Check password
        if (user.checkPassword(password)) {
            const newToken = jwt.sign({
                id: user._id,
                username
            }, process.env.JWT_TOKEN, {
                expiresIn: '3h'
            })
            user.auth.loginToken = newToken
            //res.cookie('lt', newToken, { maxAge: 1000 * 3600 * 3, secure: true, httpOnly: true, sameSite: "none" })
            return res.status(200).json({
                message: "Login successful",
                jwtToken: newToken
            })
        } else {
            return res.status(401).json({
                message: "Invalid credentials"
            })
        }
    }
})

router.get('/me', verifyUser, async (req, res) => {
    const userID = req.user.id
    const user = await User.findById(userID, { userName: 1, firstName: 1, lastName: 1, publicInfo: 1, _id: 0 })
    if (!user) {
        return res.status(404).json({
            message: "User not found"
        })
    }
    return res.status(200).json({ user })
})

router.get('/logout', verifyUser, async (req, res) => {
    const userID = req.user.id
    const user = await User.findById(userID)
    user.auth.loginToken = ''
    await user.save()
    return res.status(200).json({
        message: "Successfully logged out"
    })
})

router.get('/messages', verifyUser, async (req, res) => {
    const sender = req.query.from // Username of messages sender
    console.log(`Requesting messages from ${sender}`)
    const user = req.user.username
    if (!sender) { // If no sender is specified
        return res.status(422).json({
            message: "You must specify the sender"
        })
    }
    // Retrieve messages sent by sender or sent by user
    const messages = await Message
                            .find(
                                { $or: [{ from: sender, to: user }, { to: sender, from: user }] },
                                { __v: 0 }
                            )
                            .sort({ dateSent: 1 })
    if (messages.length) {
        return res.status(200).json({
            messages
        })
    } else {
        return res.status(404).json({
            message: "No message found"
        })
    }
})

router.get('/contacts', verifyUser, async (req, res) => {
    const userID = req.user.id
    const user = await User.findById(userID).populate("listOfContacts.who", User.getPublicProjection())
    const contacts = user.listOfContacts
    return res.status(200).json({
        contacts
    })
})

router.get('/invites', verifyUser, async (req, res) => {
    try {
        const invites = await Invite.find(
            { to: req.user.id, accepted: false, refused: false },
            { seen: 0 }
        ).populate("to", User.getPublicProjection()).populate("from", User.getPublicProjection())
        if (invites.length) {
            Invite.updateMany({ to: req.user.id }, { seen: true })
            return res.status(200).json({
                invites
            })
        } else {
            return res.status(404).json({
                message: "No invite found"
            })
        }
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            message: "Could not fetch invites"
        })
    }
})

module.exports = router