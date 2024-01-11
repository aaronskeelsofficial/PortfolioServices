//General
const express = require('express');
const app = express();
const server = require('http').Server(app);
const cors = require('cors');
//DiffieHellman
const io = require('socket.io')(server, {
  cors: {
    origin: "https://aaronskeels.work",
    methods: ["GET", "POST"]
  }
});
//SQLAccounts
const sqlite3 = require('sqlite3');
const {v4 : uuidv4} = require('uuid');
const crypto = require('crypto');
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false })); //This is required to have post params accessible with req.body.VAR
app.use(bodyParser.json()); //This is required to have post params be JSON objects
const cookieParser = require('cookie-parser');
app.use(cookieParser());
//
global.__basedir = __dirname;

//CORS Stuff
// app.use(cors({
//     origin: 'https://portfolio.aaronskeels1.repl.co'
// }));
let originWhitelist = ["https://aaronskeels.work","https://www.aaronskeels.work"];
let corsOptions = {
  origin: function (origin, callback) {
    if (originWhitelist.indexOf(origin) !== -1 || !origin) {
      // console.log("Good Origin: " + origin);
      callback(null, true);
    } else {
      // console.log("Bad Origin: " + origin);
      callback(new Error("Not allowed by CORS"));
    }
  }
}
app.use(cors(corsOptions));

//DiffieHellmanStuff
io.on('connection', (socket) => {
    console.log("Socket connection established.");
    // socket.emit('out', "1");
    // socket.on('ack', (data) => {
    //     //Ack
    // });
});
let DiffieHellmanChat = require("./diffiehellmanchat.js"); DiffieHellmanChat.init(io);

//SQLAccountsStuff
SQLAccounts = require("./sqlaccounts.js");SQLAccounts.init(sqlite3);
app.post('/projects/SQLAccounts/createacct', function (req, res){
    SQLAccounts.handleCreateAccount(req, res, uuidv4, crypto);
});
app.post('/projects/SQLAccounts/loginacct', function (req, res){
    SQLAccounts.handleLoginAccount(req, res, uuidv4, crypto);
});
app.post('/projects/SQLAccounts/countacct', function (req, res){
    SQLAccounts.handleCountAccounts(req, res);
});

server.listen(process.env.PORT || 3000, function () {
    console.log('listening on *:' + (process.env.PORT || 3000));
});