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
    const authToken = authHeader.split(' ')
    if (!authToken) {
        return res.status(403).json({
            status: 403,
            message: "You are not authenticated. Please login."
        })
    }
    try {
        const user = jwt.verify(token, process.env.JWT_TOKEN)
        req.user = user
        return next()
    } catch (error) {
        console.error(error)
        return res.status(401).json({
            status: 401,
            message: "Invalid token."
        })
    }
}

router.post('/register', async (req, res) => {
    var { username, firstname, lastname, email, password } = req.body

    // Validating user name
    if (validateWithMinLength(username, 3)) {
        const userNameTaken = await User.findOne({ userName: username })
        if (userNameTaken) {
            return res.status(409).json({
                status: 409,
                field: 'username',
                message: "This username is already taken. Please try another one."
            })
        }
    } else {
        return res.status(422).json({
            status: 422,
            field: 'username',
            message: !username ? "You must specify a username." : "Username is too short. Must be at least 3 characters."
        })
    }

    // Validating first name
    if (!validateWithMaxLength(firstname, 50)) {
        return res.status(422).json({
            status: 422,
            field: 'firstname',
            message: !firstname ? "You must specify a first name." : "First name is too long. Must not exceed 50 characters."
        })
    }

    // Validating last name
    if (!validateWithMaxLength(lastname, 50)) {
        return res.status(422).json({
            status: 422,
            field: 'lastname',
            message: !lastname ? "You must specify a last name." : "Last name is too long. Must not exceed 50 characters."
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
                message: "This email is already taken. Please try another one."
            })
        }
    } else {
        return res.status(422).json({
            status: 422,
            field: 'email',
            message: !email ? "Please set an email." : "This email is invalid."
        })
    }

    // Validating password
    if (validatePassword(password)) {
        // Encrypting password
        password = await bcrypt.hash(password, 10)
    } else {
        res.status(422).json({
            status: 422,
            field: 'password',
            message: !password ? "Please set a password." : "Password is too short."
        })
        return
    }

    try {
        // Create user and set login token
        const user = await User.create({
            userName: username,
            firstName: firstname,
            lastName: lastname,
            email,
            password,
            verifiedEmail: false,
        })
    
        const token = jwt.sign({
            user_id: user._id,
            username
        }, process.env.JWT_TOKEN, {
            expiresIn: '3h'
        })
        user.auth = { loginToken: token, twoFA: false, twoFAToken: '' }
        user.save()

        res.status(201).json({
            status: 201,
            message: "User has been successfully registered!"
        })    
    } catch (error) {
        console.error(error)
        res.status(500).json({
            status: 500,
            message: "Could not create user."
        })    
    }
})

router.post('/login', async (req, res) => {
    const { username, password } = req.body

    if (!(username && password)) {
        // If one of the credentials is not specified
        res.status(400).json({
            status: 400,
            message: "Please specify credentials."
        })
    } else {
        // Find user
        const user = await User.findOne({ userName: username })
        const newToken = jwt.sign({
            user_id: user._id,
            username
        }, process.env.JWT_TOKEN, {
            expiresIn: '3h'
        })
        // Check password
        if (await bcrypt.compare(password, user.password)) {
            user.auth.loginToken = newToken
            res.cookie('lt', newToken, { maxAge: 10800, httpOnly: true })
            return res.status(200).json({
                status: 200,
                message: "Login successful."
            })
        }
    }
})

router.get('/messages', verifyUser, async (req, res) => {
    const sender = req.query.from // Username of messages sender
    const user = res.user.username
    if (sender) { // If no sender is specified
        return res.status(422).json({
            status: 422,
            message: "You must specify the sender."
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
            message: "No message found."
        })
    }
})

module.exports = router