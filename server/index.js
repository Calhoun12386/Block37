//server/index.js
const { client, createTables,createUser, fetchUsers, createBook, fetchBooks, authenticate, findUserWithToken, fetchBookDetails, 
    fetchReviewsByBook, createReview, fetchMyReviews } = require('./db');

const express = require("express");
const app = express();
app.use(express.json());

//Route to fetch all users
app.get('/api/users', async(req, res, next)=> {
    try {
      res.send(await fetchUsers());
    }
    catch(ex){
      next(ex);
    }
  });

  //Route to Log-in a user
  app.post('/api/auth/login', async(req, res, next)=> {
    try {
      res.send(await authenticate(req.body));
    }
    catch(ex){
      next(ex);
    }
  });

  //create a new user
  app.post('/api/auth/register', async(req, res, next) => {
    try {
      const { username, password } = req.body;
      const user = await createUser({ username, password });
      const token = await authenticate({ username, password }); // Automatically log the user in after registration
      res.status(201).send(token);
    }
    catch(ex) {
      next(ex);
    }
  });

  //Middleware
  const isLoggedIn = async (req, res, next) => {
    try {
      req.user = await findUserWithToken(req.headers.authorization);
      next();
    } catch (ex) {
      next(ex);
    }
  };

  
    // Route to get the logged-in user's details
app.get('/api/auth/me', isLoggedIn, async (req, res) => {
    try {
        res.send(req.user);
    } catch (ex) {
        res.status(500).send({ error: 'Could not fetch user' });
    }
});

// Route to fetch all books
app.get('/api/books', async (req, res) => {
    try {
        const books = await fetchBooks();
        res.send(books);
    } catch (ex) {
        res.status(500).send({ error: 'Could not fetch books' });
    }
});

// Route to fetch details of a specific book
app.get('/api/books/:id', async (req, res) => {
    try {
        const item = await fetchBookDetails(req.params.id);
        res.send(item);
    } catch (ex) {
        res.status(404).send({ error: 'Item not found' });
    }
});

// Route to fetch all reviews for a specific book
app.get('/api/books/:id/reviews', async (req, res) => {
    try {
        const reviews = await fetchReviewsByBook(req.params.id);
        res.send(reviews);
    } catch (ex) {
        res.status(500).send({ error: 'Could not fetch reviews' });
    }
});

// Route to create a new review for a specific item, only accessible to logged-in users
app.post('/api/items/:id/reviews', isLoggedIn, async (req, res) => {
    try {
        const review = await createReview({
            userId: req.user.id,
            itemId: req.params.id,
            rating: req.body.rating,
            reviewText: req.body.reviewText
        });
        res.status(201).send(review);
    } catch (ex) {
        res.status(500).send({ error: 'Could not create review' });
    }
});

// Route to fetch all reviews written by the logged-in user
app.get('/api/reviews/me', isLoggedIn, async (req, res) => {
    try {
        const reviews = await fetchMyReviews(req.user.id);
        res.send(reviews);
    } catch (ex) {
        res.status(500).send({ error: 'Could not fetch reviews' });
    }
});


// Function to seed the database with dummy data
const seedDatabase = async () => {
    const users = [
        { username: "steven", password: "stevenpw" },
        { username: "doaa", password: "doaapw" },
        { username: "connor", password: "connorpw" },
     
    ];
    const books = [
        { title: "book1" },
        { title: "book2" },
        { title: "book3" },
        { title: "book4" },
     
    ];
    await Promise.all(users.map(user => createUser(user)));
    await Promise.all(books.map(book => createBook(book)));
    console.log("Users and books created");
};

// Function to initialize the server
const init = async () => {
    try {
        const port = process.env.PORT || 3000;
        await client.connect();
        console.log('Connected to database');

        await createTables();
        console.log('Tables created');

        await seedDatabase();

        app.listen(port, () => console.log(`Listening on port ${port}`));
        console.log('Server started successfully');

        console.log('All users:', await fetchUsers());
        console.log('All products:', await fetchBooks());
    } catch (error) {
        console.error('Failed to initialize the server:', error);
    }
};

init();


/* 
-----LOGIN A USER-------------------------------------------------
curl -X POST -H "Content-Type: application/json" \
-d '{"username": "steven", "password": "stevenpw"}' \
http://localhost:3000/api/auth/login
------------------------------------------------------------------------

-----REGISTER NEW USER---------------------------------------------------
curl -X POST -H "Content-Type: application/json" \
-d '{"username": "newUser", "password": "newPassword"}' \
http://localhost:3000/api/auth/register 
-------------------------------------------------------------------------------------

-----LOGGED-IN-DETAILS (MUST BE LOGGED IN)------------------------------------------
curl -H "Authorization: <your_token_here>" http://localhost:3000/api/auth/me
--------------------------------------------------------------------------------

-----SINGLE BOOK DETAILS------------------------------------------------------
curl -X GET http://localhost:3000/api/books/<book_id>
--------------------------------------------------------------------------------

-----GET REVIEWS OF SINGLE BOOK-----------------------------------------------
curl -X GET http://localhost:3000/api/books/<BOOK_ID>/reviews
---------------------------------------------------------------------------

-----CREATE A REVIEW (MUST BE LOGGED IN)------------------------------------------------------
curl -X POST http://localhost:3000/api/items/{bookId}/reviews \
-H "Content-Type: application/json" \
-H "Authorization: {your_token}" \
-d '{
  "rating": 5,
  "reviewText": "Great book! Highly recommend it."
}'
--------------------------------------------------------------------------------------

-----GET ALL REVIEWS BY USER-----------------------------------------
curl -X GET http://localhost:3000/api/reviews/me \
-H "Authorization: {your_token}" \
-H "Content-Type: application/json"
------------------------------------------------------------------------

*/