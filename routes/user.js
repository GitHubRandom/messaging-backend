if (process?.env?.NODE_ENV !== 'production') {
    require('dotenv').config()
}

const express = require('express')
const router = express.Router()
const User = require('../models/user')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { validateWithMinLength, validateWithMaxLength, validatePassword, validateEmail } = require('../utils/validators')

router.post('/register', async (req, res) => {
    var { username, firstname, lastname, email, password } = req.body

    // Validating user name
    if (validateWithMinLength(username, 3)) {
        const userNameTaken = await User.findOne({ userName: username })
        if (userNameTaken) {
            res.status(409).json({
                status: 409,
                field: 'username',
                message: "This username is already taken. Please try another one."
            })
            return
        }
    } else {
        res.status(422).json({
            status: 422,
            field: 'username',
            message: !username ? "You must specify a username." : "Username is too short. Must be at least 3 characters."
        })
        return
    }

    // Validating first name
    if (!validateWithMaxLength(firstname, 50)) {
        res.status(422).json({
            status: 422,
            field: 'firstname',
            message: !firstname ? "You must specify a first name." : "First name is too long. Must not exceed 50 characters."
        })
        return
    }

    // Validating last name
    if (!validateWithMaxLength(lastname, 50)) {
        res.status(422).json({
            status: 422,
            field: 'lastname',
            message: !lastname ? "You must specify a last name." : "Last name is too long. Must not exceed 50 characters."
        })
        return
    }

    // Validating email
    if (validateEmail(email)) {
        email = email.toLowerCase()
        const emailTaken = await User.findOne({ email })
        if (emailTaken) {
            res.status(409).json({
                status: 409,
                field: 'email',
                message: "This email is already taken. Please try another one."
            })
        }
    } else {
        res.status(422).json({
            status: 422,
            field: 'email',
            message: !email ? "Please set an email." : "This email is invalid."
        })
        return
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
            listOfContacts: []
        })
    
        const token = jwt.sign({
            user_id: user._id,
            username
        }, process.env.JWT_TOKEN, {
            expiresIn: '3h'
        })
        user.auth = { token, twoFA: false, twoFAToken: '' }
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

module.exports = router