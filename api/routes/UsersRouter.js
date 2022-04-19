

const router = require("express").Router();
const upload = require('../middlewares/uploadImg');
const update = require('../middlewares/updateImg');
const controller = require('../controllers/UsersController');
const auth = require('../middlewares/auth');


// GET on FQDN/users OR FQDN/users/
router.get("/", auth.isAuth ,controller.getAll); 

// GET on FQDN/users/products OR FQDN/users/products/
router.get("/products/:page", auth.isOwnerAuth ,controller.getProducts); 

router.post("/login" , auth.isNotAuth , auth.authenticate('local') /* Visit http://www.passportjs.org/docs/login/ */ ,  controller.login);
router.post('/logout' , auth.isAuth , controller.logout);

// POST on FQDN/users OR FQDN/users/
 router.post("/register", auth.isNotAuth , upload.single('img') ,controller.post);

// PUT on FQDN/users/ID .
router.put("/", auth.isAuth , update.single('img') , controller.put );

// DELETE on FQDN /users/ID .
router.delete("/", auth.isAuth , controller.delete );

module.exports = router;