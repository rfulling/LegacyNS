/**
 * Copyright (c) 1998-2016 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 *
 *
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.01       02 Sept 2016    mjpascual        New script
 */

/**
 * @param {String}
 *            type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
// Governance variable- to capture when the script was first triggered/ re-run. API Governance marked with [<units consumed>]
var START_TIMESTAMP = new Date(); // timestamps when the script is triggered, initialize this when the script is called
var ARR_ERROR_DETAILS = [];
var ST_USER = '';
var am ='a';

var INT_USAGE_LIMIT_THRESHOLD = 500;
var INT_START_TIME = new Date().getTime();

function scheduled_autoGenerateRecords(type) {
    var ST_LOGGER_TITLE = 'scheduled_autoGenerateRecords';

    try {
        var context = nlapiGetContext();
        var stSOSearch = context.getSetting('SCRIPT', 'custscript_8x8_soSearch');
        var intFulfillmentDays = context.getSetting('SCRIPT', 'custscript_8x8_fulfillmentdays');
        var stAutoApprove = context.getSetting('SCRIPT', 'custscript_8x8_auto_approve');

        ST_USER = context.getSetting('SCRIPT', 'custscript_8x8_admin_email');

        // MB: check script parameters
        if (isEmpty(stSOSearch) || isEmpty(intFulfillmentDays)) {
            log(ST_LOGGER_TITLE, 'Please set all script parameters. Terminate script.');
            return;
        }

        log(ST_LOGGER_TITLE, '==================== SCHEDULED START ====================');

        intFulfillmentDays = forceParseInt(intFulfillmentDays);

        //Search for SOs to process
        var dToday = new Date();

        //Saturday and Sunday
        if (dToday.getDay() == 0 || dToday.getDay() == 6) {
            intFulfillmentDays += 2;
        }

        //Monday
        if (dToday.getDay() == 1) {
            intFulfillmentDays += 1;
        }

        log(ST_LOGGER_TITLE, 'intFulfillmentDays: ' + intFulfillmentDays);
        var dMinusDays = nlapiDateToString(nlapiAddDays(new Date(), -1 * intFulfillmentDays));

        //Separate
        var arrFilter = null;
        if (stAutoApprove == 'T') {
            arrFilter =
				[
				 	'AND',
					[
							[
									[
											'datecreated', 'onorbefore', dMinusDays
									], 'AND',
									[
											'status', 'anyof', 'SalesOrd:A'
									]
							]
					]
				];
        }
        else {
            arrFilter =
				[
				 	'AND',
					[
							[
									'status', 'anyof', 'SalesOrd:B'
							]
					]
				];
        }


        //Complete search components
        var objNSearch = nlapiLoadSearch('', stSOSearch);
        var arrSavedSearchFilterExp = objNSearch.getFilterExpression();
        arrSavedSearchFilterExp = arrSavedSearchFilterExp.concat(arrFilter);

        objNSearch.setFilterExpression(arrSavedSearchFilterExp);

        var searchSO = SuiteUtil.search(null, 'transaction', objNSearch.getFilters(), objNSearch.getColumns());

        if (!isEmpty(searchSO)) {
            var stCount = searchSO.length;
            log(ST_LOGGER_TITLE, 'Initial Search Entry | Sales Order to process: ' + stCount);

            for (var intCtr = 0; intCtr < stCount; intCtr++) {
                var stIFId = '';

                var objSO = searchSO[intCtr];
                var stSOId = objSO.getValue('internalid');
                var stStatus = objSO.getValue('statusref');
                var stPaymentMethod = objSO.getValue('paymentmethod');

                log(ST_LOGGER_TITLE, 'stStatus ' + stStatus);

                if (stStatus == 'pendingApproval') {
                    try {
                        //Approve SO
                        nlapiSubmitField('salesorder', stSOId, 'orderstatus', 'B');
                        log(ST_LOGGER_TITLE, 'SO approved..');

                    } /* End try */
                    catch (error) {
                        var stError = 'Item Fulfilment for SO #' + stSOId + ' cannot be approved. | ' + error.getCode() + ': ' + error.getDetails();
                        nlapiLogExecution('ERROR', ST_LOGGER_TITLE, stError);
                        ARR_ERROR_DETAILS.push(stError);
                        nlapiSubmitField('salesorder', stSOId, ['custbody_8x8_initial_auto_processed', 'custbody_8x8_err_message'], ['T', stError]);
                        continue;
                    }
                }

                log(ST_LOGGER_TITLE, '1 Before Transformation : ' + stSOId);

                try {
                    /* Generate Fulfillment */
                    log(ST_LOGGER_TITLE, '2 Before Transformation : ' + stSOId);
                    var recIF = nlapiTransformRecord('salesorder', stSOId, 'itemfulfillment');
                    log(ST_LOGGER_TITLE, '3 Before Transformation : ' + stSOId);
                    stIFId = nlapiSubmitRecord(recIF, false, true);
                    log(ST_LOGGER_TITLE, '4 Before Transformation : ' + stSOId);
                    log(ST_LOGGER_TITLE, 'SO has been fulfilled. Item Fulfillment ID: ' + stIFId);

                } /* End try */
                catch (error) {
                    var stError = 'Item Fulfilment for SO #' + stSOId + ' not created. | ' + error.getCode() + ': ' + error.getDetails();
                    nlapiLogExecution('ERROR', ST_LOGGER_TITLE, stError);
                    ARR_ERROR_DETAILS.push(stError);
                    nlapiSubmitField('salesorder', stSOId, ['custbody_8x8_initial_auto_processed', 'custbody_8x8_err_message'], ['T', stError]);
                } /* End catch */

                if (!isEmpty(stIFId)) {
                    // save SO
                    nlapiSubmitField('salesorder', stSOId, ['custbody_8x8_initial_auto_processed'], ['T']);
                    nlapiLogExecution('DEBUG', ST_LOGGER_TITLE, 'Checked SO customer record as processed... stSOId =' + stSOId);

                    try {
                        if (!isEmpty(stPaymentMethod)) {
                            /* Generate Cash Sale */
                            var recCashSale = nlapiTransformRecord('salesorder', stSOId, 'cashsale');
                            var CSID = nlapiSubmitRecord(recCashSale, false, true);
                            log(ST_LOGGER_TITLE, 'SO transformed to Cash Sale. Cash Sale ID: ' + CSID);
                        }
                        else {
                            /* Generate Invoice */
                            var recInv = nlapiTransformRecord('salesorder', stSOId, 'invoice');
                            var INVID = nlapiSubmitRecord(recInv, false, true);
                            log(ST_LOGGER_TITLE, 'SO transformed to Invoice. Invoice ID: ' + INVID);
                        }

                    } /* End try */
                    catch (error) {
                        var stError = 'CS / Inv for SO #' + stSOId + ' not created. | ' + error.getCode() + ': ' + error.getDetails();
                        nlapiLogExecution('ERROR', ST_LOGGER_TITLE, stError);
                        ARR_ERROR_DETAILS.push(stError);
                        nlapiSubmitField('salesorder', stSOId, ['custbody_8x8_initial_auto_processed', 'custbody_8x8_err_message'], ['T', stError]);
                    } /* End catch */
                }

                //Monitor usage unit / time run
                INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);
            }

        } /* End if first search */

        log(ST_LOGGER_TITLE, 'Remaining usage: ' + context.getRemainingUsage());
        log(ST_LOGGER_TITLE, '==================== SCHEDULED END ====================');
    }

    catch (error) {
        if (error.getDetails != undefined) {
            nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else {
            nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
            throw nlapiCreateError('99999', error.toString());
        }
    }
}

/**
*
* Send error status email
*
*/
function sendEmail() {
    var stLogTitle = 'scheduled_autoGenerateRecords.sendEmail';

    var stUser = ST_USER;
    if (isEmpty(stUser)) {
        stUser = nlapiGetUser();
    }
    var stSubject = '[8x8] Auto Generate Records';
    var stBody = '';
    stBody += 'Date: ' + new Date() + ' <br/>';
    if (ARR_ERROR_DETAILS.length > 0) {
        stBody += 'Errors: <br/>';
        for (var intCtr = 0; intCtr < ARR_ERROR_DETAILS.length; intCtr++) {
            stBody += ' - ' + ARR_ERROR_DETAILS[intCtr] + '<br/>';
        }
    }
    else {
        stBody += 'Process Status: Successful.';
    }

    nlapiLogExecution('DEBUG', stLogTitle, 'stUser = ' + stUser + '| stBody =' + stBody);

    nlapiSendEmail(stUser, stUser, stSubject, stBody);

    nlapiLogExecution('DEBUG', stLogTitle, 'Email Sent..');
}

/**
 * Null Checker
 *
 * @param {String}
 *            field id
 * @returns {boolean}
 */
function isEmpty(field) {
    if (field == '' || field == null || field == "null" || field == undefined) {
        return true;
    }

    return false;

}

/**
 * Logging
 *
 * @param {String}
 *            Log Title
 * @param {String}
 *            Log Details
 * @returns void
 */
function log(title, details) {
    nlapiLogExecution('DEBUG', title, details);
}

/**
 * Forced Parsing
 *
 * @param {String}
 *            Value to parse
 *
 * @returns {Number} Parsed value or 0
 */
function forceParseFloat(stValue) {
    return (isNaN(parseFloat(stValue)) ? 0.00 : parseFloat(stValue));
}

/**
 * Forced Parsing
 *
 * @param {String}
 *            Value to parse
 *
 * @returns {Number} Parsed value or 0
 */
function forceParseInt(stValue) {
    return (isNaN(parseInt(stValue)) ? 0.00 : parseInt(stValue));
}



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