
const mongoose = require('mongoose');
const Product = require("../models/Product");



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

//Hook options .
const hookOps = {
     query : true ,
     document : false 
};

const orderSchema = new mongoose.Schema({
    
    _id /*protected*/ : mongoose.Schema.Types.ObjectId,


    
    store /*protected */ : {
        type : mongoose.Schema.Types.ObjectId ,
        ref : 'Store' ,
        required : true
    }
    ,


    totalPrice /* protected */ : {
        type : Number ,
        required : true ,
        default : 0 ,
        min : 0
    } ,

    quantity /*protected on update*/  : {
        type: Number ,
        required : true ,
        min : 1 
    } ,

    accepted /*protected on create */ : {
        type : Boolean ,
        default : false
    } ,
  
    at /*protected*/  : {
        type : Date ,
        required : true ,
        default : new Date()
    } ,

    product /*protected on update */  : {
        type : mongoose.Schema.Types.ObjectId ,
        ref : 'Product' ,
        required : true
    } ,

    cart /*protected on update */ : {
        type : mongoose.Schema.Types.ObjectId ,
        ref : 'Cart' ,
        required : true
    }

});


orderSchema.post('findOneAndRemove' , hookOps , async (deletedOrder) => {

    await Product.updateOne({_id : deletedOrder.product} , {$pull : {orders : deletedOrder._id} , $inc : {quantity :  deletedOrder.quantity} }    , updateOps).exec();//Pull the removed order from the product list of orders . 

})

module.exports = mongoose.model('Order', orderSchema);