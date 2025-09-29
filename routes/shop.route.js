import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { CreateOrEditShop } from "../controllers/shop.controller.js";
import { upload } from "../middlewares/multer.js";

const shopRouter = express.Router();

shopRouter.post("/shop", isAuth, upload.single("image"), CreateOrEditShop);

export default shopRouter;
