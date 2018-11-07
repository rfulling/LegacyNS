/**
 * Copyright (c) 1998-2016 NetSuite, Inc. 2955 Campus Drive, Suite 100, San
 * Mateo, CA, USA 94403-2511 All Rights Reserved.
 * 
 * This software is the confidential and proprietary inobjFormation of NetSuite,
 * Inc. ('Confidential InobjFormation'). You shall not disclose such Confidential
 * InobjFormation and shall use it only in accordance with the terms of the license
 * agreement you entered into with NetSuite.
 * 
 */
/**
 * Module Description
 * 
 * Version      Date                Author          Remarks
 * 1.00         10 Mar 2016         rfulling         Suitelet for Retainer Plus
 * 1.10         23 Mar 2016         rfulling       Fix / Clean-up
 * 1.20         13 Mar 2017                         Script locking
 * 1.21         27 Mar 2017         ajdeleon        Fixed internal id of journal entry in sublist and error message of script locking
 * 
 */

var CONTEXT = nlapiGetContext();

/**
 * TDD 2: Retainer Plus Time Only
 * @param request
 * @param response
 */
function suitelet_AllocateProjectRevenue(request, response) {
    try {
        var stLogTitle = 'suitelet_AllocateProjectRevenue';
        nlapiLogExecution('DEBUG', stLogTitle, '>> Entry Log <<');

        //Get script parameters
        var stRevrecSearch = CONTEXT.getSetting('SCRIPT', 'custscript_revrec_plus');
        var stAllCompany = CONTEXT.getSetting('SCRIPT', 'custscript_all_company2');

        nlapiLogExecution('DEBUG', stLogTitle, 'SCRIPT PARAMETERS: ' + '| stRevrecSearch = ' + stRevrecSearch);

        //Validate script parameters
        if (Eval.isEmpty(stRevrecSearch) || Eval.isEmpty(stAllCompany)) {
            throw nlapiCreateError('EMPTY_SCRIPT_PARAMETER', 'Script Parameters should not be empty.');
        }

        switch (request.getMethod()) {

            case 'GET':
                objForm = showHardApprovedListPage(request, stRevrecSearch, stAllCompany);
                response.writePage(objForm);
                break;

            case 'POST':
                processJournalEntry(request);
                nlapiSetRedirectURL('SUITELET', 'customscript_sl_retainer_plus_time_only', 'customdeploy_sl_retainer_plus_time_only');
                break;

            default:
                break;

        }

        nlapiLogExecution('DEBUG', stLogTitle, '>> Exit Log <<');

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
 * Show Processing Message Page
 * @returns objForm
 */
function showMessagePage() {
    var objForm = nlapiCreateForm('Proportionator');
    objForm.addField('custpage_result', 'inlinehtml', '').setDisplayType('normal').setDefaultValue(
        'Your Request has been submitted to be processed.  You will be notified by email when the process is complete.');
    return objForm;
}

/**
 * 
 * Generate Page
 * @param request
 * @param stRetainerSearch
 * 
 */
function showHardApprovedListPage(request, stRevrecSearch, stAllCompany) {
    var stLogTitle = 'suitelet_AllocateProjectRevenue.showHardApprovedListPage';
    nlapiLogExecution('DEBUG', stLogTitle, 'Generating Form...');

    var objForm = nlapiCreateForm('Proportionator');
    var stProjectId = request.getParameter('custpage_project_filter');

    //add buttons
    objForm.addSubmitButton('Process');
    objForm.setScript('customscript_cs_apco_retainer_plus');
    objForm.addButton('custpage_filter_project', 'Search', 'filter_list()');

    //add field groups
    var fieldgroup = 'field_group';
    objForm.addFieldGroup(fieldgroup, 'Main Filters');
    objForm.addField('custpage_project_filter', 'select', 'Project', 'job', fieldgroup).setDefaultValue(stProjectId);

    //add sublist
    var objSublist = objForm.addSubList('custpage_sublist', 'list', 'Journal Entries', 'custpage_item_tab');
    objSublist.addMarkAllButtons();
    objSublist.addField('custpage_select_checkbox', 'checkbox', 'Select');
    objSublist.addField('custpage_date', 'date', 'Date');
    objSublist.addField('custpage_period', 'text', 'Period');
    objSublist.addField('custpage_type', 'text', 'Type');
    objSublist.addField('custpage_document_number', 'text', 'Document Number');
    objSublist.addField('custpage_name', 'text', 'Name');
    objSublist.addField('custpage_account', 'text', 'Account');
    objSublist.addField('custpage_memo', 'text', 'Memo');
    objSublist.addField('custpage_amount', 'text', 'Amount');
    objSublist.addField('custpage_end_date', 'date', 'Project End Date');
    objSublist.addField('custpage_journal_id', 'text', 'Internal Id').setDisplayType('hidden');
    objSublist.addField('custpage_name_id', 'text', 'Name ID').setDisplayType('hidden');

    // 1.20 | Script Locker

    var isScriptOnLock = false;

    if (stProjectId) {

        // Check if selected subsidiary is being processed by the scheduled script
        var isScriptOnLock = ScriptLocker.isOnProcess({
            scriptName: 'customscript_sc_retainer_plus_only', // proportionator scheduled script
            lockOnField: 'job',
            lockOnFieldValue: stProjectId
        });

        if (isScriptOnLock === true) {
            var msg = 'Script is currently processing for the selected job.';
            nlapiLogExecution('audit', stLogTitle, 'SCRIPT_LOCKER:' + msg);

            // Show message to user
            var objMessage = objForm.addField('custpage_hardapp_stat', 'inlinehtml', '');
            objMessage.setLayoutType('outsideabove', 'startcol');
            objMessage.setDefaultValue('<font color=\"red\" size=\"2\"><b>' + msg + '</b></font>');

            // Return, do not populate sublist
            return objForm; //aj deleon - added objform;

        }
    }
    else {
        nlapiLogExecution('debug', stLogTitle, 'NO_SCRIPT_LOCKING: Job is empty');
    }

    //Search for the journal entries that will be included in the list
    var arrJournalEntry = searchJournalEntries(stRevrecSearch, stProjectId, stAllCompany);

    //Loop search results
    for (var intCtr = 0; intCtr < arrJournalEntry.length; intCtr++) {
        var intLineNo = intCtr + 1;
        objSublist.setLineItemValue('custpage_date', intLineNo, arrJournalEntry[intCtr].getValue('trandate', null, 'GROUP'));
        objSublist.setLineItemValue('custpage_period', intLineNo, arrJournalEntry[intCtr].getText('postingperiod', null, 'GROUP'));
        objSublist.setLineItemValue('custpage_type', intLineNo, arrJournalEntry[intCtr].getValue('type', null, 'GROUP'));
        objSublist.setLineItemValue('custpage_document_number', intLineNo, arrJournalEntry[intCtr].getValue('tranid', null, 'GROUP'));
        objSublist.setLineItemValue('custpage_name', intLineNo, arrJournalEntry[intCtr].getText('entity', null, 'GROUP'));
        objSublist.setLineItemValue('custpage_account', intLineNo, arrJournalEntry[intCtr].getText('account', null, 'GROUP'));
        objSublist.setLineItemValue('custpage_memo', intLineNo, arrJournalEntry[intCtr].getValue('memo', null, 'GROUP'));
        objSublist.setLineItemValue('custpage_amount', intLineNo, arrJournalEntry[intCtr].getValue('fxamount', null, 'SUM'));
        objSublist.setLineItemValue('custpage_end_date', intLineNo, arrJournalEntry[intCtr].getValue('custentity_apco_proj_period_end_date', 'job', 'GROUP'));
        // objSublist.setLineItemValue('custpage_journal_id', intLineNo, arrJournalEntry[intCtr].getId());
        objSublist.setLineItemValue('custpage_journal_id', intLineNo, arrJournalEntry[intCtr].getValue('internalid', null, 'GROUP'));
        objSublist.setLineItemValue('custpage_name_id', intLineNo, arrJournalEntry[intCtr].getValue('entity', null, 'GROUP'));
    }


    return objForm;
}

/**
 * Process Journal Entries
 * @param request
 */
function processJournalEntry(request) {
    var stLogTitle = 'suitelet_AllocateProjectRevenue.processJournalEntry';

    //Initialize
    var arrChecked = [];

    //Get the items
    var stListType = 'custpage_sublist';
    var intCount = request.getLineItemCount(stListType);
    nlapiLogExecution('DEBUG', stLogTitle, 'intCount = ' + intCount);

    //For each result, save project
    for (var intLineCtr = 1; intLineCtr <= intCount; intLineCtr++) {
        var stChecked = request.getLineItemValue(stListType, 'custpage_select_checkbox', intLineCtr);
        var stJEId = request.getLineItemValue(stListType, 'custpage_journal_id', intLineCtr);

        nlapiLogExecution('DEBUG', 'CHECKED', 'Checked: ' + stChecked + ' | stJEId ' + stJEId + ' | Line: ' + intLineCtr);

        if (stChecked == 'T' && !Eval.isEmpty(stJEId)) {
            arrChecked.push(stJEId);
        }
    }

    //Run Scheduled Script
    nlapiLogExecution('DEBUG', stLogTitle, 'arrChecked =' + arrChecked);

    if (arrChecked.length > 0) {
        var arrParams = [];
        arrParams['custscript_je_ids'] = arrChecked.toString();

        // 1.20 | Script locking 
        var stProjectId = request.getParameter('custpage_project_filter');
        nlapiLogExecution('DEBUG', stLogTitle, 'stProjectId =' + stProjectId);
        arrParams['custscript_project2'] = stProjectId;

        var stSchedStatus = callScheduledScript('customscript_sc_retainer_plus_only', 'customdeploy_sc_retainer_plus_only', arrParams);
        nlapiLogExecution('DEBUG', stLogTitle, 'stSchedStatus:  ' + stSchedStatus);
    }
}

/**
 * Search for all the Journal Entries
 * @param stTimeSavedSearch
 * @param stProjectId 
 * @returns arrResults - search result of the saved search executed against transaction
 * 
 */
function searchJournalEntries(stRevrecSearch, stProjectId, stAllCompany) {
    var stLogTitle = 'suitelet_AllocateProjectRevenue.showHardApprovedListPage.searchJournalEntries';

    var arrFilters = [];

    //Filters
    if (!Eval.isEmpty(stProjectId) && stProjectId != stAllCompany) {
        arrFilters.push(new nlobjSearchFilter('internalid', 'job', 'anyof', stProjectId));
    }

    //Columns
    var arrColumns = [];

    var arrResults = SuiteUtil.search(stRevrecSearch, 'journalentry', arrFilters, arrColumns); // jem 03/27

    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);
    nlapiLogExecution('DEBUG', stLogTitle, 'stRevrecSearch: ' + stRevrecSearch);

    return arrResults;
}


//------------------------------------------------- UTILITY FUNCTIONS -------------------------------------------------

var Eval =
    {
        /**
         * Evaluate if the given string or object value is empty, null or undefined.
         * 
         * @param {String}
         *            stValue - string or object to evaluate
         * @returns {Boolean} - true if empty/null/undefined, false if not
         * @author bfelciano, mmeremilla
         */
        isEmpty: function (stValue) {
            if ((stValue == null) || (stValue == undefined)) {
                return true;
            }
            else {
                if (typeof stValue == 'string') {
                    if ((stValue == '')) {
                        return true;
                    }
                }
                else if (typeof stValue == 'object') {
                    if (stValue.length == 0 || stValue.length == 'undefined') {
                        return true;
                    }
                }

                return false;
            }
        }
    };

var Parse =
    {
        /**
         * Converts string to float. If value is infinity or can't be converted to a
         * number, 0.00 will be returned.
         * 
         * @param {String}
         *            stValue - any string
         * @returns {Number} - a floating point number
         * @author jsalcedo
         */
        forceFloat: function (stValue) {
            var flValue = parseFloat(stValue);

            if (isNaN(flValue) || (stValue == Infinity)) {
                return 0.00;
            }

            return flValue;
        },

        /**
         * Converts string to integer. If value is infinity or can't be converted to
         * a number, 0 will be returned.
         * 
         * @param {String}
         *            stValue - any string
         * @returns {Number} - an integer
         * @author jsalcedo
         */
        forceInt: function (stValue) {
            var intValue = parseInt(stValue);

            if (isNaN(intValue) || (stValue == Infinity)) {
                return 0;
            }

            return intValue;
        }

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
                if ((CONTEXT.getExecutionContext() === 'scheduled')) {
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

/**
* Calls scheduled script to update originating transactions
*
* @param stScheduledScriptId
* @param stScheduledDeploymentId
* @param arrParams
* @returns stSchedStatus
*/
function callScheduledScript(stScheduledScriptId, stScheduledDeploymentId, arrParams) {
    var stLogTitle = 'suitelet_approveTime.callScheduledScript';

    nlapiLogExecution('DEBUG', stLogTitle, 'Scheduled Script ID = ' + stScheduledScriptId + '| Scheduled Script Deployment ID = ' + stScheduledDeploymentId);

    // 1.11 | Fix for multiple deployments 
    //var stSchedStatus = nlapiScheduleScript(stScheduledScriptId, 'customdeploy_sc_approve_time', arrParams);
    var stSchedStatus = nlapiScheduleScript(stScheduledScriptId, null, arrParams);
    nlapiLogExecution('DEBUG', stLogTitle, 'Scheduled Script Status : ' + stSchedStatus);

    while (stSchedStatus != 'QUEUED') {
        nlapiLogExecution('DEBUG', stLogTitle, 'No available Sched Script Deployment found, creating new deployment.');

        createNewDeployment(stScheduledDeploymentId);

        stSchedStatus = nlapiScheduleScript(stScheduledScriptId, null, arrParams);
        nlapiLogExecution('DEBUG', stLogTitle, 'Scheduled Script Status : ' + stSchedStatus);
    }

    return stSchedStatus;
}

//3-24-2017
var NSUtil = (typeof NSUtil === 'undefined') ? {} : NSUtil;

NSUtil.search = function (stRecordType, stSearchId, arrSearchFilter, arrSearchColumn) {
    if (stRecordType == null && stSearchId == null) {
        throw nlapiCreateError('SSS_MISSING_REQD_ARGUMENT', 'search: Missing a required argument. Either stRecordType or stSearchId should be provided.');
    }

    var arrReturnSearchResults = new Array();
    var objSavedSearch;

    if (stSearchId != null) {
        objSavedSearch = nlapiLoadSearch((stRecordType) ? stRecordType : null, stSearchId);

        // add search filter if one is passed
        if (arrSearchFilter != null) {
            objSavedSearch.addFilters(arrSearchFilter);
        }

        // add search column if one is passed
        if (arrSearchColumn != null) {
            objSavedSearch.addColumns(arrSearchColumn);
        }
    }
    else {
        objSavedSearch = nlapiCreateSearch((stRecordType) ? stRecordType : null, arrSearchFilter, arrSearchColumn);
    }

    var objResultset = objSavedSearch.runSearch();
    var intSearchIndex = 0;
    var arrResultSlice = null;
    do {
        if ((nlapiGetContext().getExecutionContext() === 'scheduled')) {
            try {
                this.rescheduleScript(1000);
            }
            catch (e) {
            }
        }

        arrResultSlice = objResultset.getResults(intSearchIndex, intSearchIndex + 1000);
        if (arrResultSlice == null) {
            break;
        }

        arrReturnSearchResults = arrReturnSearchResults.concat(arrResultSlice);
        intSearchIndex = arrReturnSearchResults.length;
    }

    while (arrResultSlice.length >= 1000);

    return arrReturnSearchResults;
};

NSUtil.isEmpty = function (stValue) {
    return ((stValue === '' || stValue == null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function (v) {
        for (var k in v)
            return false;
        return true;
    })(stValue)));
};