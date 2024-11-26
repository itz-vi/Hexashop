const express = require('express');
const router = express.Router();
const productModel = require("./products")
const userModel = require("./users");
const cartModel = require('./cart');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const upload = require('./multer');
const path = require("path");
const uploadsPath = path.join(__dirname, "uploads");
router.use("/uploads", express.static(uploadsPath));

router.get("/", (req, res) => {
  res.render("register");
})
router.get("/login", (req, res) => {
  res.render("login");
})
//--------------  JWT AUthentication
// Register 
router.post('/register', upload.single('image'), async (req, res) => {
  const { username, email, password } = req.body;
  const imagefile = req.file ? req.file.filename : null;
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      const createdUser = await userModel.create({
        username, email, password: hash, image: imagefile
      });
      const token = jwt.sign({ email: email, userid: createdUser._id }, "shhhh");
      res.cookie("token", token);
      res.redirect("/login");
    });
  });
});
// Login 
router.post("/login", async function (req, res) {
  const { email, password } = req.body;

  const user = await userModel.findOne({ email });
  if (!user) return res.status(500).send("Something went wrong");

  bcrypt.compare(password, user.password, function (err, result) {
    if (result) {
      const token = jwt.sign({ email: email, userid: user._id }, "shhhh");
      res.cookie("token", token);
      res.status(200).redirect("/home");
    } else res.redirect("/login");
  });
});
// isLoggedIn
function isLoggedIn(req, res, next) {
  const token = req.cookies.token
  if (!token) return res.redirect("/login")
  const data = jwt.verify(token, "shhhh")
  req.user = { _id: data.userid, email: data.email }
  next()
};
// Logout  
router.get("/logout", function (req, res) {
  res.cookie("token", "");
  res.redirect("/login");
});
// Profile 
router.get("/profile", isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ email: req.user.email })
  res.render("profile", { user });
});

// -----------   Add Product 
router.get('/addProdcut', isLoggedIn, function (req, res) {
  res.render('addProdcut');
})



// Add Product
router.post('/addProdcut', isLoggedIn, upload.single('image'), async function (req, res) {
  const { title, description, price } = req.body;
  const imagefile = req.file ? req.file.filename : null;
  const userId = req.user._id;
  const newProduct = await productModel.create({ title, description, price, image: imagefile, user: userId });
  await newProduct.save();
  res.redirect("products");
});

// Home-page
router.get('/home', isLoggedIn, async function (req, res) {
  res.render('home',);
});

// -----------  Products aa 
router.get('/products', isLoggedIn, async function (req, res) {
  const user = await userModel.findOne({ email: req.user.email }).populate("products");
  const products = await productModel.find({ user: user._id });
  res.render('products', { user, products });
})

router.get('/about', isLoggedIn, function (req, res) {
  res.render('about');
})
router.get('/contact', isLoggedIn, function (req, res) {
  res.render('contact');
})





// Single-product 
router.get('/product/:id', isLoggedIn, async (req, res) => {
  const product = await productModel.findById(req.params.id);
  res.render('singleProduct', { product });
});

// ------------ ADD to cart 
router.post('/cart/add/:productId', isLoggedIn, async (req, res) => {
  const { productId } = req.params;
  const userId = req.user._id;
  let user = await userModel.findById(userId).populate('cart');
  let cart = user.cart || new cartModel({ user: userId, products: [], totalPrice: 0 });
  !user.cart && (user.cart = (await cart.save())._id) && await user.save();
  const existingProduct = cart.products.find(p => p.product.equals(productId));
  existingProduct ? existingProduct.quantity++ : cart.products.push({ product: productId, quantity: 1 });
  const product = await productModel.findById(productId);
  if (product) cart.taotalPrice += parseFloat(product.price);
  await cart.save();
  res.status(200).json({ message: 'Product added to cart' });
});
//  ----------- Cart-page 
router.get('/cart', isLoggedIn, async (req, res) => {
  const userId = req.user._id;
  const user = await userModel.findById(userId).populate({
    path: 'cart',
    populate: {
      path: 'products.product',
      model: 'Product',
      select: 'title price image'
    }
  });
  const cart = user.cart;
  const totalCost = cart ? cart.products.reduce((total, item) => total + item.product.price * item.quantity, 0) : 0;
  res.render('cart', { user, cart, totalCost });
});

// Update cart
router.post('/cart/update/:productId', isLoggedIn, async (req, res) => {
  const { productId } = req.params;
  const { quantityChange } = req.body;
  const userId = req.user._id;
  const cart = await cartModel.findOne({ user: userId });
  const cartProduct = cart.products.find(p => p.product.equals(productId));
  cartProduct.quantity += quantityChange;
  if (cartProduct.quantity <= 0) cart.products = cart.products.filter(p => !p.product.equals(productId));
  const product = await productModel.findById(productId);
  if (product) cart.totalPrice = cart.products.reduce((total, item) => total + item.quantity * product.price, 0);
  await cart.save();
  res.status(200).json({ message: 'Cart updated successfully' });
});

// Remove cart
router.post('/cart/remove', isLoggedIn, async (req, res) => {
  const { productId } = req.body;
  const userId = req.user._id;
  const cart = await cartModel.findOne({ user: userId });
  const productToRemove = cart.products.find(p => p.product.equals(productId));
  cart.products = cart.products.filter(p => !p.product.equals(productId));
  const product = await productModel.findById(productId);
  if (product) cart.totalPrice -= product.price * productToRemove.quantity;
  await cart.save();
  res.status(200).json({ message: 'Product removed from cart' });
});

module.exports = router;