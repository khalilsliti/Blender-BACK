
require('dotenv').config();
const express = require('express');
const app = express();
const morgan = require('morgan');
const mongoose = require('mongoose');

// Mongoose configuration 
mongoose.set('useNewUrlParser', true); // Ensures using the new Url parser of the MogoDB driver .
mongoose.set('useUnifiedTopology', true); // Uses the new MongoDB unified topology .
mongoose.set('useFindAndModify', false); // Avoid deprecation caused by using findAndModify .
mongoose.set('useCreateIndex', true); // Avoid deprecation caused by using collection.ensureIndex and use collection.Createindex insted . 
mongoose.Promise = global.Promise; //Setting the mongoose promises to JS global promises .

const session = require('express-session');
const auth = require('./api/middlewares/auth');
const cors = require('./api/middlewares/httpControl');

//Routers
const productsRouter = require('./api/routes/ProductsRouter');
const storesRouter = require('./api/routes/StoresRouter');
const ordersRouter = require('./api/routes/OrdersRouter');
const cartsRouter = require('./api/routes/CartsRouter');
const usersRouter = require('./api/routes/UsersRouter');


//DB
const user =  { username : process.env.DB_USERNAME , password : process.env.DB_PWD }; //DB user .
const db = process.env.DB_NAME ; //DB name .

const uri = `mongodb+srv://${encodeURIComponent(user.username)}:${encodeURIComponent(user.password)}@${encodeURIComponent(process.env.DB_CLUSTER)}/${encodeURIComponent(db)}?retryWrites=true&w=majority`;

async function start() {

    //connecting to db .
    console.log(`Connecting to DB "${db}" ...`);
    const connection = await mongoose.connect(uri);
    console.log(`Connected to DB "${db}" as "${user.username}" at ${new Date().toDateString()}.`);   

    /* If the connection to db failed it will throw an error which will break the execution of this function and will be catched with start().catch()
        Then one single middleware will be added to the stack and will match any given path and response with a 503 response indicating the unavailability of the service .
    */

    /* If the connection is established successfully then these middlewares gonna be added to the stack and the middleware of 503 response will not */

    //Middlewares

    app.use(morgan('dev')); //Http request Logger .
    app.use(express.json()); //JSON parser .
    app.use('/uploads', express.static('uploads')); //uploads is a static folder .
    app.use(session({secret : process.env.SESSION_SECRET ,resave: false,saveUninitialized: false}));
    app.use(auth.initialize());
    app.use(auth.session());
    app.use(cors); //CORS specification .


    //Routes .


    app.use( "/products" , productsRouter );
    app.use( "/stores" , storesRouter );
    app.use( "/orders" , ordersRouter );
    app.use( "/carts" , cartsRouter );
    app.use( '/users' , usersRouter );

    //Requested resource does not match any route .
    app.use((req, res, next) => {
        throw  ( Object.assign( new Error("Not found") , {status : 404 } ) );
    });
    

    //Error handler .
    app.use((error, req, res, next) => {
        console.error(error); //Log the error stack trace to stderr .
        //Send an error back to client with the corresponding http status code if specified otherwise code 500 will be chosen .
        res.status(error.status || 500).json({
        error: {
            message: error.message
        }
        });
    });

}

      


 //connecting to the DB .
 //If failed then the error stack trace will be logged in the stderr and the server will response to any request on any resource with a 503 http response .
start().catch(err => {

    console.error(err);  

    app.use((req , res , next) => {
    res.status(503).json({
        error: {
          message: "Service is temporarily unavailable ."
        }
      });
});

}); 






//exporting the app object .
module.exports = app;