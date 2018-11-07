/**
 * Copyright (c) 1998-2015 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */

/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.0        31 May 2016     Russell Fulling
 * 
 *
 */

/**
 * This function is the main function being called in the suitelet.
 *
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */


function main(request, response) {
    LOG_TITLE = 'main';
    try {
        //assign a parameter to check on what stage of the suitelet you are already at and to create the corresponding form for that stage
        var stAction = request.getParameter('custpage_action');
        nlapiLogExecution('DEBUG', LOG_TITLE, 'Action: ' + stAction);

        switch (stAction) {
            //upon clicking the 'Search Item(s)' button
            case 'GET_ITEMS':
                var form = callScheduledScript(request);
                response.writePage(form);
                break;
                //upon submitting

            default:
                var form = page_startSearch(request);
                response.writePage(form);
                break;
        }
    }
    catch (ex) {
        if (ex.getDetails != undefined) {
            nlapiLogExecution('ERROR', 'Process Error', ex.getCode() + ': ' + ex.getDetails());
            throw ex;
        }
        else {
            nlapiLogExecution('ERROR', 'Unexpected Error', ex.toString());
            throw nlapiCreateError('99999', ex.toString(), true);
        }
    }
}

/**
 * This function creates the initial form to be shown upon landing on the suitelet from the transaction.
 *
 * @param request
 * @returns nlobjForm
 */
function page_startSearch(request) {
    var LOG_TITLE = 'page_startSearch';

    var stUser = nlapiGetUser();
    var objEmpLocation = '';
    var objEmpLocationLabel = nlapiLookupField('employee', stUser, ['location', 'custentity_lbc_default_from_loc'], true);


    var _SEARCHFORM = nlapiCreateForm('Accting Period Update');

    //buttons for choosing on how the searching for the items will execute
    _SEARCHFORM.addSubmitButton('Update Projects');


    return _SEARCHFORM;
}



function confirmationText(details) {
    if (details) {
        var stConfirmation = '<div width="100%" class="uir-alert-box confirmation session_confirmation_alert" style=""><div class="icon confirmation"><img alt="" src="/images/icons/messagebox/icon_msgbox_confirmation.png"></div><div class="content"><div class="title">Confirmation</div><div class="descr">{0}</div></div></div>'.format(details);

        return stConfirmation;
    }
    return '';
}

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined' ? args[number] : match;
        });
    };
}

function inArray(val, arr) {
    var bIsValueFound = false;

    for (var i = 0; i < arr.length; i++) {
        if (val == arr[i]) {
            bIsValueFound = true;
            break;
        }
    }

    return bIsValueFound;
}

function isEmpty(stValue) {
    if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
        return true;
    }

    return false;
}

function getItemRecord(arrFilters, arrColumns) {
    var logTitle = 'getItemRecord';
    try {
        var arrTransactions = nlapiSearchRecord('item', null, arrFilters, arrColumns);
        if (isEmpty(arrTransactions) == false) {
            if (arrTransactions.length == 1) {
                return arrTransactions;
            } else {
                throw nlapiCreateError('99999', 'Savesearch return more than 1 result');
            }
        }
        return null;
    } catch (error) {
        if (error.getDetails != undefined) {
            nlapiLogExecution('DEBUG', 'Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        } else {
            nlapiLogExecution('DEBUG', 'Unexpected Error: ', error.toString());
            throw error;
        }
    }
}/**
 * Copyright (c) 1998-2015 NetSuite, Inc.
 * 2955 Campus Drive, Suite 100, San Mateo, CA, USA 94403-2511
 * All Rights Reserved.
 *
 * This software is the confidential and proprietary information of
 * NetSuite, Inc. ("Confidential Information"). You shall not
 * disclose such Confidential Information and shall use it only in
 * accordance with the terms of the license agreement you entered into
 * with NetSuite.
 */

/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.0        12 Dec 2014     Julius Cuanan
 * 1.1        17 Mar 2015     Julius Cuanan	   Update in the suitelet
 * 1.2        24 Mar 2015     Julius Cuanan	   Update in the suitelet
 *
 */

/**
 * This function is the main function being called in the suitelet.
 *
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @returns {Void} Any output is written via response object
 */


function main(request, response) {
    LOG_TITLE = 'main';
    try {
        //assign a parameter to check on what stage of the suitelet you are already at and to create the corresponding form for that stage
        var stAction = request.getParameter('custpage_action');
        nlapiLogExecution('DEBUG', LOG_TITLE, 'Action: ' + stAction);

        switch (stAction) {
            //upon clicking the 'Search Item(s)' button
            case 'GET_ITEMS':
                var form = callScheduledScript(request);
                objForm = showMessagePage();
                response.writePage(objForm);
                break;
                //upon submitting

            default:
                var form = page_startSearch(request);
                response.writePage(form);
                break;
        }
    }
    catch (ex) {
        if (ex.getDetails != undefined) {
            nlapiLogExecution('ERROR', 'Process Error', ex.getCode() + ': ' + ex.getDetails());
            throw ex;
        }
        else {
            nlapiLogExecution('ERROR', 'Unexpected Error', ex.toString());
            throw nlapiCreateError('99999', ex.toString(), true);
        }
    }
}

/**
 * This function creates the initial form to be shown upon landing on the suitelet from the transaction.
 *
 * @param request
 * @returns nlobjForm
 */
function page_startSearch(request) {
    var LOG_TITLE = 'page_startSearch';
    var newActPeriod = nlapiLoadConfiguration("companypreferences").getFieldValue("custscript_apco_acct_period");
    nlapiLogExecution('DEBUG', 'period ', ' config sesttings ' + ': ' + newActPeriod);
    var stUser = nlapiGetUser();
    var objEmpLocation = 'customrecord_rtf_course_group';


    var _SEARCHFORM = nlapiCreateForm('Accounting Periods');

    //buttons for choosing on how the searching for the items will execute
    _SEARCHFORM.addSubmitButton('Update Projects');

    _SEARCHFORM.addField('custpage_lbc_from_location', 'select', 'Accounting Period: ', 'accountingperiod').setDisplayType('inline').setDefaultValue(newActPeriod);
    //store in a parameter the values needed for processing the records
    _SEARCHFORM.addField('custpage_action', 'text', 'Action').setDisplayType('hidden').setDefaultValue('GET_ITEMS');

    return _SEARCHFORM;
}

/**
 * This function creates the result form to be shown upon clicking the button 'Get Selected Item' on the suitelet.
 * That is after the item has been populated.
 *
 * @param request
 * @returns nlobjForm
 */
function page_getItems(request) {



    return _PROCESSFORM;
}
/**
 * Show Processing Message Page
 * @returns objForm
 */
function showMessagePage() {
    var objForm = nlapiCreateForm('Changing Accounting Periods');
    objForm.addField('custpage_result', 'inlinehtml', '').setDisplayType('normal').setDefaultValue(
			'Your Request has been submitted to be processed.  You will be notified by email when the process is complete.');
    return objForm;
}
/**
* Calls scheduled script to update originating transactions
* 
* @param stScheduledScriptId
* @param stScheduledDeploymentId
* @param arrParams
* @returns stSchedStatus
*/
function callScheduledScript(stScheduledScriptId, stScheduledDeploymentId, arrParams) {
    var arrParams = [];
    // arrParams.push(43);
    var stLogTitle = 'suitelet_updatePeriod.callScheduledScript';

    nlapiLogExecution('DEBUG', stLogTitle, 'Scheduled Script ID = ' + stScheduledScriptId + '| Scheduled Script Deployment ID = ' + stScheduledDeploymentId);
    var stSchedStatus = nlapiScheduleScript('customscript_apco_sc_update_period', 'customdeploy_apco_udpate_periods', null);

    nlapiLogExecution('DEBUG', stLogTitle, 'Scheduled Script Status : ' + stSchedStatus);

    return stSchedStatus;
}

/**
* Copy the existing deployment
*
* @param stDeployId
*/
function createNewDeployment(stDeployId) {
    var stLogTitle = 'suitelet_approveTime.callScheduledScript.createNewDeployment';

    var record = nlapiCopyRecord('scriptdeployment', stDeployId);
    record.setFieldValue('status', 'NOTSCHEDULED');
    record.setFieldValue('startdate', nlapiDateToString(new Date(), 'date'));

    var stId = nlapiSubmitRecord(record, true, true);

    nlapiLogExecution('AUDIT', stLogTitle, 'New deployment created = ' + stId);
}



function confirmationText(details) {
    if (details) {
        var stConfirmation = '<div width="100%" class="uir-alert-box confirmation session_confirmation_alert" style=""><div class="icon confirmation"><img alt="" src="/images/icons/messagebox/icon_msgbox_confirmation.png"></div><div class="content"><div class="title">Confirmation</div><div class="descr">{0}</div></div></div>'.format(details);

        return stConfirmation;
    }
    return '';
}

if (!String.prototype.format) {
    String.prototype.format = function () {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function (match, number) {
            return typeof args[number] != 'undefined' ? args[number] : match;
        });
    };
}

function inArray(val, arr) {
    var bIsValueFound = false;

    for (var i = 0; i < arr.length; i++) {
        if (val == arr[i]) {
            bIsValueFound = true;
            break;
        }
    }

    return bIsValueFound;
}

function isEmpty(stValue) {
    if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
        return true;
    }

    return false;
}

