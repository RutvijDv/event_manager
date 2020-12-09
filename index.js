//requiring modules
const mongoose = require("mongoose");
const express = require("express");
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.urlencoded({
  extended: true
}));
app.set("view engine", "ejs");
app.use(express.static("public"));

//conecting to database eventmanager and creating database and new event
mongoose.connect("mongodb://localhost:27017/eventmanager", {
  useUnifiedTopology: true,
  useNewUrlParser: true
});

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

const event = new mongoose.model("event", eventschema);

var newevent = new event();
var eventID = "";
var deleteEventFlag = false;
var deletedEvent = new event();
var eventFlag = false;
var currentcreated = new event();

setInterval(function() {
  changes();
}, 1000);

//get request to create form
app.get("/", function(req, res) {
  changes();
  res.sendFile(__dirname + "/homepage.html");
});
app.get("/timeline", function(req, res) {
  event.find({}, function(err, events) {
    if (err) {
      eventFlag = false;
    } else {
      eventFlag = true;
      res.render("timeline", {
        flag: eventFlag,
        eventArr: events,
      });
    }
  }).sort({
    startDate: 1
  });
});
app.get("/createform", function(req, res) {
  res.sendFile(__dirname + "/form.html");
});

app.get("/formcreated", function(req, res) {
  res.render("created", {
    eventid: currentcreated._id,
    event: currentcreated.eventName
  });
});

app.get("/deleteform", function(req, res) {
  res.sendFile(__dirname + "/deleteForm.html");
});

app.get("/deleted", function(req, res) {
  res.render("deleted", {
    flag: deleteEventFlag,
    event: deletedEvent
  });
});

//posting in form
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
  newevent.startDate = startDate + "T" + startTime + "+0530";
  newevent.endDate = endDate + "T" + endTime + "+0530";
  newevent.description = description;
  newevent.registrationLink = registrationLink;
  newevent.status = "future";
  newevent.clashing = false;
  currentcreated = newevent;
  clash(currentcreated);
  newevent.save();
  newevent = new event();
  res.redirect("/formcreated");
});

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
  res.redirect("/deleted");

});

function changes() {
  var currentdate = new Date;
  event.find({}, function(err, events) {
    if (err) {
      return;
    } else {
      events.forEach(function(evt) {
        if (evt.endDate < currentdate) {
          event.findByIdAndDelete(evt._id,function(err,evt){
            if(err){
              console.log(err);
            }
          });
        }
        if (evt.startDate < currentdate && evt.endDate > currentdate) {
          event.findByIdAndUpdate(evt._id, {
            $set: {
              status: 'ongoing'
            }
          }, function(err, up) {
            if (err) {
              console.log(err);
            }
          });
        }
      });
    }
  });
}

function clash(current) {
  event.find({}, function(err, events) {
    if (err) {
      return;
    } else {
      events.forEach(function(evt) {
        if (evt.startDate <= current.startDate) {
          if (current.startDate < evt.endDate) {
            event.findByIdAndUpdate(evt._id, {
              $set: {
                clashing: true
              }
            }, function(err, up) {
              if (err) {
                console.log(err);
              } else {
                console.log("event updated");
              }
            });
            event.findByIdAndUpdate(current._id, {
              $set: {
                clashing: true
              }
            }, function(err, up) {
              if (err) {
                console.log(err);
              } else {
                console.log("event updated");
              }
            });
          }
        } else {
          if (evt.startDate < current.endDate) {
            event.findByIdAndUpdate(evt._id, {
              $set: {
                clashing: true
              }
            }, function(err, up) {
              if (err) {
                console.log(err);
              } else {
                console.log("event updated");
              }
            });
            event.findByIdAndUpdate(current._id, {
              $set: {
                clashing: true
              }
            }, function(err, up) {
              if (err) {
                console.log(err);
              } else {
                console.log("event updated");
              }
            });
          }
        }
      });
    }
  });
}

app.listen(3000, function() {
  console.log("server started at 3000");
});
