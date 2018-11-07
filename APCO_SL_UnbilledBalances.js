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
 * Module Description - Intercompany Invoices and Bills
 * 
 * Version    	Date            	Author           	Remarks
 * 1.00       	04/19/2016    		rfulling 			Initial version.
 *
 */

var CONTEXT = nlapiGetContext();

/**
 * TDD 5: Intercompany Invoices and Bills
 * @param request
 * @param response
 */
function suitelet_unbilledBalances(request, response) {
    try {
        var stLogTitle = 'suitelet_unbilledBalances';
        nlapiLogExecution('DEBUG', stLogTitle, '>> Entry Log <<');

        var stUnbilledSavedSearch = CONTEXT.getSetting('SCRIPT', 'custscript_apco_unbilled_search');
        var stParamDepId = CONTEXT.getSetting('SCRIPT', 'custscript_apco_param_dep_id');

        // Throw error if any script parameter is empty
        if (Eval.isEmpty(stUnbilledSavedSearch) || Eval.isEmpty(stParamDepId)) {
            throw nlapiCreateError('EMPTY_SCRIPT_PARAMETER', 'Script Parameters should not be empty.');
        }

        nlapiLogExecution('DEBUG', stLogTitle, 'SCRIPT PARAMETERS: ' + 'stUnbilledSavedSearch = ' + stUnbilledSavedSearch);

        var stAction = request.getParameter('custpage_action');
        nlapiLogExecution('DEBUG', stLogTitle, 'Action: ' + stAction);

        //If submit button, then call the approve process
        var objForm = null;
        if (stAction == 'SUBMIT') {
            processUnbilledBalances(request, stParamDepId);
            //Re-direct to message page
            objForm = showMessagePage();
        }
        else {
            //Show form
            objForm = showUnbilledBalancesListPage(request, stUnbilledSavedSearch);
        }

        response.writePage(objForm);

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
    var objForm = nlapiCreateForm('Unbilled Balances');
    objForm.addField('custpage_result', 'inlinehtml', '').setDisplayType('normal').setDefaultValue(
			'The request has been submitted to be processed by the scheduled script. Changes might not be reflected immediately.');
    return objForm;
}

/**
 * Show the time page
 * 
 * @param request
 * @param stUnbilledSavedSearch
 * @returns objForm
 */
function showUnbilledBalancesListPage(request, stUnbilledSavedSearch) {

    var stLogTitle = 'suitelet_unbilledBalances.showUnbilledBalancesListPage';
    nlapiLogExecution('DEBUG', stLogTitle, 'Generating Form...');

    //Create Form
    var objForm = nlapiCreateForm('Unbilled Balances');

    objForm.addSubmitButton('Submit');

    objForm.addField('custpage_action', 'text', 'Action').setDisplayType('hidden').setDefaultValue('SUBMIT');

    //Sublist - Unbilled AR List
    objForm.addSubTab('custpage_unbilledtab', 'Unbilled AR', null);
    var obj_sublist = objForm.addSubList('custpage_unbilled', 'list', 'Unbilled AR', 'custpage_unbilledtab');

    obj_sublist.addMarkAllButtons();
    obj_sublist.addField('custpage_cb', 'checkbox', 'Select');
    obj_sublist.addField('custpage_id', 'select', 'ID', 'transaction').setDisplayType('disabled');
    obj_sublist.addField('custpage_subsidiary', 'select', 'Performing Subsidiary', 'subsidiary').setDisplayType('inline');
    obj_sublist.addField('custpage_other_sub', 'select', 'Owning Subsidiary', 'subsidiary').setDisplayType('inline');
    obj_sublist.addField('custpage_account', 'select', 'Account', 'account').setDisplayType('inline');
    obj_sublist.addField('custpage_amount', 'currency', 'Amount').setDisplayType('inline');
    obj_sublist.addField('custpage_currency', 'select', 'Currency', 'currency').setDisplayType('inline');

    //Load Saved Search
    var arrUnbilledSearchResult = searchUnbilledList(stUnbilledSavedSearch);

    for (var intTimeCtr = 0; intTimeCtr < arrUnbilledSearchResult.length; intTimeCtr++) {
        var intCtr = intTimeCtr + 1;
        obj_sublist.setLineItemValue('custpage_cb', intCtr, 'F');
        obj_sublist.setLineItemValue('custpage_id', intCtr, arrUnbilledSearchResult[intTimeCtr].getValue('internalid', null, 'group'));
        obj_sublist.setLineItemValue('custpage_subsidiary', intCtr, arrUnbilledSearchResult[intTimeCtr].getValue('subsidiary', null, 'group'));
        obj_sublist.setLineItemValue('custpage_other_sub', intCtr, arrUnbilledSearchResult[intTimeCtr].getValue('custcolapco_other_subsidiary', null, 'group'));
        obj_sublist.setLineItemValue('custpage_account', intCtr, arrUnbilledSearchResult[intTimeCtr].getValue('account', null, 'group'));
        obj_sublist.setLineItemValue('custpage_amount', intCtr, arrUnbilledSearchResult[intTimeCtr].getValue('fxamount', null, 'sum'));
        obj_sublist.setLineItemValue('custpage_currency', intCtr, arrUnbilledSearchResult[intTimeCtr].getValue('currency', null, 'group'));
    }

    return objForm;
}

/**
 * @param request
 * 
 */
function processUnbilledBalances(request, stParamDepId) {
    var stLogTitle = 'suitelet_unbilledBalances.processUnbilledBalances';

    nlapiLogExecution('DEBUG', stLogTitle, 'Process Unbilled Balances...');

    //Get the items
    var intCount = request.getLineItemCount('custpage_unbilled');
    nlapiLogExecution('DEBUG', stLogTitle, 'intCount = ' + intCount);

    //Object Holder
    var arrChecked = [];

    //For each result, get checked items
    for (var intLineCtr = 1; intLineCtr <= intCount; intLineCtr++) {
        var stChecked = request.getLineItemValue('custpage_unbilled', 'custpage_cb', intLineCtr);
        var stUnbilledId = request.getLineItemValue('custpage_unbilled', 'custpage_id', intLineCtr);
        if (stChecked == 'T' && !Eval.isEmpty(stUnbilledId)) {
            arrChecked.push(stUnbilledId);

            //nlapiSubmitField('intercompanyjournalentry', stUnbilledId, 'custbody_apco_unbilled_balances', 'T');
        }
    }

    //Run scheduled script
    var arrParams = [];
    if (arrChecked.length > 0) {
        arrParams['custscript_sc_unbilled'] = arrChecked.toString();

        nlapiLogExecution('DEBUG', stLogTitle, 'arrParams =' + arrParams.toString());

        var stSchedStatus = callScheduledScript('customscript_sc_unbilled', stParamDepId, arrParams);
        nlapiLogExecution('DEBUG', stLogTitle, 'stSchedStatus =' + stSchedStatus);

    }

    nlapiLogExecution('DEBUG', stLogTitle, 'CONTEXT.getRemainingUsage() =' + CONTEXT.getRemainingUsage());

}

//------------------------------------------------- SEARCHES  -------------------------------------------------

/**
 * Search for all Unbilled AR
 * @param stUnbilledSavedSearch 
 * @returns arrResults - search result of the saved search executed against transaction
 * 
 */
function searchUnbilledList(stUnbilledSavedSearch) {
    var stLogTitle = 'suitelet_unbilledBalances.showUnbilledBalancesListPage.searchUnbilledList';

    //Filters and Columns
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('custbody_apco_unbilled_balances', null, 'is', 'F'));

    var arrColumns = [];

    var arrResults = SuiteUtil.search(stUnbilledSavedSearch, 'transaction', arrFilters, arrColumns);

    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);
    return arrResults;
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
    var stLogTitle = 'suitelet_unbilledBalances.callScheduledScript';

    nlapiLogExecution('DEBUG', stLogTitle, 'Scheduled Script ID = ' + stScheduledScriptId + '| Scheduled Script Deployment ID = ' + stScheduledDeploymentId);

    var stSchedStatus = nlapiScheduleScript(stScheduledScriptId, 'customdeploy_sc_unbilled', arrParams);
    nlapiLogExecution('DEBUG', stLogTitle, 'Scheduled Script Status : ' + stSchedStatus);

    while (stSchedStatus != 'QUEUED') {
        nlapiLogExecution('DEBUG', stLogTitle, 'No available Sched Script Deployment found, creating new deployment.');

        createNewDeployment(stScheduledDeploymentId);

        stSchedStatus = nlapiScheduleScript(stScheduledScriptId, null, arrParams);
        nlapiLogExecution('DEBUG', stLogTitle, 'Scheduled Script Status : ' + stSchedStatus);
    }

    return stSchedStatus;
}

/**
 * Copy the existing deployment
 * 
 * @param stDeployId
 */
function createNewDeployment(stDeployId) {
    var stLogTitle = 'suitelet_unbilledBalances.callScheduledScript.createNewDeployment';

    var record = nlapiCopyRecord('scriptdeployment', stDeployId);
    record.setFieldValue('status', 'NOTSCHEDULED');
    record.setFieldValue('startdate', nlapiDateToString(new Date(), 'date'));

    var stId = nlapiSubmitRecord(record, true, true);

    nlapiLogExecution('AUDIT', stLogTitle, 'New deployment created = ' + stId);
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

};