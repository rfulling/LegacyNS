/**
 * Copyright NetSuite, Inc. 2013 All rights reserved. 
 * The following code is a demo prototype. Due to time constraints of a demo,
 * the code may contain bugs, may not accurately reflect user requirements 
 * and may not be the best approach. Actual implementation should not reuse 
 * this code without due verification.
 * 
 * Version    Date            Author           Remarks
 * 1.00       04 Dec 2013     Randy Lorenzano
 * 
 */



// Script Parameters
SPARAM_DEPARTMENT = 'custscript_rl_sdg_department';
SPARAM_CHART_BG = 'custscript_rl_sdg_chart_bg';
SPARAM_DEBUGMODE = 'custscript_rl_debug_mode';
SPARAM_ENT_TYPES = 'custscript_rl_entitlement_types';

DEPARTMENT = nlapiGetContext().getSetting('SCRIPT', SPARAM_DEPARTMENT);
CHART_BG_COLOR = nlapiGetContext().getSetting('SCRIPT', SPARAM_CHART_BG);
DEBUG = nlapiGetContext().getSetting('SCRIPT', SPARAM_DEBUGMODE) == 'T';
ENT_TYPES = nlapiGetContext().getSetting('SCRIPT', SPARAM_ENT_TYPES);

// Other Constants
CAPACITY_CHART_TITLE = 'Capacity Chart';
WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];


HC_BG_HOLIDAY = '#006633';
HC_TC_HOLIDAY = '#33FF00';

HC_BG_WEEKEND = '#ccc';

HC_CHAR_HALF = '&#189;';

// Request Status
HC_REQ_PENDING = 1;
HC_REQ_APPROVED = 2;
HC_REQ_REJECTED = 3;

// get the format defined by the user for compatibility
HC_DATEFORMAT = nlapiLoadConfiguration('userpreferences').getFieldValue('dateformat');


REC_EMPLOYEE = 'employee';
FLD_LASTNAME = 'lastname';
FLD_FIRSTNAME = 'firstname';
FLD_DEPARTMENT = 'department';
FLD_ISINACTIVE = 'isinactive';
FLD_HIREDATE = 'hiredate';
FLD_BIRTHDATE = 'birthdate';


/* accepts a date string and returns a string date */
function rlAddDays(sDate, numDays) {
    return nlapiDateToString(nlapiAddDays(nlapiStringToDate(sDate), numDays), HC_DATEFORMAT);
}


function inArray(needle, haystack) {
    if (haystack == null)
        return false;
    var length = haystack.length;
    for (var i = 0; i < length; i++) {
        if (haystack[i] == needle) return true;
    }
    return false;
}


function getEmployees(idDepartment) {
    var sColumns = [
                    new nlobjSearchColumn(FLD_FIRSTNAME),
                    new nlobjSearchColumn(FLD_LASTNAME),
                    new nlobjSearchColumn(FLD_DEPARTMENT),
                    new nlobjSearchColumn(FLD_HIREDATE),
                    new nlobjSearchColumn(FLD_BIRTHDATE),
    ];

    var sFilters = [
                    new nlobjSearchFilter(FLD_DEPARTMENT, null, 'is', idDepartment),
                    new nlobjSearchFilter(FLD_ISINACTIVE, null, 'is', 'F')
    ];

    var arrEmployees = nlapiSearchRecord(REC_EMPLOYEE, null, sFilters, sColumns);
    return arrEmployees;
};

function daysOfMonth(theDate) {

    var month = theDate.getMonth(); // Month starts from 0 ; Zero
    var year = theDate.getFullYear();
    var days = 31;

    switch (month) {
        case 2: case 4: case 6: case 7: case 9: case 11:
            days = 31;
        case 3: case 5: case 8: case 10:
            days = 30;
            break;
        case 1:
            days = (year % 4) ? 28 : 29;
            break;
    }

    return days;
}


