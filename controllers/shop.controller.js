import Shop from "../models/shop.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

export const CreateOrEditShop = async (req, res) => {
  try {
    console.log("shop endpoint");

    const { name, city, state, address } = req.body;
    let image;
    if (req.file) {
      console.log(req.file);
      image = await uploadOnCloudinary(req.file.path);
    }
    if (!name || !city || !state || !address) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    let shop = await Shop.findOne({ owner: req.userId });

    if (!shop) {
      try {
        const shop = await Shop.create({
          name,
          city,
          state,
          address,
          image,
          owner: req.userId,
        });

        return res.status(201).json({
          success: true,
          message: "Shop registered successfully",
          data: shop,
        });
      } catch (error) {
        console.error("Shop registration error:", error);
        return res.status(500).json({
          success: false,
          message: "Internal server error. Please try again later.",
        });
      }
    }

    const result = await Shop.findByIdAndUpdate(
      shop._id,
      {
        name,
        city,
        state,
        address,
        image,
        owner: req.userId,
      },
      { new: true }
    );

    await shop.populate("owner items");

    return res.status(201).json({
      success: true,
      message: "Shop details updated successfully",
      data: result,
    });
  } catch (error) {
    console.error("error while updating shop", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

export const getShop = async (req, res) => {
  try {
    console.log("get shop endpoint");

    const userId = req.userId;
    console.log("user ", userId);

    let shop = await Shop.findOne({ owner: userId }).populate({
      path: "items",
      options: { sort: { updatedAt: -1 } },
    });

    if (!shop) {
      return res.status(201).json({
        success: true,
        message: "Shop not found",
        data: shop,
      });
    }

    return res.status(201).json({
      success: true,
      message: "Shop details get successfully",
      data: shop,
    });
  } catch (error) {
    console.error("error while geting shop", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};

export const getShopByCity = async (req, res) => {
  try {
    console.log("getshopbycity endpoint");
    const city = req?.params?.city;

    if (!city) {
      return res.status(201).json({
        success: false,
        message: "City not found",
      });
    }

    const result = await Shop.find({
      city: { $regex: new RegExp(`^${city}$`, "i") },
    }).populate("items");

    return res.status(200).json({
      success: true,
      message: "shops found from your city",
      data: result,
    });
  } catch (error) {
    console.log("error : ", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};
