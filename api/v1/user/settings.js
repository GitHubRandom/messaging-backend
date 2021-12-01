const express = require('express')
const router = express.Router()
const multer = require('multer')
const fs = require("fs")
const verifyUser = require('./authMiddleware')
const User = require('../../../models/user')

const filesPath = "/home/ritzy/Documents/Messaging Backend/files"
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
        fileSize: 2*1024*1024
    },
    fileFilter: (req, file, callback) => {
        if (Object.keys(extensions).includes(file.mimetype)) {
            callback(null, true)
        } else {
            callback(new Error("File must be PNG, JPG or JPEG."))
        }
    }
}).single("profile_picture")

router.post('/account', verifyUser, async (req, res) => {

    avatarUpload(req, res, async function(error) {
        if (error) {
            if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
                return res.status(422).json({
                    field: 'profile_picture',
                    message: "File must not exceed 2MB"
                })
            }
            return res.status(500).json({
                field: 'profile_picture',
                message: error.message || "An error occured while processing avatar image"
            })
        }

        const { username, firstname, lastname, bio } = req.body
        const user = await User.findById(req.user.id)
        if (req.file) {
            user.publicInfo.profilePicture = "/static" + req.file.path.replace(filesPath, "")
        }
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

    /*if (profile_picture) {
        avatarUpload(req, res, function (error) {
            if (error) {
                console.log(error)
                if (error.code === "LIMIT_FILE_SIZE") {
                    return res.status(400).json({
                        field: 'profile_picture',
                        message: "File is too large. Must be less than 2MB."
                    })
                }
                return res.status(500).json({
                    message: "An error occured while uploading file"
                })
            }
            console.log("File uploaded")
        })
    } else if (!username && !firstname && !lastname && !bio) {
        return res.status(400).json({
            message: "No data sent"
        })
    }    

    

    return res.status(200).json({
        message: "Changes saved successfully"
    })

    /*const user = await User.findById(req.user.id)
    if (username) {
        user.userName = username
    }
    if (firstname) {
        user.firstName = firstname
    }
    if (lastname) {
        user.lastName = lastname
    }*/
})

module.exports = router