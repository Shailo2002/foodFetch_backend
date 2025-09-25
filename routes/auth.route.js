import express from "express"
import { signIn, signOut, signUp } from "../controllers/auth.conrollers"

const authRouter = express.Router()

authRouter.post("/signup", signUp)
authRouter.post("/signin", signIn)
authRouter.post("/signout", signOut);

export default authRouter