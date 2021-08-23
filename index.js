const PORT = process?.env?.PORT || 8000
const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')
const http = require('http')
const cors = require('cors')
const Mongoose = require('mongoose')
const server = http.createServer(app)
const { Server } = require('socket.io')
const io = new Server(server)

Mongoose
    .connect(process.env.DATABASE_URI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true })
    .then(() => {
        app.use(cors({
            origin: (origin, callback) => {
                !origin || origin.includes("netlify.app") ? callback(null, true) : callback(new Error("Origin not allowed"))
            },
            preflightContinue: true,
            credentials: true,
            methods: "GET,POST,DELETE"
        }))
        app.use(express.json())
        app.use(express.urlencoded({
            extended: true
        }))
        app.use(cookieParser())
        app.use('/user', require('./routes/user'))
        app.use('/static', express.static('public'))

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