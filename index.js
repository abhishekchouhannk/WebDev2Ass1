require("./utils.js");

require('dotenv').config();
const express = require('express'); // imports the express.js module and assigns it to a constant variable named express
const session = require('express-session'); // imports the sessions library.
const MongoStore = require('connect-mongo');
const Joi = require("joi"); // input field validation library
const bcrypt = require('bcrypt');
const saltRounds = 12;

/*
  creates an instance of the Express application by calling the express function.
  Assigns the result to a constant variables named app.
  thus, 'app' const is an express app instance.
*/
const app = express();  

// By adding this middleware to your application, you can access the form data sent by the client in a URL-encoded format. 
// This data will be available in the req.body object.
app.use(express.urlencoded({extended: false}));

const expireTime = 1 * 60 * 60 * 1000; //expires after 1 hour, time is stored in milliseconds  (hours * minutes * seconds * millis)

/* secret information section */
const mongodb_host = process.env.MONGODB_HOST;
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_database = process.env.MONGODB_DATABASE;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;

const node_session_secret = process.env.NODE_SESSION_SECRET;

var {database} = include('databaseConnection');

const userCollection = database.db(mongodb_database).collection('users');

var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@${mongodb_host}/a-1`,
  crypto: {
		secret: mongodb_session_secret
	}
});

app.set('view engine', 'ejs');

app.use(session({ 
  secret: node_session_secret,
	store: mongoStore, //default is memory store 
	saveUninitialized: false, 
	resave: true
}
));

// sets the port the application will listen on. checks if 'PORT' environment variable is set
// if it is, it uses that value. If not set, it defaults to port 3020.
const port = process.env.PORT || 3020;

/*
  defines a route handler for the HTTP GET request method at the root path ('/').
  When a user visits the root path of the application, the handler function will be called
  with the request ('req') and response ('res') objects.
  In this case, the function sends the string "Hello World!" as the response.
  Response go to the webpage.
*/
app.get('/', (req, res) => {
  res.render('homepage', {session: req.session});
});

function sessionValidation(req, res, next) {
  if (req.session.authenticated) {
    console.log("Session authorized");
    return next();
  } else {
    res.redirect("login?notLoggedIn=true");
  }
}

async function adminAuthorization(req, res, next) {
  const result = await userCollection.find().project({name: 1, email: 1, type: 1, _id: 1}).toArray();
  for (i = 0; i < result.length; i++) {
    if (result[i].email == req.session.email && result[i].type == "admin") {
      return next();
    }
  }
  res.render('unauthorized');
}

app.get('/signUp', (req,res) => {
  res.render('signUp', {req});
});

// new user info validation and addition
app.post('/submitUser', async (req,res) => {
  var name = req.body.name;
  var email = req.body.email;
  var password = req.body.password;
  
  // check to see if username or password was blank, redirect to signUp page, with message that fields were blank
  if(email == "" || password == "" || name == "") {
    res.redirect("/signUp?blank=true");
    return;
  }

  const schema = Joi.object(
    {
      name: Joi.string().regex(/^[a-zA-Z ]+$/).max(20).required(),
      email: Joi.string().email().max(50).required(),
      password: Joi.string().max(20).required()
    }
  );

  const validationResult = schema.validate({name, email, password});

  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect("/signUp?invalid=true");
    return;
  }

  var hashedPassword = await bcrypt.hashSync(password, saltRounds);

  await userCollection.insertOne({name: name, email: email, password: hashedPassword, type: 'user'});

  // grant user a session and set it to be valid
  req.session.authenticated = true;
  req.session.email = email;
  req.session.cookie.maxAge = expireTime;
  req.session.name = name;

  res.redirect('/members');
});

app.get('/login', (req,res) => {
  res.render('login', {req});
});

app.post('/loggingin', async (req,res) => {
  var email = req.body.email;
  var password = req.body.password;

  if(email == "" || password == "") {
    res.redirect("/login?blank=true");
    return;
  }

  const schema = Joi.string().email().max(50).required();
  const validationResult = schema.validate(email);
  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect("/login?invalid=true");
    return;
  }

  const result = await userCollection.find({
    email: email
  }).project({name: 1, email: 1, password: 1, _id: 1}).toArray();

  if(result.length != 1) {
    // that means user has not registered probably
    res.redirect("/login?incorrect=true");
    return;
  }

  // check if password matches for the username found in the database
  if (await bcrypt.compare(password, result[0].password)) {
    req.session.authenticated = true;
    req.session.email = email;
    req.session.cookie.maxAge = expireTime;
    req.session.name = result[0].name; 
    res.redirect('/members');
  } else {
    //user and password combination not found
    res.redirect("/login?incorrectPass=true");
  }
});

app.get('/members', sessionValidation, (req, res) => {

  // // Generate a random number between 1 and 3
  // const randomNum = Math.floor(Math.random() * 3) + 1;

  // // Construct the path to the random cat image using string concatenation
  // const imagePath = '/public/cat' + randomNum + '.gif';
  
  res.render('members', {name: req.session.name});
});

app.get('/admin', sessionValidation, adminAuthorization, async (req,res) => {
  const result = await userCollection.find().project({name: 1, email: 1, type: 1, _id: 1}).toArray();
  res.render("admin", {users: result});
});

app.post('/promoteUser', sessionValidation, adminAuthorization, async(req, res) => {
  const userEmail = req.body.email; // assuming you have this value from the request body

  userCollection.updateOne(
    { email: userEmail },
    { $set: { type: "admin" } }
  );
  res.redirect('/admin');
});

app.post('/demoteUser', sessionValidation, adminAuthorization, async(req, res) => {
  const userEmail = req.body.email; // assuming you have this value from the request body

  userCollection.updateOne(
    { email: userEmail },
    { $set: { type: "user" } }
  );
  res.redirect('/admin');
});

// catches the /about route
app.get('/about', (req,res) => {
  res.render('about');
});

app.get('/signout', (req, res) => {
  req.session.destroy();
  res.render('signout');
}); 

app.use(express.static(__dirname));

// redirect all other mistakes by user (pages that do not exist) to a meaningful warning
app.get("*", (req,res) => {
	res.status(404);
  res.render('404');
});

/*
  starts the application listening on the specified port ('port') and logs a message to the console
  indicating which port the application is listening on.
*/
app.listen(port, () => {
    console.log(`Node application listening on port: ${port}`);
});
