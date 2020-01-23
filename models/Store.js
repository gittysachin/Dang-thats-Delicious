// we use mongoose to interface with our mongoDB 

const mongoose = require('mongoose');
mongoose.Promise = global.Promise; // We can wait for data to come back from database with async await using build-in ES6 promise
// we can use the built-in callbacks, we can use external libraries
// open devTool and type 'Promise' in console
const slug = require('slugs'); // this allows us to mamke url friendly names, its sort of like wordpress permalink

const storeSchema = new mongoose.Schema({
  // name: String,
  // trim will take out the white spaces oin either end of string
  name: {
      type: String,
      trim: true,
      required: 'Please enter a store name!'
  },
  slug: String,
  description: {
      type: String,
      trim: true
  },
  tags: [String],
  created: {
      type: Date,
      default: Date.now
  },
  location: {
      type: {
          type: String,
          default: 'Point'
      },
      coordinates: [{
          type: Number,
          required: 'You must supply coordinates!'
      }],
      address: {
          type: String,
          required: 'You must supply an address!'
      }
  },
  photo: String,
  author: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: 'You must supply and author'
  }
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Define our indexes 
storeSchema.index({
  name: 'text',
  description: 'text'
});                           // check in the index of stores of our database in Atlas

storeSchema.index({ location: '2dsphere' });  // there it will show that the type is GEOSPATIAL

// we have used pre-saved hook for mongoDB --> we are going to autogenerate this slug field before saving
storeSchema.pre('save', async function(next){
  if(!this.isModified()){
      return next();
  }
  this.slug = slug(this.name);
// find other stores that have a slug of sachin, sachin-1, sachin-2
  const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i'); // here 'i' in second parameter is for case insensitive
  const storesWithSlug = await this.constructor.find({ slug: slugRegEx }); // this.constructor will be equal to Store by the time it runs 
  if( storesWithSlug.length ){ 
      this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  next();
})

storeSchema.statics.getTagsList = function() {
  // aggregate pipeline operator
  return this.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } }, // we are grouping it by id and created new property count which is going to be equal to sum of 1
      { $sort: { count: -1 } }
  ]);
}

storeSchema.statics.getTopStores = function() {
  return this.aggregate([
    // look up stores and populate their reviews
    {
      $lookup: {
        // 'from' value comes from mongodb (it automatically takes model name and lowercase and adds an 's')
        from: 'reviews',
        localField: '_id',
        foreignField: 'store',
        as: 'reviews',
      },
    },
    // filter for only stores with more than 2 reviews
    // this is how you access index based values in mongo, so this checks for at least items with at least 2 reviews since it's a zero based index
    { $match: { 'reviews.1': { $exists: true } } },
    // add the average reviews field
    { $addFields: { averageRating: { $avg: '$reviews.rating' } } },
    // sort it by the new field, highest first
    { $sort: { averageRating: -1 } },
    // limit it to max of 10 results
    { $limit: 10 },
  ]);
};

// find reviews where the store's _id property === review's store property
// this is sort of a join but it's nice virtual field so that we're actually not saving sort of the relationship between the two, it's just 100% virtual
storeSchema.virtual('reviews', {
  ref: 'Review', // which model to link
  localField: '_id', // which field on the store
  foreignField: 'store', // which field on the review
});
// By default, Virtual fields don't actually go into either an object or into json, unless you explicitly ask it to. That's why we set toJSON and toObject
// if we want to access this data there then we need to do store.reviews

function autocompleteReviews(next) {
  this.populate('reviews');
  next();
}

storeSchema.pre('find', autocompleteReviews);
storeSchema.pre('findOne', autocompleteReviews);

module.exports = mongoose.model('Store', storeSchema);