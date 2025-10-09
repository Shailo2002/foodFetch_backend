import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { addItem, deleteItem, editItem, getItemByCity, getItemById, getItemsByShop, serchItems } from "../controllers/items.controllers.js";
import { upload } from "../middlewares/multer.js";

const itemRouter = express.Router();

itemRouter.post("/add-item", isAuth, upload.single("image"), addItem);
itemRouter.post("/edit-item/:itemId", isAuth, upload.single("image"), editItem);
itemRouter.get("/get-item/:itemId", isAuth, getItemById);
itemRouter.delete("/delete-item/:itemId", isAuth, deleteItem);
itemRouter.get("/get-item-city/:city", isAuth, getItemByCity);
itemRouter.get("/get-by-shop/:shopId", isAuth, getItemsByShop);
itemRouter.get("/search-items", isAuth, serchItems);


export default itemRouter;
