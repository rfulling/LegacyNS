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
 * Module Description - PM Review Time Sheet
 * 
 * Version      Date                Author              Remarks
 * 1.00         11 May 2016         mjpascual           Initial version.
 * 1.10         10 Mar 2017         jjacob              Pagination, Script Locking
 * 1.20         29 Mar 2017         ajdeleon            Added Script Locking & validate
 * 1.21         25 Apr 2017         ajdeleon            Fixed Pagination
 */

var CONTEXT = nlapiGetContext();
var OBJ_STATUS =
    {
        '_hardapproved': '',
        '_unapproved': ''
    };

var ARR_TIME_IDS = [];
var OBJ_TIME_IDS = {};

/**
 * TDD 7: PM Review Timesheet
 * @param request
 * @param response
 */
function suitelet_pmReviewTime(request, response) {
    try {
        var stLogTitle = 'suitelet_pmReviewTime';
        nlapiLogExecution('DEBUG', stLogTitle, '>> Entry Log <<');

        var stTimeSavedSearch = CONTEXT.getSetting('SCRIPT', 'custscript_apco_pm_time_search');
        var stTimeTaskJESavedSearch = CONTEXT.getSetting('SCRIPT', 'custscript_timesheet_tasks_jes_search');
        var stDepId = CONTEXT.getSetting('SCRIPT', 'custscript_apco_pm_dep_id');
        var stRolesAllowed = CONTEXT.getSetting('SCRIPT', 'custscript_apco_no_restriction_roles');
        var stRolePM = CONTEXT.getSetting('SCRIPT', 'custscript_apco_role_pm');
        var stTMProj = CONTEXT.getSetting('SCRIPT', 'custscript_tm_project');
        var stProjTypes = CONTEXT.getSetting('SCRIPT', 'custscript_project_types');
        var stPostingPeriod = CONTEXT.getSetting('SCRIPT', 'custscript_apco_acct_period');
        //rf 2-8-2017 for new role 
        var stRoleBiller = CONTEXT.getSetting('SCRIPT', 'custscript_apco_biller_role');

        OBJ_STATUS._hardapproved = CONTEXT.getSetting('SCRIPT', 'custscript_apco_hard_approve');
        OBJ_STATUS._unapproved = CONTEXT.getSetting('SCRIPT', 'custscript_apco_unapproved');
        OBJ_STATUS._financeApproval = CONTEXT.getSetting('SCRIPT', 'custscript_apco_finance_appr');

        // Throw error if any script parameter is empty
        if (Eval.isEmpty(stTimeSavedSearch) || Eval.isEmpty(stDepId) || Eval.isEmpty(OBJ_STATUS._hardapproved) || Eval.isEmpty(OBJ_STATUS._unapproved) || Eval.isEmpty(stRolesAllowed) || Eval.isEmpty(stTMProj) || Eval.isEmpty(stProjTypes)
            || Eval.isEmpty(stPostingPeriod) || Eval.isEmpty(stRolePM || Eval.isEmpty(stRoleBiller))) {
            throw nlapiCreateError('EMPTY_SCRIPT_PARAMETER', 'Script Parameters should not be empty.');
        }

        nlapiLogExecution('DEBUG', stLogTitle, 'SCRIPT PARAMETERS: ' + 'stbiller = ' + stRoleBiller);

        var stAction = request.getParameter('custpage_action');
        nlapiLogExecution('DEBUG', stLogTitle, 'Action: ' + stAction);

        var objForm = null;

        switch (request.method) {
            case 'GET':
                //Show form
                var arrRolesAllowed = stRolesAllowed.split(',');
                var arrBillerRoles = stRoleBiller.split(',');
                objForm = showTimesheetListPage(request, stTimeSavedSearch, stTimeTaskJESavedSearch, arrRolesAllowed, stTMProj, stProjTypes, stPostingPeriod, stRolePM, arrBillerRoles);
                response.writePage(objForm);
                break;

            case 'POST':
                processTime(request, stDepId);
                // nlapiSetRedirectURL('SUITELET', 'customscript_sl_approve_time', 'customdeploy_sl_approve_time');
                //Re-direct to message page
                objForm = showMessagePage();
                response.writePage(objForm);
                break;

            default:
                break;
        }

        /*
        //If approve button, then call the approve process
        if (stAction == 'APPROVE') {
            processTime(request, stDepId);
            //Re-direct to message page
            objForm = showMessagePage();
        }
        else {
            //Show form
            var arrRolesAllowed = stRolesAllowed.split(',');
            var arrBillerRoles = stRoleBiller.split(',');
            objForm = showTimesheetListPage(request, stTimeSavedSearch, stTimeTaskJESavedSearch, arrRolesAllowed, stTMProj, stProjTypes, stPostingPeriod, stRolePM, arrBillerRoles);
        }

        response.writePage(objForm);
        */

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
    var objForm = nlapiCreateForm('PM Suitelet – Time');
    objForm.addField('custpage_result', 'inlinehtml', '').setDisplayType('normal').setDefaultValue(
        'Your Request has been submitted to be processed.  You will be notified by email when the process is complete.');
    return objForm;
}

/**
 * Show the time page
 * 
 * @param request
 * @param stTimeSavedSearch
 * @param stTimeTaskJESavedSearch
 * @param arrRolesAllowed
 * @param stTMProj
 * //rf 2-8-2017 for new rold
 * @param stRoleBiller
 * @param stProjTypes
 * @param stPostingPeriod
 * @param stRolePM
 * @returns objForm
 */
function showTimesheetListPage(request, stTimeSavedSearch, stTimeTaskJESavedSearch, arrRolesAllowed, stTMProj, stProjTypes, stPostingPeriod, stRolePM, arrBillerRoles) {

    var stLogTitle = 'suitelet_pmReviewTime.showTimesheetListPage';
    nlapiLogExecution('DEBUG', stLogTitle, 'Generating Form...');

    var objFilter = {};
    objFilter.stProject = request.getParameter('custpage_project_hd');
    objFilter.stLocation = request.getParameter('custpage_location_hd');
    objFilter.stSubsidiary = request.getParameter('custpage_subsidiary_hd');
    objFilter.stEmployee = request.getParameter('custpage_employee_hd');
    objFilter.stToDate = request.getParameter('custpage_todate_hd');
    objFilter.stFromDate = request.getParameter('custpage_fromdate_hd');
    objFilter.stProjMgr = request.getParameter('custpage_projmgr_hd');
    objFilter.stStatus = request.getParameter('custpage_status_hd');
    objFilter.stProjTask = request.getParameter('custpage_projtask_hd');
    objFilter.stProjType = request.getParameter('custpage_projtype_hd');

    nlapiLogExecution('DEBUG', stLogTitle, 'objFilter =' + JSON.stringify(objFilter));

    //Create Form
    var objForm = nlapiCreateForm('PM Suitelet – Time');

    objForm.setScript('customscript_cs_review_time');
    objForm.addButton('custpage_filter_btn', 'Search', 'filter_list()');
    objForm.addSubmitButton('Submit');

    //Group
    objForm.addFieldGroup('custgrp_filter', 'Filter');
    //objForm.addFieldGroup( 'custgrp_select', 'Select');

    /* -- Pagination 1.21 -- */
    var stRequestSelectedRecords = request.getParameter('selected_records');
    var arrRequestSelectedRecords = [];
    objForm.addField('custpage_selectedrecords', 'longtext', 'Selected Records').setDisplayType('hidden').setDefaultValue(stRequestSelectedRecords);

    if (!Eval.isEmpty(stRequestSelectedRecords)) {
        arrRequestSelectedRecords = JSON.parse(stRequestSelectedRecords);
    }
    /* -- END Pagination 1.21 -- */

    //Fields
    objForm.addField('custpage_action', 'text', 'Action').setDisplayType('hidden').setDefaultValue('APPROVE');

    var stUserRole = nlapiGetRole();

    var objFld = objForm.addField('custpage_project_hd', 'select', 'Project', 'job', 'custgrp_filter').setMandatory(true);
    objFld.setDefaultValue(objFilter.stProject);

    objForm.addField('custpage_projtask_hd', 'select', 'Project  Task', null, 'custgrp_filter').setDefaultValue(objFilter.stProjTask);
    objForm.addField('custpage_subsidiary_hd', 'select', 'Subsidiary', 'subsidiary', 'custgrp_filter').setDefaultValue(objFilter.stSubsidiary);
    objForm.addField('custpage_location_hd', 'select', 'Location', 'location', 'custgrp_filter').setDefaultValue(objFilter.stLocation);
    objForm.addField('custpage_employee_hd', 'select', 'Employee', 'employee', 'custgrp_filter').setDefaultValue(objFilter.stEmployee);

    if (!Eval.inArray(stUserRole, arrRolesAllowed)) {
        objForm.addField('custpage_projmgr_hd', 'select', 'Project Manager', 'employee', 'custgrp_filter').setDisplayType('hidden').setDefaultValue(objFilter.stProjMgr);
    }

    else {
        objForm.addField('custpage_projmgr_hd', 'select', 'Project Manager', 'employee', 'custgrp_filter').setDefaultValue(objFilter.stProjMgr);
    }

    objForm.addField('custpage_status_hd', 'select', 'Status', 'customlist_apco_time_appr_status', 'custgrp_filter').setDefaultValue(objFilter.stStatus);
    objForm.addField('custpage_todate_hd', 'date', 'Start Date', null, 'custgrp_filter').setDefaultValue(objFilter.stToDate);
    objForm.addField('custpage_fromdate_hd', 'date', 'End Date', null, 'custgrp_filter').setDefaultValue(objFilter.stFromDate);
    objForm.addField('custpage_hardapproved', 'text', 'Hard Approved', null, 'custgrp_filter').setDisplayType('hidden').setDefaultValue(OBJ_STATUS._hardapproved);
    objForm.addField('custpage_unapproved', 'text', 'Unapproved', null, 'custgrp_filter').setDisplayType('hidden').setDefaultValue(OBJ_STATUS._unapproved);
    objForm.addField('custpage_projtype_hd', 'select', 'Project Type', 'jobtype', 'custgrp_filter').setDisplayType('disabled').setDefaultValue(objFilter.stProjType);

    //Posting Period
    objForm.addField('custpage_posting_hd', 'select', 'Posting Period', 'accountingperiod', 'custgrp_filter').setDisplayType('disabled').setDefaultValue(stPostingPeriod);

    //Sublist
    var stTimesheetTab = 'custpage_tab_tsheet';
    objForm.addSubTab(stTimesheetTab, 'Timesheet', null);
    var obj_sublist = objForm.addSubList('custpage_pm_review', 'list', 'Timesheet', stTimesheetTab);

    //Project Type
    var arrTimeSearchResult = '';
    var bIsTM = true;

    if (objFilter.stProjType != stTMProj) {
        bIsTM = false;
    }
    nlapiLogExecution('DEBUG', stLogTitle, 'bIsTM ' + bIsTM + ' | objFilter.stProjType = ' + objFilter.stProjType + ' | stTMProj = ' + stTMProj);

    //Visible Fields
    obj_sublist.addField('custpage_id', 'select', 'Time Id', 'timebill').setDisplayType('disabled');
    obj_sublist.addField('custpage_date', 'text', 'Date').setDisplayType('inline');
    obj_sublist.addField('custpage_statusid', 'text', 'Status Id').setDisplayType('hidden');
    obj_sublist.addField('custpage_status', 'text', 'Status').setDisplayType('inline');
    obj_sublist.addField('custpage_employee', 'text', 'Employee').setDisplayType('inline');
    obj_sublist.addField('custpage_location', 'text', 'Location').setDisplayType('inline');
    obj_sublist.addField('custpage_subsidiary', 'text', 'Subsidiary').setDisplayType('inline');
    obj_sublist.addField('custpage_project', 'text', 'Project').setDisplayType('inline');
    obj_sublist.addField('custpage_projtask', 'text', 'Project Task').setDisplayType('inline');
    obj_sublist.addField('custpage_memo', 'textarea', 'Timecard Notes / Memo').setDisplayType('inline');
    obj_sublist.addField('custpage_hours', 'text', 'Hours').setDisplayType('inline');
    obj_sublist.addField('custpage_billable', 'text', 'Bill Rate').setDisplayType('inline');
    obj_sublist.addField('custpage_amount', 'text', 'Amount').setDisplayType('inline');
    //  if(bIsTM)
    //  {
    //      obj_sublist.addField('custpage_wo_cb', 'checkbox', 'Write off');
    //  }
    //  if(!bIsTM)
    //  {
    //      obj_sublist.addField('custpage_wo_hours', 'float', 'Hours').setDisplayType('entry');
    //  }
    obj_sublist.addField('custpage_tr_cb', 'checkbox', 'Transfer');

    var objFld = obj_sublist.addField('custpage_tr_projto', 'select', 'Project', 'job');
    objFld.setDefaultValue(objFilter.stProject);

    obj_sublist.addField('custpage_projtask_btn', 'checkbox', 'Select Project Task');
    obj_sublist.addField('custpage_tr_projtask', 'select', 'Project  Task', 'projecttask').setDisplayType('disabled');

    if (!bIsTM) {
        obj_sublist.addField('custpage_tr_hours', 'float', 'Hours').setDisplayType('entry');
    }

    /* ------------------------ START 1.20 Script Locking ------------------------ */

    var isScriptOnLock = false;

    if (!Eval.isEmpty(objFilter.stProject)) {
        //check if mandatory field is being processed by the scheduled script
        var isScriptOnLock = ScriptLocker.isOnProcess({
            scriptName: 'customscript_sc_review_time', //scheduled script
            lockOnField: 'project',
            lockOnFieldValue: objFilter.stProject
        });

        if (isScriptOnLock === true) {
            var msg = 'Script is currently processing for the selected project.';
            nlapiLogExecution('AUDIT', stLogTitle, 'SCRIPT_LOCKER:' + msg);

            // Show message to user
            var objMessage = objForm.addField('custpage_hardapp_stat', 'inlinehtml', '');
            objMessage.setLayoutType('outsideabove', 'startcol');
            objMessage.setDefaultValue('<font color=\"red\" size=\"2\"><b>' + msg + '</b></font>');

            // Return, do not populate sublist
            return objForm; //aj deleon - added objform;
        }
    }
    else {
        nlapiLogExecution('debug', stLogTitle, 'NO_SCRIPT_LOCKING: project field is empty');
    }

    /* ------------------------ END 1.20 Script Locking ------------------------ */

    //Load Saved Search
    if (validateFilter(objFilter)) {
        // 1.10 | Pagination: 
        //arrTimeSearchResult = searchTimeList(objFilter, stTimeSavedSearch, arrRolesAllowed, bIsTM, stPostingPeriod, stRolePM, arrBillerRoles);
        var objSearch = buildSearch(objFilter, stTimeSavedSearch, arrRolesAllowed, bIsTM, stPostingPeriod, stRolePM, arrBillerRoles);

        // 1.10 | Pagination: Get pagination request params
        var urlPageNo = request.getParameter(Pagination.FIELD_PAGE_NO);
        var urlPageSize = request.getParameter(Pagination.FIELD_PAGE_SIZE);
        var urlCache = request.getParameter(Pagination.FIELD_CACHE);

        nlapiLogExecution('debug', stLogTitle, 'PAGINATION: urlPageNo=' + urlPageNo + ' | urlPageSize=' + urlPageSize + ' | urlCache=' + urlCache);

        // 1.10 | Pagination: Load cache data
        var arrCacheData = (urlCache) ? Pagination.getCache({ id: urlCache }) : null;

        // Add hidden field for the pagination cache record id
        if (urlCache) {
            objForm = Pagination.addCacheToForm({
                form: objForm,
                value: urlCache
            });
        }

        // 1.10 | Pagination: Render page selectors to form
        objForm = Pagination.displaySelectors({
            form: objForm,
            tab: stTimesheetTab,
            urlPageNo: urlPageNo,
            urlPageSize: urlPageSize,
            recordType: objSearch.recordType,
            savedSearch: objSearch.savedSearch,
            filters: objSearch.filters
        });

        // 1.10 | Pagination: Fetch data per page no and page size
        var arrTimeSearchResult = Pagination.getPage({
            recordType: objSearch.recordType,
            savedSearch: objSearch.savedSearch,
            filters: objSearch.filters,
            columns: objSearch.columns,
            pageSize: Pagination.CURRENT_PAGE_SIZE,
            pageNo: Pagination.CURRENT_PAGE_NO
        });

        for (var intTimeCtr = 0; intTimeCtr < arrTimeSearchResult.length; intTimeCtr++) {
            var intTimeId = arrTimeSearchResult[intTimeCtr].getValue('internalid');
            ARR_TIME_IDS.push(intTimeId);
        }

        nlapiLogExecution('DEBUG', stLogTitle, 'ARR_TIME_IDS = ' + ARR_TIME_IDS);

        // Search: Time Task
        var arrTimeTaskSearchResult = searchTimeTasks(stTimeTaskJESavedSearch);
        storeInTimeIdsObj(arrTimeTaskSearchResult);

        // 1.10 | Pagination:
        var PAGINATION_arrCurrentPageData = [];

        for (var intTimeCtr = 0; intTimeCtr < arrTimeSearchResult.length; intTimeCtr++) {
            var intCtr = intTimeCtr + 1;
            var stIntId = arrTimeSearchResult[intTimeCtr].getValue('internalid');
            var stTaskName = '';

            if (!Eval.isEmpty(OBJ_TIME_IDS[stIntId])) {
                stTaskName = OBJ_TIME_IDS[stIntId].stTaskName;
            }

            // 1.10 | Pagination: Check from cache the current line
            // var PAGINATION_objLine = arrCacheData[stIntId];
            // nlapiLogExecution('debug', '*** TEST ***', 'PAGINATION_objLine: ' + JSON.stringify(PAGINATION_objLine));
            // 1.10 | Pagination: 
            // if (PAGINATION_objLine)
            // {
            //     PAGINATION_arrCurrentPageData.push(stIntId);
            // }   

            /*
            if (arrCacheData && arrCacheData.length > 0)
            {               
                // 1.10 | Pagination: Determine if line has to be checked or not based on cache data
                //var PAGINATION_selected = Pagination.inArray(stIntId, arrCacheData);
                var PAGINATION_objLineChecked = Pagination.isLineChecked(stIntId, arrCacheData);
                
                // 1.10 | Pagination: Store selected records
                if (PAGINATION_selected)
                {
                    PAGINATION_arrCurrentPageData.push(stIntId);
                }   
            }
            */

            /* --- START 1.21 Pagination --- */

            //set default values
            var objDefaultValues = {};
            objDefaultValues.checkbox = 'F';
            objDefaultValues.project_to = '';
            objDefaultValues.project_task = '';
            objDefaultValues.hours = '';

            //check previous page records
            for (var key in arrRequestSelectedRecords) {
                //get id
                var stSelectedRercordId = arrRequestSelectedRecords[key].stId;

                //populate data
                if (stSelectedRercordId == stIntId) {
                    //overwrite default values
                    objDefaultValues.checkbox = 'T';
                    objDefaultValues.project_to = arrRequestSelectedRecords[key].stTRProjTo;
                    objDefaultValues.project_task = arrRequestSelectedRecords[key].stTRProjTask;
                    objDefaultValues.hours = arrRequestSelectedRecords[key].stTRHours;
                    break;
                }
            }
            /* --- END 1.21 Pagination --- */


            obj_sublist.setLineItemValue('custpage_id', intCtr, stIntId);
            obj_sublist.setLineItemValue('custpage_date', intCtr, arrTimeSearchResult[intTimeCtr].getValue('date')); //Date
            obj_sublist.setLineItemValue('custpage_statusid', intCtr, arrTimeSearchResult[intTimeCtr].getValue('custcol_time_entry_appr_status')); //Status Id
            obj_sublist.setLineItemValue('custpage_status', intCtr, arrTimeSearchResult[intTimeCtr].getText('custcol_time_entry_appr_status')); //Status
            obj_sublist.setLineItemValue('custpage_employee', intCtr, arrTimeSearchResult[intTimeCtr].getText('employee')); //Employee
            obj_sublist.setLineItemValue('custpage_location', intCtr, arrTimeSearchResult[intTimeCtr].getText('location')); //Location
            obj_sublist.setLineItemValue('custpage_subsidiary', intCtr, arrTimeSearchResult[intTimeCtr].getValue('subsidiary')); //Subsidiary
            obj_sublist.setLineItemValue('custpage_project', intCtr, arrTimeSearchResult[intTimeCtr].getText('customer')); //Customer
            obj_sublist.setLineItemValue('custpage_projtask', intCtr, stTaskName); //Task
            obj_sublist.setLineItemValue('custpage_memo', intCtr, arrTimeSearchResult[intTimeCtr].getValue('memo')); //Memo
            obj_sublist.setLineItemValue('custpage_hours', intCtr, arrTimeSearchResult[intTimeCtr].getValue('durationdecimal')); //Hours
            obj_sublist.setLineItemValue('custpage_billable', intCtr, arrTimeSearchResult[intTimeCtr].getValue('rate')); //Rate 
            obj_sublist.setLineItemValue('custpage_amount', intCtr, arrTimeSearchResult[intTimeCtr].getValue('formulanumeric')); //Amount


            // obj_sublist.setLineItemValue('custpage_tr_cb', intCtr,  (PAGINATION_objLine ? 'T' : 'F'));
            // obj_sublist.setLineItemValue('custpage_tr_projto', intCtr, '');
            // obj_sublist.setLineItemValue('custpage_tr_projtask', intCtr, '');

            obj_sublist.setLineItemValue('custpage_tr_cb', intCtr, objDefaultValues.checkbox); //1.21 checkbox
            obj_sublist.setLineItemValue('custpage_tr_projto', intCtr, objDefaultValues.project_to); //1.21 projto
            obj_sublist.setLineItemValue('custpage_tr_projtask', intCtr, objDefaultValues.project_task); //1.21 projtask

            //select project task checkbox
            if (!Eval.isEmpty(objDefaultValues.project_task)) {
                obj_sublist.setLineItemValue('custpage_projtask_btn', intCtr, 'T');
            }

            if (!bIsTM) {
                // obj_sublist.setLineItemValue('custpage_tr_hours', intCtr, '');
                obj_sublist.setLineItemValue('custpage_tr_hours', intCtr, objDefaultValues.hours); //1.21 hours

            }

            // 1.10 | Pagination: Set line data from pagination cache
            // if (PAGINATION_objLine)
            // {
            //     for (var field in PAGINATION_objLine)
            //     {
            //         var value = PAGINATION_objLine[field];
            //         nlapiLogExecution('debug', '*** TEST ***', 'field= ' + field + ' | value=' + value);
            //         obj_sublist.setLineItemValue('custpage_' + field, intCtr, value);
            //     }   
            // }   
        }

        // 1.10 | Pagination: Hidden field for the record IDs of the current page
        // objForm.addField(Pagination.FIELD_PAGE_DATA, 'longtext', 'CurrentData').setDisplayType('hidden').setDefaultValue(JSON.stringify(PAGINATION_arrCurrentPageData));

    }

    return objForm;
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
 *  Call the scheduled script to process time
 * 
 * @param request
 * @param stDepId
 * 
 */
function processTime(request, stDepId) {
    var stLogTitle = 'suitelet_pmReviewTime.processTime';

    nlapiLogExecution('DEBUG', stLogTitle, 'Entering processTime...');

    //Get the items
    var stListType = 'custpage_pm_review';
    var intCount = request.getLineItemCount(stListType);
    nlapiLogExecution('DEBUG', stLogTitle, 'intCount = ' + intCount);

    //Initialize
    var arrWriteOff = [];
    var arrTransfer = [];
    var arrHold = [];
    var arrReject = [];

    var stProjType = request.getParameter('custpage_projtype_hd');
    var stPostingPd = request.getParameter('custpage_posting_hd');

    for (var intLineCtr = 1; intLineCtr <= intCount; intLineCtr++) {
        var stId = request.getLineItemValue(stListType, 'custpage_id', intLineCtr);

        var stWOChecked = request.getLineItemValue(stListType, 'custpage_wo_cb', intLineCtr);
        var stWOHrs = request.getLineItemValue(stListType, 'custpage_wo_hours', intLineCtr);
        var stTRChecked = request.getLineItemValue(stListType, 'custpage_tr_cb', intLineCtr);
        var stTRProjTo = request.getLineItemValue(stListType, 'custpage_tr_projto', intLineCtr);
        var stTRProjTask = request.getLineItemValue(stListType, 'custpage_tr_projtask', intLineCtr);
        var stTRHours = request.getLineItemValue(stListType, 'custpage_tr_hours', intLineCtr);

        //      var stHOChecked = request.getLineItemValue(stListType, 'custpage_ho_cb', intLineCtr);
        //      var stHOExp = request.getLineItemValue(stListType, 'custpage_ho_exp', intLineCtr);
        //      var stRTChecked = request.getLineItemValue(stListType, 'custpage_rt_cb', intLineCtr);
        //      var stRTExp = request.getLineItemValue(stListType, 'custpage_rt_exp', intLineCtr);

        var objItem = {};
        objItem.stId = stId;
        objItem.stProjType = stProjType;

        if (stWOChecked == 'T') {
            objItem.stWOHrs = stWOHrs;
            arrWriteOff.push(objItem);
        }

        if (stTRChecked == 'T') {
            objItem.stTRProjTo = stTRProjTo;
            objItem.stTRProjTask = stTRProjTask;
            objItem.stTRHours = stTRHours;
            arrTransfer.push(objItem);
        }

    }

    /* ------------------------START Pagination 1.21 ------------------------ */
    var stRequestSelectedRecords = request.getParameter('custpage_selectedrecords'); //get selected records including on previous page

    var arrRequestSelectedRecords = [];
    if (!Eval.isEmpty(stRequestSelectedRecords)) {
        arrRequestSelectedRecords = JSON.parse(stRequestSelectedRecords);
    }
    /* ------------------------ END Pagination 1.21 ------------------------ */

    nlapiLogExecution('DEBUG', 'arrRequestSelectedRecords', JSON.stringify(arrRequestSelectedRecords));
    nlapiLogExecution('DEBUG', 'arrTransfer', JSON.stringify(arrTransfer));

    //Run scheduled script
    var objParams = {};
    objParams['custscript_writeoff'] = JSON.stringify(arrWriteOff);
    // objParams['custscript_transfer'] = JSON.stringify(arrTransfer);
    objParams['custscript_transfer'] = JSON.stringify(arrRequestSelectedRecords); //1.21
    objParams['custscript_hold'] = JSON.stringify(arrHold);
    objParams['custscript_reject'] = JSON.stringify(arrReject);
    objParams['custscript_apco_postpd'] = stPostingPd;

    /* ------------------------ START 1.20 Script Locking ------------------------ */

    var stProjectId = request.getParameter('custpage_project_hd');
    nlapiLogExecution('DEBUG', stLogTitle, 'stProjectId =' + stProjectId);
    objParams['custscript_timesheet_projectid'] = stProjectId;

    /* ------------------------ END 1.20 Script Locking ------------------------ */

    var stSchedStatus = callScheduledScript('customscript_sc_review_time', stDepId, objParams);
    nlapiLogExecution('DEBUG', stLogTitle, 'stSchedStatus =' + stSchedStatus);
    nlapiLogExecution('DEBUG', stLogTitle, 'CONTEXT.getRemainingUsage() =' + CONTEXT.getRemainingUsage());

}

//------------------------------------------------- SCHEDULED SCRIPT CALL  -------------------------------------------------

/**
* Calls scheduled script to update originating transactions
* 
* @param stScheduledScriptId
* @param stScheduledDeploymentId
* @param arrParams
* @returns stSchedStatus
*/
function callScheduledScript(stScheduledScriptId, stScheduledDeploymentId, arrParams) {
    var stLogTitle = 'suitelet_pmReviewTime.callScheduledScript';

    nlapiLogExecution('DEBUG', stLogTitle, 'Scheduled Script ID = ' + stScheduledScriptId + '| Scheduled Script Deployment ID = ' + stScheduledDeploymentId);

    var stSchedStatus = nlapiScheduleScript(stScheduledScriptId, 'customdeploy_sc_review_time', arrParams);
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
    var stLogTitle = 'suitelet_pmReviewTime.callScheduledScript.createNewDeployment';

    var record = nlapiCopyRecord('scriptdeployment', stDeployId);
    record.setFieldValue('status', 'NOTSCHEDULED');
    record.setFieldValue('startdate', nlapiDateToString(new Date(), 'date'));

    var stId = nlapiSubmitRecord(record, true, true);

    nlapiLogExecution('AUDIT', stLogTitle, 'New deployment created = ' + stId);
}

/**
 * Store Project Tasks in an object
 * @param arrTimeTaskSearchResult
 */
function storeInTimeIdsObj(arrTimeTaskSearchResult) {
    var stLogTitle = 'suitelet_pmReviewTime.showTimesheetListPage.searchProjectList';

    nlapiLogExecution('DEBUG', stLogTitle, 'arrTimeTaskSearchResult = ' + arrTimeTaskSearchResult.length);

    for (var intTaskCtr = 0; intTaskCtr < arrTimeTaskSearchResult.length; intTaskCtr++) {
        var objTask = arrTimeTaskSearchResult[intTaskCtr];
        var stTaskId = objTask.getValue('internalid', null, 'GROUP');

        if (Eval.isEmpty(OBJ_TIME_IDS[stTaskId])) {
            OBJ_TIME_IDS[stTaskId] = {};
            OBJ_TIME_IDS[stTaskId].stTaskName = objTask.getValue('title', 'projectTask', 'GROUP');
            OBJ_TIME_IDS[stTaskId].stTaskId = objTask.getValue('internalid', 'projectTask', 'GROUP');
            OBJ_TIME_IDS[stTaskId].stJEId = objTask.getValue('internalid', 'CUSTCOL_APCO_TIMEENTYR_JE', 'GROUP');
        }
    }

    nlapiLogExecution('AUDIT', stLogTitle, 'OBJ_TIME_IDS = ' + JSON.stringify(OBJ_TIME_IDS));
}
//------------------------------------------------- SEARCHES  -------------------------------------------------

/**
 * Search for project
 * @param bForMgrs
 * @param stProjTypes
 * @returns arrResults - search result of the saved search executed against transaction
 */
function searchProjectList(bForMgrs, stProjTypes) {
    var stLogTitle = 'suitelet_pmReviewTime.showTimesheetListPage.searchProjectList';

    //Getters
    var stUser = nlapiGetUser();
    var arrProjTypes = stProjTypes.split(',');
    nlapiLogExecution('DEBUG', stLogTitle, 'arrProjTypes = ' + arrProjTypes);

    //Filters
    var arrFilters = [];
    if (bForMgrs) {
        arrFilters.push(new nlobjSearchFilter('custentity_apco_proj_mgr', null, 'anyof', stUser));
    }
    arrFilters.push(new nlobjSearchFilter('isinactive', null, 'is', 'F'));
    arrFilters.push(new nlobjSearchFilter('type', null, 'anyof', arrProjTypes));

    //Columns
    var arrColumns = [];
    arrColumns.push(new nlobjSearchColumn('internalid'));
    arrColumns.push(new nlobjSearchColumn('companyname'));

    var arrResults = SuiteUtil.search(null, 'job', arrFilters, arrColumns);

    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);

    return arrResults;
}
/**
 * Search for all timesheet 
 * 
 * Update 10 Mar 2017:
 * Search function updated to only return the search object. 
 * The actual search is executed within the Pagination logic.
 * 
 * @param objFilter
 * @param stTimeSavedSearch 
 * @param arrRolesAllowed
 * @param bIsTM
 * @param stPostingPeriod
 * @param stRolePM
 * @returns arrResults - search result of the saved search executed against transaction
 */
//function searchTimeList(objFilter, stTimeSavedSearch, arrRolesAllowed, bIsTM, stPostingPeriod, stRolePM, arrBillerRoles) {
function buildSearch(objFilter, stTimeSavedSearch, arrRolesAllowed, bIsTM, stPostingPeriod, stRolePM, arrBillerRoles) {
    var stLogTitle = 'suitelet_pmReviewTime.showTimesheetListPage.searchTimeList';

    //Getters
    var stUser = nlapiGetUser();
    var stUserRole = nlapiGetRole();

    //Filters
    var arrFilters = [];

    if (!Eval.isEmpty(objFilter.stProject)) {
        arrFilters.push(new nlobjSearchFilter('customer', null, 'anyof', objFilter.stProject));
    }

    nlapiLogExecution('DEBUG', stLogTitle, 'stUserRole = ' + stUserRole + 'stRolePM =' + stRolePM);

    if (stUserRole == stRolePM) {
        arrFilters.push(new nlobjSearchFilter('custentity_apco_proj_mgr', 'customer', 'anyof', nlapiGetUser()));
    }

    //rf 2-8-2017 to add the biller role to the search criteria;
    //allow any biller role to create the filter
    /*if (Eval.inArray(stUserRole, arrBillerRoles)) 
     {
         //nlapiLogExecution('DEBUG', stLogTitle, 'stUserRole = ' + stUserRole + ' stRoleBiller =' + arrBillerRoles);
            arrFilters.push(new nlobjSearchFilter('custentity_apco_biller', 'job', 'anyof', nlapiGetUser()));
     }*/

    if (!Eval.isEmpty(objFilter.stProjTask)) {
        arrFilters.push(new nlobjSearchFilter('internalId', 'projectTask', 'anyof', objFilter.stProjTask));
    }

    if (!Eval.isEmpty(objFilter.stEmployee)) {
        arrFilters.push(new nlobjSearchFilter('employee', null, 'anyof', objFilter.stEmployee));
    }

    if (!Eval.isEmpty(objFilter.stSubsidiary)) {
        arrFilters.push(new nlobjSearchFilter('subsidiary', null, 'anyof', objFilter.stSubsidiary));
    }

    if (!Eval.isEmpty(objFilter.stLocation)) {
        arrFilters.push(new nlobjSearchFilter('location', null, 'anyof', objFilter.stLocation));
    }

    if (!Eval.isEmpty(objFilter.stStatus)) {
        arrFilters.push(new nlobjSearchFilter('custcol_time_entry_appr_status', null, 'is', objFilter.stStatus));
    }

    if (!Eval.isEmpty(objFilter.stFromDate) && !Eval.isEmpty(objFilter.stToDate)) {
        arrFilters.push(new nlobjSearchFilter('date', null, 'within',
            [
                objFilter.stToDate, objFilter.stFromDate
            ]));
    }
    else if (!Eval.isEmpty(objFilter.stFromDate)) {
        arrFilters.push(new nlobjSearchFilter('date', null, 'onorbefore', objFilter.stFromDate));
    }
    else if (!Eval.isEmpty(objFilter.stToDate)) {
        arrFilters.push(new nlobjSearchFilter('date', null, 'onorafter', objFilter.stToDate));
    }

    nlapiLogExecution('DEBUG', stLogTitle, 'arrRolesAllowed = ' + arrRolesAllowed);

    //Admin and Finance roles will be able to see all projects in the suitelet.
    /*  if (!Eval.inArray(stUserRole, arrRolesAllowed)) 
      {
          arrFilters.push(new nlobjSearchFilter('custentity_apco_proj_mgr', 'customer', 'anyof', stUser));
      }
      else 
      {
          if (!Eval.isEmpty(objFilter.stProjMgr)) 
          {
              arrFilters.push(new nlobjSearchFilter('custentity_apco_proj_mgr', 'customer', 'anyof', objFilter.stProjMgr));
          }
      }*/

    nlapiLogExecution('DEBUG', stLogTitle, 'stPostingPeriod = ' + stPostingPeriod);

    if (!Eval.isEmpty(stPostingPeriod)) {
        var stEndDate = nlapiLookupField('accountingperiod', stPostingPeriod, 'enddate');
        nlapiLogExecution('DEBUG', stLogTitle, 'stEndDate = ' + stEndDate);
        arrFilters.push(new nlobjSearchFilter('date', null, 'onorbefore', stEndDate));
    }

    if (bIsTM) {
        //Unbilled
        arrFilters.push(new nlobjSearchFilter('status', null, 'is', 'T'));

        //Approval Status
        if (!Eval.isEmpty(objFilter.stStatus) && objFilter.stStatus != OBJ_STATUS._hardapproved) {
            return [];
        }
        else {
            arrFilters.push(new nlobjSearchFilter('custcol_time_entry_appr_status', null, 'anyof', OBJ_STATUS._hardapproved));
        }
    }
    else {
        arrFilters.push(new nlobjSearchFilter('custcol_time_entry_appr_status', null, 'anyof', [OBJ_STATUS._hardapproved, OBJ_STATUS._financeApproval]));
    }

    //Columns
    var arrColumns = [];

    // 1.10 | Pagination: Actual search commented out
    // var arrResults = SuiteUtil.search(stTimeSavedSearch, 'timebill', arrFilters, arrColumns);
    // nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);
    // return arrResults;

    // 1.10 | Pagination: Return search filters and columns
    return {
        recordType: 'timebill',
        savedSearch: stTimeSavedSearch,
        filters: arrFilters,
        columns: null
    };

}

/**
 * Search for all timesheet Tasks
 * @param stTimeTaskJESavedSearch
 * @returns arrResults - search result of the saved search executed against transaction
 */
function searchTimeTasks(stTimeTaskJESavedSearch) {
    var stLogTitle = 'suitelet_pmReviewTime.showTimesheetListPage.searchTimeTasks';

    //Filters
    var arrFilters = [];
    if (!Eval.isEmpty(ARR_TIME_IDS)) {
        arrFilters.push(new nlobjSearchFilter('internalid', null, 'anyof', ARR_TIME_IDS));
    }
    else {
        return [];
    }

    //Columns
    var arrColumns = [];

    var arrResults = SuiteUtil.search(stTimeTaskJESavedSearch, 'timebill', arrFilters, arrColumns);

    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);

    return arrResults;
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