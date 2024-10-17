//server/db.js
const pg = require('pg');
const client = new pg.Client(process.env.DATABASE_URL || 'postgres://localhost/book_review_db');
const uuid = require('uuid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const JWT = process.env.JWT || 'key';

// Function to create all necessary tables
const createTables = async () => {
    const SQL = `
    DROP TABLE IF EXISTS comments;
    DROP TABLE IF EXISTS reviews;
    DROP TABLE IF EXISTS users;
    DROP TABLE IF EXISTS books;
    CREATE TABLE users (
      id UUID PRIMARY KEY,
      username VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    );
    CREATE TABLE books (
      id UUID PRIMARY KEY,
      title VARCHAR(255) UNIQUE NOT NULL,
      description TEXT,
      category VARCHAR(255)
    );
    CREATE TABLE reviews (
      id UUID PRIMARY KEY,
      user_id UUID REFERENCES users(id),
      book_id UUID REFERENCES books(id),
      rating INTEGER,
      review_text TEXT,
      CONSTRAINT unique_user_item UNIQUE (user_id, book_id)
    );
    CREATE TABLE comments (
      id UUID PRIMARY KEY,
      review_id UUID REFERENCES reviews(id),
      user_id UUID REFERENCES users(id),
      comment_text TEXT
    );
  `;
    await client.query(SQL);
};


// Function to create a new user with hashed password
const createUser = async ({ username, password }) => {
    const hashPassword = await bcrypt.hash(password, 5);
    const SQL = 'INSERT INTO users (id, username, password) VALUES ($1, $2, $3) RETURNING *';
    const response = await client.query(SQL, [uuid.v4(), username, hashPassword]);
    return response.rows[0];
};

//authenticate user
const authenticate = async({ username, password })=> {
    const SQL = `
      SELECT id, password
      FROM users
      WHERE username = $1
    `;
    const response = await client.query(SQL, [ username ]);
    if(!response.rows.length || (await bcrypt.compare(password, response.rows[0].password)) === false){
      const error = Error('not authorized_authenticate');
      error.status = 401;
      throw error;
    }
    const token = await jwt.sign({ id: response.rows[0].id }, JWT);  // Generate JWT token
    return { token };
  };

//Verify token for isloggedin
const findUserWithToken = async(token)=> {
    let id;
    try {
      const payload = await jwt.verify(token, JWT);  // Verify the token
      id = payload.id;
    } catch(ex) {
      const error = Error('not authorized_find user');
      error.status = 401;
      throw error;
    }
    
    const SQL = `
      SELECT id, username FROM users WHERE id=$1;
    `;
    const response = await client.query(SQL, [id]);
    if(!response.rows.length){
      const error = Error('not authorized');
      error.status = 401;
      throw error;
    }
    
    return response.rows[0];
  };

// Function to fetch all users
const fetchUsers = async () => {
    try {
        const query = 'SELECT * FROM users';
        const { rows } = await client.query(query);
        return rows;
    } catch (error) {
        throw new Error('Error fetching users');
    }
};

// Function to create a new book
const createBook = async ({ title, description, category }) => {
    const SQL = 'INSERT INTO books (id, title, description, category) VALUES ($1, $2, $3, $4) RETURNING *';
    const response = await client.query(SQL, [uuid.v4(), title, description, category]);
    return response.rows[0];
};
// Function to fetch all products
const fetchBooks = async () => {
    const SQL = 'SELECT * FROM books';
    const response = await client.query(SQL);
    return response.rows;
};

// Function to fetch details of a specific book
const fetchBookDetails = async (bookId) => {
    const SQL = 'SELECT * FROM books WHERE id = $1';
    const response = await client.query(SQL, [bookId]);
    return response.rows[0];
};

// Function to fetch all reviews for a specific item
const fetchReviewsByBook = async (bookId) => {
    const SQL = 'SELECT r.*, u.username FROM reviews r JOIN users u ON r.user_id = u.id WHERE book_id = $1';
    const response = await client.query(SQL, [bookId]);
    return response.rows;
};

// Function to create a new review
const createReview = async ({ userId, bookId, rating, reviewText }) => {
    const SQL = 'INSERT INTO reviews (id, user_id, book_id, rating, review_text) VALUES ($1, $2, $3, $4, $5) RETURNING *';
    const response = await client.query(SQL, [uuid.v4(), userId, bookId, rating, reviewText]);
    return response.rows[0];
};

// Function to fetch all reviews written by a specific user
const fetchMyReviews = async (userId) => {
    const SQL = 'SELECT * FROM reviews WHERE user_id = $1';
    const response = await client.query(SQL, [userId]);
    return response.rows;
};

// Function to update a specific review
const updateReview = async ({ reviewId, userId, rating, reviewText }) => {
    const SQL = 'UPDATE reviews SET rating = $1, review_text = $2 WHERE id = $3 AND user_id = $4 RETURNING *';
    const response = await client.query(SQL, [rating, reviewText, reviewId, userId]);
    return response.rows[0];
};

// Function to delete a specific review
const deleteReview = async ({ reviewId, userId }) => {
    const SQL = 'DELETE FROM reviews WHERE id = $1 AND user_id = $2';
    await client.query(SQL, [reviewId, userId]);
};

// Function to create a new comment
const createComment = async ({ reviewId, userId, commentText }) => {
    const SQL = 'INSERT INTO comments (id, review_id, user_id, comment_text) VALUES ($1, $2, $3, $4) RETURNING *';
    const response = await client.query(SQL, [uuid.v4(), reviewId, userId, commentText]);
    return response.rows[0];
};

// Function to fetch comments by review ID
const fetchCommentsByReview = async (reviewId) => {
    const SQL = 'SELECT c.id, c.comment_text, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.review_id = $1';
    const response = await client.query(SQL, [reviewId]);
    return response.rows;
};
//toselect all columns
//const SQL = 'SELECT c.*, u.username FROM comments c JOIN users u ON c.user_id = u.id WHERE c.review_id = $1';

// Function to fetch all comments written by a specific user
const fetchMyComments = async (userId) => {
    const SQL = 'SELECT * FROM comments WHERE user_id = $1';
    const response = await client.query(SQL, [userId]);
    return response.rows;
};

// Function to update a specific comment
const updateComment = async ({ commentId, userId, commentText }) => {
    const SQL = 'UPDATE comments SET comment_text = $1 WHERE id = $2 AND user_id = $3 RETURNING *';
    const response = await client.query(SQL, [commentText, commentId, userId]);
    return response.rows[0];
};

// Function to delete a specific comment
const deleteComment = async ({ commentId, userId }) => {
    const SQL = 'DELETE FROM comments WHERE id = $1 AND user_id = $2';
    await client.query(SQL, [commentId, userId]);
};

module.exports = {
  client,
  createTables,
  createUser,
  createBook,
  fetchUsers,
  fetchBooks,
  authenticate,
  findUserWithToken,
  fetchBookDetails,
  fetchReviewsByBook,
  createReview,
  fetchMyReviews,
  updateReview,
  deleteReview,
  createComment,
  fetchCommentsByReview,
  fetchMyComments,
  updateComment,
  deleteComment
};       