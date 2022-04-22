const mongoose = require('mongoose');

mongoose.connect('mongodb://localhost:27017/remoterecord');

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: {
        type: String,
        set: val => require('bcrypt').hashSync(val, 10),
        required: true,
        select: false
    },
    exam: { type: String, default: "exam" }
})

const User = mongoose.model('User', UserSchema);
// User.db.dropCollection('users')
module.exports = { User }