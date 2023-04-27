const express = require('express'); // imports the express.js module and assigns it to a constant variable named express
const session = require('express-session'); // imports the sessions library.

/*
  creates an instance of the Express application by calling the express function.
  Assigns the result to a constant variables named app.
  thus, 'app' const is an express app instance.
*/
const app = express();  

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
