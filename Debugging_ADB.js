var endBal = 0;
var CONTEXT = nlapiGetContext();
var INT_USAGE_LIMIT_THRESHOLD = 500;
var INT_START_TIME = new Date().getTime()
var ARR_TIME_IDS = [];
var OBJ_TIME_IDS = {};




function processADB() {

    //get all the balance sheet accounts 
    var actPeriods = getAccountingPeriods();

    var arrItems = [];
    var OBJ_ITEMS = {};
    //  if (balActs) {
    //for ongoing use we will pass in the period id from the suitelet and run one at a time.
    //
    if (actPeriods) {

        for (var x = 0; x < actPeriods.length ; x++) {
            var actPeriod = nlapiLoadRecord('accountingperiod', actPeriods[x].getId());
            var begDate = nlapiStringToDate(actPeriod.getFieldValue('startdate'));
            var endDate = nlapiStringToDate(actPeriod.getFieldValue('enddate'));
            var daysInPeriod = (endDate.getTime() - begDate.getTime()) / (1000 * 60 * 60 * 24);
            daysInPeriod = Math.round(daysInPeriod);

            var pdate = begDate;
            var sumDate = begDate;
            var dtEndDate = endDate;
            var actPeriodId = actPeriods[x].getId();
            var endBalCal = 0;
            //now get all bs Accounts
            var arrAccounts = getAllBSAccounts();
            for (var bs = 0; bs < arrAccounts.length ; bs++) {
                // for (var x = 0; x < balActs.length ; x++) {
                //get the balance for subsidiary, account, location, department, class from the transactions
                //get balances 
                var arrBegBal = [];
                var arrcurTrans = [];
                var arrendBal = [];
                sumDate = begDate;
                var endBalCal = 0;
                var intAccount = arrAccounts[bs].getId();//accounts payable

               // arrBegBal = getBalances(intAccount, pdate, 'before', pdate, actPeriodId);
             //   arrcurTrans = getBalances(intAccount, pdate, 'within', dtEndDate, actPeriodId);
              //  arrendBal = getBalances(intAccount, pdate, 'onorbefore', dtEndDate, actPeriodId);
                //InsertEnding Line.

                //get the daily ending balances 
                endBalCal = getCumBalances(intAccount, dtEndDate, 'onorbefore', dtEndDate, actPeriodId);

                //Insert Cumulative line
                var sot = '';
                ///create an object from each of the arrays
               

                var stop = '';
            }
        }
    }

    //  nlapiLogExecution('DEBUG', stLogTitle, 'Generating Form...');
}


var endBalCal = 0;
var intAccount =6177;// arrAccounts[bs].getId();//accounts payable

//arrBegBal = getBalances(intAccount, pdate, 'before', pdate, actPeriodId);
//arrcurTrans = getBalances(intAccount, pdate, 'within', dtEndDate, actPeriodId);

//arrendBal = getBalances(intAccount, pdate, 'onorbefore', dtEndDate, actPeriodId);
//InsertEnding Line.

//get the daily ending balances
endBalCal = getCumBalances(intAccount, dtEndDate, 'onorbefore', dtEndDate, actPeriodId);

//Insert Cumulative line
var sot = '';
///create an object from each of the arrays
//INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);

//var myARBal = nlapiCreateRecord('customrecord_jm_monthly_adb');
//  var mAct = nlapiCreateRecord('customrecord_jm_monthly_adb');
//  var mEnd = nlapiCreateRecord('customrecord_jm_monthly_adb')



var stop = '';


    

//  nlapiLogExecution('DEBUG', stLogTitle, 'Generating Form...');
//Group

/**
 *  Call the scheduled script to process time
 *
 * @param request
 * @param stDepId
 *
 */



function getCumBalances(account, dtDate, stOperator, myEndDate, actPeriod) {
    var arrFilters = [];
    var arrColumns = [];
    dtDate = nlapiDateToString(dtDate);
    prEndDate = nlapiDateToString(myEndDate);
    var actPeriodObj = nlapiLoadRecord('accountingperiod', actPeriod);
    var begDate = nlapiStringToDate(actPeriodObj.getFieldValue('startdate'));
    var endDate = nlapiStringToDate(actPeriodObj.getFieldValue('enddate'));
    var daysInPeriod = (endDate.getTime() - begDate.getTime()) / (1000 * 60 * 60 * 24);
    daysInPeriod = Math.round(daysInPeriod);
   
    var pdate = begDate;
    var dtEndDate = endDate;
    arrFilters.push(new nlobjSearchFilter('account', null, 'is', account));
    //arrFilters.push(new nlobjSearchFilter('trandate', null, stOperator, prEndDate));
    arrFilters.push(new nlobjSearchFilter('postingperiod', null, 'is', actPeriod));

    arrColumns.push(new nlobjSearchColumn('account', null, 'group'));
    arrColumns.push(new nlobjSearchColumn('subsidiary', null, 'group'));
    arrColumns.push(new nlobjSearchColumn('department', null, 'group'));
    arrColumns.push(new nlobjSearchColumn('location', null, 'group'));
    arrColumns.push(new nlobjSearchColumn('class', null, 'group'));
    arrColumns.push(new nlobjSearchColumn('amount', null, 'sum'));
   // arrColumns.push(new nlobjSearchColumn('trandate', null, 'group'));
    var arrTransactions = [];
    var arrCumBala = [];
   // var arrFilters = [];
   
    cumulativeEndBal = 0;
    arrTransactions = nlapiSearchRecord('transaction', 'customsearch_jm_adb_account_bal_by_dat', arrFilters, arrColumns);
    //Now i have transactions for this period by sub,account,loc,class dept
    INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);
    if (arrTransactions) {
        //get cumulative ending balance for row of the transaction
        for (var i = 0; i < arrTransactions.length ; i++) {
            //builde the criteria to get the ending balances by the key
            while (pdate <= dtEndDate) {
                var arrBalFilters = [];
                arrBalFilters.push(new nlobjSearchFilter('trandate', null, 'onorbefore', nlapiDateToString(pdate)));
                arrBalFilters.push(new nlobjSearchFilter('account', null, 'is', account));

                if (arrTransactions[i].getValue('subsidiary', null, 'group')) { 
                     arrBalFilters.push(new nlobjSearchFilter('subsidiary', null, 'anyof', arrTransactions[i].getValue('subsidiary', null, 'group')));
                }
                if (arrTransactions[i].getValue('department', null, 'group')) {
                    arrBalFilters.push(new nlobjSearchFilter('department', null, 'anyof', arrTransactions[i].getValue('department', null, 'group')));
                }
                if (arrTransactions[i].getValue('location', null, 'group')) {
                    arrBalFilters.push(new nlobjSearchFilter('location', null, 'anyof', arrTransactions[i].getValue('location', null, 'group')));
                }
                if (arrTransactions[i].getValue('class', null, 'group')) {
                    arrBalFilters.push(new nlobjSearchFilter('class', null, 'anyof', arrTransactions[i].getValue('class', null, 'group')));
                }
                //search ending balance based on the new filters same columns
                arrCumBala = nlapiSearchRecord('transaction', 'customsearch_jm_adb_account_bal_by_dat', arrBalFilters, arrColumns)
                  cumulativeEndBal = parseFloat(cumulativeEndBal) + parseFloat(arrCumBala[0].getValue('amount', null, 'sum'));
                pdate = nlapiAddDays(pdate, 1);
            }
            var myARBal = nlapiCreateRecord('customrecord_jm_adb_summary');
            myARBal.setFieldValue('custrecord_jm_adm_summary_period', actPeriodId);

            myARBal.setFieldValue('custrecord_jm_summary_account', arrTransactions[0].getValue('account', null, 'group'));
            myARBal.setFieldValue('custrecord_jm_adb_summary_sub', arrTransactions[0].getValue('subsidiary', null, 'group'));
            myARBal.setFieldValue('custrecord_jm_summary_dept', arrTransactions[0].getValue('department', null, 'group'));
            myARBal.setFieldValue('custrecord_jm_adb_summary_class', arrTransactions[0].getValue('class', null, 'group'));
            myARBal.setFieldValue('custrecord_jm_summary_location', arrTransactions[0].getValue('location', null, 'group'));
            //
            myARBal.setFieldValue('custrecord_jm_adb_cumulative', cumulativeEndBal);
            myARBal.setFieldValue('custrecord_jm_adb_summary_adb', (parseFloat(cumulativeEndBal) / (parseInt(daysInPeriod) + 1)));
            nlapiSubmitRecord(myARBal);
        }
    }
    return cumulativeEndBal;
}

function getAccountingPeriods() {
    var arrFilters = [];
    var arrColumns = [];

    //  arrFilters.push(new nlobjSearchFilter('account', null, 'is', account));
    //  arrFilters.push(new nlobjSearchFilter('trandate', null, stOperator, dtDate));
    arrColumns.push(new nlobjSearchColumn('startdate').setSort(true));
    // var arrACTS = SuiteUtil.search('customsearch_jm_accounting_period_sr', 'accountingperiod', arrFilters, arrColumns)
    var arrACTS = nlapiSearchRecord('accountingperiod', 'customsearch_jm_accounting_period_sr', null, arrColumns);
    return arrACTS;
}

function deleteCustomRecords() {

    var arrFilters = [];
    var arrColumns = [];

    var arrREQ = SuiteUtil.search('customsearch_delete_customrecord_jm_mont', 'customrecord_jm_monthly_adb', arrFilters, arrColumns)
    //for each row in the result set get the set the internal id of thd custom record with the running total of the budget

    for (var i = 0; i < arrREQ.length; i++) {
        INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);
        nlapiDeleteRecord('customrecord_jm_monthly_adb', arrREQ[i].getId());
    }
}

function getAllBSAccounts() {

    var arrFilters = [];
    var arrColumns = [];

    var arrREQ = SuiteUtil.search('customsearch_rtf_all_balance_sheet_act', 'account', arrFilters, arrColumns)
    //for each row in the result set get the set the internal id of thd custom record with the running total of the budget
    return arrREQ;
}

// ------------------------------------------------- UTILITY FUNCTIONS -------------------------------------------------
var Eval =
{
    /**
	 * Evaluate if the given string is empty string, null or undefined.
	 * 
	 * @param {String}
	 *            stValue - Any string value
	 * @returns {Boolean}
	 * @memberOf Eval
	 * @author memeremilla
	 */
    isEmpty: function (stValue) {
        if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
            return true;
        }

        return false;
    },
    /**
	* Evaluate if the given string is an element of the array
	* 
	* @param {String}
	*            stValue - String to find in the array.
	* @param {Array}
	*            arr - Array to be check for components.
	* @returns {Boolean}
	* @memberOf Eval
	* @author memeremilla
	*/
    inArray: function (stValue, arr) {
        var bIsValueFound = false;

        for (var i = 0; i < arr.length; i++) {
            if (stValue == arr[i]) {
                bIsValueFound = true;
                break;
            }
        }

        return bIsValueFound;
    },
};

var Parse =
{
    /**
	 * Converts String to Float
	 * 
	 * @author asinsin
	 */
    forceFloat: function (stValue) {
        var flValue = parseFloat(stValue);

        if (isNaN(flValue)) {
            return 0.00;
        }

        return flValue;
    },
};

var SuiteUtil =
{

    /**
	 * Get all of the results from the search even if the results are more than
	 * 1000.
	 * 
	 * @param {String}
	 *            strSearchId - the search id of the saved search that will be
	 *            used.
	 * @param {String}
	 *            strRecordType - the record type where the search will be
	 *            executed.
	 * @param {Array}
	 *            arrSearchFilter - array of nlobjSearchFilter objects. The
	 *            search filters to be used or will be added to the saved search
	 *            if search id was passed.
	 * @param {Array}
	 *            arrSearchColumn - array of nlobjSearchColumn objects. The
	 *            columns to be returned or will be added to the saved search if
	 *            search id was passed.
	 * @returns {Array} - an array of nlobjSearchResult objects
	 * @memberOf SuiteUtil
	 * @author memeremilla
	 */
    search: function (stSearchId, stRecordType, arrSearchFilter, arrSearchColumn) {
        var arrReturnSearchResults = new Array();
        var nlobjSavedSearch;

        if (stSearchId != null) {
            nlobjSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

            // add search filter if one is passed
            if (arrSearchFilter != null) {
                nlobjSavedSearch.addFilters(arrSearchFilter);
            }

            // add search column if one is passed
            if (arrSearchColumn != null) {
                nlobjSavedSearch.addColumns(arrSearchColumn);
            }
        }
        else {
            nlobjSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
        }

        var nlobjResultset = nlobjSavedSearch.runSearch();
        var intSearchIndex = 0;
        var nlobjResultSlice = null;
        do {
            if ((nlapiGetContext().getExecutionContext() === 'scheduled')) {
                this.rescheduleScript(1000);
            }

            nlobjResultSlice = nlobjResultset.getResults(intSearchIndex, intSearchIndex + 1000);
            if (!(nlobjResultSlice)) {
                break;
            }

            for (var intRs in nlobjResultSlice) {
                arrReturnSearchResults.push(nlobjResultSlice[intRs]);
                intSearchIndex++;
            }
        }

        while (nlobjResultSlice.length >= 1000);

        return arrReturnSearchResults;
    },

    /**
	 * Pauses the scheduled script either if the remaining usage is less than
	 * the specified governance threshold usage amount or the allowed time is
	 * exceeded. Then it will reschedule it.
	 * 
	 * @param {Number}
	 *            intGovernanceThreshold - The value of the governance threshold
	 *            usage units before the script will be rescheduled.
	 * @param {Number}
	 *            intStartTime - The time when the scheduled script started
	 * @param {Number}
	 *            flPercentOfAllowedTime - the percent of allowed time based
	 *            from the maximum running time. The maximum running time is
	 *            3600000 ms.
	 * @returns void
	 * @memberOf SuiteUtil
	 * @author memeremilla
	 */
    rescheduleScript: function (intGovernanceThreshold, intStartTime, intMaxTime, flPercentOfAllowedTime) {
        var stLoggerTitle = 'SuiteUtil.rescheduleScript';
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
		{
		    'Remaining usage': nlapiGetContext().getRemainingUsage()
		}));

        if (intMaxTime == null) {
            intMaxTime = 3600000;
        }

        var intRemainingUsage = nlapiGetContext().getRemainingUsage();
        var intRequiredTime = 900000; // 25% of max time
        if ((flPercentOfAllowedTime)) {
            var flPercentRequiredTime = 100 - flPercentOfAllowedTime;
            intRequiredTime = intMaxTime * (flPercentRequiredTime / 100);
        }

        // check if there is still enough usage units
        if ((intGovernanceThreshold)) {
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Checking if there is still enough usage units.');

            if (intRemainingUsage < (parseInt(intGovernanceThreshold, 10) + parseInt(20, 10))) {
                nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
				{
				    'Remaining usage': nlapiGetContext().getRemainingUsage()
				}));
                nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

                var objYield = nlapiYieldScript();
                if (objYield.status == 'FAILURE') {
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					{
					    'Status': objYield.status,
					    'Information': objYield.information,
					    'Reason': objYield.reason
					}));
                }
                else {
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					{
					    'After resume with': intRemainingUsage,
					    'Remaining vs governance threshold': intGovernanceThreshold
					}));
                }
            }
        }

        if ((intStartTime)) {
            // get current time
            var intCurrentTime = new Date().getTime();

            // check if elapsed time is near the arbitrary value
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Check if elapsed time is near the arbitrary value.');

            var intElapsedTime = intMaxTime - (intCurrentTime - intStartTime);
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Remaining time is ' + intElapsedTime + ' ms.');

            if (intElapsedTime < intRequiredTime) {
                nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

                // check if we are not reaching the max processing time which is 3600000 seconds
                var objYield = nlapiYieldScript();
                if (objYield.status == 'FAILURE') {
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					{
					    'Status': objYield.status,
					    'Information': objYield.information,
					    'Reason': objYield.reason
					}));
                }
                else {
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					{
					    'After resume with': intRemainingUsage,
					    'Remaining vs governance threshold': intGovernanceThreshold
					}));

                    // return new start time        
                    intStartTime = new Date().getTime();
                }
            }
        }

        return intStartTime;
    },
};
