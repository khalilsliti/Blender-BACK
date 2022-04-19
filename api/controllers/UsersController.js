
const User = require("../models/User");
const Product = require("../models/Product");
const ObjectId = require('mongoose').Types.ObjectId;
const {unlink} = require('fs'); 
// Forms an array of all the User model schema paths excluding only private and protected paths .
const regex = /(^_)|(^imgPath$)|(^at$)|(^carts$)|(^store$)/; //Regex that matches private [prefixed with '_'] and protected [those that is not meant to be set by an input .] paths .
const schemaPaths = Object.getOwnPropertyNames(User.prototype.schema.paths).filter(item => ! regex.test(item)).concat('password');

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

module.exports.getProducts = (req , res , next) => {
    
    (
        async () => {

            const pageNum = Math.min( Math.max( 0 , req.params.page ) , Number.MAX_SAFE_INTEGER );

            if ( isNaN(pageNum) )
                throw ( Object.assign(new Error("Invalid page number .") , {status : 400}) );
            
            const querry = {store : req.user.store};

            const products =  await Product.find( querry ).skip( pageSize * pageNum ).limit( pageSize ).select("-__v").populate('store orders',"-__v").lean().exec() ;
            res.status(200).json(products);

    })
    ().catch(next);
        
}

module.exports.getAll = (req,res,next) => {
    

        ( 
            async  () => {

                let querry = {};

                if( req.user.role !== 'admin' ) //Only admin is authz to get all the users infos .
                    querry = {_id : req.user._id };

                const users =  await User.find( querry ).select("-__v").populate('store carts',"-__v").lean().exec() ;
                res.status(200).json(users);
            
            }
        )
        ().catch(next);
    



}

module.exports.post = (req , res , next) => {

    //Declaring newUser , this object will be saved to DB . 
    const newUser = {
        _id : req.id || new ObjectId() 
    };     
   
    (
        async () => { 

         
        //If an image is uploaded then its path must be included in the newUser POJO to be saved in the DB .
        /// Note this init must be done before any throw operation .
        if(req.file != undefined)
            newUser.imgPath = req.file.path.replace(/\\/g,"/"); 
                
        const reqBodyProperties = Object.getOwnPropertyNames(req.body);//populate reqBodyProperties with req.body property names .

        //Tests weither the req.body contains properties that respects the schema , in case there is at least one invalid property name an error of status 400 will be returned .
        // The message is obscure insuring security by obscurity concept .
        //This helps protect special paths that are not meant to be altered by an input and determined by the backend app logic .
        if( ! require("../functions/isArrEquals")(reqBodyProperties , schemaPaths ) )
            throw ( Object.assign(new Error("Invalid input .") , {status : 400}) );
     
     
         //Populating the newUser with values from the request body that matches the schema paths and ignoring other values .
         schemaPaths.forEach(item => {
             if(  req.body[item] != undefined )
                 newUser[item] = req.body[item];
         });
         
          //Looks for duplicated data such us email or phone number or username .
        const query = await User.find({ $or: [ { email : newUser.email } ,{ username : newUser.username }, {phone : newUser.phone }] });
        if ( query.length > 0 ){
            throw ( Object.assign(new Error("Email , Username or phone number are duplicated .") , {status : 400}) ); 
        }

      
        const user = await User.register(newUser , newUser.password);
        
        res.status(201).json(user); 
          
        
    })()
    .catch(err => {
          //If the none saved user have an image then it will be delted .
        if(newUser.imgPath != undefined) {
            unlink( newUser.imgPath , (error) => {
                if (error)
                err = error//Debuggin only , in userion such error does not need to propagate to API users , it needs to be logged locally since it  won't affect the API users . 
            });
        }

        next(err); //Throw the error to the ErrorHandler .

    })

};


module.exports.put = (req , res , next) => {


    const userId = req.user._id ;  // Takes the conncted user ID .
    const updateUser = {} ;


    (
        async () => {
            
            
            //If an image is uploaded then its path must be included in the newUser POJO to be saved in the DB .
            if(req.file != undefined )
               updateUser.imgPath = req.file.path.replace(/\\/g,"/"); 
                 

            //Tests weither the given ID can be a valid ObjectID or not , in case it cannot be a valid ObjectID an error with status 400 is returned and no need to query the DB .
            if(! ObjectId.isValid(userId) )
             throw ( Object.assign(new Error("User ID is invalid .") , {status : 400}) );

            const reqBodyProperties = Object.getOwnPropertyNames(req.body);//populate reqBodyProperties with req.body property names .
            //Tests weither the req.body contains properties that respects the schema , in case there is at least one invalid property name an error of status 400 will be returned .
            if( ! require("../functions/isArrEquals")(reqBodyProperties , schemaPaths.concat('newPassword') ) )
                throw ( Object.assign(new Error("Invalid input .") , {status : 400}) );

            //Dynamically populating the updateUser with the new values that confirms with the User schema .
            schemaPaths.concat('newPassword').forEach(item => {
                if( req.body[item] != undefined  && item !== 'username' && item !== 'role' ) //username / role cannot be altered .
                   updateUser[item] = req.body[item]
            });

            //Looks for duplicated data such us email or phone number .
            const query = await User.find({ $or: [ { email : updateUser.email } , {phone : updateUser.phone }] });
            if ( query.length > 0 ){
                throw ( Object.assign(new Error("Email , Username or phone number are duplicated .") , {status : 400}) ); 
            }
         
            const user = await User.findById( userId ).exec();
            
            if(user == null)
               throw ( Object.assign(new Error("User not found .") , {status : 404}) );



            if ( updateUser.password != undefined  && updateUser.newPassword != undefined  )
                await user.changePassword( updateUser.password , updateUser.newPassword );   


            const updatedUser = await User.findByIdAndUpdate( userId , updateUser , updateOps ).exec();


            

            res.status(201).json(updatedUser);
        }
    )
    ().catch(next);

};

module.exports.delete = (req , res , next) => {


    const userId = req.user._id ; // Takes the conncted user ID .

    (
        async () => {
            
            //Tests weither the given User ID can be a valid ObjectID or not , in case it cannot be a valid ObjectID an error with status 400 is returned and no need to query the DB .
            if(! ObjectId.isValid(userId) )
               throw ( Object.assign(new Error("User ID is invalid .") , {status : 400}) );

            const deletedUser = await User.findOneAndRemove( { _id :  userId } , deleteOps ).exec();

           if(deletedUser == null)
                throw ( Object.assign(new Error("User not found .") , {status : 404}) );
         

            

            //If user have an image then it will be delted only if all the operations above succedes .
            if(  deletedUser.imgPath != undefined ) {
             
                unlink( deletedUser.imgPath , (err) => {
                    if (err)
                    throw ( err ); //Debugging only , in production such error does not need to propagate to API users , it needs to be logged locally since it is won't affect the API users . 
                });
            
            }

            req.logout(); // Logout a user after deleting their account .

            res.status(201).json(deletedUser);
        }
    )().catch(next)
  

};

module.exports.login = ( req , res , next) => {

    console.log(`User ${req.user.username} authenticated at ${new Date().toString()}`);

    res.status(200).json({
        message : `welcome ${req.user.username}`
    })

};

module.exports.logout = ( req , res , next) => {

    req.logout(); //Visit http://www.passportjs.org/docs/logout/ .

    res.status(200).json({
        message : `Logged out .`
    })

};