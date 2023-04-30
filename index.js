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

const expireTime = 1 * 60 * 60 * 60; //expires after 1 hour, time is stored in milliseconds  (hours * minutes * seconds * millis)

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
  res.send("Number of visits");
    // if (req.session.numPageHits == null) {
    //     req.session.numPageHits = 1;
    // } else {
    //     req.session.numPageHits++;   
    // }
    // // numPageHits++;
    // res.send(`Number of visits: ${req.session.numPageHits}`);
});

app.get('/createUser', (req,res) => {
  var html = `
  <h2 style="width: 400px; margin: 0 auto; margin-top: 5%; margin-bottom: 5%; font-family: 'Comic Sans MS'">Welcome, register as new user here</h2>
  <div style="background-color: rgba(0, 0, 255, 0.2); padding: 20px; width: 400px; margin: 0 auto; border-radius: 10px;">
    <h2 style="color: #333; text-align: center;">Sign Up</h2>
    <form action='/submitUser' method='post' style="display: flex; flex-direction: column;">
    <input name='username' type='text' placeholder='Username' style="padding: 10px; margin-bottom: 10px; border: none; border-radius: 5px;">
    <input name='password' type='password' placeholder='Password' style="padding: 10px; margin-bottom: 10px; border: none; border-radius: 5px;">
    <button style="background-color: #007bff; color: #fff; padding: 10px; border: none; border-radius: 5px;">Submit</button>
    </form>
    ${req.query.blank === 'true' ? '<p style="color: red;">Username/Password cannot be blank. Please try again.</p>' : ''}
    ${req.query.invalid === 'true' ? '<p style="color: red;">Security risk detected with current Username/Password. Please try again.</p>' : ''}
  </div>
`;
  res.send(html);
});

app.post('/submitUser', async (req,res) => {
  var username = req.body.username;
  var password = req.body.password;
  
  // check to see if username or password was blank, redirect to signUp page, with message that fields were blank
  if(username == "" || password == "") {
    res.redirect("/createUser?blank=true");
    return;
  }

  const schema = Joi.object(
    {
      username: Joi.string().alphanum().max(20).required(),
      password: Joi.string().max(20).required()
    }
  );

  const validationResult = schema.validate({username, password});

  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect("/createUser?invalid=true");
    return;
  }

  var hashedPassword = await bcrypt.hashSync(password, saltRounds);

  await userCollection.insertOne({username: username, password: hashedPassword});
  console.log("Inserted user");

  var html = `
  <div style="text-align: center; margin-top: 10%; color: red; font-family: 'Comic Sans MS'; margin-top: 10%;">
  <h1>Signed up succesfully!!</h1>
  </div>
  `;
  res.send(html);
});

app.get('/login', (req,res) => {
var html = `
  <h2 style="width: 400px; margin: 0 auto; margin-top: 5%; margin-bottom: 5%; font-family: 'Comic Sans MS'">Welcome, Here you can log in to the app.</h2>
  <div style="background-color: rgba(0, 0, 255, 0.2); padding: 20px; width: 400px; margin: 0 auto; border-radius: 10px;">
    <h2 style="color: #333; text-align: center;">Log In</h2>
    <form action='/loggingin' method='post' style="display: flex; flex-direction: column;">
    <input name='username' type='text' placeholder='Username' style="padding: 10px; margin-bottom: 10px; border: none; border-radius: 5px;">
    <input name='password' type='password' placeholder='Password' style="padding: 10px; margin-bottom: 10px; border: none; border-radius: 5px;">
    <button style="background-color: #007bff; color: #fff; padding: 10px; border: none; border-radius: 5px;">Submit</button>
    </form>
    ${req.query.incorrect === 'true' ? '<p style="color: red;">Incorrect username or password. Please try again.</p>' : ''}
    ${req.query.blank === 'true' ? '<p style="color: red;">Username/Password cannot be blank. Please try again.</p>' : ''}
    ${req.query.invalid === 'true' ? '<p style="color: red;">Security risk detected with current Username/Password. Please try again.</p>' : ''}
  </div>
`;
  res.send(html);
});

app.post('/loggingin', async (req,res) => {
  var username = req.body.username;
  var password = req.body.password;

  if(username == "" || password == "") {
    res.redirect("/login?blank=true");
    return;
  }

  const schema = Joi.string().max(20).required();
  const validationResult = schema.validate(username);
  if (validationResult.error != null) {
    console.log(validationResult.error);
    res.redirect("/login?invalid=true");
    return;
  }

  const result = await userCollection.find({
    username: username
  }).project({username: 1, password: 1, _id: 1}).toArray();
  console.log(result);

  if(result.length != 1) {
    console.log("user not found");
    res.redirect("/login?incorrect=true");
    return;
  }

  // check if password matches for the username found in the database
  if (await bcrypt.compare(password, result[0].password)) {
    console.log("correct password");
    req.session.authenticated = true;
    req.session.username = username;
    req.session.cookie.maxAge = expireTime;

    res.redirect('/loggedIn');
  } else {
    //user and password combination not found
    res.redirect("/login?incorrect=true");
  }
});

app.get('/loggedIn', (req,res) => {
  if (!req.session.authenticated) {
      res.redirect('/login');
      return;
  }
  var html = `
  You are logged in!
  `;
  res.send(html);
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

app.use(express.static(__dirname + "/public"));

// redirect all other mistakes by user (pages that do not exist) to a meaningful warning
app.get("*", (req,res) => {
	res.status(404);
	res.send(`
    <div style="text-align: center; margin-top: 10%; color: red; font-family: 'Comic Sans MS'; margin-top: 10%;">
      <h1>Sorry, This page does not exist - 404</h1>
      <h3>You might want to check your URL ^_^</h3>
    </div>
  `);
});

// app.get('/contact', (req,res) => {
//   var missingEmail = req.query.missing;
//   var html = `
//       email address:
//       <form action='/submitEmail' method='post'>
//           <input name='email' type='text' placeholder='email'>
//           <button>Submit</button>
//       </form>
//   `;
//   if (missingEmail) {
//       html += "<br> email is required";
//   }
//   res.send(html);
// });

// app.post('/submitEmail', (req,res) => {
//   var email = req.body.email;
//   if (!email) {
//       res.redirect('/contact?missing=1');
//   }
//   else {
//       res.send("Thanks for subscribing with your email: "+email);
//   }
// });

/*
  starts the application listening on the specified port ('port') and logs a message to the console
  indicating which port the application is listening on.
*/
app.listen(port, () => {
    console.log(`Node application listening on port: ${port}`);
});
