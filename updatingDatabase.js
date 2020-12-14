exports.clash = (event,current) => {
  event.find({}, function(err, events) {
    if (err) {
      return;
    } else {
      events.forEach(function(evt) {
        if (!(evt.endDate <= current.startDate) && !(current.startDate <= evt.endDate)) {
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
      });
    }
  });
}




exports.changes = (event) => {
  var currentdate = new Date;
  event.find({}, function(err, events) {
    if (err) {
      return;
    } else {
      events.forEach(function(evt) {
        if (evt.endDate < currentdate) {
          event.findByIdAndDelete(evt._id, function(err, evt) {
            if (err) {
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
