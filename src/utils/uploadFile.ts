import { s3 } from "../config/s3";
import { configs } from "../config/config";

const bucketName = configs.awsBucketName;

interface UploadSingleFileInput {
  documentFile: Express.Multer.File;
  folderName: string;
}

export const uploadFileS3 = async ({
  documentFile,
  folderName,
}: UploadSingleFileInput): Promise<string> => {
  const originalFileName = documentFile.originalname;
  const fileExtension = originalFileName.split(".").pop();
  const fileNameWithoutExtension = originalFileName.replace(
    `.${fileExtension}`,
    ""
  );

  const currentDate = new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[-T:]/g, "");
  const fileName = `${folderName}-images/${fileNameWithoutExtension}_${currentDate}.${fileExtension}`;

  const params = {
    Bucket: bucketName,
    Key: fileName,
    Body: documentFile.buffer,
    ContentType: documentFile.mimetype,
  };

  await s3.putObject(params).promise();

  const fileUrl = `https://${bucketName}.s3.amazonaws.com/${fileName}`;
  return fileUrl;
};

export const deleteFileS3 = async (fileUrl: string): Promise<boolean> => {
  const key = fileUrl.replace(`https://${bucketName}.s3.amazonaws.com/`, "");

  const deleteParams = {
    Bucket: bucketName,
    Key: key,
  };

  await s3.deleteObject(deleteParams).promise();

  return true;
};
