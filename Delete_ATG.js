/**
 * Copyright (c) 1998-2016 NetSuite, Inc. 2955 Campus Drive, Suite 100, San
 * Mateo, CA, USA 94403-2511 All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite,
 * Inc. ("Confidential Information"). You shall not disclose such Confidential
 * Information and shall use it only in accordance with the terms of the license
 * agreement you entered into with NetSuite.
 * 
 */
/**
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.00       09 Jun 2016     lbalboa		Initial Version
 *
 */

/**
 * @param {String}
 *            type Context Types: scheduled, ondemand, userinterface, aborted,
 *            skipped
 * @returns {Void}
 */
var INT_USAGE_LIMIT_THRESHOLD = 500;
var INT_START_TIME = new Date().getTime();
//scheduled_DeleteProcessedATG();

function scheduled_DeleteProcessedATG(type) {
    //  var context = nlapiGetContext();
    var arrColumns = [];
    var arrFilters = [];

    var stLogTitle = 'scheduled_DeleteProcessedATG';
    try {
        // nlapiLogExecution('DEBUG', stLogTitle, '>>Script Entry<<');
        //var stATGProcessedSavedSearch = context.getSetting('SCRIPT', 'custscript_si_atg_saved_search');
        var stATGProcessedSavedSearch = 'customsearch_records_not_processed';
        // if (Eval.isEmpty(stATGProcessedSavedSearch)) {
        //      throw nlapiCreateError('EMPTY_SCRIPT_PARAMETER', 'Script Parameters should not be empty.');
        //  }

        //
        arrColumns.push(new nlobjSearchColumn('custrecord_csi_atg_setlmnt_order_id'));
        arrColumns.push(new nlobjSearchColumn('custrecord_csi_atg_setlmnt_trans_detail'));
        arrColumns.push(new nlobjSearchColumn('custrecord_csi_atg_setlmnt_trans_type'));
        arrColumns.push(new nlobjSearchColumn('custrecord_csi_atg_setlmnt_proc_type'));
        arrColumns.push(new nlobjSearchColumn('custrecord_csi_atg_setlmnt_tot_amt_deb'));

        var arrProcessedATG = SuiteUtil.search(stATGProcessedSavedSearch, 'customrecord_csi_atg_settlement', null, arrColumns);
        //  var arrProcessedATG = nlapiSearchRecord('customrecord_csi_atg_settlement',stATGProcessedSavedSearch,null,arrColumns);

        // if (Eval.isEmpty(arrProcessedATG)) {
        //     nlapiLogExecution('DEBUG', stLogTitle, 'ATG Settlement Records Search Result is null. Script will now Exit');
        //     return;
        // }

        deleteProcessedATGSettlement(arrProcessedATG);

        //markAtgProc(arrProcessedATG);

        //  nlapiLogExecution('DEBUG', stLogTitle, '>>Script Exit<<')
    } catch (error) {
        if (error.getDetails != undefined) {
            nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        } else {
            nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
            throw nlapiCreateError('99999', error.toString());
        }
    }

    nlapiLogExecution('DEBUG', stLogTitle, '>> Exit Log <<');
}

function deleteProcessedATGSettlement(arrProcessedATG) {
    var stLogTitle = 'deleteProcessedATGSettlement';
    var intProcessedATGCount = arrProcessedATG.length;
    nlapiLogExecution('DEBUG', stLogTitle, 'ATG Records to be deleted =' + intProcessedATGCount);

    NSUtils.checkGovernance();

    for (var intCount = 0; intCount < intProcessedATGCount; intCount++) {
        try {
            var stATGId = arrProcessedATG[intCount].getId();
            var stRecType = arrProcessedATG[intCount].getRecordType();
            var orderID = arrProcessedATG[intCount].getValue('custrecord_csi_atg_setlmnt_order_id');
            var transDetails = arrProcessedATG[intCount].getValue('custrecord_csi_atg_setlmnt_trans_detail');
            var transType = arrProcessedATG[intCount].getValue('custrecord_csi_atg_setlmnt_trans_type');
            var processType = arrProcessedATG[intCount].getValue('custrecord_csi_atg_setlmnt_proc_type');
            var totalAmt = arrProcessedATG[intCount].getValue('custrecord_csi_atg_setlmnt_tot_amt_deb');
            var createDate = arrProcessedATG[intCount].getValue('createddate');

            var isProc = getProcessedSalesOrder(orderID, transDetails, transType, processType, totalAmt);
            if (isProc == 'T') {
                nlapiDeleteRecord(stRecType, stATGId);
                nlapiLogExecution('AUDIT', stLogTitle, 'ATG Record Id :' + stATGId + ' has been successfuly deleted');
            }

            INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);
        } catch (error) {
            if (error.getDetails != undefined) {
                nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails() + ' RECORD ID =' + stATGId);
            } else {
                nlapiLogExecution('ERROR', 'Unexpected Error', error.toString() + ' RECORD ID =' + stATGId);
            }
        }
    }
}

function markAtgProc(arrProcessedATG) {
    var stLogTitle = 'deleteProcessedATGSettlement';
    var intProcessedATGCount = arrProcessedATG.length;
    nlapiLogExecution('DEBUG', stLogTitle, 'ATG Records to be deleted =' + intProcessedATGCount);

    NSUtils.checkGovernance();

    for (var intCount = 0; intCount < intProcessedATGCount; intCount++) {
        try {
            var stATGId = arrProcessedATG[intCount].getId();
             var stRecType = arrProcessedATG[intCount].getRecordType();
            var orderID = arrProcessedATG[intCount].getValue('custrecord_csi_atg_setlmnt_order_id');
            // var transDetails = arrProcessedATG[intCount].getValue('custrecord_csi_atg_setlmnt_trans_detail');
            // var transType = arrProcessedATG[intCount].getValue('custrecord_csi_atg_setlmnt_trans_type');
            //  var processType = arrProcessedATG[intCount].getValue('custrecord_csi_atg_setlmnt_proc_type');
            // var totalAmt = arrProcessedATG[intCount].getValue('custrecord_csi_atg_setlmnt_tot_amt_deb');

            var isProc = getPayment(orderID);
            if (isProc == 'T') {
                nlapiSubmitField(stRecType, stATGId, ['custrecord_csi_atg_setlmnt_processed','custrecord_csi_atg_setlmnt_error_msg'],['T','']);

                nlapiLogExecution('AUDIT', stLogTitle, 'ATG Record Id :' + stATGId + ' has been successfuly updated');
            }

            INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);
        } catch (error) {
            if (error.getDetails != undefined) {
                nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails() + ' RECORD ID =' + stATGId);
            } else {
                nlapiLogExecution('ERROR', 'Unexpected Error', error.toString() + ' RECORD ID =' + stATGId);
            }
        }
    }
}


//find processed ATG

function getProcessedSalesOrder(orderid, shippinggroup, transType, processType, totAmt) {
    var arrFilters = [];

    arrFilters.push(new nlobjSearchFilter('custrecord_csi_atg_setlmnt_order_id', null, 'is', orderid));
    arrFilters.push(new nlobjSearchFilter('custrecord_csi_atg_setlmnt_trans_detail', null, 'is', shippinggroup));
    arrFilters.push(new nlobjSearchFilter('custrecord_csi_atg_setlmnt_trans_detail', null, 'is', shippinggroup));
    arrFilters.push(new nlobjSearchFilter('custrecord_csi_atg_setlmnt_trans_type', null, 'is', transType));
    arrFilters.push(new nlobjSearchFilter('custrecord_csi_atg_setlmnt_proc_type', null, 'is', processType));
    arrFilters.push(new nlobjSearchFilter('custrecord_csi_atg_setlmnt_tot_amt_deb', null, 'is', parseFloat(totAmt)));
    arrFilters.push(new nlobjSearchFilter('datecreated', null, 'before', '05/10/2017'));

    arrFilters.push(new nlobjSearchFilter('custrecord_csi_atg_setlmnt_processed', null, 'is', 'F'));
    var myRet = 'F';
    var arrProc = nlapiSearchRecord('customrecord_csi_atg_settlement', 'customsearch_is_atg_processed', arrFilters, null)


    if (arrProc) {
        myRet = 'T'
    }
    return myRet;
}

function getPayment(orderid, shippinggroup, transType, processType, totAmt) {
    var arrFilters = [];


    arrFilters.push(new nlobjSearchFilter('custbody_payment_atg_ref', null, 'is', orderid));
    arrFilters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
    // arrFilters.push(new nlobjSearchFilter('datecreated', null, 'before', '05/10/217'));

    // arrFilters.push(new nlobjSearchFilter('custrecord_csi_atg_setlmnt_processed', null, 'is', 'T'));
    var myRet = 'F';
    var arrProc = nlapiSearchRecord('transaction', 'customsearch_payments_complete', arrFilters, null)

    if (arrProc) {
        myRet = 'T'
    }
    return myRet;
}


function getInvoice(orderid, shippinggroup, transType, processType, totAmt) {
    var arrFilters = [];

    
    arrFilters.push(new nlobjSearchFilter('createdfrom', null, 'is', orderid));
    arrFilters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));
    // arrFilters.push(new nlobjSearchFilter('datecreated', null, 'before', '05/10/217'));

    // arrFilters.push(new nlobjSearchFilter('custrecord_csi_atg_setlmnt_processed', null, 'is', 'T'));
    var myRet = 'F';
    var arrProc = nlapiSearchRecord('transaction', 'customsearch_payments_complete', arrFilters, null)

    if (arrProc) {
        myRet = 'T'
    }
    return myRet;
}


function getATGId(orderid) {
    // NSUtils.checkGovernance();
    var soInernalId = 0;
    var soFilters = [];
    var soColumns = [];
    soFilters.push(new nlobjSearchFilter('tranid', null, 'contains', orderid));
    soFilters.push(new nlobjSearchFilter('mainline', null, 'is', 'T'));

   // soColumns.push(new nlobjSearchColumn('status'));


    var recOpenATG = nlapiSearchRecord('salesorder', null, soFilters, soColumns);
    if (recOpenATG) {
        var soInernalId = recOpenATG[0].getId();

    }
    return soInernalId;

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
            } else {
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
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Remaining usage=' + nlapiGetContext().getRemainingUsage());

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
                if (intRemainingUsage < (parseInt(intGovernanceThreshold, 10) + parseInt(20, 10))) {
                    var objYield = nlapiYieldScript();
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Status=' + objYield.status);
                }
            }

            if ((intStartTime)) {
                // get current time
                var intCurrentTime = new Date().getTime();

                // check if elapsed time is near the arbitrary value
                var intElapsedTime = intMaxTime - (intCurrentTime - intStartTime);

                if (intElapsedTime < intRequiredTime) {
                    // check if we are not reaching the max processing time which is
                    // 3600000 seconds
                    var objYield = nlapiYieldScript();
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Status=' + objYield.status);

                    if (objYield.status != 'FAILURE')
                        intStartTime = new Date().getTime();
                }
            }

            return intStartTime;
        },
    };

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
    };

var NSUtils =
    {
        /**
         * Get all of the results from the search even if the results are more than 1000. 
         * @param {String} stRecordType - the record type where the search will be executed.
         * @param {String} stSearchId - the search id of the saved search that will be used.
         * @param {Array} arrSearchFilter - array of nlobjSearchFilter objects. The search filters to be used or will be added to the saved search if search id was passed.
         * @param {Array} arrSearchColumn - array of nlobjSearchColumn objects. The columns to be returned or will be added to the saved search if search id was passed.
         * @returns {Array} - an array of nlobjSearchResult objects
         * @author memeremilla - initial version
         * @author gmanarang - used concat when combining the search result
         */
        search: function (stRecordType, stSearchId, arrSearchFilter, arrSearchColumn) {
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
                    try {
                        this.rescheduleScript(1000);
                    }
                    catch (e)
                    { }
                }

                nlobjResultSlice = nlobjResultset.getResults(intSearchIndex, intSearchIndex + 1000);
                if (!(nlobjResultSlice)) {
                    break;
                }

                arrReturnSearchResults = arrReturnSearchResults.concat(nlobjResultSlice);
                intSearchIndex = arrReturnSearchResults.length;
            }

            while (nlobjResultSlice.length >= 1000);

            return arrReturnSearchResults;
        },

        /**  
         * Checks governance then calls yield (mcabading 05272016 - modified)
         * @param 	{Integer} myGovernanceThreshold 	 * 
         * @returns {Void} 
         * @author memeremilla
         */
        checkGovernance: function () {
            var context = nlapiGetContext();

            if (context.getRemainingUsage() < INT_USAGE_LIMIT_THRESHOLD) {
                var state = nlapiYieldScript();
                if (state.status == 'FAILURE') {
                    nlapiLogExecution("ERROR", "Failed to yield script, exiting: Reason = " + state.reason + " / Size = " + state.size);
                    throw "Failed to yield script";
                }
                else if (state.status == 'RESUME') {
                    nlapiLogExecution("AUDIT", "Resuming script because of " + state.reason + ".  Size = " + state.size);
                }
            }
        }
    };

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
 * Compilation of common utility functions used for:
 * - Parsing objects
 */
var Parse =
    {
        /**
         * Converts string to integer. If value is infinity or can't be converted to a number, 0 will be returned.
         * @param {String} stValue - any string
         * @returns {Number} - an integer
         * @author jsalcedo
         */
        forceInt: function (stValue) {
            var intValue = parseInt(stValue);

            if (isNaN(intValue) || (stValue == Infinity)) {
                return 0;
            }

            return intValue;
        },
    };