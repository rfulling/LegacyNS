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
 * TDD 7: PM Review Timesheet
 * 
 * Version      Date            Author        Remarks
 * 1.00         05/11/2016      mjpascual   Initial
 * 1.10     10 Mar 2017   jjacob      Pagination
 * 1.20     25 Apr 2017   ajdeleon    Fixed/Updated Pagination
 */

var CONTEXT = nlapiGetContext();

var OBJ_STATUS =
    {
        '_hardapproved': '',
        '_unapproved': ''
    };

var OBJ_GRP =
    {
        '_wo': 'wo',
        '_tr': 'tr',
        '_ho': 'ho',
        '_rt': 'rt'
    };

// 1.10 | Created a main fieldChanged function
function fieldChanged_main(stType, stName, intLineNo) {

    fieldChanged_validateList(stType, stName, intLineNo);

    // 1.10 Pagination: 
    fieldChanged_switchPage(stType, stName, intLineNo);

    // 1.10 Pagination: On check/uncheck of boxes
    fieldChanged_checkUncheckLine(stType, stName, intLineNo);

}

/**
 * 1.10 | Pagination: If page no and page size is changed
 * @param sublist
 * @param field
 * @param line
 */
function fieldChanged_switchPage(sublist, field, line) {
    // Page No or Page Size
    if (field == 'custpage_pageno' || field == 'custpage_pagesize') {
        filter_list();
    }
}

/**
 * If line check boxes are either checked or unchecked
 * @param stType
 * @param stName
 * @param intLineNo
 */
function fieldChanged_checkUncheckLine(stType, stName, intLineNo) {
    // if (stName == 'custpage_tr_cb')
    // {
    //  PaginationClient.updateData({
    //    sublist : 'custpage_pm_review',
    //    fieldId : 'custpage_id',
    //    fldCheckbox : 'custpage_tr_cb',
    //    line : intLineNo
    //  });
    // }  

}

/**
 * Filters
 */
function filter_list() {
    try {
        var stSelectedRecords = getSelectedRecord();

        //Getters
        var stProject = nlapiGetFieldValue('custpage_project_hd');
        var stLocation = nlapiGetFieldValue('custpage_location_hd');
        var stSubsidiary = nlapiGetFieldValue('custpage_subsidiary_hd');
        var stEmployee = nlapiGetFieldValue('custpage_employee_hd');
        var stToDate = nlapiGetFieldValue('custpage_todate_hd');
        var stFromDate = nlapiGetFieldValue('custpage_fromdate_hd');
        var stProjMgr = nlapiGetFieldValue('custpage_projmgr_hd');
        var stStatus = nlapiGetFieldValue('custpage_status_hd');
        var stProjTask = nlapiGetFieldValue('custpage_projtask_hd');
        var stProjType = nlapiGetFieldValue('custpage_projtype_hd');

        //Filter Validation
        if (PM.Eval.isEmpty(stProject)) {
            alert('Please select a project.');
            return;
        }

        //Call the suitelet
        var stUrl = nlapiResolveURL('SUITELET', 'customscript_sl_review_time', 'customdeploy_sl_review_time');
        stUrl += '&custpage_action=' + 'FILTER';
        stUrl += '&custpage_project_hd=' + stProject;
        stUrl += '&custpage_location_hd=' + stLocation;
        stUrl += '&custpage_subsidiary_hd=' + stSubsidiary;
        stUrl += '&custpage_employee_hd=' + stEmployee;
        stUrl += '&custpage_todate_hd=' + stToDate;
        stUrl += '&custpage_fromdate_hd=' + stFromDate;
        stUrl += '&custpage_projmgr_hd=' + stProjMgr;
        stUrl += '&custpage_status_hd=' + stStatus;
        stUrl += '&custpage_projtask_hd=' + stProjTask;
        stUrl += '&custpage_projtype_hd=' + stProjType;

        // 1.10 | Pagination: Update cache data before switching to other page
        // var cacheId = PaginationClient.createOrUpdateCache({
        //  cache : nlapiGetFieldValue(Pagination.PREFIX + Pagination.FIELD_CACHE),
        //  scriptName : 'customscript_sc_review_time'
        // });

        // 1.10 | Pagination: Generate pagination URL parameters
        // stUrl += PaginationClient.getURLParams({ 
        //  cacheId : cacheId 
        // });

        /* -- 1.20 -- */
        var pageno = nlapiGetFieldValue('custpage_pageno');
        var pagesize = nlapiGetFieldValue('custpage_pagesize');

        if (pageno) stUrl += '&pageno=' + pageno;
        if (pagesize) stUrl += '&pagesize=' + pagesize;
        if (stSelectedRecords) stUrl += '&selected_records=' + encodeURIComponent(stSelectedRecords);
        /* -- End 1.20 -- */

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
 * Page Init
 */
function pageinit_setDefaultVal() {
    try {
        // Pagination: Store page data
        // PaginationClient.initData({
        //  sublist : 'custpage_pm_review',
        //  fieldId : 'custpage_id',
        //  fldCheckbox : 'custpage_tr_cb'
        // });


        //alert('ARR_INIT_DATA:' + PaginationClient.ARR_INIT_DATA);

        OBJ_STATUS._hardapproved = nlapiGetFieldValue('custpage_hardapproved');
        OBJ_STATUS._unapproved = nlapiGetFieldValue('custpage_unapproved');

        //Set Project Type
        var stProjectId = nlapiGetFieldValue('custpage_project_hd');

        if (!PM.Eval.isEmpty(stProjectId)) {
            var stProjectType = nlapiLookupField('job', stProjectId, 'type');
            nlapiSetFieldValue('custpage_projtype_hd', stProjectType);

            //Set Project Tasks
            var arrTasks = searchTimeTasks(stProjectId);

            if (!PM.Eval.isEmpty(arrTasks)) {
                nlapiRemoveSelectOption('custpage_projtask_hd');
                nlapiInsertSelectOption('custpage_projtask_hd', '', '', true);
                nlapiInsertSelectOption('custpage_projtask_hd', '@NONE@', ' - NONE -', false);

                for (var intTaskCtr = 0; intTaskCtr < arrTasks.length; intTaskCtr++) {
                    var stVal = arrTasks[intTaskCtr].getValue('internalid');
                    var stValName = arrTasks[intTaskCtr].getValue('title');
                    nlapiInsertSelectOption('custpage_projtask_hd', stVal, stValName, false);
                }
            }
            var projectTaskToSet = getParameterFromURL('custpage_projtask_hd');
            if (!isEmpty(projectTaskToSet)) {
                nlapiSetFieldValue('custpage_projtask_hd', projectTaskToSet);
            }
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

}

/**
 * Field Change - field validations
 * @param stType
 * @param stName
 * @param intLineNo
 */
function fieldChanged_validateList(stType, stName, intLineNo) {
    try {
        var stParamProjType = CONTEXT.getSetting('SCRIPT', 'custscript_tm_project');
        var stParamPMRole = CONTEXT.getSetting('SCRIPT', 'custscript_apco_role_pm');

        if (stName == 'custpage_project_hd') {
            //Set Project Type
            var stProjectId = nlapiGetFieldValue(stName);
            var objProj = nlapiLookupField('job', stProjectId, ['type', 'custentity_apco_proj_mgr']);

            if (PM.Eval.isEmpty(objProj)) {
                alert("Project is not allowed");
                nlapiSetFieldValue(stName, '', false);
                return false;
            }

            var stProjectType = objProj.type;
            var stProjectMgr = objProj.custentity_apco_proj_mgr;

            var stUser = nlapiGetUser();
            var stUserRole = nlapiGetRole();

            if (stUserRole == stParamPMRole && stUser != stProjectMgr) {
                alert("Project is not allowed");
                nlapiSetFieldValue(stName, '', false);
                return false;
            }

            //Set Project Tasks
            var arrTasks = searchTimeTasks(stProjectId);

            if (!PM.Eval.isEmpty(arrTasks)) {
                nlapiRemoveSelectOption('custpage_projtask_hd');
                nlapiInsertSelectOption('custpage_projtask_hd', '', '', true);
                nlapiInsertSelectOption('custpage_projtask_hd', '@NONE@', ' - NONE -', false);

                for (var intTaskCtr = 0; intTaskCtr < arrTasks.length; intTaskCtr++) {
                    var stVal = arrTasks[intTaskCtr].getValue('internalid');
                    var stValName = arrTasks[intTaskCtr].getValue('title');
                    nlapiInsertSelectOption('custpage_projtask_hd', stVal, stValName, false);
                }
            }

            nlapiSetFieldValue('custpage_projtype_hd', stProjectType);
        }

        // Sublist
        if (stType == 'custpage_pm_review') {

            //Copy hours
            if (stName == 'custpage_tr_cb') {
                var stChecked = nlapiGetLineItemValue(stType, stName, intLineNo);
                var stHours = '';
                if (stChecked == 'T') {
                    stHours = nlapiGetLineItemValue(stType, 'custpage_hours', intLineNo);
                }
                nlapiSetLineItemValue(stType, 'custpage_tr_hours', intLineNo, stHours);
            }

            //Get status
            var stStatus = nlapiGetLineItemValue(stType, 'custpage_statusid', intLineNo);
            var stProjectType = nlapiGetFieldValue('custpage_projtype_hd');

            //Retainer
            if (stParamProjType != stProjectType) {
                switch (stStatus) {
                    case '':
                    case OBJ_STATUS._unapproved:
                        //Unapproved time does not allow any actions
                        nlapiSetLineItemValue(stType, 'custpage_wo_cb', intLineNo, 'F');
                        nlapiSetLineItemValue(stType, 'custpage_tr_cb', intLineNo, 'F');
                        nlapiSetLineItemValue(stType, 'custpage_ho_cb', intLineNo, 'F');
                        nlapiSetLineItemValue(stType, 'custpage_rt_cb', intLineNo, 'F');
                        nlapiSetLineItemValue(stType, 'custpage_wo_hours', intLineNo, '');
                        nlapiSetLineItemValue(stType, 'custpage_tr_projto', intLineNo, '');
                        nlapiSetLineItemValue(stType, 'custpage_tr_projtask', intLineNo, '');
                        nlapiSetLineItemValue(stType, 'custpage_tr_hours', intLineNo, '');
                        nlapiSetLineItemValue(stType, 'custpage_ho_exp', intLineNo, '');
                        nlapiSetLineItemValue(stType, 'custpage_rt_exp', intLineNo, '');
                        alert('Timesheet is unapproved. Changing this line is not allowed. Employee must update their time manually.');
                        return false;
                    //          case OBJ_STATUS._hardapproved:
                    //            //Hard approved time cannot be rejected. 
                    //            if (stName == 'custpage_rt_cb' || stName == 'custpage_rt_exp')
                    //            {
                    //              nlapiSetLineItemValue(stType, stName, intLineNo, '');
                    //              alert('Timesheet is hard approved. Changing this field is not allowed.');
                    //              return false;
                    //            }
                    //            break;
                    default:
                }
            }

        }

        //Validate Group Fields
        var bIsGrpCorrect = validateGroupFields(stType, stName, intLineNo);
        if (!bIsGrpCorrect) {
            nlapiSetLineItemValue(stType, stName, intLineNo, '');
            alert('Entry not allowed. You can only do one of the following per line: Writeoff or Transfer');
            return false;
        }

        var bIsTimeCorrect = validateTime(stType, stName, intLineNo);
        if (!bIsTimeCorrect) {
            nlapiSetLineItemValue(stType, stName, intLineNo, '');
            alert('Hours entered should be less than or equal the current timesheet');
            return false;
        }

        if (stName == 'custpage_projtask_btn') {
            var stChecked = nlapiGetCurrentLineItemValue('custpage_pm_review', stName);

            if (stChecked == 'T') {
                var stIndex = nlapiGetCurrentLineItemIndex('custpage_pm_review');
                var stJobNo = nlapiGetCurrentLineItemValue('custpage_pm_review', 'custpage_tr_projto');

                if (!PM.Eval.isEmpty(stJobNo)) {
                    //Create URL
                    var stUrl = nlapiResolveURL('SUITELET', 'customscript_sl_review_time_popup', 'customdeploy_sl_review_time_popup');
                    stUrl += '&custpage_action=popup';
                    stUrl += '&custpage_line_no=' + stIndex;
                    stUrl += '&custpage_job=' + stJobNo;

                    //Open window
                    window.open(stUrl, 'PopUp', 'scrollbars=yes,width=500,height=300,dialog=yes,resizable=no,minimizable=no,maximizable=no,toolbar=no,location=no,status=no,menubar=no');
                }
                else {
                    alert('You need to select Project first.');
                    return false;
                }
            }
            else {
                nlapiSetCurrentLineItemValue('custpage_pm_review', 'custpage_tr_projtask', '');
            }

        }

        if (stName == 'custpage_tr_projto') {
            nlapiSetCurrentLineItemValue('custpage_pm_review', 'custpage_projtask_btn', 'F');
        }


        return true;
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
 * Validate Group Fields
 * @param stType
 * @param stName
 * @param intLineNo
 * @returns bIsGrpCorrect
 */
function validateGroupFields(stType, stName, intLineNo) {
    var bIsGrpCorrect = true;
    var stGrp = stName.substring(stName.indexOf('_') + 1, stName.lastIndexOf('_'));

    if (stName == 'custpage_projtask_btn') {
        return bIsGrpCorrect;
    }

    var arrFldVal = [];
    if (OBJ_GRP._wo != stGrp) {
        setFldValArr(arrFldVal, stType, 'custpage_wo_cb', intLineNo);
        setFldValArr(arrFldVal, stType, 'custpage_wo_hours', intLineNo);
    }

    if (OBJ_GRP._tr != stGrp) {
        setFldValArr(arrFldVal, stType, 'custpage_tr_cb', intLineNo);
        setFldValArr(arrFldVal, stType, 'custpage_tr_projto', intLineNo);
        setFldValArr(arrFldVal, stType, 'custpage_tr_projtask', intLineNo);
        setFldValArr(arrFldVal, stType, 'custpage_tr_hours', intLineNo);
    }


    //  if (OBJ_GRP._ho != stGrp)
    //  {
    //    setFldValArr(arrFldVal, stType, 'custpage_ho_cb', intLineNo);
    //    setFldValArr(arrFldVal, stType, 'custpage_ho_exp', intLineNo);
    //  }
    //
    //  if (OBJ_GRP._rt != stGrp)
    //  {
    //    setFldValArr(arrFldVal, stType, 'custpage_rt_cb', intLineNo);
    //    setFldValArr(arrFldVal, stType, 'custpage_rt_exp', intLineNo);
    //  }

    if (arrFldVal.length > 0) {
        bIsGrpCorrect = false;
    }

    return bIsGrpCorrect;
}



function isEmpty(stValue) {
    if ((stValue == null) || (stValue == '') || (stValue == undefined) || stValue == []) {
        return true;
    } else {
        return false;
    }
}

/**
 * Set Field Value on Array
 * @param stType
 * @param stName
 * @param intLineNo
 */
function setFldValArr(arrFldVal, stType, stFld, intLineNo) {

    var stVal = nlapiGetLineItemValue(stType, stFld, intLineNo);
    if (!PM.Eval.isEmpty(stVal) && stVal != 'F') {
        arrFldVal.push(stVal);
    }

}

/**
 * Validate Time
 * @param stType
 * @param stName
 * @param intLineNo
 */
function validateTime(stType, stName, intLineNo) {
    var bIsTimeCorrect = true;

    var flHrsTS = PM.Parse.forceFloat(nlapiGetLineItemValue(stType, 'custpage_hours', intLineNo));
    if (stName == 'custpage_wo_hours' || stName == 'custpage_tr_hours') {
        var flHrsSL = PM.Parse.forceFloat(nlapiGetLineItemValue(stType, stName, intLineNo));
        //Check if Negative or equal or less than timesheet hours
        if (flHrsSL < 0 || flHrsTS < flHrsSL) {
            bIsTimeCorrect = false;
        }
    }

    return bIsTimeCorrect;
}

/**
 * Validate Mandatory Fields
 */
function saveRecord_validateMandatory() {
    var arrRT = [];
    var arrTransfer = [];
    var stListType = 'custpage_pm_review';
    var intTotalLines = nlapiGetLineItemCount(stListType);

    //Loop Lines
    for (var intLineCtr = 0; intLineCtr < intTotalLines; intLineCtr++) {
        //Getters
        var stId = nlapiGetLineItemValue(stListType, 'custpage_id', intLineCtr);
        var stRTcb = nlapiGetLineItemValue(stListType, 'custpage_rt_cb', intLineCtr);
        var stRTexp = nlapiGetLineItemValue(stListType, 'custpage_rt_exp', intLineCtr);

        var stTransferCB = nlapiGetLineItemValue(stListType, 'custpage_tr_cb', intLineCtr);
        var stTransferPT = nlapiGetLineItemValue(stListType, 'custpage_tr_projtask', intLineCtr);
        var stTransferProj = nlapiGetLineItemValue(stListType, 'custpage_tr_projto', intLineCtr);

        //Rejection validation
        if (stRTcb == 'T' && PM.Eval.isEmpty(stRTexp)) {
            arrRT.push(stId);
        }

        //Rejection validation
        if (stTransferCB == 'T' && (PM.Eval.isEmpty(stTransferPT) || PM.Eval.isEmpty(stTransferProj))) {
            arrTransfer.push(stId);
        }
    }

    //Rejection reason should be mandatory.
    if (!PM.Eval.isEmpty(arrRT)) {
        alert('Rejection reason mandatory for timesheet # ' + arrRT);
        return false;
    }

    //Rejection reason should be mandatory.
    if (!PM.Eval.isEmpty(arrTransfer)) {
        alert('Trasfer Project or Project Task mandatory for timesheet # ' + arrTransfer);
        return false;
    }

    //1.20
    getSelectedRecord();

    return true;
}

/**
 * Search for all timesheet Tasks
 * @param stTaskSavedSearch
 * @returns arrResults - search result of the saved search executed against transaction
 */
function searchTimeTasks(stProjectId) {
    //Filters
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('project', null, 'anyof', stProjectId));

    //Columns
    var arrColumns = [];
    arrColumns.push(new nlobjSearchColumn('internalid')); //Internal Id
    arrColumns.push(new nlobjSearchColumn('title')); //Job Type

    var arrResults = nlapiSearchRecord('projecttask', null, arrFilters, arrColumns);
    if (PM.Eval.isEmpty(arrResults)) {
        arrResults = [];
    }

    return arrResults;
}

function getParameterFromURL(param) {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == param) {
            return decodeURIComponent(pair[1]);
        }
    }
    return (false);
}

function getSelectedRecord() {
    //Get selected records
    var stSelectedRecords = nlapiGetFieldValue('custpage_selectedrecords');

    var arrSelectedRecords = [];

    //convert to array/object
    if (!NSUtil.isEmpty(stSelectedRecords)) arrSelectedRecords = JSON.parse(stSelectedRecords);

    //Initialize
    var arrWriteOff = [];
    var arrTransfer = [];
    var arrHold = [];
    var arrReject = [];
    var stListType = 'custpage_pm_review';
    var stProjType = nlapiGetFieldValue('custpage_projtype_hd');

    //count sublist
    var intCountSublist = nlapiGetLineItemCount('custpage_pm_review');

    //get each records in sublist
    for (var n = 1; n <= intCountSublist; n++) {
        var stId = nlapiGetLineItemValue(stListType, 'custpage_id', n);
        var stWOChecked = nlapiGetLineItemValue(stListType, 'custpage_wo_cb', n);
        var stWOHrs = nlapiGetLineItemValue(stListType, 'custpage_wo_hours', n);
        var stTRChecked = nlapiGetLineItemValue(stListType, 'custpage_tr_cb', n);
        var stTRProjTo = nlapiGetLineItemValue(stListType, 'custpage_tr_projto', n);
        var stTRProjTask = nlapiGetLineItemValue(stListType, 'custpage_tr_projtask', n);
        var stTRHours = nlapiGetLineItemValue(stListType, 'custpage_tr_hours', n);

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

            //join data
            arrSelectedRecords.push(objItem);
        }
        else if (stTRChecked == 'F') {
            removeElementFromArr(arrSelectedRecords, stId);
        }

    }

    //remove duplicate records
    arrSelectedRecords = removeDuplicateFromArr(arrSelectedRecords);

    //convert to string
    var stSelectedRecordsUpdated = JSON.stringify(arrSelectedRecords);

    //set to custom field
    nlapiSetFieldValue('custpage_selectedrecords', stSelectedRecordsUpdated);

    //return
    return stSelectedRecordsUpdated;

}

var PM = {};
PM.Eval = {};

/*
PM.Eval =
{
  
  isEmpty : function(stValue)
  {
    if ((stValue == '') || (stValue == null) || (stValue == undefined))
    {
      return true;
    }
    else
    {
      if (stValue instanceof String)
      {
        if ((stValue == ''))
        {
          return true;
        }
      }
      else if (stValue instanceof Array)
      {
        if (stValue.length == 0)
        {
          return true;
        }
      }

      return false;
    }
  },
};

*/


PM.Eval.isEmpty = function (stValue) {
    return ((stValue === '' || stValue == null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function (
        v) {
        for (var k in v)
            return false;
        return true;
    })(stValue)));
};

PM.Parse =
    {
        /**
         * Converts String to Float
         * 
         * @author asinsin
         */
        forceFloat: function (stValue) {
            var flValue = parseFloat(stValue);

            if (isNaN(flValue)) {
                return 0.00;
            }

            return flValue;
        },
    };

/** ----  v1.20 | PAGINATION ---- **/
removeElementFromArr = function (arr, val) {

    var ctr = 0;
    for (var key in arr) {
        if (arr[key].stId == val) {
            arr.splice(ctr, 1);
        }

        ctr++;
    }

    return arr;

};

removeDuplicateFromArr = function (arr) {
    var arrIds = [];

    var arrData = [];

    for (var key in arr) {
        //get id from object
        var stId = arr[key].stId;

        if (!NSUtil.inArray(stId, arrIds)) {
            //push array
            arrIds.push(stId);

            arrData.push(arr[key]);

        }

    }

    return arrData;
}



var NSUtil = (typeof NSUtil === 'undefined') ? {} : NSUtil;

NSUtil.inArray = function (stValue, arrValue) {
    var bIsValueFound = false;
    for (var i = arrValue.length - 1; i >= 0; i--) {
        if (stValue == arrValue[i]) {
            bIsValueFound = true;
            break;
        }
    }
    return bIsValueFound;
};

NSUtil.isEmpty = function (stValue) {
    return ((stValue === '' || stValue == null || stValue == undefined) || (stValue.constructor === Array && stValue.length == 0) || (stValue.constructor === Object && (function (v) {
        for (var k in v)
            return false;
        return true;
    })(stValue)));
};

NSUtil.removeDuplicate = function (arrValue) {
    if ((arrValue === '') //Strict checking for this part to properly evaluate integer value.
        || (arrValue == null) || (arrValue == undefined)) {
        return arrValue;
    }

    var arrNewValue = new Array();

    o: for (var i = 0, n = arrValue.length; i < n; i++) {
        for (var x = 0, y = arrNewValue.length; x < y; x++) {
            if (arrNewValue[x] == arrValue[i]) {
                continue o;
            }
        }

        arrNewValue[arrNewValue.length] = arrValue[i];
    }

    return arrNewValue;
};
/** ---- End | v1.20 | PAGINATION ---- **/