import DeliveryAssignment from "../models/deliveryAssignment.model.js";
import Order from "../models/order.model.js";
import Shop from "../models/shop.model.js";
import User from "../models/user.model.js";

export const placeOrder = async (req, res) => {
  try {
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
          return {
            item: i.id,
            price: i.price,
            quantity: i.quantity,
          };
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
        .populate("shopOrders.shopOrderItems.item", "name image price")
        .populate("shopOrders.assignedDeliveryBoy", "fullName mobile");

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
    if (status == "out_for_delivery" && !shopOrder.assignment) {
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
        assignment: updatedShopOrder?.assignment?._id,
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

export const getAssignment = async (req, res) => {
  try {
    const deliveryBoyId = req.userId;

    const assignment = await DeliveryAssignment.find({
      brodCastedTo: deliveryBoyId,
      status: "brodcasted",
    })
      .populate({
        path: "order",
        populate: {
          path: "shopOrders.shopOrderItems.item",
          select: "name image price", // only pick what you need
        },
      })
      .populate("shop");

    const formattedData = assignment.map((a) => ({
      assignmentId: a?._id,
      orderId: a?.order?._id,
      shopName: a?.shop?.name,
      deliveryAddress: a?.order?.deliveryAddress,
      items:
        a?.order?.shopOrders?.find((x) => x._id.equals(a.shopOrderId))
          ?.shopOrderItems || [],
      subtotal: a?.order?.shopOrders?.find((x) => x._id.equals(a.shopOrderId))
        ?.subTotal,
    }));

    return res.status(201).json({
      success: true,
      message: "all availabel orders get successfully",
      data: formattedData,
    });
  } catch (error) {
    console.log("error : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

export const acceptOrder = async (req, res) => {
  try {
    const { assignmentId } = req.params;

    const assignment = await DeliveryAssignment.findById(assignmentId);
    if (!assignment) {
      return res.status(400).json({
        success: false,
        message: "assignment not found.",
      });
    }

    if (assignment.status == "assigned") {
      return res.status(400).json({
        success: false,
        message: "order already assigned.",
      });
    }

    const alreadyAssigned = await DeliveryAssignment.findOne({
      assignedTo: req.userId,
      status: { $nin: ["brodcasted", "completed"] },
    });

    if (alreadyAssigned) {
      return res.status(400).json({
        success: false,
        message: "You are already assigned to another order",
      });
    }

    (assignment.assignedTo = req.userId),
      (assignment.status = "assigned"),
      (assignment.acceptedAt = new Date());
    await assignment.save();

    const order = await Order.findById(assignment?.order);
    if (!order) {
      return res.status(400).json({
        success: false,
        message: "order not found.",
      });
    }
    const shopOrder = order.shopOrders.find((x) =>
      x._id.equals(assignment.shopOrderId)
    );
    shopOrder.assignedDeliveryBoy = req.userId;
    await order.save();

    return res.status(201).json({
      success: true,
      message: "Order Accepted",
    });
  } catch (error) {
    console.log("error : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

export const getCurrentOrder = async (req, res) => {
  try {
    const assignment = await DeliveryAssignment.findOne({
      assignedTo: req.userId,
      status: "assigned",
    })
      .populate({
        path: "order",
        populate: {
          path: "user",
          select: "fullName mobile email location",
        },
      })
      .populate("assignedTo", "fullName email mobile location")
      .populate("shop", "name address");

    console.log("assignement : ", assignment);
    if (!assignment) {
      return res.status(400).json({
        success: false,
        message: "No order Assigned",
      });
    }
    if (!assignment.order) {
      return res.status(400).json({
        success: false,
        message: "No order found",
      });
    }

    const shopOrder = assignment.order.shopOrders.find((so) =>
      so._id.equals(assignment.shopOrderId)
    );

    if (!shopOrder) {
      return res.status(400).json({
        success: false,
        message: "shopOrder not found",
      });
    }

    let deliveryBoyLocation = { lat: null, lon: null };
    if (assignment.assignedTo.location.coordinates.length == 2) {
      deliveryBoyLocation.lat = assignment.assignedTo.location.coordinates[1];
      deliveryBoyLocation.lon = assignment.assignedTo.location.coordinates[0];
    }

    let curstomerLocation = { lat: null, lon: null };
    if (assignment.order.deliveryAddress) {
      curstomerLocation.lat = assignment.order.deliveryAddress.latitude;
      curstomerLocation.lon = assignment.order.deliveryAddress.longitude;
    }

    return res.status(201).json({
      success: true,
      message: "Order Accepted",
      data: {
        _id: assignment.order._id,
        user: assignment.order.user,
        shopOrder,
        shop: {
          name: assignment.shop.name,
          address: assignment.shop.address,
        },
        deliveryAddress: assignment.order.deliveryAddress.text,
        deliveryBoyLocation,
        curstomerLocation,
      },
    });
  } catch (error) {
    console.log("error : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};
