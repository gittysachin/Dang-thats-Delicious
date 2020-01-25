const mongoose = require('mongoose');
const multer = require('multer');  // it handles all of those field that are being passed
const jimp = require('jimp');   // it will allow us to resize our photo
const uuid = require('uuid');   // it will allow us to make the file name unique --> many users can name the photo same

const Store = mongoose.model('Store');  // getting the modelled storeSchema from Store.js
const User = mongoose.model('User');

const multerOptions = {
  storage: multer.memoryStorage(),
  fileFilter(req, file, next) {
    const isPhoto = file.mimetype.startsWith('image/');
    if (isPhoto) {
      next(null, true);  // this is a callback promise, we have been using async await for promises
			// the first value is error, and the second value you're passing in is what needs to get passed 
			// if we pass null as second parameter that means it worked
    } else {
      next({ message: "That filetype isn't allowed" }, false);
    }
  },
};

// exports.myMiddleWare = (req, res, next) => {
// 	req.name = 'Sachin';
	// res.cookie('name', 'Sachin is cool', { maxAge: 2220 });  // look at application in dev tools
	
	// if(req.name === 'Sachin'){  // http://localhost:7777
	// 	throw Error('That is a stupid name');
	// }
// 	next();
// }

exports.homePage = (req, res) => {
  // console.log(req.name); // Sachin
	// req.flash('error', 'Something Happened');
	// req.flash('error', 'Another <strong>thing</strong> happened');
	// req.falsh('error', 'OOh NO.....');
	// req.flash('info', 'Something Happened');
	// req.flash('warning', 'Something Happened');
	// req.flash('success', 'Something Happened');
  res.render('index');
};

exports.addStore = (req, res) => {
  res.render('editStore', {
    title: 'Add Store',
  });
};

exports.upload = multer(multerOptions).single('photo');  // we just want single field that's called a photo

exports.resize = async (req, res, next) => {
  // check if there is a file to resize
  if (!req.file) {
    // skip to next middleware if not
    return next();
  }
  // NOTE: data on req.file - fieldname, originalname, encoding, mimetype, buffer, size
  // get extension from mimetype
  const extension = req.file.mimetype.split('/')[1];
  // prepare filename and make it available on req.body
  req.body.photo = `${uuid.v4()}.${extension}`;
  // read photo into jimp from buffer in memory
  const photo = await jimp.read(req.file.buffer);
  // resize photo
  await photo.resize(800, jimp.AUTO);
  // write resized photo out to uploads photo
  await photo.write(`./public/uploads/${req.body.photo}`);
  // move on to next middleware
  return next();
};

exports.createStore = async (req, res) => {
  // console.log(req.body);
	// res.json(req.body); // send all of the data immediately back to the user that we sent using the form
	
	// const store = new Store(req.body);
  // await store.save();
  req.body.author = req.user._id;
  const store = await (new Store(req.body)).save();
  req.flash('success', `Successfully created ${store.name} ✨. Care to leave a review?`);
  res.redirect(`/stores/${store.slug}`);

  // store.age = 10;
	// store.cool = true;
	// store.save(function(err, store){
	// 	if(!err){
	// 		console.log('It worked!');
	// 		res.redirect('/');
	// 	}
	// }); // in order to store age, cool etc in mongoDB we have to save the store, then it will return to us either with error or save. It takes some time to extxute this.
	
	// store 
	// 	.save()
	// 	.then(store => {
	// 		// res.json(store);
	// 		return Store.find()
	// 	})
	// 	.then(stores => {
	// 		res.render('storeList', { stores: stores }) // we can do 'then' as long as these will return some sort of Promise
	// 	})
	// 	.catch(err => {
	// 		throw Error(err);
	// 	});
	// console.log('It worked!');
};

exports.getStores = async (req, res) => {
  const page = req.params.page || 1;
  const limit = 7;
  const skip = (page * limit) - limit;
  const storesPromise = Store
    .find()
    .skip(skip)
    .limit(limit)
    .sort({ created: 'desc' });
  const countPromise = Store.countDocuments();
  const [stores, count] = await Promise.all([storesPromise, countPromise]);
  const pages = Math.ceil(count / limit);  // Math.ceil will give us the upper bound
  if (!stores.length && skip) {
    req.flash('info', `You asked for page ${page} which doesn't exist so you'be been redirected to the last page 🔄`);
    res.redirect(`/stores/page/${pages}`);
    return;
  }
  res.render('stores', {
    title: 'Stores',
    stores,
    count,
    page,
    pages,
  });
};

exports.getStoreBySlug = async (req, res, next) => {
  const store = await Store.findOne({ slug: req.params.slug }).populate('author');  // populate will associate the details of author and reviews with this data, you can see that by doing h.dump
  if(!store) return next(); // It's gonna execute the next middleware named as errorHandlers.notFound 
    // res.json(store);
    res.render('store', { store, title: store.name });
};

exports.getStoresByTag = async (req, res) => {
  const { tag } = req.params;
  const tagQuery = tag || { $exists: true };   // if there is no tag, then it will show us every store that has atleast 1 tag on it
  const tagsPromise = Store.getTagsList();
  // res.json(tagsPromise);
  const storesPromise = Store.find({ tags: tagQuery });
  // rather than awaiting on both the promises, we're gonna await for all of them at once, So this way it will take less time.
  const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);

  res.render('tags', {
    title: 'Tags',
    tags,
    tag,
    stores,
  });
};

const confirmOwner = (store, user) => {
  if (!store.author.equals(user._id)) {    //      || user.level > 10 
    throw Error('You must own a store in order to edit it');
  }
};

exports.editStore = async (req, res) => {
  const store = await Store.findOne({ _id: req.params.id }).populate('author');
  confirmOwner(store, req.user);
  res.render('editStore', {
    title: 'Edit Store',
    store,
  });
};

exports.updateStore = async (req, res) => {
  req.body.location.type = 'Point';  // if we update an address then MongoDB will not have the `type: 'Point'`
  const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
    new: true, // returns new value instead of old one
    runValidators: true, // runs any validations (e.g. required) included in schema
  }).exec();
  req.flash('success', `Successfully updated ${store.name} 🙌. <a href="/stores/${store.slug}">View Store ➡</a>`);
  res.redirect(`/stores/${req.params.id}/edit`);
};

exports.deleteStore = async (req, res) => {
  const store = await Store.findOneAndRemove({ _id: req.params.id }).exec();
  req.flash('success', `Successfully removed ${store.name} 🗑`);
  res.redirect('/stores');
};

exports.searchStores = async (req, res) => {
  // res.json({ it: 'Worked' });       
  // res.json(req.query); // http://localhost:7777/api/search?q=pizza&name=Sachin&cool=true
  const stores = await Store.find({
    $text: {
      $search: req.query.q,     // http://localhost:7777/api/search?q=coffee
      $caseSensitive: false,
    },
  }, { // project: projects (adds) a field on to the query
    score: { $meta: 'textScore' },
  }).sort({
    score: { $meta: 'textScore' },
  }).limit(5); // limit to 5 results
  res.json(stores);
};

exports.mapStores = async (req, res) => {
  // res.json({ it: 'Worked' });
  // res.json(req.query);   // http://localhost:7777/api/stores/near?lat=4
  const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
  const query = {
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates,
        },      // http://localhost:7777/api/stores/near?lat=43.2&lng=-79.8
        $maxDistance: 10000, // 10km (6.21371 miles, divide by 1.609 for approx conversion)
      },
    },
  };
  
  // const stores = await Store.find(q);
  // const stores = await Store.find(q).select('-author -tags');
  const stores = await Store.find(query).select('slug name description location photo').limit(10);
  res.json(stores);
};

exports.mapPage = async (req, res) => {
  res.render('map', {
    title: 'Map',
  });
};

exports.heartStore = async (req, res) => {
  const hearts = req.user.hearts.map(obj => obj.toString());
  const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
  const user = await User
    .findByIdAndUpdate(req.user._id,
      { [operator]: { hearts: req.params.id } },
      { new: true });
  res.json(user);
};

exports.getHearts = async (req, res) => {
  const stores = await Store.find({ _id: { $in: req.user.hearts } });
  res.render('hearts', {
    title: 'My Hearts',
    stores,
  });
};

exports.getTopStores = async (req, res) => {
  const stores = await Store.getTopStores();
  res.render('topStores', {
    title: 'Top Stores',
    stores,
  });
};
