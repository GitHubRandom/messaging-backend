const User = require('../models/user')
const Message = require('../models/message')
const Invite = require('../models/invite')

const registerSignals = socket => {

    // Catch incoming messages, save them into DB and send them to recipient room
    socket.on('message', async (message, callback) => {
        message.from = socket.user.username
        if (socket.user.conversation && socket.user.conversation.username === message.to) {
            // Authorized to send message
            try {
                const createdMessage = await Message.create({ ...message })
                socket.to(message.to).emit('message', createdMessage)
                socket.to(message.to).emit('activity', { activity: 'none' })
                callback({
                    success: true,
                    message: createdMessage
                })
            } catch (error) {
                console.error(error)
                callback({
                    success: false,
                    reason: "Server could not send message",
                    message
                })
            }
        } else {
            callback({
                success: false,
                reason: "Unauthorized",
                message
            })
        }   
    })

    // Catch conversation select & return online status of recipient
    socket.on('conversation select', async (username, callback) => {
        console.log(`@${socket.user.username} wants to talk with @${username}`)
        // Check user and recipient friendship
        const user = await User.findById(socket.user.id).populate("listOfContacts.who")
        if (!(user.listOfContacts.some(contact => contact.who && contact.who.userName === username ))) {
            return callback({
                success: false,
                message: "Unauthorized"
            })
        }        
        // Join new conversation room
        socket.user.conversation = {
            username
        }
        socket.to(username).emit('seen', socket.user.username)
        // Set all conversation messages as seen
        await Message.updateMany(
            { to: socket.user.username, from: socket.user.conversation.username },
            { read: true }
        )
        if (callback) {
            const { onlineStatus } = await User.findOne({ userName: username }, { onlineStatus: 1, _id: -1 })
            callback({
                success: true,
                onlineStatus: Boolean(onlineStatus),
            })
        }
    })

    // Catch message seen event
    socket.on('seen', async () => {
        // Set all conversation messages as seen
        await Message.updateMany(
            { to: socket.user.username, from: socket.user.conversation.username },
            { read: true }
        )
        socket.to(socket.user.conversation.username).emit('seen', socket.user.username)
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

    socket.on('invite', async (who, callback) => {
        // Invited user
        const whoUser = await User.findOne({ userName: who })
        // Connected user
        const user = await User.findById(socket.user.id)
        if (!user) {
            return callback({
                success: false,
                message: "You don't exist ?!"
            })
        }
        if (!whoUser) {
            return callback({
                success: false,
                message: `No user with username @${who}`
            })
        }
        // Check if invited person is not already in contacts list
        const isFriend = user.listOfContacts.some(contact => contact.who === whoUser._id)
        if (isFriend) {
            return callback({
                success: false,
                message: "Already a contact"
            })
        }
        const hasInvite = await Invite.find({ from: whoUser._id, to: user._id })
        if (hasInvite.length) {
            return callback({
                success: false,
                message: `@${who} has already invited you`
            })
        }
        // Create invite
        Invite.create({
            from: user._id,
            to: whoUser._id,
        }, async function(error) {
            if (error) return callback({ success: false, message: "Could not create invite" })
            user.listOfContacts.push({
                who: whoUser._id
            })
            await user.save()
            callback({
                success: true,
                message: "Invite sent successfully",
                contact: {
                    who: {
                        userName: whoUser.userName,
                        firstName: whoUser.firstName,
                        lastName: whoUser.lastName,
                        publicInfo: whoUser.publicInfo
                    }
                }
            })
        })
    })

    socket.on('invite response', async ({ id, response }, callback) => {
        try {
            const invite = await Invite.findById(id)
            // Check if user is authorized to respond
            if (invite.to != socket.user.id) {
                return callback({
                    success: false,
                    message: "Unauthorized"
                })
            }
            if (response === "accept") {
                const sender = await User.findById(invite.from, User.getPublicProjection())
                await User.updateOne(
                    { _id: invite.to, "listOfContacts.who": { $ne: invite.from } },
                    { $push: { listOfContacts: { who: invite.from } } },
                    function(error, affected) {
                        console.log(error)
                        console.log(affected)
                    }
                )
                invite.accepted = true
                invite.refused = false
                await invite.save()
                return callback({
                    success: true,
                    contact: { who: sender }
                })
            } else if (response === "refuse") {
                invite.accepted = false
                invite.refused = true
                await invite.save()
                callback({
                    success: true
                })
            } else {
                return callback({
                    success: false,
                    message: "Invalid response"
                })
            }
        } catch (error) {
            console.error(error)
            callback({
                success: false,
                message: "Could not process invite response"
            })
        }
    })

    socket.on('connnect_error', error => {
        if (error instanceof Error) {
            console.error(error)
        }
    })

    socket.on('disconnect', async () => {
        const user = await User.findById(socket.user.id).populate('listOfContacts.who')
        user.listOfContacts.forEach(({ who }) => {
            if (who && who.onlineStatus) socket.to(who.userName).emit('user offline', socket.user.username)
        })
        socket.leave(socket.user.username)
        // update user's online status
        await User.findOneAndUpdate(
            { userName: socket.user.username },
            { onlineStatus: false },
        )
        console.log(`@${socket.user.username} disconnected !`)
    })
}

module.exports = registerSignals