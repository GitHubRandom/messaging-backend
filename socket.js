const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const Message = require('./models/message')
const User = require('./models/user')

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
            { onlineStatus: true }
        )
        // Every connected user joins a room with its username for incoming messages
        socket.join(socket.user.username)
        // Emit message that user became online
        socket.to(socket.user.username).emit('user online', socket.user.username)
        // Catch incoming messages, save them into DB and sending them to recipient room
        socket.on('message', async message => {
            if (socket.user.username === message.from) {
                try {
                    await Message.create({ ...message })
                    socket.to(message.to).emit('message', message)
                } catch (error) {
                    console.error(error)
                }    
            }
        })
        // Catch conversation select & return online status of recipient
        socket.on('conversation select', async (username, callback) => {
            console.log(`@${socket.user.username} wants to talk with @${username}`)
            // Leave old conversation room
            if (socket.user.conversation && socket.user.conversation.username && socket.rooms.has(socket.user.conversation.username)) {
                socket.leave(socket.user.conversation.username)
            }
            // Join new conversation room
            socket.join(username)
            socket.user.conversation = {
                username
            }
            if (callback) {
                const { onlineStatus } = await User.findOne({ userName: username }, { onlineStatus: 1, _id: -1 })
                callback({
                    onlineStatus: Boolean(onlineStatus),
                })
            }
        })
        // Catch conversation activities
        socket.on('activity', activity => {
            /*
                Catch user's activity and send it to recipient
                Then register a timeout in case no other activity is sent within 3 seconds
                For new activities, we clear any timeout registered for activity reset
            */
            if (socket.user.conversation && socket.user.conversation.username) {
                if (socket.user.conversation.activityTimeout) {
                    clearTimeout(socket.user.conversation.activityTimeout)
                }
                socket.to(socket.user.conversation.username).emit('activity', activity)
            }
            socket.user.conversation.activityTimeout = setTimeout(() => {
                socket.to(socket.user.conversation.username).emit('activity', { activity: 'none' })
            }, 3000)
        })
        socket.on('connnect_error', error => {
            if (error instanceof Error) {
                console.error(error)
            }
        })
        socket.on('disconnect', async () => {
            socket.to(socket.user.username).emit('user offline', socket.user.username)
            // update user's online status
            await User.findOneAndUpdate(
                { userName: socket.user.username },
                { onlineStatus: false },
            )
            console.log(`@${socket.user.username} disconnected !`)
        })
    })    
}

exports.start = start
