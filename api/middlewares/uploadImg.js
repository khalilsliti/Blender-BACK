

//Visit https://www.npmjs.com/package/multer for full documentation .
    const multer = require('multer'); 

const ObjectId = require('mongoose').Types.ObjectId;
const maxImgSize = 5 * 1024 * 1024 /* 5 MBs maximum file size .*/ ;



//Configuring multer .
const storage = multer.diskStorage({
    destination: (req, file, cb) => {

        cb(null, `./uploads${req.baseUrl}`);//Images will be saved here locally based on the requested endpoint meaning users , stores and products images are in seperate dirs under 'uploads' .

    }
    ,

filename: function(req, file, cb) {
    //On creation unlike update not much work is required.

    req.id =  new ObjectId(); //Since no id is provided as a paramter and a file is submitted then a new ID is genereated and req.id is pouplated , req.id will be used to name the image and to ensure conssitency between a doc ObjectId and its corresponding image name the req.id is accessed by other middlewares in the stack in the response lifecycle .
    const extension = file.mimetype.slice(file.mimetype.indexOf('/') + 1) ; //Determines the extension of the file from the mimetype [Note this is for testing only , in production such action is a potential security threat since with a valid mimetype any file smaller than maxImgSize will be uploadid .].
    cb(null, `${req.id}.${extension}` );//Image name is the req.id 'ID.FILE_EXTENSION' .
    
}
});

const fileFilter = (req, file, cb) => {
    // Accept only jpeg files [Note more types requires further work on updating existing images with different extensions]
    if ( file.mimetype === 'image/jpeg' ) {
    cb(null, true);
    } else {
      cb(Object.assign(new Error("Invalid Image type .") , {status : 400}));// Reject a file otherwise
    }
};

module.exports = multer({
    storage: storage,
    limits: {
    fileSize: maxImgSize //Limits the maximum size of a file that can be uploaded to 'maxImgSize' .
    },
    fileFilter: fileFilter //Apply the 'fileFilter' filter to the upload multer .
});
