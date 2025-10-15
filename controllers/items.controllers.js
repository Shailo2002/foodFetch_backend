import Item from "../models/item.model.js";
import Shop from "../models/shop.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

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

    shop.items.push(item._id);
    await shop.save();
    await shop.populate({
      path: "items",
      options: { sort: { updatedAt: -1 } },
    });

    return res.status(200).json({
      success: true,
      message: "Item added successfully",
      data: shop,
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
    const itemId = req.params.itemId;

    let image;
    if (req.file) {
      image = await uploadOnCloudinary(req.file.path);
    }

    const item = await Item.findByIdAndUpdate(
      itemId,
      {
        name,
        image,
        category,
        price,
        foodtype,
      },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }
    const shop = await Shop.findOne({ owner: req.userId }).populate({
      path: "items",
      options: { sort: { updatedAt: -1 } },
    });

    return res.status(200).json({
      success: true,
      message: "Item edited successfully",
      data: shop,
    });
  } catch (error) {
    console.error("error while adding Item : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

export const getItemById = async (req, res) => {
  try {
    const itemId = req?.params?.itemId;

    const item = await Item.findById(itemId);

    if (!item) {
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

export const deleteItem = async (req, res) => {
  try {
    const itemId = req?.params?.itemId;

    const item = await Item.findByIdAndDelete(itemId);
    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
      });
    }

    const shop = await Shop.findOne({ owner: req.userId }).populate({
      path: "items",
      options: { sort: { updatedAt: -1 } },
    });

    return res.status(200).json({
      success: true,
      message: "Item edited successfully",
      data: shop,
    });
  } catch (error) {
    console.error("error while adding Item : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

export const getItemByCity = async (req, res) => {
  try {
    const city = req?.params?.city;

    if (!city || city === "null" || city === "undefined") {
      return res.status(400).json({
        success: false,
        message: "City is required",
      });
    }

    const shops = await Shop.find({
      city: { $regex: new RegExp(`^${city}$`, "i") },
    }).populate("items");

    if (!shops || shops.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No shops found for this city",
      });
    }

    const shopIds = shops.map((shop) => shop._id);
    const items = await Item.find({ shop: { $in: shopIds } });

    return res.status(200).json({
      success: true,
      message: "Items found from your city",
      data: items,
    });
  } catch (error) {
    console.log("error : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

export const getItemsByShop = async (req, res) => {
  try {
    const { shopId } = req.params;

    if (!shopId) {
      return res.status(400).json({
        success: false,
        message: "Shop is required",
      });
    }

    const shop = await Shop.findById(shopId).populate("items");
    if (!shop) {
      return res.status(400).json({
        success: false,
        message: "Shop not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "shopItem get successfully",
      data: { shop, items: shop.items },
    });
  } catch (error) {
    console.log("error : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

export const serchItems = async (req, res) => {
  try {
    const { query, city } = req?.query;

    if (!city || !query) {
      return;
    }

    const shops = await Shop.find({
      city: { $regex: new RegExp(`^${city}$`, "i") },
    }).populate("items");

    if (!shops || shops.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No shops found for this city",
      });
    }

    const shopIds = shops.map((shop) => shop._id);
    const items = await Item.find({
      shop: { $in: shopIds },
      $or: [
        { name: { $regex: query, $options: "i" } },
        { category: { $regex: query, $options: "i" } },
      ],
    }).populate("shop", "name image");

    return res.status(200).json({
      success: true,
      message: "Items found from your city",
      data: items,
    });
  } catch (error) {
    console.log("error : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

export const rating = async (req, res) => {
  try {
    const { itemId, rating } = req.body;

    if (!itemId || !rating) {
      res.status(201).json({
        success: false,
        message: "itemId and rating required",
      });
    }

    if (rating < 0 || rating > 5) {
      res.status(201).json({
        success: false,
        message: "rating must be between 0 to 5",
      });
    }

    const item = await Item.findById(itemId);

    const newCount = item?.rating?.count + 1;
    const newAverage = (item?.rating?.average * item?.rating?.count + rating) / newCount;

    item.rating.average = newAverage;
    item.rating.count = newCount;
    await item.save();


    return res.status(201).json({
      success: true,
      message: "rating updated successfully",
      data: { rating: item?.rating },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};
