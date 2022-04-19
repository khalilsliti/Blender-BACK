
//Visit https://www.npmjs.com/package/multer for full documentation .
    const multer = require('multer');

const Store = require("../models/Store");
const ObjectId = require('mongoose').Types.ObjectId;
const maxImgSize = 5 * 1024 * 1024 /* 5 MBs maximum file size .*/ ;



//Configuring multer .
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
    cb(null, `./uploads${req.baseUrl}`); //Images will be saved here locally based on the requested endpoint meaning users , stores and products images are in seperate dirs under 'uploads' .
    }
    ,
filename: function(req, file, cb) {


       

        //Since this works on various documents of differnet collections , determening their corresponding logic is a necessity.
        // This block determines the adequate logic to use by checking the requested endpoint .
        const extension = file.mimetype.slice(file.mimetype.indexOf('/') + 1) ; //Determines the extension of the file from the mimetype [Note this is for testing only , in production such action is a potential security threat since with a valid mimetype any file smaller than maxImgSize will be uploadid .].
       
        switch ( req.baseUrl ) {

            // PUT /users 
            case '/users' : 
                return cb(null, `${req.user._id}.${extension}` );//Image name is the connected user id 'ID.FILE_EXTENSION' .

            // PUT /stores
            case '/stores' :
                // If the connected store owner store ID is nullish no image will be updated to the server and a bad request error will be thrown .
                if( ! req.user.store )
                    return   cb(Object.assign(new Error("No store .") , {status : 400}) );
                
                return cb(null, `${req.user.store}.${extension}` );//Image name is the connected store owner store ID 'ID.FILE_EXTENSION' .
                
            //PUT /products/:id
            case '/products' :

              // If the connected store owner store ID is nullish no image will be updated to the server and a bad request error will be thrown .
                if( ! req.user.store )
                    return   cb(Object.assign(new Error("No store .") , {status : 400}) );
                
                const productId = req.params.id; // The product ID is given as a route parameter .

                //If the productId cannot be a valid ObjectId a bad request error is thrown and no image will be updated .
                if(! ObjectId.isValid( productId ) )
                    return cb(Object.assign(new Error("Invalid Product ID .") , {status : 400}) );

                // If the productId is a valid ObjectId .
                    (


                        async () => {
                            
                            // Querry the DB to find the store doc of the connected store owner .
                            const result = await Store.findById( req.user.store ).lean().exec() ;
                            
                            //If no store doc found a not found error will be thrown and no image will be updated .
                            if(result == null)
                                  throw ( Object.assign(new Error(` No store .`) , {status : 404}) );//If no document is found a not found response is sent back with 404 status code .
                            
                            //If the store doc exists , its products property will contain ObjectIds , this block casts ObjectIds to String values to check if the given productId which is a string is included in the list of products owned by the store owned by the connected store owner .

                            result.products = result.products.map(element => 
                                element = element.toString()
                            );

                            // If the productId is not an id of an owned product by the store owned by the connected store owner , an error must be thrown here a not found error is thrown since this does not mean necessarily that this is a forbidden request since it matches the cases in which the productId is not found .
                            if (! result.products.includes(productId) )
                              throw ( Object.assign(new Error(` Not found .`) , {status : 404}) );//If no document is found a not found response is sent back with 404 status code .
                        
                              cb(null, `${productId}.${extension}` );//Image name is the productId 'ID.FILE_EXTENSION' .
                        }
            
                    )().catch(cb) // If an error occures in the async funcion it will be cought by catch and passed to cb call back function as the first arg , since the object passed is not nullish then multerer will know that it's an error and will stop and throw it to the error handler.
                
                break;

            default : return cb(Object.assign(new Error("BAD REQUEST .") , {status : 400}) ); //By default , if no explicit endpoint matches then it is a bad request , note that this won't work since the 404 middleware in app.js will catch this before but it is a best practice to always add extra layers of restrictions . 
        }
    
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
