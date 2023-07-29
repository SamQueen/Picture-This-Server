const path = require("path");
const { S3Client, AbortMultipartUploadCommand, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
require('dotenv').config()

// amazon aws vars
const bucket_name = process.env.AWS_BUCKET_NAME;
const bucket_region = process.env.AWS_BUCKET_REGION;
const access_key = process.env.AWS_ACESS_KEY;
const secret_access_key = process.env.AWS_SECRET_KEY;

// s3 object
const s3 = new S3Client({
    credentials: {
        accessKeyId: access_key,
        secretAccessKey: secret_access_key
    },
    region: bucket_region,
    bucket_name: bucket_name
});

module.exports = s3;