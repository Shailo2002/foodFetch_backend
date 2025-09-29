import Item from "../models/item.model.js";
import Shop from "../models/shop.model.js";
import uploadOnCloudinary from "../utils/cloudinary";

export const addItem = async (req, res) => {
  try {
    const { name, category, price, foodtype } = req.body;

    let image;
    if (req.file) {
      image = await uploadOnCloudinary(req.file.path);
    }

    let shop = await Shop.findOne({ owner: req.userId });

    if (!shop) {
      return res.status(404).json({
        success: false,
        message: "Shop not found",
      });
    }

    const item = await Item.create({
      name,
      image,
      shop: shop._id,
      category,
      price,
      foodtype,
    });
    return res.status(200).json({
      success: true,
      message: "Item added successfully",
      data: item,
    });
  } catch (error) {
    console.error("error while adding Item : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

export const editItem = async (req, res) => {
  try {
    const { name, category, price, foodtype } = req.body;
    const itemId = req.params.itemId

    let image;
    if (req.file) {
      image = await uploadOnCloudinary(req.file.path);
    }

    const item = await Item.findByIdAndUpdate(itemId, {
      name,
      image,
      category,
      price,
      foodtype,
    },{new: true});

    if(!item){
        return res.status(404).json({
          success: false,
          message: "Item not found",
        });
    }

    return res.status(200).json({
      success: true,
      message: "Item edited successfully",
      data: item,
    });
  } catch (error) {
    console.error("error while adding Item : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};
