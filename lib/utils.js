import jwt from "jsonwebtoken" 

export const genrateToken = (uid)=>{

        const token = jwt.sign({uid},process.env.JWT_SECRET,{expiresIn:'7d'})
        return token
}