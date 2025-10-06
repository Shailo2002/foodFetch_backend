import DeliveryAssignment from "../models/deliveryAssignment.model.js";
import Order from "../models/order.model.js";
import Shop from "../models/shop.model.js";
import User from "../models/user.model.js";

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

        const shopOrderItems = items.map((i) => {
          return { item: i.id, price: i.price, quantity: i.quantity };
        });

        return {
          shop: shopId,
          owner: shop.owner,
          subTotal,
          shopOrderItems,
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

    const newOrder = await Order.create(orderData);

    if (!newOrder) {
    }

    await newOrder.populate(
      "shopOrders.shopOrderItems.item",
      "name image price"
    );
    await newOrder.populate("shopOrders.shop", "name");

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      data: newOrder,
    });
  } catch (error) {
    console.log("error : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

export const getMyOrders = async (req, res) => {
  try {
    console.log("my order endpoint");
    const userId = req.userId;

    const user = await User.findById(userId);

    if (user?.role == "user") {
      const orders = await Order.find({ user: userId })
        .sort({ createdAt: -1 })
        .populate("shopOrders.shop", "name")
        .populate("shopOrders.owner", "name email mobile")
        .populate("shopOrders.shopOrderItems.item", "name image price");

      if (!orders) {
        return res.status(201).json({
          success: true,
          message: "no Order placed yet",
        });
      }

      return res.status(201).json({
        success: true,
        message: "all orders get successfully",
        data: orders,
      });
    } else if (user?.role == "owner") {
      const orders = await Order.find({ "shopOrders.owner": userId })
        .sort({ createdAt: -1 })
        .populate("shopOrders", "shopOrders.owner === userId")
        .populate("shopOrders.shop", "name")
        .populate("user")
        .populate("shopOrders.shopOrderItems.item", "name image price");

      if (!orders) {
        return res.status(201).json({
          success: true,
          message: "no Order placed yet",
        });
      }
      const filteredOrder = orders.map((order) => ({
        _id: order._id,
        paymentMethod: order?.paymentMethod,
        deliveryAddress: order?.deliveryAddress,
        user: order.user,
        shopOrders: order.shopOrders.find((o) => o.owner._id == req.userId),
        createdAt: order.createdAt,
      }));

      return res.status(201).json({
        success: true,
        message: "all orders get successfully",
        data: filteredOrder,
      });
    }
  } catch (error) {
    console.log("error : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId, shopId } = req.params;
    const { status } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const shopOrder = order.shopOrders.find((o) => o.shop.equals(shopId));
    if (!shopOrder) {
      return res.status(404).json({
        success: false,
        message: "Shop order not found",
      });
    }
    shopOrder.status = status;

    let deliveryBoysPayload = [];
    if (status == "out_for_delivery" || !shopOrder.assignment) {
      const { latitude, longitude } = order?.deliveryAddress;

      const nearDeliveryBoys = await User.find({
        role: "delivery_boy",
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [Number(longitude), Number(latitude)],
            },
            $maxDistance: 5000,
          },
        },
      });

      const nearbyIds = nearDeliveryBoys.map((boy) => boy._id);
      const busyIds = await DeliveryAssignment.find({
        assignedTo: { $in: nearbyIds },
        status: { $nin: ["brodcasted", "completed"] },
      }).distinct("assignedTo");

      const busyIdsSet = new Set(busyIds?.map((id) => String(id)));
      const availableBoys = nearDeliveryBoys.filter(
        (b) => !busyIdsSet.has(String(b._id))
      );
      const candidates = availableBoys.map((x) => x._id);

      if (candidates.length <= 0) {
        await order.save();

        return res.status(200).json({
          success: true,
          message: "Shop order status updated but no available delivery boy",
          data: shopOrder.status,
        });
      }
      const deliveryAssignment = await DeliveryAssignment.create({
        order: order._id,
        shop: shopOrder.shop,
        shopOrderId: shopOrder._id,
        brodCastedTo: candidates,
        status: "brodcasted",
      });

      shopOrder.assignedDeliveryBoy = deliveryAssignment.assignedTo;
      shopOrder.assignment = deliveryAssignment._id;

      deliveryBoysPayload = availableBoys.map((b) => ({
        id: b._id,
        fullName: b.fullName,
        longitude: b.location.coordinates?.[0],
        latitude: b.location.coordinates?.[1],
        mobile: b.mobile,
      }));
    }

    await order.populate("shopOrders.shop", "name");
    await order.populate(
      "shopOrders.assignedDeliveryBoy",
      "fullName email mobile"
    );

    await shopOrder.save();
    await order.save();

    const updatedShopOrder = order.shopOrders.find((o) =>
      o.shop.equals(shopId)
    );

    return res.status(200).json({
      success: true,
      message: "Shop order status updated successfully",
      data: {
        shopOrder: updatedShopOrder,
        assignedDeliveryBoy: updatedShopOrder?.assignedDeliveryBoy,
        availableBoys: deliveryBoysPayload,
        assignment: updatedShopOrder?.assignment._id,
      },
    });
  } catch (error) {
    console.error("updateOrderStatus error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};
