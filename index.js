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

const expireTime = 1 * 60 * 60 * 60; //expires after 1 hour, time is stored in milliseconds  (hours * minutes * seconds * millis)

var users = []; 

/* secret information section */
const mongodb_user = process.env.MONGODB_USER;
const mongodb_password = process.env.MONGODB_PASSWORD;
const mongodb_session_secret = process.env.MONGODB_SESSION_SECRET;
const node_session_secret = process.env.NODE_SESSION_SECRET;

app.use(express.urlencoded({extended: false}));

var mongoStore = MongoStore.create({
	mongoUrl: `mongodb+srv://${mongodb_user}:${mongodb_password}@a-1.zyajbsk.mongodb.net/a-1`,
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

// counting the number of visits to the home page.
var numPageHits = 0;

/*
  defines a route handler for the HTTP GET request method at the root path ('/').
  When a user visits the root path of the application, the handler function will be called
  with the request ('req') and response ('res') objects.
  In this case, the function sends the string "Hello World!" as the response.
  Response go to the webpage.
*/
app.get('/', (req, res) => {
    if (req.session.numPageHits == null) {
        req.session.numPageHits = 1;
    } else {
        req.session.numPageHits++;   
    }
    // numPageHits++;
    res.send(`Number of visits: ${req.session.numPageHits}`);
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
  </div>
`;
  res.send(html);
});

app.post('/submitUser', (req,res) => {
  var username = req.body.username;
  var password = req.body.password;
  
  // check to see if username or password was blank, redirect to signUp page, with message that fields were blank
  if(username == "" || password == "") {
    res.redirect("/createUser?blank=true");
    return;
  }

  // users.push({ username: username, password: password });
  var hashedPassword = bcrypt.hashSync(password, saltRounds);

  users.push({ username: username, password: hashedPassword });

  console.log(users);

  var usershtml = "";
  for (i = 0; i < users.length; i++) {
      usershtml += "<li>" + users[i].username + ": " + users[i].password + "</li>";
  }
  var html = "<ul>" + usershtml + "</ul>";
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
  </div>
`;
  res.send(html);
});

app.post('/loggingin', (req,res) => {
  var username = req.body.username;
  var password = req.body.password;
  if(username == "" || password == "") {
    res.redirect("/login?blank=true");
    return;
  }
  var usershtml = "";
  for (i = 0; i < users.length; i++) {
      if (users[i].username == username) {
          if (bcrypt.compareSync(password, users[i].password)) {
              req.session.authenticated = true;
              req.session.username = username;
              req.session.cookie.maxAge = expireTime;
              res.redirect('/loggedIn');
              return;
          }
      }
  }

  //user and password combination not found
  res.redirect("/login?incorrect=true");
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

app.get('/contact', (req,res) => {
  var missingEmail = req.query.missing;
  var html = `
      email address:
      <form action='/submitEmail' method='post'>
          <input name='email' type='text' placeholder='email'>
          <button>Submit</button>
      </form>
  `;
  if (missingEmail) {
      html += "<br> email is required";
  }
  res.send(html);
});

app.post('/submitEmail', (req,res) => {
  var email = req.body.email;
  if (!email) {
      res.redirect('/contact?missing=1');
  }
  else {
      res.send("Thanks for subscribing with your email: "+email);
  }
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

/*
  starts the application listening on the specified port ('port') and logs a message to the console
  indicating which port the application is listening on.
*/
app.listen(port, () => {
    console.log(`Node application listening on port: ${port}`);
});
