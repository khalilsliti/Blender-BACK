
const Order = require("../models/Order");
const Product = require('../models/Product');
const Store = require('../models/Store');
const Cart = require('../models/Cart');
const ObjectId = require('mongoose').Types.ObjectId;
const { query } = require("express");

// Forms an array of all the Order model schema paths excluding only private and protected paths .
const regex = /(^_)|(^at$)|(^totalPrice$)|(^store$)/; //Regex that matches private [prefixed with '_'] and protected [those that is not meant to be set by an input .] paths .
const schemaPaths = Object.getOwnPropertyNames(Order.prototype.schema.paths).filter(item => ! regex.test(item));


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

        if( req.user.role !== 'admin' ) //Only admin is authz to get all the orders infos .
            {
                if ( req.user.role == 'customer' ){
                  querry = { cart : { $in : req.user.carts } }; //If you the connected user is a customer then it can only observe its own list of orders .
                }else if ( req.user.role == 'owner' ) {
                  querry = { store : req.user.store };   //If you the connected user is a store owner then it can only observe a list of its related orders .
                }else{
                    throw ( Object.assign(new Error("Forbidden .") , {status : 403}) ); // If not an admin , not a customer or an owner you are forbidden to see any orders .
                }

            }

         const orders =  await Order.find( querry ).skip( pageSize * pageNum ).limit( pageSize ).select("-__v").populate('product cart',"-__v").populate({ path: 'cart', populate: { path: 'customer' }}).lean().exec() ;
         res.status(200).json(orders);
         
         }
     )
     ().catch(next);

}; 

module.exports.post = (req , res , next) => {

    //Declaring newOrder , this object will be saved to DB . 
    const newOrder = {
        _id :  new ObjectId() 
    };     
    
    let updatedProduct = null , product = null;

    (
        async () => { 

                    
            const reqBodyProperties = Object.getOwnPropertyNames(req.body);//populate reqBodyProperties with req.body property names .

            //Tests weither the req.body contains properties that respects the schema , in case there is at least one invalid property name an error of status 400 will be returned .
            // The message is obscure insuring security by obscurity concept .
            //This helps protect special paths that are not meant to be altered by an input and determined by the backend app logic .
            if( ! require("../functions/isArrEquals")( reqBodyProperties , schemaPaths ) )
                throw ( Object.assign(new Error("Invalid input .") , {status : 400}) );
        
        
            //Populating the newOrder with values from the request body that matches the schema paths and ignoring other values .
            schemaPaths.forEach(item => {
                if(  req.body[item] != undefined && item !== 'accepted' ) //Any new order initially is unaccepted , it can be accepted by the store owne later on .
                    newOrder[item] = req.body[item];
            });
        
            //Tests weither the given Cart ID  can be a valid ObjectID or not , in case it cannot be a valid ObjectID an error with status 400 is returned and no need to query the DB .


            if(! ObjectId.isValid(newOrder.cart) )
                throw ( Object.assign(new Error("Cart ID is invalid .") , {status : 400}) );    

            // If the order Id is not included in the list of carts owned by the connected customer  an error must be thrown .

            const carts = req.user.carts.map(element => 
                element = element.toString() //Casts ObjectId to String
            );

            if( ! carts.includes(newOrder.cart) )
                throw ( Object.assign(new Error("Cart not found .") , {status : 404}) );    

             if(! ObjectId.isValid(newOrder.product) )
                throw ( Object.assign(new Error("Product ID is invalid .") , {status : 400}) );
            
             product = await Product.findById(newOrder.product).exec();

            if(product == null)
                throw ( Object.assign(new Error("Product not found .") , {status : 404}) );

            if( newOrder.quantity > product.quantity )
                throw ( Object.assign(new Error("Product available quantity exceeded .") , {status : 400}) );

             updatedProduct = await Product.findByIdAndUpdate(newOrder.product , {$inc : {quantity : - newOrder.quantity}} , updateOps).exec();//Decrement the ordered qunatity from the product available quantity .
            
            newOrder.totalPrice = product.unitPrice * newOrder.quantity ; //totalPrice 

            newOrder.store = product.store ;        
        
            const order = await new Order(newOrder).save({select : {__v : -1 }});

            await Product.updateOne({_id : newOrder.product} , {$addToSet : {orders : newOrder._id}} , updateOps).exec();//Push the new order to the list of orders of the product . 
            await Cart.updateOne({_id : newOrder.cart} , {$addToSet : {orders : newOrder._id} , $inc : {totalPrice : newOrder.totalPrice}} , updateOps).exec();//Push the new order to the list of orders of the cart . 


            res.status(201).json(order); 
    })()
    .catch(err => {

        if(updatedProduct && product && product.quantity > updatedProduct.quantity ) {
            (    
                async () => {

                    await Product.findByIdAndUpdate(updatedProduct._id , {$inc : {quantity :  newOrder.quantity}} , updateOps).exec();//Increment the ordered qunatity from the product available quantity in case of an error.

                })()
                .catch(error => {err = error})
            
            }
        
        next(err);
    
  })

};


module.exports.put = (req , res , next) => {

    const orderId = req.params.id ;
    const updateOrder = {} ;
    const storeId = req.user.store ;

    (
        async () => {

            //Tests weither the given ID in the URL can be a valid ObjectID or not , in case it cannot be a valid ObjectID an error with status 400 is returned and no need to query the DB .
            if(! ObjectId.isValid(orderId) )
                throw ( Object.assign(new Error("Order ID is invalid .") , {status : 400}) );

            

            const reqBodyProperties = Object.getOwnPropertyNames(req.body);//populate reqBodyProperties with req.body property names .
            //Tests weither the req.body contains properties that respects the schema , in case there is at least one invalid property name an error of status 400 will be returned .
            if( ! require("../functions/isArrEquals")(reqBodyProperties , schemaPaths ) )
                throw ( Object.assign(new Error("Invalid input .") , {status : 400}) );

            //Dynamically populating the updateOrder with the new values that confirms with the Order schema .
            schemaPaths.forEach(item => {
                if( req.body[item] != undefined && item !== 'product' && item !== 'cart' && item !== 'quantity' ) //product/cart id and quantity cannot be altered .
                   updateOrder[item] = req.body[item]
            });

            const order = await Order.findById(orderId).lean().exec();
            
            if( order == null )
             throw ( Object.assign(new Error("Order not found .") , {status : 404}) );

            if( storeId == undefined )
              throw ( Object.assign(new Error("You do not own a store .") , {status : 400}) );
        
         if(! ObjectId.isValid( storeId ) )
              throw ( Object.assign(new Error("Store ID is invalid .") , {status : 400}) );


         const result = await Store.findById( storeId ).lean().exec() ;
                       
         if(result == null)
               throw ( Object.assign(new Error(` Store not found .`) , {status : 404}) );//If no document is found a not found response is sent back with 404 status code .
         
         result.products = result.products.map(element => 
                 element = element.toString()
             );

         if (! result.products.includes(order.product.toString()) )
           throw ( Object.assign(new Error(`Product not found .`) , {status : 404}) );//If no document is found a not found response is sent back with 404 status code .
     
        
       const updatedOrder = await Order.findByIdAndUpdate( orderId , updateOrder , updateOps ).exec();

            if(updatedOrder == null)
               throw ( Object.assign(new Error("Order not found .") , {status : 404}) );


            res.status(201).json(updatedOrder);
        }
    )
    ().catch(next);

};

module.exports.delete = (req , res , next) => {

    const orderId = req.params.id ;

    (
        async () => {
            
            //Tests weither the given ID in the URL can be a valid ObjectID or not , in case it cannot be a valid ObjectID an error with status 400 is returned and no need to query the DB .
            if(! ObjectId.isValid(orderId) )
                throw ( Object.assign(new Error("Order ID is invalid .") , {status : 400}) );

            // If the order Id is not included in the list of carts owned by the connected customer  an error must be thrown .    
          
            const order = await Order.findById(orderId).lean().exec();
            
            if(order == null)
                throw ( Object.assign(new Error("Order not found .") , {status : 404}) );

            const carts = req.user.carts.map(element => 
                element = element.toString()
            );

            if( ! carts.includes(order.cart) )
             throw ( Object.assign(new Error("Cart not found .") , {status : 404}) );        
    


            const deletedOrder = await Order.findOneAndRemove( { _id : orderId } , deleteOps ).exec();

           if(deletedOrder == null)
                throw ( Object.assign(new Error("Order not found .") , {status : 404}) );
        
            await Cart.updateOne({_id : deletedOrder.cart} , {$pull : {orders : deletedOrder._id}  ,  $inc : {totalPrice :  - deletedOrder.totalPrice } } , updateOps).exec();//Pull the removed order from the cart list of orders . 
           
           
            res.status(201).json(deletedOrder);
        }
    )().catch(next)
  

};