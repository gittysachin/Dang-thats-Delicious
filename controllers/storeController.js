const mongoose = require('mongoose');
mongoose.set('useFindAndModify', false);
const Store = mongoose.model('Store'); // getting the modelled storeSchema from Store.js
const multer = require('multer'); // it handles all of those field that are being passed 
const jimp = require('jimp'); // it will allow us to resize our photo
const uuid = require('uuid'); // it will allow us to make the file name unique --> many users can name the photo same


const multerOptions = {
	storage: multer.memoryStorage(),
	fileFilter(req, file, next) {
		const isPhoto = file.mimetype.startsWith('image/'); // if virus.exe file is renames with extension then it can check even that
		if(isPhoto){
			next(null, true); // this is a callback promise, we have been using async await for promises
			// the first value is error, and the second value you're passing in is what needs to get passed 
			// if we pass null as second parameter that means it worked
		} else {
			next({ message: 'That filetype isn\'t allowed!' }, false);
		}
	}
}

// exports.myMiddleWare = (req, res, next) => {
// 	req.name = 'Sachin';
// 	// res.cookie('name', 'Sachin is cool', { maxAge: 2220 });  // look at application in dev tools
	
// 	// if(req.name === 'Sachin'){  // http://localhost:7777
// 	// 	throw Error('That is a stupid name');
// 	// }
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
	res.render('editStore', { title: 'Add Store' });
};

exports.upload = multer(multerOptions).single('photo'); // we just want single field that's called a photo

exports.resize = async (req, res, next) => {
	// check if there's no new file to resize
	if( !req.file ){
		next(); // skip to the next middleware
	}
	// console.log(req.file);
	const extension = req.file.mimetype.split('/')[1];
	req.body.photo = `${uuid.v4()}.${extension}`;
	// now we resize
	const photo = await jimp.read(req.file.buffer);
	await photo.resize(800, jimp.AUTO); // width is going to be 800 and height -> AUTO
	await photo.write(`./public/uploads/${req.body.photo}`);
	// once we have written the photo to our filesystem, keep going!
	next();
}

exports.createStore = async (req, res) => {
	// console.log(req.body);
	// res.json(req.body); // send all of the data immediately back to the user that we sent using the form
	
	// const store = new Store(req.body);
	// await store.save();
	const store = await (new Store(req.body)).save();
	req.flash('success', `Successfully Created ${store.name}. Care to leave a review?`);
	res.redirect(`/store/${store.slug}`);

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
    // pagination 
    const page = req.params.page || 1;
    const limit = 7;
    const skip = (page * limit) - limit;

    // 1. Query the database for the list of all stores
    const storesPromise = Store
        .find()
        .skip(skip)
        .limit(limit);
    
    const countPromise = Store.countDocuments();
    
    const [stores, count] = await Promise.all([storesPromise, countPromise]);
    const pages = Math.ceil(count / limit);   // Math.ceil will give us the upper bound
    if(!stores.length && skip) {
        req.flash('info', `Hey! You asked for page ${page}. But that doesn't exist. So I put you on page ${pages}`);
        res.redirect(`/stores/page/${pages}`);
        return; 
    }
    
    res.render('stores', { title: 'Stores', stores, page, pages, count });
}

const confirmOwner = (store, user) => {
    if( !store.author.equals(user._id) ){     //      || user.level > 10 
        throw Error('You must own a store in order to edit it!');
    }
}

exports.editStore = async (req, res) => {
	// 1. Find the store given the ID
	// res.json(req.params); // params is something in the req which is come through the url
	const store = await Store.findOne({ _id: req.params.id });
	// res.json(store);

	// 2. Confirm they are the owner of the store 
    confirmOwner(store, req.user);
	
	// 3. Render out the edit form so the user can edit their store
	res.render('editStore', { title: `Edit ${store.name}`, store });
};

exports.updateStore = async (req, res) => {
	// set the location data to be a point 
	req.body.location.type = 'Point'; // if we update an address then MongoDB will not have the `type: 'Point'`
	// find and update the store
	const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
		new: true, // return the new store instead of the old one
		runValidators: true // that will force our model to run these required validators and all other validators in case someone tries to edit it
	}).exec();
	req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store →</a>`);
	
	// redirect them to the store and tell them it worked
	res.redirect(`/stores/${store._id}/edit`);
}

exports.getStoreBySlug = async (req, res, next) => {
    // res.send('It Works!');
    const store = await (await Store.findOne({ slug: req.params.slug })).populated('author');  // populate will associate the details of author and reviews with this data, you can see that by doing h.dump
    if(!store) return next(); // It's gonna execute the next middleware named as errorHandlers.notFound 
    // res.json(store);
    res.render('store', { store, title: store.name });
}

exports.getStoresByTag = async (req, res) => {
    const tag = req.params.tag;
    const tagQuery = tag || { $exists: true }; // if there is no tag, then it will show us every store that has atleast 1 tag on it
    const tagsPromise = Store.getTagsList();
    // res.json(tagsPromise);
    const storesPromise = Store.find({ tags: tagQuery });
    // rather than awaiting on both the promises, we're gonna await for all of them at once, So this way it will take less time.
    const results = await Promise.all([tagsPromise, storesPromise]);
    var tags = results[0];
    var stores = results[1];
    // res.json(results);
    res.render('tag', { tags, title: 'Tags', tag, stores })
}

exports.searchStores = async (req, res) => {
    // res.json({ it: 'Worked' });       
    // res.json(req.query); // http://localhost:7777/api/search?q=pizza&name=Sachin&cool=true
    const stores = await Store.find({
        $text: {
            $search: req.query.q     // http://localhost:7777/api/search?q=coffee
        }
    }, {
        score: { $meta: 'textScore' }
    })
    .sort({
        score: { $meta: 'textScore' }
    })
    .limit(5) // limit to only 5 results
    res.json(stores);
}

exports.mapStores = async (req, res) => {
    // res.json({ it: 'Worked' });
    // res.json(req.query);   // http://localhost:7777/api/stores/near?lat=43&lng=-149
    const coordinates = [req.query.lng, req.query.lat].map(parseFloat);
    const q = {
        location: {
            $near: {
                $geometry: {
                    type: 'Point',
                    coordinates
                },
                $maxDistance: 10000    // 10km         // http://localhost:7777/api/stores/near?lat=43.2&lng=-79.8
            }
        }
    }
    
    // const stores = await Store.find(q);
    // const stores = await Store.find(q).select('-author -tags');
    const stores = await Store.find(q).select('slug name description location photo').limit(10);
    res.json(stores);
}

exports.mapPage = (req, res) => {
    res.render('map', { title: 'Map' });
}

exports.heartStore = async (req, res) => {
    const hearts = req.user.hearts.map(obj => obj.toString());
    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
    const user = await User
        .findByIdAndUpdate(req.user.id, 
            { [operator]: { hearts: req.params.id } },
            { new: true }
        )
    res.json(user);
}

exports.getHearts = async (req, res) => {
    const stores = await Store.find({
        _id: { $in: req.user.hearts }   
    });
    res.render('stores', { title: 'Hearted Stores', stores });
}

exports.getTopStores = async (req, res) => {
    const stores = await Store.getTopStores();
    // res.json(stores);
    res.render('topStores', { stores, title: '⭐ Top Stores!'});
}