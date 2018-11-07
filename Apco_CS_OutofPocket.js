/**
* Copyright (c) 1998-2016 NetSuite, Inc.
* 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
* All Rights Reserved.
* 
* This software is the confidential and proprietary information of NetSuite, Inc. ("Confidential Information").
* You shall not disclose such Confidential Information and shall use it only in accordance with the terms of the license agreement
* you entered into with NetSuite.
*/

/**
 * Module Description - Validate lines to set the Billable field to true
 * 
 * Version      Date                Author              Remarks
 * 1.00         03/17/2016          mjpascual           Initial version.
 *
 */


var CONTEXT = nlapiGetContext();

/**
 * TDD 3: Out of Pocket Revenue Recognition 
 * @appliedtorecord recordType
 *   
 * @param stType {String} type Operation types: create, edit, view, copy, print, email
 */
function pageInit_generateJournals(stType) {
    try {
        var stAccts = CONTEXT.getSetting('SCRIPT', 'custscript_accts');

        if (OP.Eval.isEmpty(stAccts)) {
            nlapiLogExecution('DEBUG', 'ERROR', 'Script parameters should not be empty.');
            return;
        }

        if (stType == 'delete') {
            return;
        }

        var arrAccts = stAccts.split(',');

        //If edit, delete the lines with accounts created via script
        if (stType == 'edit') {
            deleteScriptedLinesUI(arrAccts);
        }
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
 * Delete expense lines that were scripted
 * @param recTrans
 * 
 */
function deleteScriptedLinesUI(arrAccts) {
    //Loop Expense line
    var intExpCount = nlapiGetLineItemCount('expense');
    for (var intCtr = intExpCount; intCtr > 0; intCtr--) {
        var stItem = nlapiGetLineItemValue('expense', 'category', intCtr);
        if (OP.Eval.inArray(stItem, arrAccts)) {
            nlapiRemoveLineItem('expense', intCtr);
        }
    }
}

/**
 * TDD 3: Out of Pocket Revenue Recognition, check the billable field
 * @param stType
 */
function validateLine_checkBillable(stType) {

    try {
        var stBillOptOut = '';

        if (stType == 'item') {
            var stItem = nlapiGetCurrentLineItemValue(stType, 'item');
            if (!OP.Eval.isEmpty(stItem)) {
                stBillOptOut = nlapiLookupField('item', stItem, 'custitem_apco_billable_opt_out');
            }
        }

        if (stType == 'expense') {
            var stItem = nlapiGetCurrentLineItemValue(stType, 'category');
            nlapiLogExecution('DEBUG', 'validateLine_checkBillabls', 'stItem  Expenses = ' + stItem);
            if (!OP.Eval.isEmpty(stItem)) {
                stItem = parseInt(stItem);
                stBillOptOut = AJXLIB.AJAXSearch.lookup('expensecategory', stItem, 'custrecord_ec_billable_opt_out');
                nlapiLogExecution('DEBUG', 'validateLine_checkBillabls', 'stBillOptOut = ' + stBillOptOut);
                // stBillOptOut = nlapiLookupField('expensecategory', stItem, 'custrecord_ec_billable_opt_out');
            }
        }

        if ((stType == 'item') || (stType == 'expense')) {
            //If the opt out billable field is false, check the project record to which the bill belongs
            // This is getting the current line number, this is cause on any line that not line_num ==1 it will
            // need to get the project from the header in order to perform the appropriate lookups 
            //var line_num = nlapiGetCurrentLineItemIndex('expense');
            //if (line_num == 1)
            // {
            var stProject = nlapiGetCurrentLineItemValue(stType, 'customer');
            // }
            //else
            //{
            //    var stProject = nlapiGetFieldValue('custbody_apco_proj_er_hdr');
            //}

            if (stBillOptOut != 'T' && !OP.Eval.isEmpty(stProject)) {
                //var stBillable = nlapiLookupField('job', stProject, 'custentity_apco_billable_box');
                stProject = parseInt(stProject);
                var stBillable = AJXLIB.AJAXSearch.lookup('job', stProject, 'custentity_apco_billable_box');
                if (stBillable == 'T') {
                    //Set the Line Billable as True
                    nlapiSetCurrentLineItemValue(stType, 'isbillable', 'T');
                    return true;
                }
            }

            nlapiSetCurrentLineItemValue(stType, 'isbillable', 'F');
        }

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

    return true;
}


/**
 * Utilities
 */

var OP = {};
OP.Eval =
{
    /**
     * Evaluate if the given string is empty string, null or undefined.
     * 
     * @param {String} stValue - Any string value
     * @returns {Boolean}
     * @memberOf Eval
     * @author memeremilla
     */
    isEmpty: function (stValue) {
        if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
            return true;
        }
        else {
            if (stValue instanceof String) {
                if ((stValue == '')) {
                    return true;
                }
            }
            else if (stValue instanceof Array) {
                if (stValue.length == 0) {
                    return true;
                }
            }

            return false;
        }
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
        if (this.isEmpty(arr)) {
            return false;
        }

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
