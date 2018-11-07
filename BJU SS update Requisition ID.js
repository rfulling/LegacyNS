/**
 * Copyright (c) 1998-2015 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 * 
 * This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
 * You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
 * you entered into with NetSuite.
 *
 * Module Description
 * 
 * Version    Date            Author           Remarks
 * 1.0        27 Aug 2015     Julius Cuanan	   
 *
 */

CONTEXT = nlapiGetContext();
USAGE_LIMIT_THRESHOLD = 1000;

/**
 * @param {String} type Context Types: scheduled, ondemand, userinterface, aborted, skipped
 * @returns {Void}
 */
function scheduled(type) {
    try {
        var LOG_TITLE = 'scheduled';
        nlapiLogExecution('DEBUG', LOG_TITLE, '|==========START SCRIPT EXECUTION: scheduled==========|');

        var TRANS_TO_TRANSFORM_SAVED_SEARCH = CONTEXT.getSetting('SCRIPT', 'custscript_pi_txns_to_transform');
        nlapiLogExecution('DEBUG', LOG_TITLE, 'TRANS_TO_TRANSFORM_SAVED_SEARCH = ' + TRANS_TO_TRANSFORM_SAVED_SEARCH);

        if (!TRANS_TO_TRANSFORM_SAVED_SEARCH) {
            nlapiLogExecution('DEBUG', LOG_TITLE, 'Exit. Script parameter/s is/are not setup properly. Check the script deployment setup.');
            nlapiLogExecution('DEBUG', LOG_TITLE, '|===========END SCRIPT EXECUTION: scheduled===========|');
            return;
        }

        nlapiLogExecution('DEBUG', LOG_TITLE, '--start getAllResults()');
        var arrTransResult = getAllResults(null, TRANS_TO_TRANSFORM_SAVED_SEARCH);
        nlapiLogExecution('DEBUG', LOG_TITLE, '--end getAllResults()');

        if (arrTransResult) {
            for (var j = 0; j < arrTransResult.length; j++) {
                var stTranType = arrTransResult[j].getRecordType();
                var stTranId = arrTransResult[j].getId();
                var stTransaction = (stTranType == 'salesorder') ? 'Sales Order' : 'Return Authorization';

                try {
                    nlapiLogExecution('DEBUG', LOG_TITLE, 'Currently processing ' + stTransaction + ' with internal id = ' + stTranId);

                    if (stTranType == 'salesorder') {
                        var recSO = nlapiLoadRecord(stTranType, stTranId);
                        var intSOLineItemCount = recSO.getLineItemCount('item');

                        for (var i = 1; i <= intSOLineItemCount; i++) {
                            recSO.setLineItemValue('item', 'price', i, '-1');//custom
                            recSO.setLineItemValue('item', 'custcol_amount_override_reason', i, '0');
                            recSO.setLineItemValue('item', 'rate', i, 0);
                            recSO.setLineItemValue('item', 'amount', i, 0);
                            //  recSO.setLineItemValue('item', 'serialnumbers', i, recSO.getLineItemText('item','item',i));
                        }

                        recSO.setFieldValue('custbody_pi_adj_inv', 'F');

                        nlapiSubmitRecord(recSO, false, true);

                        var recIF = nlapiTransformRecord(stTranType, stTranId, 'itemfulfillment');
                        nlapiSubmitRecord(recIF, false, true);
                    }
                    else if (stTranType == 'returnauthorization') {
                        var recIR = nlapiTransformRecord(stTranType, stTranId, 'itemreceipt');
                        nlapiSubmitRecord(recIR, false, true);

                        var recRA = nlapiLoadRecord(stTranType, stTranId);
                        var intSOLineItemCount = recRA.getLineItemCount('item');

                        for (var i = 1; i <= intSOLineItemCount; i++) {
                            recRA.setLineItemValue('item', 'price', i, '-1');//custom
                            recRA.setLineItemValue('item', 'custcol_amount_override_reason', i, '0');
                            recRA.setLineItemValue('item', 'rate', i, 0);
                            recRA.setLineItemValue('item', 'amount', i, 0);
                        }

                        recRA.setFieldValue('custbody_pi_adj_inv', 'F');

                        nlapiSubmitRecord(recRA, false, true);
                    }
                }
                catch (ex) {
                    nlapiLogExecution('DEBUG', LOG_TITLE, 'An error occured while processing ' + stTransaction + ' with internal id: ' + stTranId);

                    if (ex.getDetails != undefined) {
                        nlapiLogExecution('ERROR', 'Process Error', ex.getCode() + ': ' + ex.getDetails());
                    }
                    else {
                        nlapiLogExecution('ERROR', 'Unexpected Error', ex.toString());
                    }
                }

                checkGovernance(USAGE_LIMIT_THRESHOLD);
            }
        }
        else {
            nlapiLogExecution('DEBUG', LOG_TITLE, 'There are no results from the search execution.');
        }

        nlapiLogExecution('DEBUG', LOG_TITLE, '|===========END SCRIPT EXECUTION: scheduled===========|');
    }
    catch (error) {
        if (error.getDetails != undefined) {
            nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else {
            nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
            throw nlapiCreateError('99999', error.toString(), true);
        }
    }
}

function getAllResults(stRecordType, stSavedSearch, arrFilters, arrColumns) {
    var arrResult = [];
    var count = 1000;
    var init = true;
    var min = 0;
    var max = 1000;

    var search = null;
    if (stSavedSearch) {
        search = nlapiLoadSearch(stRecordType, stSavedSearch);
        if (arrFilters) search.addFilters(arrFilters);
        if (arrColumns) search.addColumns(arrColumns);
    }
    else {
        search = nlapiCreateSearch(stRecordType, arrFilters, arrColumns);
    }

    var rs = search.runSearch();

    while (count == 1000 || init) {
        var resultSet = rs.getResults(min, max);
        arrResult = arrResult.concat(resultSet);
        min = max;
        max += 1000;

        init = false;
        count = resultSet.length;
    }

    return arrResult;
}


//Check usage versus threshold
function checkGovernance(governanceThreshold) {
    if (CONTEXT.getRemainingUsage() < governanceThreshold) {
        //		nlapiLogExecution("DEBUG", 'checkGovernance', "Remaining Usage: "+ CONTEXT.getRemainingUsage());
        nlapiLogExecution("DEBUG", 'checkGovernance', "Remaining Usage: " + error);

        var state = nlapiYieldScript();

        if (state.status == 'FAILURE') {
            nlapiLogExecution("ERROR", "Failed to yield script, exiting: Reason = " + state.reason + " / Size = " + state.size);
            throw "Failed to yield script";
        }
        else if (state.status == 'RESUME') {
            nlapiLogExecution("ERROR", "Resuming script because of " + state.reason + ".  Size = " + state.size);
        }
    }
}