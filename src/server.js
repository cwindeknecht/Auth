const bodyParser = require('body-parser');
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcrypt');

const User = require('./user.js');

const STATUS_USER_ERROR = 422;
const BCRYPT_COST = 11;

const server = express();
// to enable parsing of json bodies for post requests
server.use(bodyParser.json());
server.use(
  session({
    secret: 'e5SPiqsEtjexkTj3Xqovsjzq8ovjfgVDFMfUzSmJO21dtXs4re',
    resave: true,
    saveUninitialized: false,
  })
);

const routeCheck = (req,res,next) => {
  if (req.path.includes('restricted')) {
  if (!req.session.username) return res.status(400).json({err: "Failed to log in."})
  next();
  }
  else next();
};

server.use(routeCheck);


/* Sends the given err, a string or an object, to the client. Sets the status
 * code appropriately. */
const sendUserError = (err, res) => {
  res.status(STATUS_USER_ERROR);
  if (err && err.message) {
    res.json({ message: err.message, stack: err.stack });
  } else {
    res.json({ error: err });
  }
};

server.post('/users', (req, res) => {
  if (!req.body.username || !req.body.password) {
    res.status(422).json({ error: 'Need username and password' });
  }
  const {username, password} = req.body;
  const newUser = new User({ username, passwordHash: password });

  newUser
    .save()
    .then(user => {
      console.log("saving new user: ", user);
      res.send(user);
      res.status(200).json({ message: 'User Created', user });
    })
    .catch(error => {
      sendUserError(error, res);
    });
});

server.post('/log-in', (req, res) => {
  if (!req.body.username || !req.body.password) {
    res.status(422).json({ error: 'Need username and password' });
  }

  let { username, password } = req.body;
  username = username.toLowerCase();
  User.findOne({ username })
    .then(userFound => {
      console.log("Found User:", userFound);
      bcrypt.compare(password, userFound.passwordHash)
        .then(result => {
          if (result) {
            req.session.username = username;
            res.status(200).json({ success: true });
          }
        })
        .catch(err => {
          sendUserError(err,res);
      });
    })
    .catch(err => {
      sendUserError(err,res);
    });
});

const loggedIn = (req,res,next) => {
  if (!req.session.username) return res.status(400).json({err: "Failed to log in."})
  req.user = req.session.username;
  next();
}


// TODO: add local middleware to this route to ensure the user is logged in
server.get('/me', loggedIn, (req, res) => {
  // Do NOT modify this route handler in any way.
  res.json(req.user);
});

server.get('/restricted/', (req,res) => {
  res.status(200).json('Restricted Working');
});

module.exports = { server };
