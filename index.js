//requiring modules
require('dotenv').config()
const mongoose = require("mongoose");
const express = require("express");
const bodyParser = require("body-parser");
const DateTime = require("luxon");
const updateData = require("./updatingDatabase.js");
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const LocalStrategy = require('passport-local').Strategy;
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const findOrCreate = require('mongoose-findorcreate');


//creating app
const app = express();

app.use(bodyParser.urlencoded({
  extended: true
}));
app.set("view engine", "ejs");
app.use(express.static("public"));
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());
app.use(passport.session());


//conecting to database eventmanager and creating database and new event
mongoose.connect("mongodb://localhost:27017/eventmanager", {
  useUnifiedTopology: true,
  useNewUrlParser: true
});
// creating event schema
const eventschema = new mongoose.Schema({
  eventName: {
    type: String,
    required: [1, "Event Name is required"]
  },
  clubName: {
    type: String,
    required: [1, "Club Name is required"]
  },
  startDate: {
    type: Date,
    required: [1, "date required"]
  },
  endDate: {
    type: Date,
    required: [1, "date required"]
  },
  description: String,
  registrationLink: String,
  status: String,
  clashing: Boolean
});
// creating event model
const event = new mongoose.model("event", eventschema);
//creating User Schema
const userSchema = new mongoose.Schema({
  email : {
    type : String,
    require : false,
    unique : false
  },
  username : {
    type : String,
    require : false,
    unique : false
  },
  password : {
    type : String,
    require : false,
    unique : false
  },
  googleId : {
    type : String,
    require : false,
    unique : false
  },
  createdEvents : [String]
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)
//creating User model
const User = new mongoose.model("user", userSchema);


passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/eventistry",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(request, accessToken, refreshToken, profile, done) {
    User.findOrCreate({ googleId: profile.id, email: profile.email, username: profile.given_name}, function (err, user) {
      if(err){
        console.log(err);
      }
      return done(err, user);
    });
  }
));


// declaring variables
var newevent = new event();
var eventID = "";
var deleteEventFlag = false;
var deletedEvent = new event();
var currentcreated = new event();

// calling function changes every second
setInterval(function() {
  updateData.changes(event);
}, 1000);






//////////////////////////////////////////////////// get requests //////////////////////////////////////////////////////////////

//get request to homepage.
app.get("/", function(req, res) {
  res.render("homepage");
});

// get request to register page.
app.get("/register",function(req,res){
    res.render("register");
});

// get request to login page.
app.get("/login",function(req,res){
    res.render("login");
});

//get request to timeline.
app.get("/timeline", function(req, res) {
  event.find({}, function(err, events) {
    if (err) {
      console.log(err);
    } else {
      res.render("timeline", {
        eventArr: events,
      });
    }
  }).sort({
    startDate: 1
  });
});

//get request to create form.
app.get("/createform", function(req, res) {
  if(req.isAuthenticated()){
    res.render("createform");
  } else {
    res.redirect("/login");
  }

});

//get request to created form.
app.get("/formcreated", function(req, res) {
  if(req.isAuthenticated()){
    res.render("formcreated", {
      eventid: currentcreated._id,
      event: currentcreated.eventName
    });
  } else{
    res.redirect("/login");
  }

});

//get request to delete form.
app.get("/deleteform", function(req, res) {
  res.render("deleteform");
});

// get request to deleted form
app.get("/formdeleted", function(req, res) {
  res.render("formdeleted", {
    flag: deleteEventFlag,
    event: deletedEvent
  });
});

//google authentication
app.get('/auth/google',
  passport.authenticate('google', { scope: ['email' ,'profile' ] })
);

app.get( '/auth/google/eventistry',
    passport.authenticate( 'google', {
        successRedirect: '/profile',
        failureRedirect: '/login'
}));

//get request to profile
app.get("/profile",function(req,res){
  if(req.isAuthenticated()){
    userEvents = req.user.createdEvents;
    event.find({_id : userEvents}, function(err,foundEvent){
      if(err){
        console.log(err);
      } else {
        res.render("profile",{username: req.user.username, email: req.user.email, eventArr: foundEvent});
      }
    });

  }else{
    res.redirect("/login");
  }
});

//get request to logout
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/login");
});

/////////////////////////////////////// post requests ////////////////////////////////////////////////////////

//post request from create form
app.post("/createform", function(req, res) {

  var eventName = req.body.eventName;
  var clubName = req.body.clubName;
  var startDate = req.body.startDate;
  var startTime = req.body.startTime;
  var endDate = req.body.endDate;
  var endTime = req.body.endTime;
  var description = req.body.description;
  var registrationLink = req.body.registrationLink;

  newevent.eventName = eventName;
  newevent.clubName = clubName;
  newevent.startDate = startDate + "T" + startTime + "+05:30";
  newevent.endDate = endDate + "T" + endTime + "+05:30";
  newevent.description = description;
  newevent.registrationLink = registrationLink;
  newevent.status = "future";
  newevent.clashing = false;

  currentcreated = newevent;
  newevent.save();
  updateData.clash(event,currentcreated);
  if(req.isAuthenticated()){
    User.findById(req.user._id, function(err,foundUser){
      if(err){
        console.log(err);
      }else{
        if(foundUser){
          userEvents = foundUser.createdEvents;
          userEvents.push(currentcreated._id);
          User.findByIdAndUpdate(req.user._id,{ $set: {createdEvents: userEvents}},function(err,user){
            if(err){
              console.log(err);
            }else{
              console.log(user);
            }
          });
        }
      }
    });
  }else{
    res.redirect("/login");
  }
  console.log(req.user);
  newevent = new event();

  res.redirect("/formcreated");

});

//post request from delete form.
app.post("/deleteform", function(req, res) {
  eventID = req.body.eventid;

  event.findByIdAndDelete(eventID, function(err, evt) {
    if (err) {
      deleteEventFlag = false;
    } else {
      deleteEventFlag = true;
      deletedEvent = evt;
    }
  });
  res.redirect("/formdeleted");

});

//post request from register page.
app.post("/register", function(req,res){

  User.register({ username: req.body.username, email: req.body.email}, req.body.password, function(err,user){
    if(err){
      console.log(err);
      res.redirect("/register")
    } else {
      passport.authenticate("local")(req,res,function(){
          res.redirect("/createform");
        });
    }
  });

});

//post request from login page.
app.post("/login", function(req, res){
  const user = new User({
    username : req.body.username,
    password : req.body.password
  });

  req.login(user, function(err){
    if(err){
      console.log(err);
    } else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/createform");
      });
    }
  });

});





////////////////////////////////////// listen to the port //////////////////////////////////////////////////

app.listen(3000, function() {
  console.log("server started at 3000");
});
