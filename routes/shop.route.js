import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import {
  CreateOrEditShop,
  getShop,
  getShopByCity,
} from "../controllers/shop.controller.js";
import { upload } from "../middlewares/multer.js";

const shopRouter = express.Router();

shopRouter.post(
  "/create-edit",
  isAuth,
  upload.single("image"),
  CreateOrEditShop
);
shopRouter.get("/get-my", isAuth, getShop);
shopRouter.get("/get-shop-city/:city", isAuth, getShopByCity);


export default shopRouter;
