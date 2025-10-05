import Order from "../models/order.model.js";
import Shop from "../models/shop.model.js";

export const placeOrder = async (req, res) => {
  try {
    console.log("placeOrder route");

    const { cartItems, paymentMethod, deliveryAddress } = req.body;

    if (!cartItems) {
      return res.status(400).json({
        success: false,
        message: "There is no Item in Cart",
      });
    }
    if (!paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Please select payment Method",
      });
    }
    if (!deliveryAddress) {
      return res.status(400).json({
        success: false,
        message: "Please select Delivery Address",
      });
    }

    const groupItemByShop = {};

    cartItems.map((item) => {
      if (!groupItemByShop[item.shop]) {
        groupItemByShop[item.shop] = [];
      }
      groupItemByShop[item.shop].push(item);
    });

    const shopOrders = await Promise.all(
      Object.keys(groupItemByShop).map(async (shopId) => {
        const shop = await Shop.findById(shopId).populate("owner");
        if (!shop) throw new Error(`Shop not found: ${shopId}`);
        const items = groupItemByShop[shopId];

        const subTotal = items.reduce(
          (sum, i) => sum + Number(i.price) * Number(i.quantity),
          0
        );

        const shopOrderItem = items.map((i) => {
          return { item: i.id, price: i.price, quantity: i.quantity };
        });

        return {
          shop: shopId,
          owner: shop.owner,
          subTotal,
          shopOrderItem,
        };
      })
    );

    const totalAmount = (await shopOrders).reduce(
      (sum, item) => sum + item.subTotal,
      0
    );

    const orderData = {
      user: req.userId,
      paymentMethod,
      deliveryAddress,
      totalAmount,
      shopOrders: shopOrders,
    };
    
    const order = await Order.create(orderData)

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: order,
    });
  } catch (error) {
    console.log("error : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};
