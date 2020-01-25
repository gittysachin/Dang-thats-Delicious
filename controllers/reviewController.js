const mongoose = require('mongoose');

const Review = mongoose.model('Review');

exports.addReview = async (req, res) => {
  // res.json(req.body);
  req.body.author = req.user._id;
  req.body.store = req.params.id;
  // res.json(req.body);

  const newReview = new Review(req.body);
  await newReview.save();
  req.flash('success', 'Your review was successfully saved ⭐');
  res.redirect('back');
};
