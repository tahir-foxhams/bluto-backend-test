import AWS from "aws-sdk";
import { S3Client } from "@aws-sdk/client-s3";
import { configs } from "./config";

AWS.config.update({
  accessKeyId: configs.awsAccessKey,
  secretAccessKey: configs.awsSecretAccessKey,
  region: configs.awsRegion,
});
export const s3 = new AWS.S3();

export const s3Client = new S3Client({
  region: configs.awsRegion,
  credentials: {
    accessKeyId: configs.awsAccessKey,
    secretAccessKey: configs.awsSecretAccessKey,
  },
});