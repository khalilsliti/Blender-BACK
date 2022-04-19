

const router = require("express").Router();
const upload = require('../middlewares/uploadImg');
const update = require('../middlewares/updateImg');
const controller = require('../controllers/ProductsController');
const auth = require('../middlewares/auth');


// GET on FQDN/products OR FQDN/products/
router.get("/:page",controller.getAll);


// GET on FQDN/products OR FQDN/products/
router.get("/store/:id/:page",controller.getStoreProducts);

// POST on FQDN/products OR FQDN/products/
 router.post("/" , auth.isOwnerAuth , upload.single('img') ,controller.post);

// PUT on FQDN/products/ID .
router.put("/:id", auth.isOwnerAuth , update.single('img') , controller.put );


// DELETE on FQDN/products/ID .
router.delete("/:id", auth.isOwnerAuth , controller.delete );

module.exports = router;