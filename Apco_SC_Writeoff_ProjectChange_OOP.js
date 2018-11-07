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
 * TDD 8: Write-off or Project Change for OOP Cost
 * 
 * Version    	Date            	Author              Remarks
 * 1.10         05/23/2016          mjpascual           Initial
 */

var CONTEXT = nlapiGetContext();

var OBJ_VBER = {};
var OBJ_PROCESS = {};
var ARR_ERROR_DETAILS = [];
var ST_POST_PD = '';
var STATUS =
{
    '_appr_vb': '',
    '_appr_er': ''
};

var INT_USAGE_LIMIT_THRESHOLD = 500;
var INT_START_TIME = new Date().getTime();

/**
 * TDD 8: Write-off or Project Change for OOP Cost
 * @param type
 */
function scheduled_writeOffProjectChange(type) {
    try {
        var stLogTitle = 'scheduled_writeOffProjectChange';
        nlapiLogExecution('DEBUG', stLogTitle, '>> Entry Log <<');

        //Get script paramaters 
        var stVBERSavedSearch = CONTEXT.getSetting('SCRIPT', 'custscript_apco_sc_vber_search');
        var stAdjustmentVendor = CONTEXT.getSetting('SCRIPT', 'custscript_vber_adj_vendor');
        var stAjustmentEmployee = CONTEXT.getSetting('SCRIPT', 'custscript_vber_adj_emp');
        var stDefaultWriteOffCat = CONTEXT.getSetting('SCRIPT', 'custscript_vber_writeoff_cat');
        var objWriteOff = CONTEXT.getSetting('SCRIPT', 'custscript_vber_writeoff');
        var objMove = CONTEXT.getSetting('SCRIPT', 'custscript_vber_move');
        STATUS._appr_vb = CONTEXT.getSetting('SCRIPT', 'custscript_appr_status_vb');
        STATUS._appr_er = CONTEXT.getSetting('SCRIPT', 'custscript_appr_status_er');
        ST_POST_PD = CONTEXT.getSetting('SCRIPT', 'custscript_apco_acct_period');

        // Throw error if any script parameter is empty
        if (Eval.isEmpty(stVBERSavedSearch) || Eval.isEmpty(stAdjustmentVendor) || Eval.isEmpty(stAjustmentEmployee) || Eval.isEmpty(stDefaultWriteOffCat)
				 || Eval.isEmpty(STATUS._appr_vb) || Eval.isEmpty(STATUS._appr_er)) {
            throw nlapiCreateError('EMPTY_SCRIPT_PARAMETER', 'Script Parameters should not be empty.');
        }

        var arrWriteOff = JSON.parse(objWriteOff);
        var arrMove = JSON.parse(objMove);

        nlapiLogExecution('DEBUG', stLogTitle, 'arrWriteOff = ' + arrWriteOff + ' | arrMove =' + arrMove);

        var arrObj = arrWriteOff.concat(arrMove);

        if (Eval.isEmpty(arrObj)) {
            nlapiLogExecution('DEBUG', stLogTitle, 'No records to process');
            return;
        }

        var intObjCount = getVBERDetails(arrObj, stVBERSavedSearch);

        if (intObjCount == 0) {
            nlapiLogExecution('DEBUG', stLogTitle, 'No search result found');
            return;
        }

        if (!Eval.isEmpty(arrMove)) {
            processMove(arrMove, stAdjustmentVendor, stAjustmentEmployee);
        }

        updateLineFlags();

        sendEmail();

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
 * Get VB or ER details
 * @param arrObj
 * @param stVBERSavedSearch
 * @returns intCountObj
 */
function getVBERDetails(arrObj, stVBERSavedSearch) {
    var stLogTitle = 'scheduled_writeOffProjectChange.getVBERDetails';
    nlapiLogExecution('DEBUG', stLogTitle, 'Enter getVBERDetails');

    var arrIds = [];
    for (var intCtr = 0; intCtr < arrObj.length; intCtr++) {
        var objItem = arrObj[intCtr];

        if (!Eval.inArray(objItem.stId, arrIds)) {
            arrIds.push(objItem.stId);
        }

    }

    nlapiLogExecution('DEBUG', stLogTitle, 'arrIds =' + arrIds);

    var arrVBERSearchResult = searchVBERList(arrIds, stVBERSavedSearch);
    var intCountObj = 0;
    for (var intVBERCtr = 0; intVBERCtr < arrVBERSearchResult.length; intVBERCtr++) {
        var stId = arrVBERSearchResult[intVBERCtr].getValue('internalid');
        var stLineId = arrVBERSearchResult[intVBERCtr].getValue('line');

        var stKey = stId + '-' + stLineId;
        if (Eval.isEmpty(OBJ_VBER[stKey])) {
            OBJ_VBER[stKey] = {};
            OBJ_VBER[stKey].stId = stId; //Id
            OBJ_VBER[stKey].stLineId = stLineId; //Line Id
            OBJ_VBER[stKey].stProject = arrVBERSearchResult[intVBERCtr].getValue('altname', 'customer'); //Project
            OBJ_VBER[stKey].stProject = arrVBERSearchResult[intVBERCtr].getValue('entitynumber', 'customer'); //Project
            OBJ_VBER[stKey].stProjectId = arrVBERSearchResult[intVBERCtr].getValue('internalid', 'customer'); //Project Id
            OBJ_VBER[stKey].stProjectSub = arrVBERSearchResult[intVBERCtr].getValue('subsidiary', 'customer'); //Project Sub
            OBJ_VBER[stKey].stDate = arrVBERSearchResult[intVBERCtr].getValue('trandate'); //Date
            OBJ_VBER[stKey].stType = arrVBERSearchResult[intVBERCtr].getValue('type'); //Type
            OBJ_VBER[stKey].stEmpVen = arrVBERSearchResult[intVBERCtr].getValue('mainname'); //Employee or Vendor Id
            OBJ_VBER[stKey].stEmpVenName = arrVBERSearchResult[intVBERCtr].getText('mainname'); //Employee or Vendor Name
            OBJ_VBER[stKey].stEmpId = arrVBERSearchResult[intVBERCtr].getValue('internalid', 'employee'); //Employee Id
            OBJ_VBER[stKey].stVenId = arrVBERSearchResult[intVBERCtr].getValue('internalid', 'vendor'); //Vendor Id
            OBJ_VBER[stKey].stEmpSub = arrVBERSearchResult[intVBERCtr].getValue('subsidiary', 'employee'); //Employee Subsidiary
            OBJ_VBER[stKey].stVenSub = arrVBERSearchResult[intVBERCtr].getValue('subsidiary', 'vendor'); //Vendor Subsidiary
            OBJ_VBER[stKey].stDocNo = arrVBERSearchResult[intVBERCtr].getValue('tranid'); //Doc No
            OBJ_VBER[stKey].stItem = arrVBERSearchResult[intVBERCtr].getValue('item'); //Item
            OBJ_VBER[stKey].stItemTrans = arrVBERSearchResult[intVBERCtr].getValue('custcol_apco_item_on_trans'); //Item on Trans
            OBJ_VBER[stKey].stExpCat = arrVBERSearchResult[intVBERCtr].getValue('expensecategory'); //Expense Category
            OBJ_VBER[stKey].stAmt = arrVBERSearchResult[intVBERCtr].getValue('formulacurrency'); //Amount
            OBJ_VBER[stKey].stBillable = arrVBERSearchResult[intVBERCtr].getValue('custentity_apco_billable_box', 'customer'); //Billable
            OBJ_VBER[stKey].stDepartment = arrVBERSearchResult[intVBERCtr].getValue('internalid', 'department'); //Department
            OBJ_VBER[stKey].stLocation = arrVBERSearchResult[intVBERCtr].getValue('location'); //Location
            OBJ_VBER[stKey].stWOAcct = arrVBERSearchResult[intVBERCtr].getValue('custitem_apco_writeoff_nonbillable_exp', 'item'); //Writeoff acct
            OBJ_VBER[stKey].stExpAcct = arrVBERSearchResult[intVBERCtr].getValue('expenseaccount', 'item'); //Expense Acct
            OBJ_VBER[stKey].stRefNo = arrVBERSearchResult[intVBERCtr].getValue('refnumber'); //Ref. #
            OBJ_VBER[stKey].stCurr = arrVBERSearchResult[intVBERCtr].getValue('currency'); //Currency
            OBJ_VBER[stKey].stTranId = arrVBERSearchResult[intVBERCtr].getValue('transactionnumber'); //Tran Id
            intCountObj++;
        }
    }

    nlapiLogExecution('DEBUG', stLogTitle, 'OBJ_VBER =' + JSON.stringify(OBJ_VBER));

    return intCountObj;
}

/**
 * Process Writeoff
 * @param arrWriteOff
 * @param stAjustmentEmployee
 * @param stDefaultWriteOffCat
 */
function processWriteOff(arrWriteOff, stAdjustmentVendor, stAjustmentEmployee, stDefaultWriteOffCat) {
    var stLogTitle = 'scheduled_writeOffProjectChange.processWriteOff';
    nlapiLogExecution('DEBUG', stLogTitle, 'Enter processWriteOff');

    for (var intCtr = 0; intCtr < arrWriteOff.length; intCtr++) {

        var objItem = arrWriteOff[intCtr];
        nlapiLogExecution('DEBUG', stLogTitle, 'objItem = ' + JSON.stringify(objItem));

        var stKey = objItem.stId + '-' + objItem.stLineId;
        nlapiLogExecution('DEBUG', stLogTitle, 'stKey = ' + stKey);

        var objTran = OBJ_VBER[stKey];
        nlapiLogExecution('DEBUG', stLogTitle, 'objTran = ' + JSON.stringify(objTran));

        if (Eval.isEmpty(OBJ_VBER[stKey])) {
            nlapiLogExecution('ERROR', stLogTitle, 'ER-9999: Writeoff failed for transaction # ' + objItem.stId + ' : Invalid JSON');
            ARR_ERROR_DETAILS.push('ER-9999: Writeoff failed for failed for transaction # ' + objItem.stId + ' : Invalid JSON');
            continue;
        }

        var stRecType = '';
        var stTranType = objTran.stType;
        var flAmt = Parse.forceFloat(objItem.stWOAmt);
        try {
            if (stTranType == 'VendBill') {
                //Create a vendor bill
                createVB_writeoff(objTran, flAmt, stAdjustmentVendor);
                stRecType = 'vendorbill';
            }
            else if (stTranType == 'ExpRept') {
                //Create an expense report
                createER_writeoff(objTran, flAmt, stAjustmentEmployee, stDefaultWriteOffCat);
                stRecType = 'expensereport';
            }
            else {
                throw 'Record Type not supported.';
            }

            //Update Flag
            if (Eval.isEmpty(OBJ_PROCESS[objItem.stId])) {
                OBJ_PROCESS[objItem.stId] = {};
                OBJ_PROCESS[objItem.stId].stType = stRecType;
                OBJ_PROCESS[objItem.stId].arrProcess = [];
            }

            OBJ_PROCESS[objItem.stId].arrProcess.push(objTran.stLineId);

        }
        catch (err) {
            nlapiLogExecution('ERROR', stLogTitle, 'ER-0001: Writeoff failed for ' + stTranType + ' # ' + objItem.stId + ' | ' + err.getCode() + ' : ' + err.getDetails());
            ARR_ERROR_DETAILS.push('ER-0001: Writeoff failed for ' + stTranType + ' # ' + objItem.stId + ' | ' + err.getCode() + ' : ' + err.getDetails());
        }

        //Monitor usage unit / time run
        INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);
    }

    nlapiLogExecution('DEBUG', stLogTitle, 'OBJ_PROCESS ' + JSON.stringify(OBJ_PROCESS));

}

/**
 * Process Move
 * @param arrMove
 * @param stAdjustmentVendor
 * @param stAjustmentEmployee
 */
function processMove(arrMove, stAdjustmentVendor, stAjustmentEmployee) {
    var stLogTitle = 'scheduled_writeOffProjectChange.processMove';
    nlapiLogExecution('DEBUG', stLogTitle, 'Enter processMove');

    for (var intCtr = 0; intCtr < arrMove.length; intCtr++) {

        var objItem = arrMove[intCtr];
        nlapiLogExecution('DEBUG', stLogTitle, 'objItem = ' + JSON.stringify(objItem));

        var stKey = objItem.stId + '-' + objItem.stLineId;
        nlapiLogExecution('DEBUG', stLogTitle, 'stKey = ' + stKey);

        var objTran = OBJ_VBER[stKey];
        nlapiLogExecution('DEBUG', stLogTitle, 'objTran = ' + JSON.stringify(objTran));

        if (Eval.isEmpty(OBJ_VBER[stKey])) {
            nlapiLogExecution('ERROR', stLogTitle, 'ER-9999: Process Move failed for transaction # ' + objItem.stId + ' : Invalid JSON');
            ARR_ERROR_DETAILS.push('ER-9999: Process Move failed for failed for transaction # ' + objItem.stId + ' : Invalid JSON');
            continue;
        }

        var stTranType = objTran.stType;
        var stRecType = '';
        var stTypeCode = '';
        try {
            if (stTranType == 'VendBill') {
                stRecType = 'vendorbill';
                stTypeCode = 'VBT';
            }
            else if (stTranType == 'ExpRept') {

                stRecType = 'expensereport';
                stTypeCode = 'ERT';
            }
            else {
                throw 'Record Type not supported.';
            }

            //Create a vendor bill
            createVB_move(objTran, objItem, stAdjustmentVendor, stTypeCode, stRecType);

            //Update Flag
            if (Eval.isEmpty(OBJ_PROCESS[objItem.stId])) {
                OBJ_PROCESS[objItem.stId] = {};
                OBJ_PROCESS[objItem.stId].stType = stRecType;
                OBJ_PROCESS[objItem.stId].arrProcess = [];
            }

            OBJ_PROCESS[objItem.stId].arrProcess.push(objTran.stLineId);

        }
        catch (err) {
            nlapiLogExecution('ERROR', stLogTitle, 'ER-0002: Process Move failed for ' + stTranType + ' # ' + objItem.stId + ' | ' + err.getCode() + ' : ' + err.getDetails());
            ARR_ERROR_DETAILS.push('ER-0002: Process Move failed for ' + stTranType + ' # ' + objItem.stId + ' | ' + err.getCode() + ' : ' + err.getDetails());
        }

        //Monitor usage unit / time run
        INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);
    }

    nlapiLogExecution('DEBUG', stLogTitle, 'OBJ_PROCESS ' + JSON.stringify(OBJ_PROCESS));

}

/**
 * 
 * Create Vendor Bill for Move
 * @param objTran
 * @param objItem
 * @param stAdjustmentVendor
 * @param stTypeCode
 * @param stRecType
 *
 */
function createVB_move(objTran, objItem, stAdjustmentVendor, stTypeCode, stRecType) {
    var stLogTitle = 'scheduled_writeOffProjectChange.createVB_move';
    nlapiLogExecution('DEBUG', stLogTitle, 'Entering createVB_move');

    var flAmt = Parse.forceFloat(objItem.stMVAmt);

    var stEndDate = nlapiLookupField('accountingperiod', ST_POST_PD, 'enddate');
    nlapiLogExecution('DEBUG', stLogTitle, 'stEndDate = ' + stEndDate);

    //Create VB
    var recTran = nlapiCreateRecord('vendorbill',
	{
	    recordmode: 'dynamic'
	});

    var objOldProject = nlapiLookupField('job', objTran.stProjectId, ['subsidiary', 'currency', 'entityid']);

    var stNewProjBillable = 'F';
    var stNewProjSubsidiary = '';

    if (!Eval.isEmpty(objItem.stMVProj)) {
        var objNewProject = nlapiLookupField('job', objItem.stMVProj,
		[
				'custentity_apco_billable_box', 'subsidiary', 'entityid'
		]);

        if (!Eval.isEmpty(objNewProject)) {
            stNewProjBillable = objNewProject.custentity_apco_billable_box;
            stNewProjSubsidiary = objNewProject.subsidiary;
            stNewProjEntity = objNewProject.entityid;
            nlapiLogExecution('DEBUG', stLogTitle, 'objNewProject =' + JSON.stringify(objNewProject));
        }
    }

    recTran.setFieldValue('tranid', stTypeCode + objTran.stTranId);
    recTran.setFieldValue('entity', stAdjustmentVendor);
    recTran.setFieldValue('subsidiary', objOldProject.subsidiary);
    recTran.setFieldValue('currency', objOldProject.currency);
    recTran.setFieldValue('approvalstatus', STATUS._appr_vb);
    recTran.setFieldValue('custbody_apco_writeoff_processed', 'T');
    recTran.setFieldValue('trandate', stEndDate);
    recTran.setFieldValue('postingperiod', ST_POST_PD);

    //First Line
    var objFirstLine = {};
    objFirstLine.customer = objTran.stProjectId;
    objFirstLine.description = 'Transfer to ' + stNewProjEntity;

    var stItem = '';
    if (!Eval.isEmpty(objTran.stItemTrans)) {
        stItem = objTran.stItemTrans;
    }
    else if (!Eval.isEmpty(objTran.stItem)) {
        stItem = objTran.stItem;
    }
    else if (!Eval.isEmpty(objTran.stExpCat)) {
        var stItemCatId = nlapiLookupField('expensecategory', objTran.stExpCat, 'custrecord_apco_item_link');
        if (!Eval.isEmpty(stItemCatId)) {
            stItem = stItemCatId;
        }
    }
    nlapiLogExecution('DEBUG', stLogTitle, 'stItem =' + stItem);

    objFirstLine.isbillable = checkBillable(stItem, objTran.stBillable);

    //Second Line
    var objSecondLine = {};

    if (stNewProjSubsidiary == objOldProject.subsidiary) {
        objSecondLine.customer = objItem.stMVProj;
    }
    else {
        objSecondLine.custcol_apco_ic_project = objItem.stMVProj;
    }

    objSecondLine.isbillable = checkBillable(objItem.stMVItem, stNewProjBillable);
    objSecondLine.description = 'Transfer from ' + objOldProject.entityid;

    //08/05/2016
    if (stRecType == 'vendorbill') {
        objFirstLine.custcol_vendor_trans = objTran.stVenId;
        objSecondLine.custcol_vendor_trans = objTran.stVenId;
    }
        //Expense Report
    else {
        objFirstLine.custcol_apco_employee = objTran.stEmpId;
        objSecondLine.custcol_apco_employee = objTran.stEmpId;
    }

    //Adding Lines
    addLine(recTran, 'item', stItem, Parse.forceNegative(flAmt), objFirstLine);
    nlapiLogExecution('DEBUG', stLogTitle, 'objFirstLine =' + JSON.stringify(objFirstLine));

    addLine(recTran, 'item', objItem.stMVItem, flAmt, objSecondLine);
    nlapiLogExecution('DEBUG', stLogTitle, 'objSecondLine =' + JSON.stringify(objSecondLine));

    //Submit record
    var stId = nlapiSubmitRecord(recTran, false, true);
    nlapiLogExecution('AUDIT', stLogTitle, 'VB created. stId = ' + stId);
}

/**
 * 
 * Check Billable
 * @param stItemId
 * @param stProjBillable
 * @returns stCheck
 */
function checkBillable(stItemId, stProjBillable) {

    var stLogTitle = 'scheduled_writeOffProjectChange.checkBillable';


    // 08/05/2016 - 
    //1.	On Each line on the Adjustment Vendor the first check is the Project.  Is the BOX on the header checked?
    //2.	The item on that line is the OPT OUT Box checked?
    //Condition - #1 is checked  & #2 is NOT Checked RESULT = Billable box on line should be checked
    nlapiLogExecution('DEBUG', stLogTitle, 'stItemId =' + stItemId + ' | stProjBillable =' + stProjBillable);

    var stCheck = 'F';

    if (!Eval.isEmpty(stItemId)) {
        var stItemOptOut = nlapiLookupField('item', stItemId, 'custitem_apco_billable_opt_out');

        nlapiLogExecution('AUDIT', stLogTitle, 'stProjBillable = ' + stProjBillable + ' | stItemOptOut = ' + stItemOptOut);

        if (stProjBillable == 'T' && stItemOptOut != 'T') {
            stCheck = 'T';
        }
    }

    return stCheck;
}

/**
 * 
 * Add Lines
 * @param recTrans
 * @param stItem
 * @param flAmt
 * @param objLine
 *
 */
function addLine(recTrans, stLineType, stItem, flAmt, objLine) {

    recTrans.selectNewLineItem(stLineType);
    recTrans.setCurrentLineItemValue(stLineType, 'category', stItem);
    recTrans.setCurrentLineItemValue(stLineType, 'item', stItem);
    recTrans.setCurrentLineItemValue(stLineType, 'rate', nlapiFormatCurrency(flAmt));
    if (objLine != null) {
        for (var stKeyId in objLine) {
            recTrans.setCurrentLineItemValue(stLineType, stKeyId, objLine[stKeyId]);
        }
    }
    recTrans.commitLineItem(stLineType);

}

/**
 * Update Line Flags
 * @param arrWriteOff
 * @param stAjustmentEmployee
 * @param stDefaultWriteOffCat
 */
function updateLineFlags() {
    var stLogTitle = 'scheduled_writeOffProjectChange.updateLineFlags';
    nlapiLogExecution('DEBUG', stLogTitle, 'Enter updateLineFlags');

    for (var stId in OBJ_PROCESS) {
        var objItem = OBJ_PROCESS[stId];
        var stRecType = objItem.stType;
        var arrLines = objItem.arrProcess;

        try {
            var recObj = nlapiLoadRecord(stRecType, stId);

            var stLine = 'item';
            if (stRecType == 'expensereport') {
                stLine = 'expense';
            }

            //Loop
            var bHasSetLine = false;
            var intLineCount = recObj.getLineItemCount(stLine);
            nlapiLogExecution('DEBUG', stLogTitle, 'intLineCount =' + intLineCount);

            for (var intCtrLine = 1 ; intCtrLine <= intLineCount; intCtrLine++) {
                var stPosition = recObj.getLineItemValue(stLine, 'line', intCtrLine);

                nlapiLogExecution('DEBUG', stLogTitle, 'stLine =' + stLine + ' | stPosition =' + stPosition + ' | arrLines =' + arrLines);

                if (Eval.inArray(stPosition, arrLines)) {
                    bHasSetLine = true;
                    recObj.setLineItemValue(stLine, 'custcol_apco_writeoff_processed', intCtrLine, 'T');
                }
            }

            if (bHasSetLine) {
                var stUpdatedId = nlapiSubmitRecord(recObj, false, true);
                nlapiLogExecution('AUDIT', stLogTitle, 'Record ' + stRecType + ' #' + stUpdatedId + ' updated successfully');
            }
            else {
                throw 'ERROR';
            }
        }
        catch (err) {
            nlapiLogExecution('ERROR', stLogTitle, 'ER-9999: Record ' + stRecType + ' #' + stId + ' failed to update flags on line #' + arrLines + '. Please update manually.');
            ARR_ERROR_DETAILS.push('ER-9999: Record ' + stRecType + ' #' + stId + ' failed to update flags on line #' + arrLines + '. Please update manually.');
        }

        //Monitor usage unit / time run
        INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);
    }



}


/**
*
* Send error status email
* 
*/
function sendEmail() {
    var stLogTitle = 'scheduled_writeOffProjectChange.sendEmail';
    nlapiLogExecution('DEBUG', stLogTitle, 'Enter sendEmail');

    var stUser = nlapiGetUser();
    var stSubject = '[APCO] Write-off or Project Change for OOP Costs';
    var stBody = '';
    stBody += 'Date: ' + new Date() + ' <br/>';
    if (!Eval.isEmpty(ARR_ERROR_DETAILS)) {
        stBody += 'Errors: <br/>';
        for (var intCtr = 0; intCtr < ARR_ERROR_DETAILS.length; intCtr++) {
            stBody += ' - ' + ARR_ERROR_DETAILS[intCtr] + '<br/>';
        }
    }
    else {
        stBody += 'Process Status: Successful.';
    }

    nlapiSendEmail(stUser, stUser, stSubject, stBody);

    nlapiLogExecution('DEBUG', stLogTitle, 'Email Sent.. stUser = ' + stUser);
}

//------------------------------------------------- SEARCH FUNCTIONS -------------------------------------------------

/**
 * Search for all VB and ERs 
 * @param arrIds
 * @param stVBERSavedSearch 
 * @returns arrResults - search result of the saved search executed against transaction
 */
function searchVBERList(arrIds, stVBERSavedSearch) {
    var stLogTitle = 'scheduled_writeOffProjectChange.searchVBERList';
    nlapiLogExecution('DEBUG', stLogTitle, 'stVBERSavedSearch = ' + stVBERSavedSearch + '| arrIds =' + arrIds);

    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('internalid', null, 'anyof', arrIds));

    //Columns
    var arrColumns = [];
    var arrResults = SuiteUtil.search(stVBERSavedSearch, 'transaction', arrFilters, arrColumns);

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

var Parse =
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

    forceNegative: function (stVal) {
        return this.forceFloat(stVal) * (-1);
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

    /**
	 * Pauses the scheduled script either if the remaining usage is less than
	 * the specified governance threshold usage amount or the allowed time is
	 * exceeded. Then it will reschedule it.
	 * 
	 * @param {Number}
	 *            intGovernanceThreshold - The value of the governance threshold
	 *            usage units before the script will be rescheduled.
	 * @param {Number}
	 *            intStartTime - The time when the scheduled script started
	 * @param {Number}
	 *            flPercentOfAllowedTime - the percent of allowed time based
	 *            from the maximum running time. The maximum running time is
	 *            3600000 ms.
	 * @returns void
	 * @memberOf SuiteUtil
	 * @author memeremilla
	 */
    rescheduleScript: function (intGovernanceThreshold, intStartTime, intMaxTime, flPercentOfAllowedTime) {
        var stLoggerTitle = 'SuiteUtil.rescheduleScript';
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
		{
		    'Remaining usage': nlapiGetContext().getRemainingUsage()
		}));

        if (intMaxTime == null) {
            intMaxTime = 3600000;
        }

        var intRemainingUsage = nlapiGetContext().getRemainingUsage();
        var intRequiredTime = 900000; // 25% of max time
        if ((flPercentOfAllowedTime)) {
            var flPercentRequiredTime = 100 - flPercentOfAllowedTime;
            intRequiredTime = intMaxTime * (flPercentRequiredTime / 100);
        }

        // check if there is still enough usage units
        if ((intGovernanceThreshold)) {
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Checking if there is still enough usage units.');

            if (intRemainingUsage < (parseInt(intGovernanceThreshold, 10) + parseInt(20, 10))) {
                nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
				{
				    'Remaining usage': nlapiGetContext().getRemainingUsage()
				}));
                nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

                var objYield = nlapiYieldScript();
                if (objYield.status == 'FAILURE') {
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					{
					    'Status': objYield.status,
					    'Information': objYield.information,
					    'Reason': objYield.reason
					}));
                }
                else {
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					{
					    'After resume with': intRemainingUsage,
					    'Remaining vs governance threshold': intGovernanceThreshold
					}));
                }
            }
        }

        if ((intStartTime)) {
            // get current time
            var intCurrentTime = new Date().getTime();

            // check if elapsed time is near the arbitrary value
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Check if elapsed time is near the arbitrary value.');

            var intElapsedTime = intMaxTime - (intCurrentTime - intStartTime);
            nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Remaining time is ' + intElapsedTime + ' ms.');

            if (intElapsedTime < intRequiredTime) {
                nlapiLogExecution('AUDIT', stLoggerTitle, 'Script State : ' + 'Rescheduling script.');

                // check if we are not reaching the max processing time which is 3600000 seconds
                var objYield = nlapiYieldScript();
                if (objYield.status == 'FAILURE') {
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					{
					    'Status': objYield.status,
					    'Information': objYield.information,
					    'Reason': objYield.reason
					}));
                }
                else {
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Successfully reschedule the script.');
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					{
					    'After resume with': intRemainingUsage,
					    'Remaining vs governance threshold': intGovernanceThreshold
					}));

                    // return new start time        
                    intStartTime = new Date().getTime();
                }
            }
        }

        return intStartTime;
    },
};