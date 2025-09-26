import multer, { FileFilterCallback } from "multer";
import { Request } from "express";

const upload = multer({
  fileFilter: (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
  ) => {
    if (
      file.mimetype === "image/jpeg" ||
      file.mimetype === "image/jpg" ||
      file.mimetype === "image/png"
    ) {
      cb(null, true);
    } else {
      (req as any).fileValidationError = "Only JPEG, JPG, and PNG files are allowed";
      cb(null, false);
    }
  },
});

export default upload;