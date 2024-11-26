const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://sharmavivan2022:haAJG9YT3gF5LX9B@cluster0.hvzpi.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  image: String,
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product"
  }],
  cart: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Cart'
  }
});

module.exports = mongoose.model('User', userSchema);
