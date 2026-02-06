import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import jwt from "jsonwebtoken";
import multer from "multer";

const app = express();


// Configure multer for MEMORY storage (files in buffer)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG and GIF are allowed.'), false);
  }
};
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
    files: 10 // Max 10 files
  }
});


const validateJWT = (req, res, next) => {

  if(process.env.NODE_ENV === "test") {
    next();
    return;
  }

  // Get the auth header value
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];


  if (token == null) return res.sendStatus(403); // if there's no token

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);

    req.user = user;
    next();
  });
};


app.use(express.json({limit: '50mb'}));
app.set("port", process.env.PORT || 3000);

app.use(bodyParser.json());
app.use(cors());
app.use(express.urlencoded({limit: '50mb', extended: true}));

const reviewsUpload = upload.fields([
  { name: 'images', maxCount: 10 }
]);

export { app, validateJWT, reviewsUpload }