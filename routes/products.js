const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  title: String,
  price: Number,  
  image: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
});

module.exports = mongoose.model('Product', productSchema);
