const jwt = require('jsonwebtoken')

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

module.exports = verifyUser