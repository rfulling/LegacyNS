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
 * Module Description - Hard Approve Time
 * 
 * Version    	Date            	Author           	Remarks
 * 1.00       	03/09/2016    		mjpascual 			Initial version.
 *
 */

function filter_list() {
    try {
        //Getters
        var stProject = nlapiGetFieldValue('custpage_project_hd');
        var stEmployee = nlapiGetFieldValue('custpage_employee_hd');
        //var stDate = nlapiGetFieldValue('custpage_date_hd');
        var stSubsidiary = nlapiGetFieldValue('custpage_subsidiary_hd');
        var stDepartment = nlapiGetFieldValue('custpage_department_hd');
        var stLocation = nlapiGetFieldValue('custpage_location_hd');
        var stPostPd = nlapiGetFieldValue('custpage_posting_hd');


        if (SM.Eval.isEmpty(stPostPd) || SM.Eval.isEmpty(stProject)) {
            alert('USER_ERROR: Project and Period are required fields.');
            return;
        }

        //Call the suitelet
        var stUrl = nlapiResolveURL('SUITELET', 'customscript_sl_approve_time', 'customdeploy_sl_approve_time');
        stUrl += '&custpage_action=' + 'FILTER';
        stUrl += '&custpage_project_hd=' + stProject;
        stUrl += '&custpage_employee_hd=' + stEmployee;
        stUrl += '&custpage_subsidiary_hd=' + stSubsidiary;
        //stUrl += '&custpage_date_hd=' + stDate;
        stUrl += '&custpage_department_hd=' + stDepartment;
        stUrl += '&custpage_location_hd=' + stLocation;
        stUrl += '&custpage_posting_hd=' + stPostPd;

        //Open the suitelet window
        window.onbeforeunload = null;
        window.location = stUrl;
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

/**
 * Utilities
 */

var SM = {};
SM.Eval =
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
};
