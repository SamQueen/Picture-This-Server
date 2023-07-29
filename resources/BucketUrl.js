const { S3Client, AbortMultipartUploadCommand, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const s3 = require('./S3Bucket');

// presigned url
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const bucket_name = process.env.AWS_BUCKET_NAME;

// generate presigned url. url directs to photos stored in s3 bucket
const generateURL = async(image_name) => {
    const getObjectParams = {
        Bucket: bucket_name,
        Key: image_name
    }
    const command = new GetObjectCommand(getObjectParams);
    const url = await getSignedUrl(s3, command, { expiresIn: 3600 })
    
    return url;
}

module.exports = generateURL;