import express from "express"
import dotenv from "dotenv"
import connectDb from "./config/db.js"
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

app.get("/", (req, res) => {
    res.send("hi")
})

app.listen(PORT, ()=> {
    connectDb()
    console.log("backend server is running on ", PORT)
})