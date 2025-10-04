import mongoose from "mongoose";

const shopOrederItemSchema = new mongoose.model(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Item",
      required: true,
    },
    price: Number,
    quantity: Number,
  },
  { timestamps: true }
);

const shopOrderSchem = new mongoose.model(
  {
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Shop",
      required: true,
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    subTotal: Number,
    shopOrderItems: [shopOrederItemSchema],
  },
  { timestamps: true }
);

const orderSchema = new mongoose.model(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "online"],
      required: true,
    },
    deliveryAddress: {
      text: String,
      latitude: Number,
      longitude: Number,
      required: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    shopOrder: [],
  },
  { timestamps: true }
);

const Order = mongoose.Schema("order", orderSchema);
export default Order;
