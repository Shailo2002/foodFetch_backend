import express from "express";
import dotenv from "dotenv";
import connectDb from "./config/db.js";
import cookieParser from "cookie-parser";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { socketHandler } from "./socket.js";

import authRouter from "./routes/auth.route.js";
import userRouter from "./routes/user.route.js";
import shopRouter from "./routes/shop.route.js";
import itemRouter from "./routes/items.route.js";
import orderRouter from "./routes/order.route.js";

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(",")
  : ["http://localhost:5173"];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  })
);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true,
    methods: ["GET", "POST"],
  },
});

app.set("io", io);

const PORT = process.env.PORT || 8000;

app.use(cookieParser());
app.use(express.json());

app.use("/api/auth", authRouter);
app.use("/api/user", userRouter);
app.use("/api/shop", shopRouter);
app.use("/api/item", itemRouter);
app.use("/api/order", orderRouter);

socketHandler(io);

server.listen(PORT, () => {
  connectDb();
  console.log(`Server running on port ${PORT}`);
  console.log("Allowed origins:", allowedOrigins);
});
