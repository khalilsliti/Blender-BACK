
const Store = require("../models/Store");
const Owner = require("../models/User");
const ObjectId = require('mongoose').Types.ObjectId;
const {unlink} = require('fs'); 
// Forms an array of all the Store model schema paths excluding only private and protected paths .
const regex = /(^_)|(^imgPath$)|(^createdAt$)|(^products$)|(^owner$)/; //Regex that matches private [prefixed with '_'] and protected [those that is not meant to be set by an input .] paths .
const schemaPaths = Object.getOwnPropertyNames(Store.prototype.schema.paths).filter(item => ! regex.test(item));

//Mongoose update options .  
const updateOps = {
    useFindAndModify : false ,
    runValidators : true ,
    new :true
    };
//Mongoose delete options .         
const deleteOps  = {
    useFindAndModify : false
    };

const pageSize = 12 ; // Size of pool stores on a page .



module.exports.getAll = (req,res,next) => {

    ( 
        async  () => {
         
        const pageNum = Math.min( Math.max( 0 , req.params.page ) , Number.MAX_SAFE_INTEGER );

        if ( isNaN(pageNum) )
            throw ( Object.assign(new Error("Invalid page number .") , {status : 400}) );

         const stores =  await Store.find().skip( pageSize * pageNum ).limit( pageSize ).select("-__v").populate('products owner',"-__v").lean().exec() ;
         res.status(200).json(stores);
         
         }
     )
     ().catch(next);
        }; 

module.exports.post = (req , res , next) => {
    
    const newStore = {
        _id : req.id || new ObjectId() ,
        owner : req.user._id 
    };      
   

    const storeId = req.user.store ;

    (
       async () => { 

          
            
            //If an image is uploaded then its path must be included in the newProduct POJO to be saved in the DB .
            /// Note this init must be done before any throw operation .
            if(req.file != undefined)
                newStore.imgPath = req.file.path.replace(/\\/g,"/"); 

            if( storeId != undefined )
                throw ( Object.assign(new Error("You do own a store .") , {status : 400}) );
            
                const reqBodyProperties = Object.getOwnPropertyNames(req.body);//populate reqBodyProperties with req.body property names .
            
            //Tests weither the req.body contains properties that respects the schema , in case there is at least one invalid property name an error of status 400 will be returned .
            if( ! require("../functions/isArrEquals")(reqBodyProperties , schemaPaths ) )
                throw ( Object.assign(new Error("Invalid input .") , {status : 400}) );

             //Populating the newStore with values from the request body that matches the schema paths and ignoring other values .
            schemaPaths.forEach(item => {
                if(  req.body[item] != undefined )
                newStore[item] = req.body[item];
            });

            if( ! ObjectId.isValid(newStore.owner) )
                throw ( Object.assign(new Error("OWNER ID is invalid .") , {status : 400}) );

            const owner = await Owner.findById(newStore.owner).exec();

            if(owner == null)
                throw ( Object.assign(new Error("Owner not found .") , {status : 404}) );
            
            if( owner.role !== 'owner' )
                 throw ( Object.assign(new Error("Not a store owner .") , {status : 400}) );

            const store = await new Store(newStore).save({select : {__v : -1 }});
            await Owner.updateOne( {_id : owner._id} , {$set : {store : newStore._id}} , updateOps ).exec();

            res.status(201).json(store);
    })()
    .catch(err => {
        //If the none saved store have an image then it will be delted .
        if(newStore.imgPath != undefined) {
            unlink( newStore.imgPath , (error) => {
            if (error)
                err = error//Debuggin only , in production such error does not need to propagate to API users , it needs to be logged locally since it  won't affect the API users . 
            });
        }

      next(err); //Throw the error to the ErrorHandler .

  })


};


module.exports.put = (req , res , next) => {

    const storeId = req.user.store ;
    const updateStore = {} ;

   

    (
        async () => {

            //If an image is uploaded then its path must be included in the newProduct POJO to be saved in the DB .
            if(req.file != undefined)
               updateStore.imgPath = req.file.path.replace(/\\/g,"/") ;
            
            if( storeId == undefined )
               throw ( Object.assign(new Error("You do not own a store .") , {status : 400}) );

             //Tests weither the given ID in the URL can be a valid ObjectID or not , in case it cannot be a valid ObjectID an error with status 400 is returned and no need to query the DB .
            if(! ObjectId.isValid(storeId) )
                throw ( Object.assign(new Error("Store ID is invalid .") , {status : 400}) );

            //Tests weither the req.body contains properties that respects the schema , in case there is at least one invalid property name an error of status 400 will be returned .
            const reqBodyProperties = Object.getOwnPropertyNames(req.body);//populate reqBodyProperties with req.body property names .
            if( ! require("../functions/isArrEquals")(reqBodyProperties , schemaPaths ) )
                throw ( Object.assign(new Error("Invalid input .") , {status : 400}) );
          
         
                 
            //Dynamically populating the updateStore with the new values that confirms with the Store schema .
            schemaPaths.forEach(item => {

                if( req.body[item] != undefined  )
                  updateStore[item] = req.body[item]
            });

            
            //Saving the updateStore
       
            const updatedStore = await Store.findByIdAndUpdate( storeId , updateStore , updateOps ).exec();

            if(updatedStore == null)
               throw ( Object.assign(new Error("Store not found .") , {status : 404}) );


            res.status(201).json(updatedStore);
        }
    )
    ().catch(next);

};

module.exports.delete = (req , res , next) => {

    const storeId = req.user.store ;
    
    (
        async () => {

            if( storeId == undefined )
               throw ( Object.assign(new Error("You do not own a store .") , {status : 400}) );

          
            //Tests weither the given ID in the URL can be a valid ObjectID or not , in case it cannot be a valid ObjectID an error with status 400 is returned and no need to query the DB .
            if(! ObjectId.isValid(storeId) )
              throw ( Object.assign(new Error("Store ID is invalid .") , {status : 400}) );


           const deletedStore = await Store.findOneAndRemove( { _id : storeId } , deleteOps ).exec();

           if(deletedStore == null)
                throw ( Object.assign(new Error("Store not found .") , {status : 404}) );

            await Owner.updateOne( {_id : deletedStore.owner} , {$unset : {store : deletedStore._id}} , updateOps ).exec();
            //If store have an image then it will be delted .
            if(deletedStore.imgPath != undefined) {
              
                unlink( deletedStore.imgPath , (err) => {
                    if (err)
                    throw ( err ); //Debuggin only , in production such error does not need to propagate to API users , it needs to be logged locally since it is won't affect the API users . 
                });
            
            }
            res.status(201).json(deletedStore);
        }
    )
    ().catch(next);

};