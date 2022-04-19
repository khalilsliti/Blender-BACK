
const mongoose = require('mongoose');
const Order = require("../models/Order");



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

const cartSchema = new mongoose.Schema({
    
    _id /*protected*/ : mongoose.Schema.Types.ObjectId ,

    
    totalPrice /* protected */ : {
        type : Number ,
        required : true ,
        default : 0 ,
        min : 0
    } ,
    

    customer /* protected */ : {
        type :  mongoose.Schema.Types.ObjectId ,
        ref : 'User' ,
        required : true
    } ,

    at /*protected*/  : {
        type : Date ,
        required : true ,
        default : new Date()
    } ,

    orders /*protected*/ : [{
        type : mongoose.Schema.Types.ObjectId ,
        ref : 'Order'
    }]

});

cartSchema.post('findOneAndRemove' , hookOps , async (deletedCart) => {

    await deletedCart.orders.forEach( async (id) => {
        await Order.findOneAndRemove( { _id : id } , deleteOps).exec(); 
    } );

  


})

module.exports = mongoose.model('Cart', cartSchema);