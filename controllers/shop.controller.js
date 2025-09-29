import Shop from "../models/shop.model";
import uploadOnCloudinary from "../utils/cloudinary";

export const CreateOrEditShop = async (req, res) => {
  try {
    console.log("shop endpoint");

    const { name, city, state, address } = req.body;
    let image;
    if (req.file) {
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

    result = await Shop.findByIdAndUpdate(
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

    await shop.populate("owner");

    return res.status(201).json({
      success: true,
      message: "Shop details updated successfully",
    });
  } catch (error) {
    console.error("error while updating shop", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error. Please try again later.",
    });
  }
};
