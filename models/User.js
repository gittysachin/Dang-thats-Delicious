const mongoose = require('mongoose');
const md5 = require('md5');
const validator = require('validator');
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');
// passportLocalMongoose will take care of creating additional fields to out Schema

mongoose.Promise = global.Promise; // Although we don't need to do this in our each model as we did it in start.js
// But mongoose will give you some error in terminal that this is depricated. So we suppressed this error.

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
    validate: [validator.isEmail, 'Invalid Email Address'],
    required: 'Please supply an email address',

  },
  name: {
    type: String,
    required: 'Please supply a name',
    trim: true,
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  hearts: [
    { type: mongoose.Schema.ObjectId, ref: 'Store' },
  ],
});
// actually we don't wanna store the password itself, we wanna store what's called the hash of that password
// And to do that, we're going to use a package called passportjs
// Essentially it takes away all of the heavy lifting that comes along with managing the session, creting token, logging people in and out for popular interface providers like Google, Facebook, github

// We don't really need to make another property named gravatar. It can be use used with Virtual Field. Sometimes fields can be generated.

userSchema.virtual('gravatar').get(function() {
  return `https://gravatar.com/avatar/${md5(this.email)}?s=200`;
});

userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });
userSchema.plugin(mongodbErrorHandler);  // validate will give nice error but not the properties like 'unique', So it will change those ugly errors to nice errors

module.exports = mongoose.model('User', userSchema);
