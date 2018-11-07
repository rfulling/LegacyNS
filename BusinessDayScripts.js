 var newDay = addBusinessDays(new Date("7/17/2012"), 17);

//Returns Date object - Thu Aug 09 2012 00:00:00 GMT-0700 (PDT).
function addBusinessDays(baseDate, daysToAdd) {
             var newDate = baseDate;
             var bussDayCounter = 0;

             while ( bussDayCounter < daysToAdd ) {
                      newDate = nlapiAddDays(newDate, 1);
                      if ( newDate.getDay() == 0 ) {
                               newDate = nlapiAddDays(newDate, 1);
                      } else if ( newDate.getDay() == 6 ) {
                               newDate = nlapiAddDays(newDate, 2);
                      }

                      bussDayCounter++;
             }

             return newDate;
          }




// add (or subtract) business days to provided date
addBusinessDays = function (startingDate, daysToAdjust) {
    var newDate = new Date(startingDate.valueOf()),
        businessDaysLeft,
        isWeekend,
        direction;

    // Timezones are scary, let's work with whole-days only
    if (daysToAdjust !== parseInt(daysToAdjust, 10)) {
        throw new TypeError('addBusinessDays can only adjust by whole days');
    }

    // short-circuit no work; make direction assignment simpler
    if (daysToAdjust === 0) {
        return startingDate;
    }
    direction = daysToAdjust > 0 ? 1 : -1;

    // Move the date in the correct direction
    // but only count business days toward movement
    businessDaysLeft = Math.abs(daysToAdjust);
    while (businessDaysLeft) {
        newDate.setDate(newDate.getDate() + direction);
        isWeekend = newDate.getDay() in {0: 'Sunday', 6: 'Saturday'};
		//Here check the exception table.
		
        if (!isWeekend) {
            businessDaysLeft--;
        }
    }
    return newDate;
};