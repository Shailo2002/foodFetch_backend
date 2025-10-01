import mongoose from "mongoose";

const ItemShema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    shop: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    category: {
      type: String,
      enum: [
        "Snacks",
        "Main Course",
        "Desserts",
        "Pizza",
        "Burgers",
        "Sandwiches",
        "South Indian",
        "North Indian",
        "Chinese",
        "Fast Food",
        "Others",
      ],
      required:true
    },
    price: {
        type: Number,
        min:0,
        required: true
    },
    foodtype:{
        type: String,
        enum: ["veg", "non veg"],
        required: true
    }
  },
  { timestamps: true }
);

const Item = mongoose.model("Item", ItemShema);
export default Item;
