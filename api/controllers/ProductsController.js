
const Product = require("../models/Product");
const Store = require('../models/Store');
const ObjectId = require('mongoose').Types.ObjectId;
const {unlink} = require('fs'); 
// Forms an array of all the Product model schema paths excluding only private and protected paths .
const regex = /(^_)|(^imgPath$)|(^createdAt$)|(^orders$)|(^store$)/; //Regex that matches private [prefixed with '_'] and protected [those that is not meant to be set by an input .] paths .
const schemaPaths = Object.getOwnPropertyNames(Product.prototype.schema.paths).filter(item => ! regex.test(item));

//Mongoose update options .

const pageSize = 12 ; // Size of pool products on a page .

const updateOps = {
    useFindAndModify : false ,
    runValidators : true ,
    new :true
    };
//Mongoose delete options .         
const deleteOps  = {
    useFindAndModify : false
    };


module.exports.getStoreProducts = (req , res , next) => {
    const storeId = req.params.id ;
        (
            async () => {
    
                const pageNum = Math.min( Math.max( 0 , req.params.page ) , Number.MAX_SAFE_INTEGER );
    
                if ( isNaN(pageNum) )
                    throw ( Object.assign(new Error("Invalid page number .") , {status : 400}) );

                  //Tests weither the given ID in the URL can be a valid ObjectID or not , in case it cannot be a valid ObjectID an error with status 400 is returned and no need to query the DB .
                if(! ObjectId.isValid(storeId) )
                    throw ( Object.assign(new Error("Store ID is invalid .") , {status : 400}) );

               // The store and Product ID are valid , this block will querry the DB to find the store doc and checks if the productID is an ID of a product owned by the connected sotre owner store .
               const result = await Store.findById( storeId ).lean().exec() ;
                             
               if(result == null)
                     throw ( Object.assign(new Error(` Store not found .`) , {status : 404}) );//If no document is found a not found response is sent back with 404 status code .

                const querry = {store : storeId };
    
                const products =  await Product.find( querry ).skip( pageSize * pageNum ).limit( pageSize ).select("-__v").populate('store orders',"-__v").lean().exec() ;
                res.status(200).json(products);
    
        })
        ().catch(next);
            
    }

module.exports.getAll = (req,res,next) => {

    ( 
        async  () => {

         const pageNum = Math.min( Math.max( 0 , req.params.page ) , Number.MAX_SAFE_INTEGER );

         if ( isNaN(pageNum) )
              throw ( Object.assign(new Error("Invalid page number .") , {status : 400}) );
      
         const products =  await Product.find().skip( pageSize * pageNum ).limit( pageSize ).select("-__v").populate('store orders',"-__v").lean().exec() ;
         res.status(200).json(products);
         
         }
     )
     ().catch(next);
        }; 

module.exports.post = (req , res , next) => {

    //Declaring newProduct , this object will be saved to DB . 
    const newProduct = {
        _id : req.id || new ObjectId() ,
        store : req.user.store
    };     
   
    (
        async () => { 

         
        //If an image is uploaded then its path must be included in the newProduct POJO to be saved in the DB .
        /// Note this init must be done before any throw operation .
        if(req.file != undefined)
            newProduct.imgPath = req.file.path.replace(/\\/g,"/"); 
                
        const reqBodyProperties = Object.getOwnPropertyNames(req.body);//populate reqBodyProperties with req.body property names .

        //Tests weither the req.body contains properties that respects the schema , in case there is at least one invalid property name an error of status 400 will be returned .
        // The message is obscure insuring security by obscurity concept .
        //This helps protect special paths that are not meant to be altered by an input and determined by the backend app logic .
        if( ! require("../functions/isArrEquals")(reqBodyProperties , schemaPaths ) )
            throw ( Object.assign(new Error("Invalid input .") , {status : 400}) );
     
     
         //Populating the newProduct with values from the request body that matches the schema paths and ignoring other values .
         schemaPaths.forEach(item => {
             if(  req.body[item] != undefined )
                 newProduct[item] = req.body[item];
         });
     
         //Tests weither the given ID in the URL can be a valid ObjectID or not , in case it cannot be a valid ObjectID an error with status 400 is returned and no need to query the DB .
      
         if( newProduct.store == undefined )
          throw ( Object.assign(new Error("You do not own a store .") , {status : 400}) );
      
         if(! ObjectId.isValid(newProduct.store) )
            throw ( Object.assign(new Error("Store ID is invalid .") , {status : 400}) );

        const store = await Store.findById(newProduct.store).exec();

        if(store == null)
            throw ( Object.assign(new Error("Store not found .") , {status : 404}) );

        const product = await new Product(newProduct).save({select : {__v : -1 }});

        await Store.updateOne({_id : newProduct.store} , {$addToSet : {products : newProduct._id}} , updateOps).exec();//Push the new product to the list of products owned by the given store . 

        res.status(201).json(product); 
    })()
    .catch(err => {
          //If the none saved product have an image then it will be delted .
        if(newProduct.imgPath != undefined) {
            unlink( newProduct.imgPath , (error) => {
                if (error)
                err = error//Debuggin only , in production such error does not need to propagate to API users , it needs to be logged locally since it  won't affect the API users . 
            });
        }

        next(err); //Throw the error to the ErrorHandler .

    })

};


module.exports.put = (req , res , next) => {

    const productId = req.params.id ;
    const storeId = req.user.store ;
    const updateProduct = {} ;


    (
        async () => {
            
            
            //If an image is uploaded then its path must be included in the newProduct POJO to be saved in the DB .
            if(req.file != undefined )
               updateProduct.imgPath = req.file.path.replace(/\\/g,"/"); 
             
            if( storeId == undefined )
               throw ( Object.assign(new Error("You do not own a store .") , {status : 400}) );
           
            if(! ObjectId.isValid(storeId) )
                 throw ( Object.assign(new Error("Store ID is invalid .") , {status : 400}) );

            //Tests weither the given ID in the URL can be a valid ObjectID or not , in case it cannot be a valid ObjectID an error with status 400 is returned and no need to query the DB .
            if(! ObjectId.isValid(productId) )
               throw ( Object.assign(new Error("Product ID is invalid .") , {status : 400}) );

            // The store and Product ID are valid , this block will querry the DB to find the store doc and checks if the productID is an ID of a product owned by the connected sotre owner store .
            const result = await Store.findById( storeId ).lean().exec() ;
                          
            if(result == null)
                  throw ( Object.assign(new Error(` Store not found .`) , {status : 404}) );//If no document is found a not found response is sent back with 404 status code .
            
            // products property of store doc is ann array of ObjectId , this block casts each ObjectId to its string value to check if the string value of the ProductId is invcluded in the products .
            result.products = result.products.map(element => 
                    element = element.toString()
                );

            if (! result.products.includes(productId) )
              throw ( Object.assign(new Error(` Not found .`) , {status : 404}) );//If no document is found a not found response is sent back with 404 status code .
        


            const reqBodyProperties = Object.getOwnPropertyNames(req.body);//populate reqBodyProperties with req.body property names .
            //Tests weither the req.body contains properties that respects the schema , in case there is at least one invalid property name an error of status 400 will be returned .
            if( ! require("../functions/isArrEquals")(reqBodyProperties , schemaPaths ) )
                throw ( Object.assign(new Error("Invalid input .") , {status : 400}) );

            //Dynamically populating the updateProduct with the new values that confirms with the Product schema .
            schemaPaths.forEach(item => {
                if( req.body[item] != undefined && item !== 'store' ) //sotreId cannot be altered .
                   updateProduct[item] = req.body[item]
            });

         
            const updatedProduct = await Product.findByIdAndUpdate( productId , updateProduct , updateOps ).exec();

            if(updatedProduct == null)
               throw ( Object.assign(new Error("Product not found .") , {status : 404}) );


            res.status(201).json(updatedProduct);
        }
    )
    ().catch(next);

};

module.exports.delete = (req , res , next) => {

    const productId = req.params.id ;
    const storeId = req.user.store ;

    (
        async () => {
            
            if( storeId == undefined )
               throw ( Object.assign(new Error("You do not own a store .") , {status : 400}) );
           
            if(! ObjectId.isValid(storeId) )
                 throw ( Object.assign(new Error("Store ID is invalid .") , {status : 400}) );


            //Tests weither the given ID in the URL can be a valid ObjectID or not , in case it cannot be a valid ObjectID an error with status 400 is returned and no need to query the DB .
            if(! ObjectId.isValid(productId) )
                throw ( Object.assign(new Error("Product ID is invalid .") , {status : 400}) );

            const result = await Store.findById( storeId ).lean().exec() ;
                          
            if(result == null)
                  throw ( Object.assign(new Error(` Store not found .`) , {status : 404}) );//If no document is found a not found response is sent back with 404 status code .
            
            result.products = result.products.map(element => 
                    element = element.toString()
                );

            if (! result.products.includes(productId) )
              throw ( Object.assign(new Error(` Not found .`) , {status : 404}) );//If no document is found a not found response is sent back with 404 status code .
        


            const deletedProduct = await Product.findByIdAndRemove( productId , deleteOps ).exec();

           if(deletedProduct == null)
                throw ( Object.assign(new Error("Product not found .") , {status : 404}) );

            await Store.updateOne({_id : deletedProduct.store} , {$pull : {products : deletedProduct._id}} , updateOps).exec();//Push the new product to the list of products owned by the given store . 

            //If product have an image then it will be delted only if all the operations above succedes .
            if(  deletedProduct.imgPath != undefined ) {
             
                unlink( deletedProduct.imgPath , (err) => {
                    if (err)
                    throw ( err ); //Debugging only , in production such error does not need to propagate to API users , it needs to be logged locally since it is won't affect the API users . 
                });
            
            }

            res.status(201).json(deletedProduct);
        }
    )().catch(next)
  

};