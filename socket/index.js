const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const Message = require('../models/message')
const User = require('../models/user')

const registerSignals = require('./socketOps')

const start = server => {
    const io = new Server(server)
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || ""
        console.log(token)
        if (!token) {
            return next(new Error("no token"))
        }
        try {
            const user = jwt.verify(token, process.env.JWT_TOKEN)
            socket.user = user
            console.log(socket.user)
            return next()
        } catch (error) {
            console.error(error)
            return next(new Error("invalid token"))
        }
    })
    
    io.on('connection', async socket => {
        console.log(`@${socket.user.username} is connected`)
        // Update user's online status
        await User.findOneAndUpdate(
            { userName: socket.user.username },
            { onlineStatus: true, "auth.lastConnected": new Date() }
        )
        // Every connected user joins a room with its username for incoming messages
        socket.join(socket.user.username)
        // Emit message that user is online
        const user = await User.findById(socket.user.id).populate('listOfContacts.who')
        user.listOfContacts.length && user.listOfContacts.forEach(({ who }) => {
            if (who && who.onlineStatus) socket.to(who.userName).emit('user online', socket.user.username)
        })
        // Register signals        
        registerSignals(socket)
    })

}

exports.start = start