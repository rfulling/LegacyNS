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
 * Module Description - Hard Approve Time
 *
 * Version    	Date            	Author           	Remarks
 * 1.00       	03/09/2016    		mjpascual 			Initial version.
 *
 */

var CONTEXT = nlapiGetContext();
var OBJ_TIME_STATUS = {};
var ST_MESSAGE_QUEUE = '';

/**
 * TDD 1: Hard Approve Time
 * @param request
 * @param response
 */
function suitelet_approveTime(request, response) {
    try {
        var stLogTitle = 'suitelet_approveTime';
        nlapiLogExecution('DEBUG', stLogTitle, '>> Entry Log <<');

        var stTimeSavedSearch = CONTEXT.getSetting('SCRIPT', 'custscript_apco_time_search');
        var stPostingPdSavedSearch = CONTEXT.getSetting('SCRIPT', 'custscript_apco_posting_pd_search');
        var stDepId = CONTEXT.getSetting('SCRIPT', 'custscript_apco_dep_id_at');
        var stAllCompany = CONTEXT.getSetting('SCRIPT', 'custscript_all_company');
        var stPostingPeriod = CONTEXT.getSetting('SCRIPT', 'custscript_apco_acct_period');

        OBJ_TIME_STATUS._pm_approved = CONTEXT.getSetting('SCRIPT', 'custscript_apco_pm_approved_status');
        OBJ_TIME_STATUS._approved = CONTEXT.getSetting('SCRIPT', 'custscript_apco_approved_status');
        OBJ_TIME_STATUS._rejected = CONTEXT.getSetting('SCRIPT', 'custscript_apco_rejected_status');

        // Throw error if any script parameter is empty
        if (Eval.isEmpty(stPostingPdSavedSearch) || Eval.isEmpty(stTimeSavedSearch) || Eval.isEmpty(OBJ_TIME_STATUS._pm_approved) || Eval.isEmpty(OBJ_TIME_STATUS._approved)
				|| Eval.isEmpty(OBJ_TIME_STATUS._rejected) || Eval.isEmpty(stDepId)) {
            throw nlapiCreateError('EMPTY_SCRIPT_PARAMETER', 'Script Parameters should not be empty.');
        }

        nlapiLogExecution('DEBUG', stLogTitle, 'SCRIPT PARAMETERS: ' + 'stPostingPeriod = ' + stPostingPeriod + ' | stTimeSavedSearch = ' + stTimeSavedSearch + '| stPostingPdSavedSearch = ' + stPostingPdSavedSearch + '| stAllCompany = ' + stAllCompany);

        var stAction = request.getParameter('custpage_action');
        nlapiLogExecution('DEBUG', stLogTitle, 'Action: ' + stAction);

        //If approve button, then call the approve process
        var objForm = null;
        if (stAction == 'APPROVE') {
            processApproveTime(request, stDepId);
            //Re-direct to message page
            objForm = showMessagePage();
        }
        else {
            //Show form
            objForm = showApproveListPage(request, stTimeSavedSearch, stPostingPdSavedSearch, stAllCompany, stPostingPeriod);
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
    var objForm = nlapiCreateForm('Hard Approve Time');
    objForm.addField('custpage_result', 'inlinehtml', '').setDisplayType('normal').setDefaultValue(
			'Your Request has been submitted to be processed.  You will be notified by email when the process is complete.');
    return objForm;
}

/**
 * Show the time page
 *
 * @param request
 * @param stAccrualJESavedSearch
 * @param stPostingPdSavedSearch
 * @param stAllCompany
 * @param stPostingPeriod
 * @returns objForm
 */
function showApproveListPage(request, stTimeSavedSearch, stPostingPdSavedSearch, stAllCompany, stPostingPeriod) {

    //var newActPeriod = nlapiLoadConfiguration("companypreferences").getFieldValue("custscript_apco_acct_period");
    var stLogTitle = 'suitelet_approveTime.showApproveListPage';
    nlapiLogExecution('DEBUG', stLogTitle, 'Generating Form...');

    var stMessage = request.getParameter('custpage_result');
    var objFilter = {};
    objFilter.stProject = request.getParameter('custpage_project_hd');
    objFilter.stEmployee = request.getParameter('custpage_employee_hd');
    //objFilter.stDate = request.getParameter('custpage_date_hd');
    objFilter.stDepartment = request.getParameter('custpage_department_hd');
    objFilter.stLocation = request.getParameter('custpage_location_hd');
    objFilter.stPostPd = request.getParameter('custpage_posting_hd');
    objFilter.stSubsidiary = request.getParameter('custpage_subsidiary_hd');

    //Create Form
    var objForm = nlapiCreateForm('Hard Approve Time');

    objForm.setScript('customscript_cs_approve_time');
    objForm.addButton('custpage_filter_btn', 'Search', 'filter_list()');
    objForm.addSubmitButton('Approve');

    objForm.addField('custpage_action', 'text', 'Action').setDisplayType('hidden').setDefaultValue('APPROVE');
    objForm.addField('custpage_result', 'inlinehtml', '').setDisplayType('normal').setDefaultValue(stMessage);
    objForm.addField('custpage_project_hd', 'select', 'Project', 'job').setMandatory(true).setDefaultValue(objFilter.stProject);

    arrPeriodList = searchPeriodList(stPostingPdSavedSearch);
    var objFld = objForm.addField('custpage_posting_hd', 'select', 'Period').setMandatory(true);
    objFld.addSelectOption('', '');

    var stPostDefault = '';
    for (var intFldCtr = 0; intFldCtr < arrPeriodList.length; intFldCtr++) {
        var stPostingId = arrPeriodList[intFldCtr].getId();
        var stPdId = arrPeriodList[intFldCtr].getValue('startdate') + '|' + arrPeriodList[intFldCtr].getValue('enddate');
        var stPdName = arrPeriodList[intFldCtr].getValue('periodname');

        if (stPostingPeriod == stPostingId) {
            stPostDefault = stPdId;
        }

        objFld.addSelectOption(stPdId, stPdName);
    }

    if (!Eval.isEmpty(objFilter.stPostPd)) {
        objFld.setDefaultValue(objFilter.stPostPd);
    }
    else {
        objFld.setDefaultValue(stPostDefault);
    }

    objForm.addField('custpage_employee_hd', 'select', 'Employee', 'employee').setDefaultValue(objFilter.stEmployee);
    //objForm.addField('custpage_date_hd', 'date', 'Date').setDefaultValue(objFilter.stDate);
    objForm.addField('custpage_subsidiary_hd', 'select', 'Subsidiary', 'subsidiary').setDefaultValue(objFilter.stSubsidiary);
    objForm.addField('custpage_department_hd', 'select', 'Department', 'department').setDefaultValue(objFilter.stDepartment);
    objForm.addField('custpage_location_hd', 'select', 'Location', 'location').setDefaultValue(objFilter.stLocation);

    //Load Saved Search
    if (validateFilter(objFilter)) {
        //Sublist - PM Approved
        objForm.addSubTab('custpage_pm_approvedtab', 'PM Approved', null);

        var obj_sublistPM = objForm.addSubList('custpage_pm_approved', 'list', 'PM Approved', 'custpage_pm_approvedtab');
        generateSublist(true, obj_sublistPM, stTimeSavedSearch, objFilter, stAllCompany);

        //Sublist - Not PM Approved
        objForm.addSubTab('custpage_pm_notapprovedtab', 'Not PM Approved', null);
        objForm.addField('custpage_warning', 'inlinehtml', '', null, 'custpage_pm_notapprovedtab').setDefaultValue(
				'<h1><font color=\"red\">Warning! These time entries are not PM-Approved.</font></h1>');
        var obj_sublistNotPM = objForm.addSubList('custpage_notpm_approved', 'list', 'Not PM Approved', 'custpage_pm_notapprovedtab');

        generateSublist(false, obj_sublistNotPM, stTimeSavedSearch, objFilter, stAllCompany);
    }
    else {
        objForm.addSubTab('custpage_pm_approvedtab', 'PM Approved', null);
        objForm.addField('custpage_blank', 'inlinehtml', '', null, 'custpage_pm_approvedtab').setDefaultValue('');
        objForm.addSubTab('custpage_pm_notapprovedtab', 'Not PM Approved', null);
        objForm.addField('custpage_warning', 'inlinehtml', '', null, 'custpage_pm_notapprovedtab').setDefaultValue(
				'<h1><font color=\"red\">Warning! These time entries are not PM-Approved.</font></h1>');
    }
    return objForm;
}

/**
 * Generates the sublist
 *
 * @param bIsPMApproved
 * @param obj_sublist
 * @param stTimeSavedSearch
 * @param objFilter
 */
function generateSublist(bIsPMApproved, obj_sublist, stTimeSavedSearch, objFilter, stAllCompany) {

    obj_sublist.addMarkAllButtons();

    //Visible Fields
    obj_sublist.addField('custpage_cb', 'checkbox', 'Approve');
    obj_sublist.addField('custpage_id', 'select', 'Time Id', 'timebill').setDisplayType('disabled');
    obj_sublist.addField('custpage_project', 'select', 'Company', 'customer').setDisplayType('inline');
    obj_sublist.addField('custpage_employee', 'select', 'Employee', 'employee').setDisplayType('inline');
    obj_sublist.addField('custpage_department', 'select', 'Department', 'department').setDisplayType('inline');
    obj_sublist.addField('custpage_location', 'select', 'Location', 'location').setDisplayType('inline');
    obj_sublist.addField('custpage_date', 'date', 'Date');
    obj_sublist.addField('custpage_hours', 'text', 'Hours');
    obj_sublist.addField('custpage_laborfee', 'currency', 'Labor Fee Distribution');
    obj_sublist.addField('custpage_je_rev', 'currency', 'Disbursement Distribution');
    obj_sublist.addField('custpage_discount', 'currency', 'Discount Distribution');
    obj_sublist.addField('custpage_rebate', 'currency', 'Rebate Distribution');

    //Load Saved Search
    var arrTimeSearchResult = searchTimeList(bIsPMApproved, stTimeSavedSearch, objFilter, stAllCompany);

    for (var intTimeCtr = 0; intTimeCtr < arrTimeSearchResult.length; intTimeCtr++) {
        var intCtr = intTimeCtr + 1;
        obj_sublist.setLineItemValue('custpage_cb', intCtr, 'F');
        obj_sublist.setLineItemValue('custpage_id', intCtr, arrTimeSearchResult[intTimeCtr].getValue('internalid'));
        obj_sublist.setLineItemValue('custpage_project', intCtr, arrTimeSearchResult[intTimeCtr].getValue('customer')); //Customer
        obj_sublist.setLineItemValue('custpage_employee', intCtr, arrTimeSearchResult[intTimeCtr].getValue('employee')); //Employee
        obj_sublist.setLineItemValue('custpage_department', intCtr, arrTimeSearchResult[intTimeCtr].getValue('department')); //department
        obj_sublist.setLineItemValue('custpage_location', intCtr, arrTimeSearchResult[intTimeCtr].getValue('location')); //Location
        obj_sublist.setLineItemValue('custpage_date', intCtr, arrTimeSearchResult[intTimeCtr].getValue('date')); //Date
        obj_sublist.setLineItemValue('custpage_hours', intCtr, arrTimeSearchResult[intTimeCtr].getValue('hours')); //Hours
        obj_sublist.setLineItemValue('custpage_laborfee', intCtr, arrTimeSearchResult[intTimeCtr].getValue('custcol_apco_labor_fee_distribu')); //Labor Fee Distribution
        obj_sublist.setLineItemValue('custpage_je_rev', intCtr, arrTimeSearchResult[intTimeCtr].getValue('custcol_apco_disb_fee_rev_distr')); //JE Revenue Distribution
        obj_sublist.setLineItemValue('custpage_discount', intCtr, arrTimeSearchResult[intTimeCtr].getValue('custcol_apco_discount_distr')); //Discunt Distribution
        obj_sublist.setLineItemValue('custpage_rebate', intCtr, arrTimeSearchResult[intTimeCtr].getValue('custcol_apco_rebate_distr')); //Rebate Distribution
    }

}

/**
 *  Call the scheduled script to approve time
 *
 * @param request
 *
 */
function processApproveTime(request, stDepId) {
    var stLogTitle = 'suitelet_approveTime.processApproveTime';

    nlapiLogExecution('DEBUG', stLogTitle, 'Approve Time...');

    var arrPMApproved = approveTime(request, 'custpage_pm_approved');
    var arrNotPMApproved = approveTime(request, 'custpage_notpm_approved');

    nlapiLogExecution('DEBUG', stLogTitle, 'arrPMApproved.length = ' + arrPMApproved.length + '| arrNotPMApproved = ' + arrNotPMApproved.length);

    //Run scheduled script
    var arrParams = [];
    if (arrPMApproved.length > 0 || arrNotPMApproved.length > 0) {
        var arrTimeBillsToProcess = arrPMApproved.concat(arrNotPMApproved);
        nlapiLogExecution('DEBUG', stLogTitle, 'arrTimeBillsToProcess = ' + arrTimeBillsToProcess);

        arrParams['custscript_sc_timebills'] = arrTimeBillsToProcess.toString();

        var stSchedStatus = callScheduledScript('customscript_sc_approve_time', stDepId, arrParams);
        nlapiLogExecution('DEBUG', stLogTitle, 'stSchedStatus =' + stSchedStatus);

        arrParams['custpage_result'] = ST_MESSAGE_QUEUE + stSchedStatus;
    }

    nlapiLogExecution('DEBUG', stLogTitle, 'CONTEXT.getRemainingUsage() =' + CONTEXT.getRemainingUsage());

}

/**
 * Get Checked values on the sublist
 *
 * @param request
 * @param stListType
 * @returns arrChecked
 */
function approveTime(request, stListType) {

    var stLogTitle = 'suitelet_approveTime.processApproveTime.approveTime';

    //Get the items
    var intCount = request.getLineItemCount(stListType);
    nlapiLogExecution('DEBUG', stLogTitle, 'intCount = ' + intCount);

    //Object Holder
    var arrChecked = [];

    //For each result, approve time
    for (var intLineCtr = 1; intLineCtr <= intCount; intLineCtr++) {
        var stChecked = request.getLineItemValue(stListType, 'custpage_cb', intLineCtr);
        var stTimeBillId = request.getLineItemValue(stListType, 'custpage_id', intLineCtr);

        if (stChecked == 'T' && !Eval.isEmpty(stTimeBillId)) {
            //nlapiSubmitField('timebill', stTimeBillId, 'custcol_time_entry_appr_status', OBJ_TIME_STATUS._approved);
            arrChecked.push(stTimeBillId);
        }
    }

    return arrChecked;
}

/**
 * Validate Filter
 * @param objFitler
 */
function validateFilter(objFitler) {
    for (var stKeyParam in objFitler) {
        if (!Eval.isEmpty(objFitler[stKeyParam])) {
            return true;
        }
    }
    return false;
}

/**
 * Search for all the Journal Entries
 * @param bIsPMApproved
 * @param stTimeSavedSearch
 * @param objFilter
 * @returns arrResults - search result of the saved search executed against transaction
 *
 */
function searchTimeList(bIsPMApproved, stTimeSavedSearch, objFilter, stAllCompany) {
    var stLogTitle = 'suitelet_approveTime.showApproveListPage.searchTimeList';

    nlapiLogExecution('DEBUG', stLogTitle, 'objFilter = ' + JSON.stringify(objFilter));

    var arrFilters = [];

    //Approval Status
    if (bIsPMApproved) {
        arrFilters.push(new nlobjSearchFilter('custcol_time_entry_appr_status', null, 'is', OBJ_TIME_STATUS._pm_approved));
    }
    else {
        arrFilters.push(new nlobjSearchFilter('custcol_time_entry_appr_status', null, 'noneof',
		[
				OBJ_TIME_STATUS._pm_approved, OBJ_TIME_STATUS._approved, OBJ_TIME_STATUS._rejected
		]));
    }

    //Filters
    if (!Eval.isEmpty(objFilter.stProject) && objFilter.stProject != stAllCompany) {
        arrFilters.push(new nlobjSearchFilter('customer', null, 'anyof', objFilter.stProject));
    }
    if (!Eval.isEmpty(objFilter.stEmployee)) {
        arrFilters.push(new nlobjSearchFilter('employee', null, 'anyof', objFilter.stEmployee));
    }
    //if (!Eval.isEmpty(objFilter.stDate))
    //{
    //	arrFilters.push(new nlobjSearchFilter('date', null, 'on', objFilter.stDate));
    //}
    if (!Eval.isEmpty(objFilter.stSubsidiary)) {
        arrFilters.push(new nlobjSearchFilter('subsidiary', null, 'anyof', objFilter.stSubsidiary));
    }
    if (!Eval.isEmpty(objFilter.stDepartment)) {
        arrFilters.push(new nlobjSearchFilter('department', null, 'anyof', objFilter.stDepartment));
    }
    if (!Eval.isEmpty(objFilter.stLocation)) {
        arrFilters.push(new nlobjSearchFilter('location', null, 'anyof', objFilter.stLocation));
    }
    if (!Eval.isEmpty(objFilter.stPostPd)) {
        var arrPostDate = objFilter.stPostPd.split('|');
        var stStartDate = arrPostDate[0];
        var stEndDate = arrPostDate[1];

        nlapiLogExecution('DEBUG', stLogTitle, 'arrPostDate = ' + arrPostDate);

        if (!Eval.isEmpty(stStartDate) && !Eval.isEmpty(stEndDate)) {
            arrFilters.push(new nlobjSearchFilter('date', null, 'within',
			[
					stStartDate, stEndDate
			]));
        }
    }

    //Columns
    var arrColumns = [];

    var arrResults = SuiteUtil.search(stTimeSavedSearch, 'timebill', arrFilters, arrColumns);

    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);
    return arrResults;
}

/**
 * Search for Period
 * @param stPostingPdSavedSearch
 * @returns arrResults - search result of the saved search executed against transaction
 */
function searchPeriodList(stPostingPdSavedSearch) {
    var stLogTitle = 'suitelet_pmReviewTime.showTimesheetListPage.searchPeriodList';
    var arrFilters = [];
    var arrColumns = [];

    var arrResults = SuiteUtil.search(stPostingPdSavedSearch, 'accountingperiod', arrFilters, arrColumns);

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
    var stLogTitle = 'suitelet_approveTime.callScheduledScript';

    nlapiLogExecution('DEBUG', stLogTitle, 'Scheduled Script ID = ' + stScheduledScriptId + '| Scheduled Script Deployment ID = ' + stScheduledDeploymentId);

    var stSchedStatus = nlapiScheduleScript(stScheduledScriptId, 'customdeploy_sc_approve_time', arrParams);
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
    var stLogTitle = 'suitelet_approveTime.callScheduledScript.createNewDeployment';

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