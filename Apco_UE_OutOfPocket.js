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
 * Module Description - Out of Pocket Revenue Recognition
 * 
 * Version    	Date            	Author           	Remarks
 * 1.00       	03/17/2016    		mjpascual 			Initial version.
 * 1.10         08/19/2016          mjpascual           Two JEs for T&M
 * 1.11         10/25/2016          mjpascual           Copy Project to IC Project if Subsidiary (ER) != Project Subsidiary
 * 1.12			02/15/2017			jjacob				Setting of department and location on JE for employee subsidiary
 * 
 */

var CONTEXT = nlapiGetContext();

var OBJ_EQ_ITEM = {};
var OBJ_NEQ_ACCT = {};
var OBJ_PROCESS_ITEMS = {};
var OBJ_PROJECT = {};
var ARR_PROJECTS = [];
var ARR_PROJECT_TYPES = [];
var APPR_STATUS = '2';

/**
 * TDD 3: Out of Pocket Revenue Recognition
 * @param type
 */
function afterSubmit_generateJournals(stType) {
    try {
        var stLogTitle = 'afterSubmit_generateJournals';
        nlapiLogExecution('DEBUG', stLogTitle, '>> Entry Log <<');

        var stExecContext = CONTEXT.getExecutionContext();
        nlapiLogExecution('DEBUG', stLogTitle, 'stType = ' + stType + ' | stExecContext =' + stExecContext);

        if (stType == 'delete' || (stExecContext != 'userinterface' && stExecContext != 'scheduled' && stExecContext != 'workflow')) {
            return;
        }

        //Get script parameters
        var stProjTypes = CONTEXT.getSetting('SCRIPT', 'custscript_ge_project_types');
        var stVendorId = CONTEXT.getSetting('SCRIPT', 'custscript_apco_interco_vendor'); // - 6/10/2016
        var stAcceptedProjTypes = CONTEXT.getSetting('SCRIPT', 'custscript_accepted_proj_types'); // - 11/9/2016

        //rf
        var stApprovalStatus = CONTEXT.getSetting('SCRIPT', 'custscript_apco_approval_status'); // - 6/21/2016
        var stApprovalStatusER = CONTEXT.getSetting('SCRIPT', 'custscript_apco_approval_status_er'); // - 6/28/2016

        nlapiLogExecution('DEBUG', stLogTitle, 'stApprovalStatus = ' + stApprovalStatus + ' | stApprovalStatusER =' + stApprovalStatusER);

        OBJ_EQ_ITEM =
		{
		    '_ln_income': CONTEXT.getSetting('SCRIPT', 'custscript_ln_income_item'),
		    '_ln_income_ret': CONTEXT.getSetting('SCRIPT', 'custscript_ln_income_ret_item'),
		    '_ln_revenue': CONTEXT.getSetting('SCRIPT', 'custscript_ln_revenue_item'),
		    '_ln_markup_exp': CONTEXT.getSetting('SCRIPT', 'custscript_ln_markup_exp_item'),
		    '_ln_markup_rev': CONTEXT.getSetting('SCRIPT', 'custscript_ln_markup_rev_item')
		};

        OBJ_NEQ_ACCT =
		{
		    '_vb_suspension_ac': CONTEXT.getSetting('SCRIPT', 'custscript_vb_suspension_ac'),
		    '_vb_interco_item': CONTEXT.getSetting('SCRIPT', 'custscript_vb_interco_item'),
		    '_icje_from_db': CONTEXT.getSetting('SCRIPT', 'custscript_icje_from_db'),
		    '_icje_from_db_ret': CONTEXT.getSetting('SCRIPT', 'custscript_icje_from_db_ret'),
		    '_icje_from_ico_db': CONTEXT.getSetting('SCRIPT', 'custscript_icje_from_ico_db'),
		    '_icje_from_ico_cr': CONTEXT.getSetting('SCRIPT', 'custscript_icje_from_ico_cr'),
		    '_icje_to_cr': CONTEXT.getSetting('SCRIPT', 'custscript_icje_to_cr'),
		    '_icje_mk_to_cr': CONTEXT.getSetting('SCRIPT', 'custscript_icje_mk_to_cr')
		};

        OBJ_JE1 =
		{
		    '_unbilled_exp_markups': CONTEXT.getSetting('SCRIPT', 'custscript_je1_unbilled_exp_markups'),
		    '_intercompany_exp': CONTEXT.getSetting('SCRIPT', 'custscript_je1_intercompany_exp'),
		    '_intercompany_rev': CONTEXT.getSetting('SCRIPT', 'custscript_je1_intercompany_rev')
		};

        OBJ_JE2 =
		{
		    '_rebill_exp_rev': CONTEXT.getSetting('SCRIPT', 'custscript_je2_rebill_exp_rev'),
		    '_markup_exp': CONTEXT.getSetting('SCRIPT', 'custscript_je2_markup_exp')
		};

        //Validate script parameters
        if (Eval.isEmpty(stProjTypes) || Eval.isEmpty(stVendorId) || Eval.isEmpty(stAcceptedProjTypes)) {
            throw nlapiCreateError('EMPTY_SCRIPT_PARAMETER', 'Script Parameters should not be empty.');
        }

        validateScriptParamObj(
		[
		 	OBJ_EQ_ITEM, OBJ_NEQ_ACCT, OBJ_JE1, OBJ_JE2
		]);

        //Load Record
        var stRecType = nlapiGetRecordType();
        var stRecId = nlapiGetRecordId();
        var recTrans = nlapiLoadRecord(stRecType, stRecId);
        nlapiLogExecution('DEBUG', stLogTitle, 'stRecType = ' + stRecType + ' | stRecId = ' + stRecId);

        //If edit, delete the lines with accounts created via script
        if (stType == 'edit') {
            deleteScriptedLines(recTrans);
        }

        //Set items
        setArrToProcessObject('item', recTrans, stRecId, stRecType);
        setArrToProcessObject('expense', recTrans, stRecId, stRecType);
        nlapiLogExecution('DEBUG', stLogTitle, 'OBJ_PROCESS_ITEMS = ' + JSON.stringify(OBJ_PROCESS_ITEMS));

        //Getters
        var stRecApprovalStatus = recTrans.getFieldValue('approvalstatus');
        var stRecApprovalStatusER = recTrans.getFieldValue('status');

        //08/05/2016
        var stTranId = recTrans.getFieldValue('transactionnumber');
        var stOrigVendorId = recTrans.getFieldValue('entity');

        nlapiLogExecution('DEBUG', stLogTitle, 'stRecApprovalStatus = ' + stRecApprovalStatus + ' | stRecApprovalStatusER = ' + stRecApprovalStatusER);

        var stFromSubsidiary = recTrans.getFieldValue('custbody_apco_vb_from_sub');
        var stFromSubsidiaryName = recTrans.getFieldText('custbody_apco_vb_from_sub');

        //rf 06-21 for approved bills only 
        var stToSubsidiary = recTrans.getFieldValue('subsidiary');
        var stToSubName = recTrans.getFieldText('subsidiary');

        //1.11 If the subsidiary (on ER Header) != Project Subsidiary (on ER line), then copy Project to IC Project
        if (stRecType == 'expensereport') {
            nlapiLogExecution('DEBUG', stLogTitle, '1.11 Start');

            var intExCount = recTrans.getLineItemCount('expense');
            nlapiLogExecution('DEBUG', stLogTitle, 'intExCount =' + intExCount);

            for (var intExCtr = 1; intExCtr <= intExCount; intExCtr++) {
                var stProject = recTrans.getLineItemValue('expense', 'customer', intExCtr);
                var stProjectLineSubsidiary = '';
                if (!Eval.isEmpty(OBJ_PROJECT[stProject])) {
                    stProjectLineSubsidiary = OBJ_PROJECT[stProject].stSubsidiary;
                }

                nlapiLogExecution('DEBUG', stLogTitle, 'stToSubsidiary = ' + stToSubsidiary + '  | stProjectLineSubsidiary =' + stProjectLineSubsidiary);

                if (stToSubsidiary != stProjectLineSubsidiary) {
                    recTrans.setLineItemValue('expense', 'custcol_apco_ic_project', intExCtr, stProject);
                    nlapiLogExecution('DEBUG', stLogTitle, 'Setting project in custcol_apco_ic_project');
                }
            }

        }

        //need the original exchange rate to conver to USD.
        var stOrigCurrency = recTrans.getFieldValue('currencysymbol');
        var arr_accepted_proj_type = stAcceptedProjTypes.split(',');
        ARR_PROJECT_TYPES = stProjTypes.split(',');

        //Initialize
        var arrICJE = [];
        var arrVB = [];

        //Process the objects
        for (var stKey in OBJ_PROCESS_ITEMS) {

            //Getters
            var objItem = OBJ_PROCESS_ITEMS[stKey];
            var stProject = objItem.stProject;
            var objProject = OBJ_PROJECT[stProject];

            //If project object is not found, throw an error
            if (Eval.isEmpty(objProject)) {
                throw nlapiCreateError('USER_ERROR', 'Project #' + stProject + 'is not existing.');
            }

            var stJobType = objProject.stJobType;
            nlapiLogExecution('DEBUG', stLogTitle, 'stJobType =' + stJobType + ' | arr_accepted_proj_type =' + arr_accepted_proj_type);
            if (!Eval.inArray(stJobType, arr_accepted_proj_type)) //11/10/2016
            {
                continue;
            }

            //Get Project Subsidiary
            var stProjectSubsidiary = objProject.stSubsidiary;
            var stProjectSubsidiaryName = objProject.stSubsidiaryName;
            var stProjectCurrency = objProject.stCurrency;
            var stProjectSubsidiaryCurrency = objProject.stSubsidiaryCurrency;

            nlapiLogExecution('DEBUG', stLogTitle, 'stToSubsidiary = ' + stToSubsidiary + ' | stProjectSubsidiary = ' + stProjectSubsidiary + ' | stProjectCurrency = ' + stProjectCurrency + ' | stProjectSubsidiaryCurrency =' + stProjectSubsidiaryCurrency);

            //If project subsidiary is equal to record subsidiary
            if (stToSubsidiary == stProjectSubsidiary) {
                nlapiLogExecution('DEBUG', stLogTitle, 'Subsidiaries are equal.. ');

                //Add expense lines
                addExpenseLines(recTrans, objItem, objProject);

            }
                //If project subsidiary is NOT equal to vendor subsidiary
            else {
                nlapiLogExecution('DEBUG', stLogTitle, 'Subsidiaries are NOT equal..');
                nlapiLogExecution('DEBUG', stLogTitle, 'stRecApprovalStatus = ' + stRecApprovalStatus + ' | stApprovalStatus = ' + stApprovalStatus);

                if (stRecType == 'vendorbill' && (stRecApprovalStatus != stApprovalStatus)) {
                    nlapiLogExecution('DEBUG', stLogTitle, 'Not yet approved.. exiting loop');
                    break;
                }

                if (stRecType == 'expensereport' && (stRecApprovalStatus != stApprovalStatus)) {
                    nlapiLogExecution('DEBUG', stLogTitle, 'Not yet approved.. exiting loop');
                    break;
                }

                //if vb, use the 'From Subsidiary' field, throw error if different from project sub
                var stVBid = '';
                if (stRecType == 'vendorbill') {

                    stFromSubsidiary = stProjectSubsidiary; //6/10/2016
                    stFromSubsidiaryName = stProjectSubsidiaryName;
                    nlapiLogExecution('DEBUG', stLogTitle, 'stFromSubsidiary =' + stFromSubsidiary);

                    //create 0 amount VB
                    stVBid = createVendorBill(objItem, objProject, stVendorId, stToSubsidiary, stOrigCurrency, stToSubName, stApprovalStatus, stTranId, stOrigVendorId, stRecId, stProjectCurrency, stProjectSubsidiaryCurrency);
                    if (!Eval.isEmpty(stVBid)) {
                        //save project array
                        arrVB.push(stVBid);
                    }
                }
                    //if ER, then use employee subsidiary	
                else {
                    // 06/09/2016 Run the script on create or edit and expense report approval status='t' and custbody_apco_journal_revenue is not null
                    var stApprStat = recTrans.getFieldValue('approvalstatus');
                    var stRevICJE = recTrans.getFieldValue('custbody_apco_journal_revenue');

                    nlapiLogExecution('DEBUG', stLogTitle, 'stApprStat =' + stApprStat + ' | stRevICJE = ' + stRevICJE);

                    if (stApprStat != APPR_STATUS || !Eval.isEmpty(stRevICJE)) {
                        nlapiLogExecution('DEBUG', stLogTitle, 'Does not satisfy condition. Do not create ICJE. exiting loop');
                        break;
                    }

                    stFromSubsidiary = stProjectSubsidiary;
                    stFromSubsidiaryName = stProjectSubsidiaryName;
                }

                nlapiLogExecution('DEBUG', stLogTitle, 'stProjectCurrency = ' + stProjectCurrency + '  | stProjectSubsidiaryCurrency =' + stProjectSubsidiaryCurrency);

                if (stProjectCurrency != stProjectSubsidiaryCurrency) {
                    //Create 2 JEs
                    var st2ndJE = createJE2(objItem, objProject, stFromSubsidiary, stToSubsidiary, stProjectCurrency, stVBid);
                    var st1stJE = createJE1(objItem, objProject, stFromSubsidiary, stToSubsidiary, stProjectCurrency, stVBid);

                    //Push on Array
                    arrICJE.push(st1stJE);
                    arrICJE.push(st2ndJE);
                }
                else {
                    //Create ICJE
                    var stICJEid = createICJE(objItem, objProject, stToSubsidiary, stFromSubsidiary, stVBid, stToSubName, stFromSubsidiaryName, stRecType, stOrigVendorId);
                    arrICJE.push(stICJEid);

                    if (!Eval.isEmpty(stVBid) && !Eval.isEmpty(stICJEid)) {
                        nlapiSubmitField('vendorbill', stVBid, 'custbody_apco_vb_icje', stICJEid);
                    }
                }

            }
        }

        nlapiLogExecution('DEBUG', stLogTitle, 'arrICJE = ' + arrICJE);
        nlapiLogExecution('DEBUG', stLogTitle, 'arrVB = ' + arrVB);

        //Link ICJE or JEs to the record
        if (!Eval.isEmpty(arrICJE)) {
            recTrans.setFieldValues('custbody_apco_journal_revenue', arrICJE);
        }

        //Link VB to the record
        if (!Eval.isEmpty(arrVB)) {
            recTrans.setFieldValues('custbody_vendor_bill', arrVB);
        }

        //Submit record
        var stId = nlapiSubmitRecord(recTrans, false, true);

        if (Eval.isEmpty(stId)) {
            throw nlapiCreateError('SCRIPT_ERROR', 'Record not updated...');
        }

        nlapiLogExecution('AUDIT', stLogTitle, 'Record successfully updated. stId = ' + stId);
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
 * Validate script parameters
 * @param arrObj
 */
function validateScriptParamObj(arrObj) {
    var stLogTitle = 'afterSubmit_generateJournals.validateScriptParamObj';

    for (var intObjCtr = 0; intObjCtr < arrObj.length; intObjCtr++) {
        var objParam = arrObj[intObjCtr];
        for (var stKeyParam in objParam) {
            if (Eval.isEmpty(objParam[stKeyParam])) {
                throw nlapiCreateError('EMPTY_SCRIPT_PARAMETER', 'Script Parameters should not be empty.');
            }
        }
    }
}

/**
 * 
 * Delete expense lines that were scripted
 * @param recTrans
 * 
 */
function deleteScriptedLines(recTrans) {
    var stLogTitle = 'afterSubmit_generateJournals.deleteScriptedLines';

    //Initialize
    var arrEQAcct = [];
    for (var stItem in OBJ_EQ_ITEM) {
        arrEQAcct.push(OBJ_EQ_ITEM[stItem]);
    }

    nlapiLogExecution('DEBUG', stLogTitle, 'arrEQAcct = ' + arrEQAcct);

    //Loop Expense line
    var intExpCount = recTrans.getLineItemCount('expense');

    for (var intCtr = intExpCount; intCtr > 0; intCtr--) {
        var stItem = recTrans.getLineItemValue('expense', 'category', intCtr);
        if (Eval.inArray(stItem, arrEQAcct)) {
            recTrans.removeLineItem('expense', intCtr);
            nlapiLogExecution('DEBUG', stLogTitle, 'Deleting scripted line = ' + intCtr);
        }
    }

}

/**
 * 
 * Add expense lines
 * @param recTrans
 * @param objItem
 * @param objProject
 * 
 */
function addExpenseLines(recTrans, objItem, objProject) {
    //Add Expense Lines on the record...
    var stLogTitle = 'afterSubmit_generateJournals.addExpenseLines';
    nlapiLogExecution('DEBUG', stLogTitle, 'Add Expense Lines on the record...');

    var arrObjx = objItem.arrObjItems;
    for (var intx = 0; intx < arrObjx.length; intx++) {

        var objItemx = arrObjx[intx];

        //Getters
        var stJobType = objProject.stJobType;
        var flAmt = objItemx.flAmount;
        var flMarkupPct = objProject.flMarkUp;
        var flMarkupAmt = Parse.forceFloat((flMarkupPct * flAmt) / 100);

        //Use different Account under specific project types
        var stItem = OBJ_EQ_ITEM._ln_income;
        if (Eval.inArray(stJobType, ARR_PROJECT_TYPES)) {
            stItem = OBJ_EQ_ITEM._ln_income_ret;
        }

        // start 08/03/2016
        var stTranDate = recTrans.getFieldValue('trandate');

        // end 08/03/2016

        //Create repeating line fields and value
        var objLine = {};
        objLine.location = objItem.stLocation;
        objLine.department = objItem.stDepartment;
        objLine.currency = objItem.stCurrency;
        objLine.customer = objItem.stProject;
        objLine.expensedate = stTranDate;

        var stItemLine = objItemx.stItemId;
        if (Eval.isEmpty(stItemLine)) {
            stItemLine = objItemx.stItem;
        }
        objLine.custcol_apco_item_on_trans = stItemLine;

        //Add lines
        addLine(recTrans, 'expense', stItem, flAmt, objLine);
        addLine(recTrans, 'expense', OBJ_EQ_ITEM._ln_revenue, Parse.forceNegative(flAmt), objLine);

        //If with markup, add additional lines
        if (!Eval.isEmpty(flMarkupAmt)) {
            addLine(recTrans, 'expense', OBJ_EQ_ITEM._ln_markup_rev, Parse.forceNegative(flMarkupAmt), objLine);
            addLine(recTrans, 'expense', OBJ_EQ_ITEM._ln_markup_exp, flMarkupAmt, objLine);
        }

        nlapiLogExecution('DEBUG', stLogTitle, 'stItem = ' + stItem + '| flAmt = ' + flAmt + '| flMarkupAmt = ' + flMarkupAmt + '| objLine = ' + JSON.stringify(objLine));
    }
}
/**
 * 
 * Get all the objects to process
 * @param stLineType
 * @param recTrans
 * @param stRecId
 * @param stRecType
 * 
 */
function setArrToProcessObject(stLineType, recTrans, stRecId, stRecType) {
    var stLogTitle = 'afterSubmit_generateJournals.setArrToProcessObject';
    nlapiLogExecution('DEBUG', stLogTitle, 'Setting ' + stLineType + ' Objects...');

    //Set Projects
    setProjectObject(recTrans, stLineType);

    //Getters
    var stToSubsidiary = recTrans.getFieldValue('subsidiary');
    var stTranDate = recTrans.getFieldValue('trandate');
    var stPostingPd = recTrans.getFieldValue('postingperiod');

    //Loop lines
    var intLength = recTrans.getLineItemCount(stLineType);
    for (var intCtr = 1; intCtr <= intLength; intCtr++) {
        //Process billable lines only
        //RF to process project not cusotmer
        var stProject = recTrans.getLineItemValue(stLineType, 'customer', intCtr);
        var stProjectName = recTrans.getLineItemText(stLineType, 'customer', intCtr);
        if (Eval.isEmpty(stProject)) {
            stProject = recTrans.getLineItemValue(stLineType, 'custcol_apco_ic_project', intCtr);
            stProjectName = recTrans.getLineItemText(stLineType, 'custcol_apco_ic_project', intCtr);
        }

        if (Eval.isEmpty(stProject)) {
            continue;
        }

        var objProject = OBJ_PROJECT[stProject];
        var stProjectSubsidiary = objProject.stSubsidiary;

        var stId = stRecId;
        var stEmployee = '';
        if (stRecType == 'expensereport') {
            stEmployee = recTrans.getFieldValue('entity');
            //stEmployeeSubsidiary = nlapiGetFieldValue('employee', stEmployee, 'subsidiary');
        }

        var flAmount = Parse.forceFloat(recTrans.getLineItemValue(stLineType, 'amount', intCtr));
        var stLocation = recTrans.getLineItemValue(stLineType, 'location', intCtr);
        var stDepartment = recTrans.getLineItemValue(stLineType, 'department', intCtr);
        var stCurrency = recTrans.getLineItemValue(stLineType, 'currency', intCtr);
        var stItem = recTrans.getLineItemText(stLineType, 'item', intCtr);
        var stItemId = recTrans.getLineItemValue(stLineType, 'item', intCtr);
        var stCategoryId = recTrans.getLineItemValue(stLineType, 'category', intCtr);

        var stBillableOptOut = 'F';
        //For expense reports, process only billable items
        if (stLineType == 'expense' && !Eval.isEmpty(stCategoryId)) {
            var objResultEC = nlapiLookupField('expensecategory', stCategoryId, ['custrecord_ec_billable_opt_out', 'custrecord_apco_item_link']);
            stBillableOptOut = objResultEC.custrecord_ec_billable_opt_out;
            stItemId = objResultEC.custrecord_apco_item_link;
        }

        if (stLineType == 'item' && !Eval.isEmpty(stItemId)) {
            stBillableOptOut = nlapiLookupField('item', stItemId, 'custitem_apco_billable_opt_out');

        }

        nlapiLogExecution('DEBUG', stLogTitle, 'stLineType = ' + stLineType + ' | stBillableOptOut = ' + stBillableOptOut + ' | stToSubsidiary = ' + stToSubsidiary + ' | stProjectSubsidiary = ' + stProjectSubsidiary);
        nlapiLogExecution('DEBUG', stLogTitle, 'stCategoryId = ' + stCategoryId + ' | stItemId = ' + stItemId);

        if (stBillableOptOut == 'T') {
            continue;
        }

        var stKey = stProject;

        //Group by project , location and deparment
        if (Eval.isEmpty(OBJ_PROCESS_ITEMS[stKey])) {
            OBJ_PROCESS_ITEMS[stKey] = {};
            OBJ_PROCESS_ITEMS[stKey].flAmount = 0;
            OBJ_PROCESS_ITEMS[stKey].stProject = stProject;
            OBJ_PROCESS_ITEMS[stKey].stProjectName = stProjectName;
            OBJ_PROCESS_ITEMS[stKey].stLocation = stLocation;
            OBJ_PROCESS_ITEMS[stKey].stDepartment = stDepartment;
            OBJ_PROCESS_ITEMS[stKey].stBillableOptOut = stBillableOptOut;
            OBJ_PROCESS_ITEMS[stKey].stCurrency = stCurrency;
            OBJ_PROCESS_ITEMS[stKey].stEmployee = stEmployee;
            //OBJ_PROCESS_ITEMS[stKey].stEmployeeSubsidiary = stEmployeeSubsidiary;
            OBJ_PROCESS_ITEMS[stKey].stId = stId;
            OBJ_PROCESS_ITEMS[stKey].stPostingPd = stPostingPd;
            OBJ_PROCESS_ITEMS[stKey].stTranDate = stTranDate;
            OBJ_PROCESS_ITEMS[stKey].stItem = [];
            OBJ_PROCESS_ITEMS[stKey].arrObjItems = [];
        }

        //OBJECTS
        var objItem =
		{
		    'stItem': stItem,
		    'stItemId': stItemId,
		    'stCategoryId': stCategoryId,
		    'flAmount': flAmount
		};

        OBJ_PROCESS_ITEMS[stKey].flAmount += flAmount;
        OBJ_PROCESS_ITEMS[stKey].stItem.push(stItem);
        OBJ_PROCESS_ITEMS[stKey].arrObjItems.push(objItem);

    }

}

/**
 * 
 * Set Project list as objects
 * @param recTrans
 * @param stLineType
 */
function setProjectObject(recTrans, stLineType) {
    var stLogTitle = 'afterSubmit_generateJournals.setProjectObject';
    nlapiLogExecution('DEBUG', stLogTitle, 'Setting Project Objects...');

    //Loop lines
    var intLength = recTrans.getLineItemCount(stLineType);
    for (var intCtr = 1; intCtr <= intLength; intCtr++) {
        //Process billable lines only
        //RF to process project not cusotmer
        var stProject = recTrans.getLineItemValue(stLineType, 'customer', intCtr);
        if (Eval.isEmpty(stProject)) {
            stProject = recTrans.getLineItemValue(stLineType, 'custcol_apco_ic_project', intCtr);
        }

        if (Eval.isEmpty(stProject)) {
            continue;
        }

        //save project array
        if (!Eval.inArray(stProject, ARR_PROJECTS)) {
            ARR_PROJECTS.push(stProject);
        }
    }

    //Search for the projects
    var arrProjectResults = searchProject();

    if (!Eval.isEmpty(arrProjectResults)) {
        nlapiLogExecution('DEBUG', stLogTitle, 'arrProjectResults.length = ' + arrProjectResults.length);

        //Loop lines
        for (var intCtr = 0; intCtr < arrProjectResults.length; intCtr++) {
            var stId = arrProjectResults[intCtr].getValue('internalid');
            var stJobType = arrProjectResults[intCtr].getValue('jobtype');
            var stSubsidiary = arrProjectResults[intCtr].getValue('subsidiary');
            var stSubsidiaryName = arrProjectResults[intCtr].getText('subsidiary');
            var stCurrency = arrProjectResults[intCtr].getValue('currency');
            var stSubsidiaryCurrency = nlapiLookupField('subsidiary', stSubsidiary, 'currency');
            var flMarkUp = Parse.forceFloat(arrProjectResults[intCtr].getValue('custentity_apco_markup_pct'));
            var flDisbursement = Parse.forceFloat(arrProjectResults[intCtr].getValue('custentity_apco_disbursement_fee_pct'));
            var flRebate = Parse.forceFloat(arrProjectResults[intCtr].getValue('custentity_apco_rebate_pct'));
            OBJ_PROJECT[stId] = {};
            OBJ_PROJECT[stId].stJobType = stJobType;
            OBJ_PROJECT[stId].stSubsidiary = stSubsidiary;
            OBJ_PROJECT[stId].stSubsidiaryName = stSubsidiaryName;
            OBJ_PROJECT[stId].stCurrency = stCurrency;
            OBJ_PROJECT[stId].stSubsidiaryCurrency = stSubsidiaryCurrency;
            OBJ_PROJECT[stId].flMarkUp = flMarkUp;
            OBJ_PROJECT[stId].flDisbursement = flDisbursement;
            OBJ_PROJECT[stId].flRebate = flRebate;
        }
    }

    nlapiLogExecution('DEBUG', stLogTitle, 'OBJ_PROJECT = ' + JSON.stringify(OBJ_PROJECT));
}

/**
 * 
 * Add Expense Lines
 * @param recTrans
 * @param stItem
 * @param flAmt
 * @param objLine
 *
 */
function addLine(recTrans, stLineType, stItem, flAmt, objLine) {
    var stLogTitle = 'afterSubmit_generateJournals.addLine';

    recTrans.selectNewLineItem(stLineType);

    if (stLineType == 'expense') {
        recTrans.setCurrentLineItemValue(stLineType, 'custcol_apco_exp_cat', stItem);
    }

    recTrans.setCurrentLineItemValue(stLineType, 'category', stItem);
    recTrans.setCurrentLineItemValue(stLineType, 'item', stItem);
    recTrans.setCurrentLineItemValue(stLineType, 'amount', nlapiFormatCurrency(flAmt));
    if (objLine != null) {
        for (var stKey in objLine) {
            recTrans.setCurrentLineItemValue(stLineType, stKey, objLine[stKey]);
        }
    }
    recTrans.commitLineItem(stLineType);

}

/**
 * Create a JE or ICJE Line
 * 
 * @param recTxn
 * @param stLineSub
 * @param stType
 * @param stAcct
 * @param stAmount
 * @param objStaticValues
 * 
 */
function createJournalLine(recTxn, stLineSub, stType, stAcct, stAmount, objStaticValues) {
    var stLogTitle = 'afterSubmit_generateJournals.createJournalLine';
    nlapiLogExecution('DEBUG', stLogTitle, 'stLineSub = ' + stLineSub + ' | stType = ' + stType + ' | stAcct = ' + stAcct + ' | stAmount = ' + stAmount);

    recTxn.selectNewLineItem('line');
    if (!Eval.isEmpty(stLineSub)) {
        recTxn.setCurrentLineItemValue('line', 'linesubsidiary', stLineSub); // ICJE
    }

    recTxn.setCurrentLineItemValue('line', stType, nlapiFormatCurrency(stAmount));
    recTxn.setCurrentLineItemValue('line', 'account', stAcct);
    if (objStaticValues != null) {
        for (var stKey in objStaticValues) {
            recTxn.setCurrentLineItemValue('line', stKey, objStaticValues[stKey]);
        }
    }
    recTxn.commitLineItem('line');

}

/**
 * Create Vendor Bill
 * @param objItem
 * @param objProject
 * @param stVendorId
 * @param stToSubsidiary
 * @param stOrigCurrency
 * @param stToSubName
 * @param stApprovalStatus
 * @param stTranId
 * @param stOrigVendorId
 * @param stRecId
 * @param stProjectCurrency
 * @param stProjectSubsidiaryCurrency
 * @returns stId
 * 
 */
function createVendorBill(objItem, objProject, stVendorId, stToSubsidiary, stOrigCurrency, stToSubName, stApprovalStatus, stTranId, stOrigVendorId, stRecId, stProjectCurrency, stProjectSubsidiaryCurrency) {
    var stLogTitle = 'afterSubmit_generateJournals.createVendorBill';
    nlapiLogExecution('DEBUG', stLogTitle, 'Creating Vendor Bill...' + 'rate = ' + stOrigCurrency);

    var stProjectSubsidiary = objProject.stSubsidiary;
    //var stProjectCurrency = nlapiLookupField('subsidiary', objProject.stSubsidiary, 'currency'); 

    nlapiLogExecution('DEBUG', stLogTitle, 'stProjectCurrency = ' + stProjectCurrency);

    //Create VB
    var recVB = nlapiCreateRecord('vendorbill',
	{
	    recordmode: 'dynamic'
	});
    recVB.setFieldValue('entity', stVendorId);

    recVB.setFieldValue('subsidiary', stProjectSubsidiary); //7/16/2016

    if (stProjectCurrency != stProjectSubsidiaryCurrency) {
        recVB.setFieldValue('currency', stProjectCurrency); //10/11/2016
    }
    else {
        recVB.setFieldValue('currency', stProjectSubsidiaryCurrency); //7/19/2016
    }

    recVB.setFieldValue('custbody_apco_vb_from_sub', stToSubsidiary); //6/10/2016
    recVB.setFieldValue('memo', objItem.stItem.toString());
    recVB.setFieldValue('approvalstatus', stApprovalStatus);
    recVB.setFieldValue('postingperiod', objItem.stPostingPd);
    recVB.setFieldValue('trandate', objItem.stTranDate);
    recVB.setFieldValue('tranid', 'IC' + stTranId); //8/5/2016
    recVB.setFieldValue('custbody_from_vb', stRecId); //8/5/2016

    var objItemList = objItem.arrObjItems;
    nlapiLogExecution('DEBUG', stLogTitle, 'objItemList =' + JSON.stringify(objItemList));

    if (Eval.isEmpty(objItemList) || objItemList.length == 0) {
        nlapiLogExecution('DEBUG', stLogTitle, 'No item on the list');
        return;
    }

    for (var intObjItemListCount = 0; intObjItemListCount < objItemList.length; intObjItemListCount++) {
        var objPerItem = objItemList[intObjItemListCount];
        var stItem = objPerItem.stItem;
        var flAmount = objPerItem.flAmount;
        var stItemId = objPerItem.stItemId;

        var objLine = {};
        objLine.customer = objItem.stProject;
        objLine.account = OBJ_NEQ_ACCT._vb_suspension_ac;

        //create the vendor bill only if it is not retainerless
        objLine.isbillable = 'F';
        var stJobType = objProject.stJobType;
        if (!Eval.inArray(stJobType, ARR_PROJECT_TYPES)) {
            objLine.isbillable = 'T';
        }
        objLine.custcol_apco_vb_invoice_description = stItem + ' from ' + stToSubName;
        objLine.custcol_apco_item_on_trans = stItemId;
        objLine.custcol_vendor_trans = stOrigVendorId;

        var stToCur = recVB.getFieldValue('currencysymbol');
        var stRate = nlapiExchangeRate(stToCur, stOrigCurrency, objItem.stTranDate);  // - 08/03/2016

        //This needs to be converted from the from currecny to the to currency
        var flExRate = Parse.forceFloat(stRate);
        var flAmt = flAmount * (1 / flExRate);
        objLine.rate = Parse.forceTwoDecimals(flAmt);

        //Item
        addLine(recVB, 'item', OBJ_NEQ_ACCT._vb_interco_item, flAmt, objLine);

        //Expense
        objLine.isbillable = 'F';

        addLine(recVB, 'expense', '', Parse.forceNegative(flAmt), objLine);

    }

    //Submit Record
    var stId = nlapiSubmitRecord(recVB, false, true);
    if (Eval.isEmpty(stId)) {
        throw nlapiCreateError('SCRIPT_ERROR', 'Vendor bill was not created...' + objItem.stProject);
    }

    nlapiLogExecution('AUDIT', stLogTitle, 'Vendor Bill successfully created. stId = ' + stId);
    return stId;
}

/**
 * Create ICJE
 * @param objItem
 * @param objProject
 * @param stToSubsidiary
 * @param stFromSubsidiary
 * @param stVBId
 * @param stFromName
 * @param stToName
 * @param stRecType
 * @param stOrigVendorId
 * @returns stId
 */
function createICJE(objItem, objProject, stToSubsidiary, stFromSubsidiary, stVBId, stFromName, stToName, stRecType, stOrigVendorId) {
    var stLogTitle = 'afterSubmit_generateJournals.createICJE';
    nlapiLogExecution('DEBUG', stLogTitle, 'Creating ICJE...');

    //To Subsidiary
    var arrInterChart = searchInterCoVendor(stToSubsidiary);
    if (Eval.isEmpty(arrInterChart) || arrInterChart.length != 1) {
        throw nlapiCreateError('USER_ERROR', 'To Subsidiary not found in the Intercompany Chart or more than 2 results were found: ' + stToSubsidiary);
    }
    nlapiLogExecution('DEBUG', stLogTitle, 'stToSubsidiary arrInterChart.length = ' + arrInterChart.length);
    var stAccruedAcct = arrInterChart[0].getValue('custrecord_accrued_ic_ap');

    //From Subsidiary
    var arrInterChart = searchInterCoVendor(stFromSubsidiary);
    if (Eval.isEmpty(arrInterChart) || arrInterChart.length != 1) {
        throw nlapiCreateError('USER_ERROR', 'From Subsidiary not found in the Intercompany Chart or more than 2 results were found: ' + stFromSubsidary);
    }
    nlapiLogExecution('DEBUG', stLogTitle, 'stFromSubsidiary arrInterChart.length = ' + arrInterChart.length);
    var stUnbilledAcct = arrInterChart[0].getValue('custrecord_unbilled_ic_ar');

    //Create Intercompany Journal Entries
    var recJE = nlapiCreateRecord('intercompanyjournalentry',
	{
	    recordmode: 'dynamic'
	});

    nlapiLogExecution('DEBUG', stLogTitle, 'stFromSubsidiary = ' + stFromSubsidiary + ' | stToSubsidiary = ' + stToSubsidiary);

    recJE.setFieldValue('subsidiary', stFromSubsidiary); //FROM Subsidiary
    recJE.setFieldValue('tosubsidiary', stToSubsidiary); //TO Subsidiary
    recJE.setFieldValue('postingperiod', objItem.stPostingPd);
    recJE.setFieldValue('trandate', objItem.stTranDate);

    if (!Eval.isEmpty(stVBId)) {
        recJE.setFieldValue('custbody_apco_link_intco_vb', stVBId); //Link VB
    }
    else {
        recJE.setFieldValue('custbody_apco_link_expense', objItem['stId']); //Link ER
    }

    //Get exchange rate
    var flExRate = Parse.forceFloat(recJE.getFieldValue('exchangerate'));
    nlapiLogExecution('DEBUG', stLogTitle, 'flExRate = ' + flExRate);

    var objItemList = objItem.arrObjItems;
    nlapiLogExecution('DEBUG', stLogTitle, 'objItemList =' + JSON.stringify(objItemList));

    if (Eval.isEmpty(objItemList) || objItemList.length == 0) {
        nlapiLogExecution('DEBUG', stLogTitle, 'No item on the list');
        return;
    }

    //Use different Account under specific project types
    var stJobType = objProject.stJobType;
    var stAcctDebit = OBJ_NEQ_ACCT._icje_from_db;
    if (Eval.inArray(stJobType, ARR_PROJECT_TYPES)) {
        stAcctDebit = OBJ_NEQ_ACCT._icje_from_db_ret;
    }

    for (var intObjItemListCount = 0; intObjItemListCount < objItemList.length; intObjItemListCount++) {
        var objPerItem = objItemList[intObjItemListCount];
        var flAmount = objPerItem.flAmount;
        var stItemId = objPerItem.stItemId;

        var objFromValues = {};
        objFromValues.entity = objItem['stProject'];
        objFromValues.custcol_apco_employee = objItem['stEmployee'];
        objFromValues.memo = 'Intercompany Charge from ' + stFromName + ' to ' + stToName;
        objFromValues.custcol_apco_item_on_trans = stItemId;

        var objToValues = {};
        objToValues.custcol_apco_ic_project = objItem['stProject'];
        objToValues.department = objItem['stDepartment'];
        objToValues.location = objItem['stLocation'];
        objToValues.custcol_apco_employee = objItem['stEmployee'];
        objToValues.memo = 'Intercompany Charge from ' + stFromName + ' to ' + stToName;
        objToValues.custcol_apco_item_on_trans = stItemId;

        //08/05/2016
        if (stRecType == 'vendorbill') {
            objFromValues.custcol_vendor_trans = stOrigVendorId;
            objToValues.custcol_vendor_trans = stOrigVendorId;
        }

        var flAmt = flAmount * (1 / flExRate);
        var flMarkupPct = objProject.flMarkUp;
        var flMarkupAmt = Parse.forceFloat((flMarkupPct * flAmt) / 100);

        nlapiLogExecution('DEBUG', stLogTitle, 'flAmt =' + flAmt + ' | flMarkupAmt =' + flMarkupAmt);


        var flTotal = Parse.forceTwoDecimals(flAmt) + Parse.forceTwoDecimals(flMarkupAmt);

        createJournalLine(recJE, stFromSubsidiary, 'debit', stAcctDebit, flTotal, objFromValues);
        createJournalLine(recJE, stFromSubsidiary, 'credit', stAccruedAcct, flTotal, objFromValues);
        createJournalLine(recJE, stFromSubsidiary, 'debit', OBJ_NEQ_ACCT._icje_from_ico_db, flTotal, objFromValues);
        createJournalLine(recJE, stFromSubsidiary, 'credit', OBJ_NEQ_ACCT._icje_from_ico_cr, flTotal, objFromValues);
        createJournalLine(recJE, stToSubsidiary, 'debit', stUnbilledAcct, flAmt, objToValues);
        createJournalLine(recJE, stToSubsidiary, 'credit', OBJ_NEQ_ACCT._icje_to_cr, flAmt, objToValues);

        //If with markup
        if (flMarkupAmt > 0) {
            createJournalLine(recJE, stToSubsidiary, 'debit', stUnbilledAcct, flMarkupAmt, objToValues);
            createJournalLine(recJE, stToSubsidiary, 'credit', OBJ_NEQ_ACCT._icje_mk_to_cr, flMarkupAmt, objToValues);
        }
    }

    var stId = nlapiSubmitRecord(recJE, false, true);
    if (Eval.isEmpty(stId)) {
        throw nlapiCreateError('SCRIPT_ERROR', 'ICJE was not created...');
    }

    nlapiLogExecution('AUDIT', stLogTitle, 'ICJE successfully created. stId = ' + stId);

    return stId;
}

/**
 * Create JE1
 * @param objItem
 * @param objProject
 * @param stFromSubsidiary
 * @param stToSubsidiary
 * @param stProjectCurrency
 * @param stVBid
 * @returns stId
 */
function createJE1(objItem, objProject, stFromSubsidiary, stToSubsidiary, stProjectCurrency, stVBId) {
    var stLogTitle = 'afterSubmit_generateJournals.createJE1';
    nlapiLogExecution('DEBUG', stLogTitle, 'Creating JE1...');

    //Search for intercompany vendor
    var arrInterChart = searchInterCoVendor(stToSubsidiary);

    //To  Subsidiary
    if (Eval.isEmpty(arrInterChart) || arrInterChart.length != 1) {
        throw nlapiCreateError('USER_ERROR', 'To Subsidiary not found in the Intercompany Chart or more than 2 results were found: ' + stToSubsidiary);
    }
    nlapiLogExecution('DEBUG', stLogTitle, 'stToSubsidiary arrInterChart.length = ' + arrInterChart.length);

    var stAccruedAcct = arrInterChart[0].getValue('custrecord_accrued_ic_ap');

    //Create Intercompany Journal Entries
    var recJE = nlapiCreateRecord('journalentry',
	{
	    recordmode: 'dynamic'
	});

    nlapiLogExecution('DEBUG', stLogTitle, 'stFromSubsidiary = ' + stFromSubsidiary);

    recJE.setFieldValue('subsidiary', stFromSubsidiary); //FROM Subsidiary
    recJE.setFieldValue('currency', stProjectCurrency);
    recJE.setFieldValue('postingperiod', objItem.stPostingPd);
    recJE.setFieldValue('trandate', objItem.stTranDate);

    //Use different Account under specific project types
    var stJobType = objProject.stJobType;
    var stAcctDebit = OBJ_NEQ_ACCT._icje_from_db;
    if (Eval.inArray(stJobType, ARR_PROJECT_TYPES)) {
        stAcctDebit = OBJ_NEQ_ACCT._icje_from_db_ret;
    }

    //Get exchange rate
    var flExRate = Parse.forceFloat(recJE.getFieldValue('exchangerate'));
    nlapiLogExecution('DEBUG', stLogTitle, 'flExRate = ' + flExRate);

    var objItemList = objItem.arrObjItems;
    nlapiLogExecution('DEBUG', stLogTitle, 'objItemList =' + JSON.stringify(objItemList));

    if (Eval.isEmpty(objItemList) || objItemList.length == 0) {
        nlapiLogExecution('DEBUG', stLogTitle, 'No item on the list');
        return;
    }

    for (var intObjItemListCount = 0; intObjItemListCount < objItemList.length; intObjItemListCount++) {
        var objPerItem = objItemList[intObjItemListCount];

        var stItemId = objPerItem.stItemId;
        var flAmt = objItem.flTotalAmt;

        var objValues = {};
        objValues.entity = objItem['stProject'];
        objValues.memo = objItem['stProjectName'];
        objValues.custcol_apco_employee = objItem['stEmployee'];
        objValues.custcol_apco_item_on_trans = stItemId;

        //TOTAL
        createJournalLine(recJE, null, 'debit', stAcctDebit, flAmt, objValues);
        createJournalLine(recJE, null, 'credit', stAccruedAcct, flAmt, objValues);
        createJournalLine(recJE, null, 'debit', OBJ_JE1._intercompany_exp, flAmt, objValues);
        createJournalLine(recJE, null, 'credit', OBJ_JE1._intercompany_rev, flAmt, objValues);

    }

    if (!Eval.isEmpty(stVBId)) {
        recJE.setFieldValue('custbody_apco_link_intco_vb', stVBId); //Link VB
    }
    else {
        recJE.setFieldValue('custbody_apco_link_expense', objItem['stId']); //Link ER
    }

    var stId = nlapiSubmitRecord(recJE, false, true);
    if (Eval.isEmpty(stId)) {
        throw nlapiCreateError('SCRIPT_ERROR', 'JE 1 was not created...');
    }

    nlapiLogExecution('AUDIT', stLogTitle, 'JE 1 successfully created. stId = ' + stId);

    return stId;
}



/**
 * Create JE2
 * @param objItem
 * @param objProject
 * @param stFromSubsidiary
 * @param stToSubsidiary
 * @param stProjectCurrency
 * @param stVBid
 * @returns stId
 */
function createJE2(objItem, objProject, stFromSubsidiary, stToSubsidiary, stProjectCurrency, stVBId) {
    var stLogTitle = 'afterSubmit_generateJournals.createJE2';
    nlapiLogExecution('DEBUG', stLogTitle, 'Creating JE2...');

    //From Subsidiary
    var arrInterChart = searchInterCoVendor(stFromSubsidiary);
    if (Eval.isEmpty(arrInterChart) || arrInterChart.length != 1) {
        throw nlapiCreateError('USER_ERROR', 'From Subsidiary not found in the Intercompany Chart or more than 2 results were found: ' + stFromSubsidiary);
    }
    nlapiLogExecution('DEBUG', stLogTitle, 'stFromSubsidiary arrInterChart.length = ' + arrInterChart.length);
    var stUnbilledAcct = arrInterChart[0].getValue('custrecord_unbilled_ic_ar');

    //Create Journal Entry
    var recJE = nlapiCreateRecord('journalentry',
	{
	    recordmode: 'dynamic'
	});

    nlapiLogExecution('DEBUG', stLogTitle, ' stProjectCurrency = ' + stProjectCurrency + ' | stToSubsidiary =' + stToSubsidiary);

    recJE.setFieldValue('subsidiary', stToSubsidiary); //TO Subsidiary
    recJE.setFieldValue('currency', stProjectCurrency); //Currency
    recJE.setFieldValue('postingperiod', objItem.stPostingPd);
    recJE.setFieldValue('trandate', objItem.stTranDate);

    //Get exchange rate
    var flExRate = Parse.forceFloat(recJE.getFieldValue('exchangerate'));
    nlapiLogExecution('DEBUG', stLogTitle, 'flExRate = ' + flExRate);

    var objItemList = objItem.arrObjItems;
    nlapiLogExecution('DEBUG', stLogTitle, 'objItemList =' + JSON.stringify(objItemList));

    if (Eval.isEmpty(objItemList) || objItemList.length == 0) {
        nlapiLogExecution('DEBUG', stLogTitle, 'No item on the list');
        return;
    }

    for (var intObjItemListCount = 0; intObjItemListCount < objItemList.length; intObjItemListCount++) {
        var objPerItem = objItemList[intObjItemListCount];
        var flAmount = objPerItem.flAmount;
        var stItemId = objPerItem.stItemId;

        var flAmt = flAmount * (1 / flExRate);
        var flMarkupPct = objProject.flMarkUp;
        var flMarkupAmt = Parse.forceFloat((flMarkupPct * flAmt) / 100);

        nlapiLogExecution('DEBUG', stLogTitle, 'flAmt =' + flAmt + ' | flMarkupAmt =' + flMarkupAmt);

        objItem.flTotalAmt = flMarkupAmt + flAmt;

        var objValues = {};
        objValues.custcol_apco_ic_project = objItem['stProject'];
        objValues.memo = objItem['stProjectName'];
        objValues.custcol_apco_employee = objItem['stEmployee'];
        objValues.custcol_apco_item_on_trans = stItemId;

        // @v1.12 | jjacob: Set department and location
        objValues.department = objItem['stDepartment'];
        objValues.location = objItem['stLocation'];

        //TOTAL
        createJournalLine(recJE, null, 'debit', stUnbilledAcct, flAmt, objValues);
        createJournalLine(recJE, null, 'credit', OBJ_JE2._rebill_exp_rev, flAmt, objValues);

        //MARK UP
        if (flMarkupAmt > 0) {
            createJournalLine(recJE, null, 'debit', stUnbilledAcct, flMarkupAmt, objValues);
            createJournalLine(recJE, null, 'credit', OBJ_JE2._markup_exp, flMarkupAmt, objValues);
        }

    }

    if (!Eval.isEmpty(stVBId)) {
        recJE.setFieldValue('custbody_apco_link_intco_vb', stVBId); //Link VB
    }
    else {
        recJE.setFieldValue('custbody_apco_link_expense', objItem['stId']); //Link ER
    }

    var stId = nlapiSubmitRecord(recJE, false, true);

    if (Eval.isEmpty(stId)) {
        throw nlapiCreateError('SCRIPT_ERROR', 'JE 2 was not created...');
    }

    nlapiLogExecution('AUDIT', stLogTitle, 'JE 2 successfully created. stId = ' + stId);

    return stId;
}

//------------------------------------------------- SEARCH FUNCTIONS -------------------------------------------------
/**
 * 
 * Search for the project details
 * @returns arrResults
 * 
 */
function searchProject() {
    var stLogTitle = 'afterSubmit_generateJournals.searchProject';

    var arrResults = [];

    if (!Eval.isEmpty(ARR_PROJECTS)) {
        //Filter
        var arrFilters = [];
        arrFilters.push(new nlobjSearchFilter('internalid', null, 'anyof', ARR_PROJECTS));

        //Columns
        var arrColumns = [];
        arrColumns.push(new nlobjSearchColumn('internalid')); //Internal Id
        arrColumns.push(new nlobjSearchColumn('jobtype')); //Job Type
        arrColumns.push(new nlobjSearchColumn('custentity_apco_markup_pct')); //Markup Percent
        arrColumns.push(new nlobjSearchColumn('subsidiary')); //Subsidiary
        arrColumns.push(new nlobjSearchColumn('currency')); // Currency
        arrColumns.push(new nlobjSearchColumn('custentity_apco_disbursement_fee_pct')); //Disbursement
        arrColumns.push(new nlobjSearchColumn('custentity_apco_rebate_pct')); //Rebate


        arrResults = nlapiSearchRecord('job', null, arrFilters, arrColumns);

    }

    return arrResults;
}

/**
 * 
 * Search for intercompany vendor
 * @param stFromSubsidiary
 * @returns arrResults
 * 
 */
function searchInterCoVendor(stFromSubsidiary) {
    var stLogTitle = 'afterSubmit_generateJournals.searchInterCoVendor';

    //Filter
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('custrecord_subsidiary', null, 'anyof', stFromSubsidiary));

    //Columns
    var arrColumns = [];
    //	arrColumns.push(new nlobjSearchColumn('custrecord_ic_customer'));//Customer
    //	arrColumns.push(new nlobjSearchColumn('custrecord_ic_vendor')); //Vendor
    arrColumns.push(new nlobjSearchColumn('custrecord_subsidiary')); //Subsidiary
    arrColumns.push(new nlobjSearchColumn('custrecord_unbilled_ic_ar')); //Unbilled IC Receivable
    arrColumns.push(new nlobjSearchColumn('custrecord_accrued_ic_ap')); //Accrued IC Payable
    arrColumns.push(new nlobjSearchColumn('custrecord_ic_ar')); //InterCompany AR
    arrColumns.push(new nlobjSearchColumn('custrecord_ic_ap')); //InterCompany AP

    //Results
    var arrResults = nlapiSearchRecord('customrecord_apco_intercompany_chart', null, arrFilters, arrColumns);

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
    },

    forceTwoDecimals: function (num) {
        return Math.round(num * 100) / 100;
    }
};