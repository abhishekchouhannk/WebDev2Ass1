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

  await userCollection.insertOne({name: name, email: email, password: hashedPassword});
  console.log("Inserted user");

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
  // console.log(result);

  if(result.length != 1) {
    console.log("user not found");
    // that means user has not registered probably
    res.redirect("/login?incorrect=true");
    return;
  }

  // check if password matches for the username found in the database
  if (await bcrypt.compare(password, result[0].password)) {
    console.log("correct password, true");
    req.session.authenticated = true;
    req.session.email = email;
    req.session.cookie.maxAge = expireTime;
    // console.log(result[0].name);
    req.session.name = result[0].name; 
    res.redirect('/members');
  } else {
    //user and password combination not found
    res.redirect("/login?incorrectPass=true");
  }
});

app.get('/members', (req, res) => {
  if (!req.session.authenticated) {
    res.redirect('/login?notLoggedIn=true');
    return;
  }

  // Generate a random number between 1 and 3
  const randomNum = Math.floor(Math.random() * 3) + 1;

  // Construct the path to the random cat image using string concatenation
  const imagePath = '/cat' + randomNum + '.gif';
  
  res.render('members', {name: req.session.name, imagePath});
});

// catches the /about route
app.get('/about', (req,res) => {
  var color = req.query.color;
  res.send(`<h1 style="color:${color}; text-align: center; margin-top: 10%; font-family: 'Comic Sans MS';">Made by<br>Abhishek Chouhan</h1>`);
});

//show cat images
app.get('/cat/:id', (req,res) => {

  var cat = req.params.id;

  if (cat == 1) {
    res.send("<div style='text-align:center; margin-top: 10%;'>Fluffy:<br><img src='/fluffy.gif' style='width:250px; border: 1px solid black;'></div>");
      // res.send("Fluffy: <img src='/fluffy.gif' style='width:250px;'>");
  }
  else if (cat == 2) {
    res.send("<div style='text-align:center; margin-top: 10%;'>Socks:<br><img src='/socks.gif' style='width:250px; border: 1px solid black;'></div>");
    // res.send("Socks: <img src='/socks.gif' style='width:250px;'>");
  }
  else {
    // res.send("Invalid cat id: "+cat);
    res.send("<div style='text-align:center; background-color: #ffcccc; padding: 10px; border-radius: 5px;'>Invalid cat id: " + cat + "</div>");
  }
});

app.get('/signout', (req, res) => {
  req.session.destroy();
    var html = `
    <h1 style="text-align: center; margin-top: 10%; color: red; font-family: 'Comic Sans MS'; margin-top: 10%;">You are logged out!</h1>
    <div style="text-align: center;">
      <form action="/">
        <button type="submit">Homepage</button>
      </form>
    </div>
    `;
  res.send(html);
}); 

app.use(express.static(__dirname + "/public"));

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
