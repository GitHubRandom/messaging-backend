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
const userRouter = require('./api/v1/user')
const swaggerUI = require('swagger-ui-express')
const YAML = require('yamljs')

// Connecting to DB
Mongoose.connect(process.env.DATABASE_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false }
)

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
app.use('/v1/user', userRouter)
// Serve static files
app.use('/static', express.static('public'))

// Load API docs (OpenAPI/Swagger)
const swaggerDocument = YAML.load('./docs/openapi.yaml')
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocument))

app.get('/', (_, res) => {
    res.status(200).send("<h1>Coming soon...</h1>")
})

// Start socket
require('./socket/index').start(server)

server.listen(PORT, () => {
    console.log(`Listening on port ${PORT}`)
})
