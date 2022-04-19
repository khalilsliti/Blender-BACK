

const router = require("express").Router();
const controller = require('../controllers/OrdersController');
const auth = require('../middlewares/auth');


// GET on FQDN/products OR FQDN/orders/
router.get("/:page", auth.isAuth , controller.getAll);  

// POST on FQDN/products OR FQDN/orders/
 router.post("/" , auth.isCustomerAuth , controller.post);

// PUT on FQDN/orders/ID .
router.put("/:id" , auth.isOwnerAuth , controller.put );


// DELETE on FQDN/orders/ID .
router.delete("/:id" , auth.isCustomerAuth , controller.delete );

module.exports = router;