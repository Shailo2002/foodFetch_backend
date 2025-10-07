import express from "express";
import { isAuth } from "../middlewares/isAuth.js";
import { acceptOrder, getAssignment, getCurrentOrder, getMyOrders, placeOrder, updateOrderStatus } from "../controllers/order.controllers.js";

const orderRouter = express.Router();

orderRouter.post("/place-order", isAuth, placeOrder);
orderRouter.get("/my-orders", isAuth, getMyOrders);
orderRouter.get("/get-assignments", isAuth, getAssignment);
orderRouter.post("/update-status/:orderId/:shopId", isAuth, updateOrderStatus);
orderRouter.get("/accept-order/:assignmentId", isAuth, acceptOrder);
orderRouter.get("/deliveryboy-order/", isAuth, getCurrentOrder);




export default orderRouter;
