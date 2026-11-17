import {createBannerService,getBannersService,updateBannerByIdService,deleteBannerByIdService} from "../services/banner.service.js";
import { getCloudinary } from "../config/cloudinary.js";

// Banner media is uploaded straight from the admin browser to Cloudinary,
// bypassing Vercel's 4.5 MB request-body limit. This endpoint hands back
// a short-lived signature the browser needs to perform that upload.
export const getBannerUploadSignature = async (req, res) => {
    const timestamp = Math.round(Date.now() / 1000);
    const folder = "oros/banner";

    const signature = getCloudinary().utils.api_sign_request(
        { timestamp, folder },
        process.env.CLOUDINARY_API_SECRET
    );

    res.json({
        success: true,
        message: "upload signature",
        data: {
            signature,
            timestamp,
            apiKey: process.env.CLOUDINARY_API_KEY,
            cloudName: process.env.CLOUDINARY_CLOUD_NAME,
            folder
        }
    });
};

export const createBanner =async(req,res)=>{
 const bannerdata = req.body;
 if (req.files && req.files.mediaDesktop && req.files.mediaDesktop[0]) {
    bannerdata.mediaUrlDesktop=req.files.mediaDesktop[0].path;
   bannerdata.mediaUrlDesktopPublicId=req.files.mediaDesktop[0].filename
  
 }
 if ( req.files &&
        req.files.mediaMobile &&
        req.files.mediaMobile[0]) {
   bannerdata.mediaUrlMobile=req.files.mediaMobile[0].path;
   bannerdata.mediaUrlMobilePublicId=req.files.mediaMobile[0].filename
 }
 const {message,data}= await createBannerService(bannerdata);
 res.json({
    message,
    success:true,
    data
 })
}

export const updateBannerById =async(req,res)=>{
    const {id}=req.params;
    const bannerData=req.body;
    if (req.files?.mediaDesktop?.[0]) {
        bannerData.mediaUrlDesktop=req.files.mediaDesktop[0].path;
        bannerData.mediaUrlDesktopPublicId=req.files.mediaDesktop[0].filename
    }
     if ( req.files &&
        req.files.mediaMobile &&
        req.files.mediaMobile[0]) {
   bannerData.mediaUrlMobile=req.files.mediaMobile[0].path;
   bannerData.mediaUrlMobilePublicId=req.files.mediaMobile[0].filename
 }
    const {message,data}=await updateBannerByIdService(id,bannerData);
    res.json({
        message,success:true,
        data
    })
}

export const getBanners = async (req, res) => {
    const { message, data } = await getBannersService(req.query);
    res.json({
        message,
        success: true,
        data
    })
}


export const deleteBannerById = async(req,res)=>{
    const {message,data}= await deleteBannerByIdService(req.params.id);

    res.json({
       message,
        success: true,
        data
    })
}