//server/index.js
const { client, createTables,createUser, fetchUsers, createBook, fetchBooks, authenticate, findUserWithToken, fetchBookDetails, 
    fetchReviewsByBook, createReview, fetchMyReviews, updateReview, deleteReview, createComment, fetchCommentsByReview,
    fetchMyComments, updateComment, deleteComment } = require('./db');

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

// Route to create a new review for a specific book, only accessible to logged-in users
app.post('/api/books/:id/reviews', isLoggedIn, async (req, res) => {
    try {
        const review = await createReview({
            userId: req.user.id,
            bookId: req.params.id,
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

// Route to update a review, only accessible to the user who wrote the review
app.put('/api/reviews/:id', isLoggedIn, async (req, res) => {
    try {
        const updated = await updateReview({
            reviewId: req.params.id,
            userId: req.user.id,
            rating: req.body.rating,
            reviewText: req.body.reviewText
        });
        res.send(updated);
    } catch (ex) {
        res.status(500).send({ error: 'Could not update review' });
    }
});

// Route to delete a specific review, only accessible to the user who wrote the review
app.delete('/api/reviews/:id', isLoggedIn, async (req, res) => {
    try {
        await deleteReview({ reviewId: req.params.id, userId: req.user.id });
        res.sendStatus(204);
    } catch (ex) {
        res.status(500).send({ error: 'Could not delete review' });
    }
});

// Route to create a comment on a specific review, only accessible to logged-in users
app.post('/api/books/:id/reviews/:reviewId/comments', isLoggedIn, async (req, res) => {
    try {
        const comment = await createComment({
            reviewId: req.params.reviewId,
            userId: req.user.id,
            commentText: req.body.commentText
        });
        res.status(201).send(comment);
    } catch (ex) {
        res.status(500).send({ error: 'Could not create comment' });
    }
});

// Route to fetch all comments for a specific review
app.get('/api/reviews/:id/comments', async (req, res) => {
    try {
        const comments = await fetchCommentsByReview(req.params.id);
        res.send(comments);
    } catch (ex) {
        console.error('Error fetching comments:', ex);
        res.status(500).send({ error: 'Could not fetch comments' });
    }
});

// Route to fetch all comments written by the logged-in user
app.get('/api/comments/me', isLoggedIn, async (req, res) => {
    try {
        const comments = await fetchMyComments(req.user.id);
        res.send(comments);
    } catch (ex) {
        res.status(500).send({ error: 'Could not fetch comments' });
    }
});

// Route to update a specific comment, only accessible to the user who wrote the comment
app.put('/api/comments/:id', isLoggedIn, async (req, res) => {
    try {
        const updated = await updateComment({
            commentId: req.params.id,
            userId: req.user.id,
            commentText: req.body.commentText
        });
        res.send(updated);
    } catch (ex) {
        res.status(500).send({ error: 'Could not update comment' });
    }
});

// Route to delete a specific comment, only accessible to the user who wrote the comment
app.delete('/api/comments/:id', isLoggedIn, async (req, res) => {
    try {
        await deleteComment({ commentId: req.params.id, userId: req.user.id });
        res.sendStatus(204);
    } catch (ex) {
        res.status(500).send({ error: 'Could not delete comment' });
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
curl -X POST http://localhost:3000/api/books/{bookId}/reviews \
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

-----UPDATE REVIEW--------------------------------------------------------
curl -X PUT http://localhost:3000/api/reviews/{review_id} \
-H "Authorization: YOUR_JWT_TOKEN" \
-H "Content-Type: application/json" \
-d '{
    "rating": 4,
    "reviewText": "Updated review text here."
}'
-------------------------------------------------------------------------

-----DELETE REVIEW-------------------------------------------------
curl -X DELETE http://localhost:3000/api/reviews/<REVIEW_ID> \
-H "Authorization: <YOUR_TOKEN>"
-------------------------------------------------------------------

-----COMMENT ON A REVIEW--------------------------------------------
curl -X POST http://localhost:3000/api/books/<BOOK_ID>/reviews/<REVIEW_ID>/comments \
-H "Authorization: <YOUR_TOKEN>" \
-H "Content-Type: application/json" \
-d '{"commentText": "This comment is very helpful!"}'
---------------------------------------------------------------------

-----GET ALL COMMENTS BY REVIEW--------------------------------------
curl -X GET http://localhost:3000/api/reviews/<REVIEW_ID>/comments
----------------------------------------------------------------------

-----GET ALL COMMENTS BY USER------------------------------
curl -X GET http://localhost:3000/api/comments/me \
-H "Authorization: <YOUR_TOKEN>" \
-H "Content-Type: application/json"
--------------------------------------------------------

-----UPDATE COMMENT-----------------------------------------
curl -X PUT http://localhost:3000/api/comments/<COMMENT_ID> \
-H "Authorization: <YOUR_JWT_TOKEN>" \
-H "Content-Type: application/json" \
-d '{"commentText": "Updated comment text"}'
-------------------------------------------------------------

-----DELETE A COMMENT---------------------------------------
curl -X DELETE http://localhost:3000/api/comments/<COMMENT_ID> \
-H "Authorization: <YOUR_JWT_TOKEN>" \
-H "Content-Type: application/json"
------------------------------------------------------------

*/