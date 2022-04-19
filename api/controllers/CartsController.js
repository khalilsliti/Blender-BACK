
const Cart = require("../models/Cart");
const Customer = require("../models/User");
const ObjectId = require('mongoose').Types.ObjectId;

// Forms an array of all the Cart model schema paths excluding only private and protected paths .
const regex = /(^_)|(^at$)|(^orders$)|(^totalPrice$)|(^customer$)/; //Regex that matches private [prefixed with '_'] and protected [those that is not meant to be set by an input .] paths .
const schemaPaths = Object.getOwnPropertyNames(Cart.prototype.schema.paths).filter(item => ! regex.test(item));


const pageSize = 12 ; // Size of pool products on a page .

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

module.exports.getAll = (req,res,next) => {

    ( 
        async  () => {

            const pageNum = Math.min( Math.max( 0 , req.params.page ) , Number.MAX_SAFE_INTEGER );

            if ( isNaN(pageNum) )
                 throw ( Object.assign(new Error("Invalid page number .") , {status : 400}) );

            let querry = {};

            if( req.user.role !== 'admin' ) //Only admin is authz to get all the carts infos .
                {
                     if ( req.user.role !== 'customer' )
                        throw ( Object.assign(new Error("Forbidden .") , {status : 403}) ); // If not an admin and not a customer you are forbidden to see any carts .
        
                    querry = { _id : { $in : req.user.carts } }; //If you the connected user is a customer then it can only observe its own list of carts .
                }

            const carts =  await Cart.find( querry ).skip( pageSize * pageNum ).limit( pageSize ).select("-__v").populate('orders customer',"-__v").lean().exec() ;
            res.status(200).json(carts);
            
         }
     )
     ().catch(next);

}; 

module.exports.post = (req , res , next) => {

    //Declaring newCart , this object will be saved to DB . 
    const newCart = {
        _id :  new ObjectId() ,
        customer : req.user._id
    };     
   
    (
        async () => { 

                    
            const reqBodyProperties = Object.getOwnPropertyNames(req.body);//populate reqBodyProperties with req.body property names .

            //Tests weither the req.body contains properties that respects the schema , in case there is at least one invalid property name an error of status 400 will be returned .
            // The message is obscure insuring security by obscurity concept .
            //This helps protect special paths that are not meant to be altered by an input and determined by the backend app logic .
            if( ! require("../functions/isArrEquals")( reqBodyProperties , schemaPaths ) )
                throw ( Object.assign(new Error("Invalid input .") , {status : 400}) );

            
                //Populating the newCart with values from the request body that matches the schema paths and ignoring other values .
                schemaPaths.forEach(item => {
                    if(  req.body[item] != undefined  )
                        newCart[item] = req.body[item];
                });

            if( ! ObjectId.isValid(newCart.customer) )
                throw ( Object.assign(new Error("CUSTOMER ID is invalid .") , {status : 400}) );

            const customer = await Customer.findById(newCart.customer).exec();

            if(customer == null)
                throw ( Object.assign(new Error("Customer not found .") , {status : 404}) );
            
            if( customer.role !== 'customer' )
               throw ( Object.assign(new Error("Not a customer .") , {status : 400}) );

            const cart = await new Cart(newCart).save({select : {__v : -1 }});
            await Customer.updateOne({_id : newCart.customer} , {$addToSet : {carts : newCart._id} } , updateOps).exec();//Push the new cart to the list of cart made by the customer . 

            res.status(201).json(cart); 
    })()
    .catch(next)

};


module.exports.delete = (req , res , next) => {

    const cartId = req.params.id ;
    const customerId = req.user._id ;

    (
        async () => {
            
            //Tests weither the given ID in the URL can be a valid ObjectID or not , in case it cannot be a valid ObjectID an error with status 400 is returned and no need to query the DB .
            if(! ObjectId.isValid(cartId) )
                throw ( Object.assign(new Error("Cart ID is invalid .") , {status : 400}) );

            
            if(! ObjectId.isValid( customerId ) )
                throw ( Object.assign(new Error("Customer ID is invalid .") , {status : 400}) );    

            const carts = req.user.carts.map(element => 
                element = element.toString()
            );

            if( ! carts.includes(cartId) )
                throw ( Object.assign(new Error("Cart not found .") , {status : 404}) );    
    
            const deletedCart = await Cart.findOneAndRemove( { _id : cartId } , deleteOps ).exec();

           if(deletedCart == null)
                throw ( Object.assign(new Error("Cart not found .") , {status : 404}) );

            
                await Customer.updateOne({_id : deletedCart.customer} , {$pull : {carts : deletedCart._id}  } , updateOps).exec();//Pull the removed cart from the cart list of the customer . 
            

            res.status(201).json(deletedCart);
        }
    )().catch(next)
  

};