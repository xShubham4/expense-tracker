import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name:{
        type: String,
        required: true
    },
    email:{
        type: String,
        required: true,
        unique: true
    },
    picture:{
        type: String,
    },
    googleAccessToken:{
        type: String,
    },
    googleRefreshToken:{
        type: String,
    }
}
,{
    timestamps: true
});

export default mongoose.model('User', userSchema);