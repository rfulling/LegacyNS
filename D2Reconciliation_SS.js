/**
 * Copyright NetSuite, Inc. 2015 All rights reserved. 
 * The following code is a demo prototype. Due to time constraints of a demo,
 * the code may contain bugs, may not accurately reflect user requirements 
 * and may not be the best approach. Actual implementation should not reuse 
 * this code without due verification.
 * 
 * (Module description here. Whole header length should not exceed 
 * 100 characters in width. Use another line if needed.)
 * 
 * Version    Date            Author           Remarks
 * 1.00       27 Nov 2015     rtapulado
 * 
 */
{
    var endBal = 0;
    var CONTEXT = nlapiGetContext();
    var INT_USAGE_LIMIT_THRESHOLD = 500;
    var INT_START_TIME = new Date().getTime()
    var ARR_TIME_IDS = [];
    var OBJ_TIME_IDS = {};



    var SBL_JE = 'custpage_sbl_je';
    var COL_RECONCILIATION = 'custpage_col_reconciliation';
    var COL_DATE = 'custpage_col_date';
    var COL_DEBIT = 'custpage_col_debit';
    var COL_CREDIT = 'custpage_col_credit';
    var COL_AMOUNT = 'custpage_col_amount';
    var COL_D2_CLEARED = 'custpage_d2_cleared';
    var COL_DEPARTMENT = 'custpage_department';
    var COL_LOCATION = 'custpage_location';
    var SS_RECONCILIATION_GROUPED = 'customsearch_d2_recon_grouped';
    var SS_RECONCILIATION_BASE = 'customsearch_d2_recon_base';
    var FLD_RECONCILIATION = 'custcol_jm_rtr_d2';
    var FLD_D2_CLEARED = 'custcol_jm_rtr_d2_cleared';
    var SCRIPT_D2_RECONCILIATION = 'customscript_d2_recon_sl';
    var DEPLOY_D2_RECONCILIATION = 'customdeploy_d2_recon_sl';
    var SPARAM_START_INDEX = 'custscript_start_index';
    var SPARAM_RECON_FLD_GRP = 'custscript_recon_field_group';
    var HC_MAX = 1000;
    var SPARAM_MAX = 'custscript_max_count';
}
/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @return {void}
 */
function loanSystemReconciliationGroupedUpdate(type) {
    nlapiLogExecution('DEBUG', 'start time', new Date());
    updateD2Cleared();
    nlapiLogExecution('DEBUG', 'end time =', new Date());
}

/**
 * update journal entry column D2 Cleared checkbox = T
 * @param request
 */
function updateD2Cleared() {
    var oContext = nlapiGetContext();
    var nStartIndex = oContext.getSetting('SCRIPT', SPARAM_START_INDEX);
    var nMax = oContext.getSetting('SCRIPT', SPARAM_MAX);

    var aResults = getJEsGrouped();

    if (isNullOrEmpty(nStartIndex) && isNullOrEmpty(nMax)) {
        nStartIndex = 0;
        nMax = aResults.length;
    }
    if (parseInt(nStartIndex) >= HC_MAX) {
        nlapiLogExecution('debug', 'max', 'end');
        return;
    }

    for (var i = parseInt(nStartIndex) ; i < HC_MAX; i++) { //HC_MAX

        if (parseInt(nStartIndex) < parseInt(nMax)) { //parseInt(nMax)
            //nlapiLogExecution('debug', 'nStartIndex', i + '-' + nMax);
            if (aResults) {
                if (aResults[i]) {
                    var aColumns = aResults[i].getAllColumns();
                    var sReconciliation = aResults[i].getValue('custcol_jm_rtr_d2', null, 'group');
                    var fSubsidiary = aResults[i].getValue('subsidiary', null, 'group');
                    var dAccount = aResults[i].getValue('account', null, 'group');
                    var fClass = aResults[i].getValue('class', null, 'group');
                    var fDepartment = aResults[i].getValue('department', null, 'group');
                    var fDebit = aResults[i].getValue('debitamount', null, 'sum');
                    var fCredit = aResults[i].getValue('creditamount', null, 'sum');
                    var fAmount = aResults[i].getValue('amount', null, 'sum');
                    var fcleared = aResults[i].getValue('custcol_jm_rtr_d2_cleared', null, 'group');
                    var fLocation = aResults[i].getValue('location', null, 'group');
                   
                    if (Eval.isEmpty(fClass)) {
                        fClass = null;
                    }
                    if (Eval.isEmpty(fLocation)) {
                        fLocation = null;
                    }
                    if (Eval.isEmpty(fDepartment)) {
                        fDepartment = null;
                    }

                    if (fDebit == fCredit) {
                        var aReconciliationBased = getJEsBase(sReconciliation);
                        for (var j = 0; j < aReconciliationBased.length; j++) {
                            var aColumns2 = aReconciliationBased[j].getAllColumns();
                            var idJE = aReconciliationBased[j].getValue('internalid', null, 'group');
                            var sRecordType = aReconciliationBased[j].getValue('type', null, 'group');
                            var openRecType = null;
                            var lineType = '';
                           
                            switch (sRecordType) {
                                case 'Journal': openRecType = 'journalentry', lineType = 'line'; break;
                                case 'CustInvc': openRecType = 'invoice',lineType='item'; break;
                                case 'CustCred':  openRecType = 'creditmemo', lineType = 'line' ; break;
                                default: return true;
                            }

                            if (openRecType != 'journalentry') {
                                return;

                            }
                            //check here for goverance 
                            INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);

                            var recJE = nlapiLoadRecord(openRecType, idJE);
                            var nLineJE = recJE.getLineItemCount('line');
                            
                            for (var k = 1; k <= nLineJE; k++) {
                                //Here check the class and account before marking cleared.
                                var lineClass = recJE.getLineItemValue(lineType, 'class', k);
                                var lineAct = recJE.getLineItemValue(lineType, 'account', k);
                                var lineDepartment = recJE.getLineItemValue(lineType, 'department', k);
                                var lineLocation = recJE.getLineItemValue(lineType, 'location', k);
                                var d2Status = recJE.getLineItemValue(lineType, 'custcol_jm_rtr_d2_cleared', k)


                                if (lineClass == fClass && lineAct == dAccount && fDepartment == lineDepartment && fLocation == lineLocation && d2Status == "F") {
                                    recJE.setLineItemValue('line', FLD_D2_CLEARED, k, 'T');
                                }
                            }
                            nlapiLogExecution('DEBUG', 'Submit Record, ' + recJE.getFieldValue('tranid'));
                            nlapiSubmitRecord(recJE);
                        }
                    }
                    //increment index
                    nStartIndex++;
                }
            }

        } else { //just increment hardcoded counter
            //nlapiLogExecution('debug', 'nStartIndex', i + '-' + nMax);
            nStartIndex++;
            //check governance
            if (oContext.getRemainingUsage() <= 100 && parseInt(nStartIndex) < HC_MAX) {
                var nNext = parseInt(nStartIndex) + 1;
                var aParams = {
                    custscript_start_index: nNext,
                    custscript_max_count: nMax
                }
                var sStatus = nlapiScheduleScript(oContext.getScriptId(), oContext.getDeploymentId(), aParams);
                if (sStatus == 'QUEUED')
                    break;
            }
        }

    }


}

function getJEsGrouped() {
    //utilitly to return more than 1000
    var arrResults = SuiteUtil.search(SS_RECONCILIATION_GROUPED, 'transaction', null, null)
    //return nlapiSearchRecord(null, SS_RECONCILIATION_GROUPED);
    return arrResults;
}

function getJEsBase(sReconciliation) {
    var aSearchFilters = new Array();
    aSearchFilters.push(new nlobjSearchFilter(FLD_RECONCILIATION, null, 'is', sReconciliation));
    return nlapiSearchRecord(null, SS_RECONCILIATION_BASE, aSearchFilters);
}

/**
 * 
 * @param sData
 * @returns true if data supplied is null/empty otherwise false
 */
function isNullOrEmpty(sData) {
    return ((sData == '') || (sData == null) || (typeof (sData) == 'undefined')) ? true : false;
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