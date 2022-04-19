

const router = require("express").Router();
const controller = require('../controllers/CartsController');
const auth = require('../middlewares/auth');


// GET on FQDN/products OR FQDN/carts/
router.get("/:page" , auth.isAuth , controller.getAll); 

// POST on FQDN/products OR FQDN/carts/
 router.post("/" , auth.isCustomerAuth , controller.post);




// DELETE on FQDN/carts/ID .
router.delete("/:id" , auth.isCustomerAuth , controller.delete );

module.exports = router;