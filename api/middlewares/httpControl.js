

const FRONT_END =  process.env.FRONT_END_FQDN || "http://127.0.0.1" ;

//This middleware defines our backend app Cross origin and access policies .
// Visit https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS for full documentation .

module.exports = (req, res, next) => {
    res.header("Access-Control-Allow-Origin", FRONT_END); //Allowing cross origin access froma any origin.
    res.header("Access-Control-Allow-Credentials",true); //Expose response credentials (session cookie in our case) to front end apps . 
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept, Authorization"
    ); //Accepted request headers .
    //Response to options http request . 
    if (req.method === "OPTIONS") {
        res.header("Access-Control-Allow-Methods", "PUT, POST, DELETE, GET");
        return res.status(200).json({});
    }
    next();
};