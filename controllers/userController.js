const mongoose = require('mongoose');
const { promisify } = require('es6-promisify');
const User = mongoose.model('User');

exports.loginForm = (req, res) => {
    res.render('login', { title: 'Login' });
}

exports.registerForm = (req, res) => {
    res.render('register', { title: 'Register' });
};

exports.validateRegister = (req, res, next) => {
  req.sanitizeBody('name'); // Remember we used expressValidator() in app.js
  req.checkBody('name', 'You must supply a name!').notEmpty();
  req.checkBody('email', 'That Email is not valid!').isEmail();
  req.sanitizeBody('email').normalizeEmail({
    gmail_remove_dots: false,
    remove_extension: false,
    gmail_remove_subaddress: false
  });
  req.checkBody('password', 'Password Cannot be Blank!').notEmpty();
  req.checkBody('password-confirm', 'Confirmed Password cannot be blank!').notEmpty();
  req.checkBody('password-confirm', 'Oops! Your passwords do not match').equals(req.body.password);

  const errors = req.validationErrors();
  if (errors) {
    req.flash('error', errors.map(err => err.msg));
    res.render('register', { title: 'Register', body: req.body, flashes: req.flash() });
    return; // stop the fn from running if it gets any error
  }
  next(); // there were no errors!
};

exports.register = async (req, res, next) => {
    const user = new User({
      email: req.body.email,
      name: req.body.name,
    });
    // User.register - register is bound to User via passport-local-mongoose library - version in use here uses callbacks so we promisify it to make use of async/await
    const register = promisify(User.register.bind(User)); // if registering to an object, you must also pass the object so it knows what to bind to
    // the problem with .register library is it's callback based, that's why we use promisify to turn it into a promise based function 
    await register(user, req.body.password); // it'll store the hash of the password
    next(); // move on to authController.login
};

exports.account = (req, res) => {
    res.render('account', { title: 'Edit your Account' });
}

exports.updateAccount = async (req, res) => {
    const updates = {
      name: req.body.name,
      email: req.body.email
    };
  
    const user = await User.findOneAndUpdate(
      { _id: req.user._id }, // query
      { $set: updates }, // updates
      { new: true, runValidators: true, context: 'query' } // options to run our va
    );
    req.flash('success', 'Updated the profile!');
    res.redirect('back');
  };