const express = require('express'); // imports the express.js module and assigns it to a constant variable named express
const session = require('express-session'); // imports the sessions library.
const Joi = require("joi"); // input field validation library
const bcrypt = require('bcrypt');
const saltRounds = 12;

/*
  creates an instance of the Express application by calling the express function.
  Assigns the result to a constant variables named app.
  thus, 'app' const is an express app instance.
*/
const app = express();  

var users = []; 

app.use(express.urlencoded({extended: false}));

// sets the port the application will listen on. checks if 'PORT' environment variable is set
// if it is, it uses that value. If not set, it defaults to port 3020.
const port = process.env.PORT || 3020;

// will add a process that can validate these sessions
// and so that a user cannot mess with sessionIDs and try to get in as someone else
// chances of two people creating the same session ID either intentionally or maliciously 
// are next to impossible
const node_session_secret = '67615885-9e8e-4ae1-9ac9-f80ecc7b81a8';

// telling the app to use sessions,
// by default the sessions are being stored in the RAM,
// however we'll save them in a database soon
app.use(session({
    secret: node_session_secret,
    // store: mongoStore, // default is memory store
    saveUninitialized: false,
    resave: true
}
));

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
    // res.redirect('https://www.google.com/');
});

app.get('/createUser', (req,res) => {
  var html = `
  Create User
  <form action='/submitUser' method='post'>
  <input name='username' type='text' placeholder='username'>
  <input name='password' type='password' placeholder='password'>
  <button>Submit</button>
  </form>
  `;
  res.send(html);
});

app.get('/login', (req,res) => {
  var html = `
  log in
  <form action='/loggingin' method='post'>
  <input name='username' type='text' placeholder='username'>
  <input name='password' type='password' placeholder='password'>
  <button>Submit</button>
  </form>
  `;
  res.send(html);
});

app.post('/submitUser', (req,res) => {
  var username = req.body.username;
  var password = req.body.password;

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

app.post('/loggingin', (req,res) => {
  var username = req.body.username;
  var password = req.body.password;


  var usershtml = "";
  for (i = 0; i < users.length; i++) {
      if (users[i].username == username) {
          if (bcrypt.compareSync(password, users[i].password)) {
              res.redirect('/loggedIn');
              return;
          }
      }
  }

  //user and password combination not found
  res.redirect("/login");

});

app.get('/loggedin', (req,res) => {
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
