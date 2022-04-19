

const router = require("express").Router();
const upload = require('../middlewares/uploadImg');
const update = require('../middlewares/updateImg');
const controller = require('../controllers/StoresController');
const auth = require('../middlewares/auth');



// GET on FQDN/products OR FQDN/stores/
router.get("/:page",controller.getAll); //

// POST on FQDN/products OR FQDN/stores/
 router.post("/" , auth.isOwnerAuth , upload.single('img') ,controller.post);

// PUT on FQDN/stores/ID .
router.put("/", auth.isOwnerAuth , update.single('img') , controller.put );


// DELETE on FQDN/stores/ID .
router.delete("/", auth.isOwnerAuth , controller.delete );

module.exports = router;