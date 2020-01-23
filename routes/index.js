const express = require('express');
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');
const { catchErrors } = require('../handlers/errorHandlers');

const router = express.Router();

// Do work here
// router.get('/', (req, res) => {
//   res.send('Hey! It works!');
// });

// router.get('/', (req, res) => {
    // const sachin = { name: "Sachin", age: 20, cool: true };

    // res.json(sachin);

    // res.send(req.query.name);
    // res.send(req.query);

    // type url --> http://localhost:7777/?name=sachin&age=100
    // router.get('/reverse/:name', (req, res) => {

      // type url --> http://localhost:7777/reverse/Sachin
    //   const reverse = [...req.params.name].reverse().join('');
    //   res.send(reverse);
    // })

    // res.render('hello', {
    //   name: 'Sachin',
    //   dog: req.query.dog,
    //   title: 'I love food'
    // });

// })

// router.get('/', storeController.homePage);
// router.get('/', storeController.myMiddleWare, storeController.homePage);

router.get('/', catchErrors(storeController.getStores));
router.get('/stores', catchErrors(storeController.getStores));
router.get('/stores/page/:page', catchErrors(storeController.getStores));
router.get('/add', authController.isLoggedIn, storeController.addStore);
router.post('/add', storeController.upload, catchErrors(storeController.resize), catchErrors(storeController.createStore));
router.post('/add/:id', storeController.upload, catchErrors(storeController.resize), catchErrors(storeController.updateStore));
router.get('/stores/:id/edit', catchErrors(storeController.editStore));
router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));
router.get('/tags', catchErrors(storeController.getStoresByTag));
router.get('/tags/:tag', catchErrors(storeController.getStoresByTag));
router.get('/login', userController.loginForm);
router.post('/login', authController.login);
router.get('/register', userController.registerForm);

// 1. Validate the registration data
// 2. Register the user 
// 3. We need to log them in 
router.post('/register',
  userController.validateRegister,
  catchErrors(userController.register),
  authController.login
);

router.get('/logout', authController.logout);
router.get('/account', authController.isLoggedIn, userController.account);
router.post('/account', catchErrors(userController.updateAccount));  // Wherever we've used async await, we're gonna use catchErrors cause if there's any error in the promise then it will handle it.
router.post('/account/forgot', catchErrors(authController.forgot));
router.get('/account/reset/:token', catchErrors(authController.reset));
router.post('/account/reset/:token', authController.confirmedPasswords, catchErrors(authController.update));
router.get('/map', storeController.mapPage);
router.get('/hearts', authController.isLoggedIn, catchErrors(storeController.getHearts));

router.get('/top', catchErrors(storeController.getTopStores));

/*
  API for search bar
*/

router.get('/api/search', catchErrors(storeController.searchStores));
router.get('/api/stores/near', catchErrors(storeController.mapStores));
router.post('/api/stores/:id/heart', catchErrors(storeController.heartStore));
router.post('/reviews/:id', authController.isLoggedIn, catchErrors(reviewController.addReview))

module.exports = router;