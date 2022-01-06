const express = require('express')
const router = express.Router()
const multer = require('multer')
const fs = require("fs")
const verifyUser = require('./authMiddleware')
const User = require('../../../models/user')

const profilePictureSizeLimit = parseInt(process.env.PROFILE_PICTURE_SIZE_LIMIT)
const profilePictureSizeLimitMB = profilePictureSizeLimit / (1024)*(1024)

const filesPath = global.rootPath + "/files"
const extensions = {
    "image/jpeg": ".jpeg",
    "image/jpg": ".jpg",
    "image/png": ".png"
}

const avatarUpload = multer({ 
    storage: multer.diskStorage({
        destination: function (req, file, callback) {
            const path = `${filesPath}/private/${req.user.id}/`
            fs.mkdirSync(path, { recursive: true })
            callback(null, path)
        },
        filename: function (req, file, callback) {
            const ext = extensions[file.mimetype]
            const fullName = `profile-${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`
            callback(null, fullName)
        }
    }),
    limits: {
        fileSize: profilePictureSizeLimit
    },
    fileFilter: (req, file, callback) => {
        if (Object.keys(extensions).includes(file.mimetype)) {
            callback(null, true)
        } else {
            callback(new Error("File must be PNG, JPG or JPEG."))
        }
    }
}).single("profile_picture")

router.post('/avatar', verifyUser, async (req, res) => {
    avatarUpload(req, res, async function(error) {
        if (error) {
            console.error(error)
            if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
                return res.status(422).json({
                    field: 'profile_picture',
                    message: `File must not exceed ${profilePictureSizeLimitMB}MB`
                })
            }
            return res.status(500).json({
                field: 'profile_picture',
                message: "An error occured while processing avatar image"
            })
        }
        if (!req.file) {
            return res.status(400).json({
                message: "No image provided"
            })
        }
        await User.findByIdAndUpdate(req.user.id, { $set: { "publicInfo.profilePicture": "/static" + req.file.path.replace(filesPath, "") } })
        return res.status(200).json({
            message: "Changes saved successfully"
        })
    })

})

router.post('/account', verifyUser, async (req, res) => {
    const { username, firstname, lastname, bio } = req.body
    if (!username && !firstname && !lastname && !bio) {
        return res.status(400).json({
            message: "No data provided"
        })
    }
    const user = await User.findById(req.user.id)
    if (username) {
        user.userName = username
    }
    if (firstname) {
        user.firstName = firstname
    }
    if (lastname) {
        user.lastName = lastname
    }
    if (bio) {
        user.publicInfo.bio = bio
    }
    await user.save()
    return res.status(200).json({
        message: "Changes saved successfully"
    })
})

module.exports = router