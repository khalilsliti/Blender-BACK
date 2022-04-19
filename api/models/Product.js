
const mongoose = require('mongoose');


const productSchema = new mongoose.Schema({
    _id /*protected*/ : mongoose.Schema.Types.ObjectId,
    label: { 
        type: String ,
          required: true ,
          trim : true ,
          lowercase : true ,
           maxLength : 20
         },

    store /*protected*/ : {
        type : mongoose.Schema.Types.ObjectId ,
        required : true ,
        ref : 'Store'
    }
    ,

    quantity : {
        type: Number ,
        required : true ,
        min : 1 
    } ,

    imgPath /*protected*/ : {
        type : String ,
        trim : true 
    } ,

    unit : {
        type : String ,
        trim : true ,
        required : true ,
        lowercase : true ,
        enum: ['g', 'l' , 'kg' , 'piece'] ,
        default : 'piece'
    } ,
    unitPrice : {
        type : Number ,
        required : true ,
        min : 0
    } ,
    detail : {
        type : String ,
        required : true ,
        trim : true ,
        lowercase : true ,
        maxLength : 200 
    } ,
    keywords : [String] ,

    createdAt /*protected*/  : {
        type : Date ,
        required : true ,
        default : new Date()
    } ,
    categories : [
        {
            type : String ,
            trim : true ,
            lowercase : true ,
            maxLength : 20 
        }
    ] ,
    orders /*protected*/ : [{
        type : mongoose.Schema.Types.ObjectId ,
        ref : 'Order'
    }]

});

module.exports = mongoose.model('Product', productSchema);