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
 * 
 * Module Description:
 * Creates the Job Task Suitelet that filters task based on project
 * 
 * Version    Date             Author           Remarks
 * 1.00       July 27, 2016    mjpascual
 */

var CONTEXT = nlapiGetContext();
var ST_ESTIMATE_STATUS = '';

/**
 * Creates the Job Task Suitelet that filters task based on project
 * 
 * @param request
 * @param response
 * 
 */
function suitelet_showJobTasks(request, response) {

    try {
        var stLoggerTitle = 'suitelet_showJobTasks';
        nlapiLogExecution('DEBUG', stLoggerTitle, '>>Entry<<');

        //Getters
        var stAction = request.getParameter('custpage_action');
        nlapiLogExecution('DEBUG', stLoggerTitle, 'stAction = ' + stAction);

        //Switch Page according to the selected action
        switch (stAction) {
            case 'PROCESS':
                var stHtml = doSetJobTaskList(request);
                response.write(stHtml);
                break;
            default:
                var objForm = page_showJobTaskList(request, response);
                response.writePage(objForm);
                break;
        }

        nlapiLogExecution('DEBUG', stLoggerTitle, '>>Exit<<');
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

    nlapiLogExecution('DEBUG', stLoggerTitle, '>>Exit<<');

}

/**
 * Show job task list in the suitelet
 * 
 * @param request
 * @returns {Form}
 */
function page_showJobTaskList(request) {
    var stLoggerTitle = 'suitelet_showJobTasks.page_showJobTaskList';
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Showing Job Task List Page... ');

    //Getters
    var stJobId = request.getParameter('custpage_job');
    var stLineNo = request.getParameter('custpage_line_no');

    //Create Form
    var objJobTaskForm = nlapiCreateForm('Select Job Task', true);
    objJobTaskForm.addSubmitButton('Submit');
    objJobTaskForm.addField('custpage_action', 'text', 'Action').setDisplayType('hidden').setDefaultValue('PROCESS');
    objJobTaskForm.addField('custpage_job', 'text', 'Job Id').setDisplayType('hidden').setDefaultValue(stJobId);
    objJobTaskForm.addField('custpage_line_no', 'text', 'Emp Id').setDisplayType('hidden').setDefaultValue(stLineNo);

    //Select Field
    var objServiceItemFld = objJobTaskForm.addField('custpage_sl_items', 'select', 'PROJECT TASK').setMandatory(true);

    var arrJobTasks = searchJobTasks(stJobId);
    objServiceItemFld.addSelectOption('', '', true);

    //Populate list
    for (var intCtr = 0; intCtr < arrJobTasks.length; intCtr++) {
        var objTask = arrJobTasks[intCtr];
        var stItemId = objTask.getValue('internalid');
        var stItemName = objTask.getValue('title');
        objServiceItemFld.addSelectOption(stItemId, stItemName, false);
    }

    return objJobTaskForm;
}

/**
 * Send the selected value back to the record
 * 
 * @param stRecType
 * @param stItemSelected
 * @returns {String}
 */
function doSetJobTaskList(request) {

    var stLoggerTitle = 'suitelet_showJobTasks.doSetServiceItem';
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Adding Selected item.. ');


    var stItemSelected = request.getParameter('custpage_sl_items');
    var stLineNo = request.getParameter('custpage_line_no');

    nlapiLogExecution('DEBUG', stLoggerTitle, 'stLineNo =' + stLineNo);
    nlapiLogExecution('DEBUG', stLoggerTitle, 'stItemSelected =' + stItemSelected);

    //Create the HTML
    var stHtml = '<html>';

    stHtml += '<head>';
    stHtml += '<script language="JavaScript">';
    stHtml += 'if (window.opener)';
    stHtml += '{';
    stHtml += 'window.opener.nlapiSetLineItemValue("custpage_pm_review","custpage_tr_projtask",' + stLineNo + ',' + stItemSelected + ');';
    //stHtml += 'window.opener.nlapiSetLineItemValue("custpage_pm_review","custpage_projtask_btn",'+stLineNo+',"F");';
    stHtml += '}';
    stHtml += '';
    stHtml += 'window.close();';
    stHtml += '</script>';
    stHtml += '</head>';
    stHtml += '</html>';

    nlapiLogExecution('DEBUG', stLoggerTitle, 'Item added Successfully.. ');

    return stHtml;
}

/**
 * Search for estimate items
 * 
 * @returns {Array}
 * 
 */
function searchEstimateSvcItems(stJobId, stSubsidiaryId) {
    var stLoggerTitle = 'suitelet_showJobTasks.searchEstimateSvcItems';
    nlapiLogExecution('DEBUG', stLoggerTitle, 'Search Estimate by job id = ' + stJobId);

    //Filters
    var arrEstItemsFilters = new Array();
    arrEstItemsFilters.push(new nlobjSearchFilter('type', null, 'anyof', 'Estimate'));
    arrEstItemsFilters.push(new nlobjSearchFilter('custbody_mdc_estimate_status', null, 'anyof', ST_ESTIMATE_STATUS));
    arrEstItemsFilters.push(new nlobjSearchFilter('taxline', null, 'is', 'F'));
    arrEstItemsFilters.push(new nlobjSearchFilter('cogs', null, 'is', 'F'));
    arrEstItemsFilters.push(new nlobjSearchFilter('shipping', null, 'is', 'F'));
    arrEstItemsFilters.push(new nlobjSearchFilter('type', 'item', 'anyof', 'Service'));
    if (!Eval.isEmpty(stJobId)) {
        arrEstItemsFilters.push(new nlobjSearchFilter('internalid', 'customer', 'anyof', stJobId));
    }
    if (!Eval.isEmpty(stSubsidiaryId)) {
        arrEstItemsFilters.push(new nlobjSearchFilter('subsidiary', 'item', 'anyof', stSubsidiaryId));
    }

    //Columns
    var arrEstItemsColumns = [];
    arrEstItemsColumns.push(new nlobjSearchColumn('internalid', 'item', 'GROUP')); //Internal Id
    arrEstItemsColumns.push(new nlobjSearchColumn('itemid', 'item', 'GROUP')); //Item Name
    arrEstItemsColumns.push(new nlobjSearchColumn('trandate', null, 'MIN').setSort(true)); //Transaction Date

    nlapiLogExecution('DEBUG', stLoggerTitle, 'Returning searchEstimateSvcItems result...');

    return SuiteUtil.search(null, 'estimate', arrEstItemsFilters, arrEstItemsColumns);
}

/**
 * Search for Job Tasks
 * 
 * @returns {Array}
 * 
 */
function searchJobTasks(stJobId) {
    var stLogTitle = 'suitelet_pmReviewTime.searchJobTasks';

    //Filters
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('project', null, 'anyof', stJobId));

    //Columns
    var arrColumns = [];
    arrColumns.push(new nlobjSearchColumn('internalid')); //Internal Id
    arrColumns.push(new nlobjSearchColumn('title')); //Job Type

    var arrResults = nlapiSearchRecord('projecttask', null, arrFilters, arrColumns);
    if (Eval.isEmpty(arrResults)) {
        arrResults = [];
    }

    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);

    return arrResults;
}

/**
 * Utilities
 */
Eval =
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

/**
 * Utilities
 */
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

    };