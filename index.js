const PORT = process?.env?.PORT || 8000
const express = require('express')
const app = express()
const http = require('http')
const Mongoose = require('mongoose')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server)

Mongoose
    .connect('mongodb://localhost:27017/chat', { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
    .then(() => {

        app.use(express.urlencoded({
            extended: true
        }))
        app.use('/user', require('./routes/user'))

        app.get('/', (_, res) => {
            res.status(200).send("<h1>Coming soon...</h1>")
        })

        io.on('connection', socket => {
            console.log('User connected !')
            socket.on('message', message => {
                socket.broadcast.emit(message)
            })
            socket.on('disconnect', () => {
                console.log('User disconnected !')
            })
        })

        server.listen(PORT, () => {
            console.log(`Listening on port ${PORT}`)
        })
    })