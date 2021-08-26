if (process?.env?.NODE_ENV !== 'production') {
    require('dotenv').config()
}
const PORT = process?.env?.PORT || 8000
const express = require('express')
const app = express()
const cookieParser = require('cookie-parser')
const http = require('http')
const cors = require('cors')
const Mongoose = require('mongoose')
const server = http.createServer(app)
const router = require('./routes/user')

// Connecting to DB
Mongoose
    .connect(process.env.DATABASE_URI, { useNewUrlParser: true, useUnifiedTopology: true, useCreateIndex: true, useFindAndModify: false })
    .then(mongoose => mongoose.connection.getClient())

// Fix CORS issues (F*ck CORS!)
app.use(cors({
    origin: true,
    credentials: true,
    methods: "GET,POST,DELETE"
}))

// Middlewares for POST requests data parsing
app.use(express.json())
app.use(express.urlencoded({
    extended: true
}))

app.use(cookieParser())
app.use('/user', router)
// Serve static files
app.use('/static', express.static('public'))

app.get('/', (_, res) => {
    res.status(200).send("<h1>Coming soon...</h1>")
})

// Start socket
require('./socket').start(server)

server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})
