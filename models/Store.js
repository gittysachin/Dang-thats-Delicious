// we use mongoose to interface with our mongoDB 

const mongoose = require('mongoose');
const slug = require('slugs');  // this allows us to mamke url friendly names, its sort of like wordpress permalink

mongoose.Promise = global.Promise;  // We can wait for data to come back from database with async await using build-in ES6 promise
// we can use the built-in callbacks, we can use external libraries
// open devTool and type 'Promise' in console

const storeSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    required: 'Please enter a store name',
  },
  slug: String,
  description: {
    type: String,
    trim: true,
  },
  tags: [String],
  created: {
    type: Date,
    default: Date.now,
  },
  location: {
    type: {
      type: String,
      default: 'Point',
    },
    coordinates: [
      {
        type: Number,
        required: 'You must supply coordinates',
      },
    ],
    address: {
      type: String,
      required: 'You must supply an address',
    },
  },
  photo: String,
  author: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: 'You must supply an author',
  },
}, {
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Define our indexes
storeSchema.index({
  name: 'text',
  description: 'text',
});
              // check in the index of stores of our database in Atlas

storeSchema.index({ location: '2dsphere' });    // there it will show that the type is GEOSPATIAL

// we have used pre-saved hook for mongoDB --> we are going to autogenerate this slug field before saving
storeSchema.pre('save', async function(next) {
  if (!this.isModified('name')) {
    return next();
  }
  this.slug = slug(this.name);
  // find other stores that have a slug of sachin, sachin-1, sachin-2
  const slugRegex = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');  // here 'i' in second parameter is for case insensitive
  // search db for matching slugs
  const storesWithSlug = await this.constructor.find({ slug: slugRegex });
  if (storesWithSlug.length) {
    // found existing slug(s), update url to next number
    this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
  }
  return next();
});

storeSchema.statics.getTagsList = function() {
  return this.aggregate([
    // all mongo aggregate pipeline operators begin with $
    { $unwind: '$tags' }, // $tags note: $ denotes tags is a field on the document
    { $group: { _id: '$tags', count: { $sum: 1 } } }, // group by $tag values, place into object as property '_id', add count attributee and increase by 1 for each tag
    { $sort: { count: -1 } }, // 1/-1 on $sort is ascending/descending
  ]);
};

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
// make reviews available via the store
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
