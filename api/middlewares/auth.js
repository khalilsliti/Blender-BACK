
// Visit http://www.passportjs.org/docs/ for full doc .
  const passport = require('passport');

const User = require("../models/User");

passport.use( User.createStrategy() );

passport.serializeUser(User.serializeUser());

passport.deserializeUser(User.deserializeUser());


//Checks if a user is already athenticated and there session is already established
passport.isAuth =  (req, res, next) =>  {
   
    // If the user is authenticated , then the next middleware in the stack is invoked otherwise an error will be thrown and cought by the error handler and no further middlewares will be invoked protecting Auth based routes .
    if (req.isAuthenticated()) 
      return next();
    
    next( Object.assign(new Error("Not logged in .") , {status : 401}));
}


//Checks if the user is not logged in and no session is established .
passport.isNotAuth =  (req, res, next) =>  {
  if (! req.isAuthenticated()) return next();
  
  next( Object.assign(new Error("Already logged in .") , {status : 403}));
}


//Checks if a User is logged in and that they are a customer .
passport.isCustomerAuth =  (req, res, next) =>  {
  if ( req.isAuthenticated() )
  {
    if( req.user.role === 'customer' ) //If the connected user is a customer the next middleware will be invoked otherwise an error will be thrown and cought by the error handler and no further middleware will be invoked protectign Authz based routes .
      return next();
    
    next( Object.assign(new Error("Forbidden .") , {status : 403}));

  }
else
  {
    next( Object.assign(new Error("Not logged in .") , {status : 401}));
  }

}

//Checks if a User is logged in and that they are a store owner .
passport.isOwnerAuth =  (req, res, next) =>  {
  if ( req.isAuthenticated() )
    {
      if( req.user.role === 'owner' ) 
        return next();
      
      next( Object.assign(new Error("Forbidden .") , {status : 403}));

    }
  else
    {
      next( Object.assign(new Error("Not logged in .") , {status : 401}));
    }
  
  }

module.exports = passport;