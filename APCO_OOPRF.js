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
 * Module Description - Creation of T&M Journal Entries
 * 
 * Version    	Date            	Author           	Remarks
 * 1.00       	03/17/2016    		mjpascual 			Initial version.
 *
 */

var CONTEXT = nlapiGetContext();

var OBJ_EQ_ITEM = {};
var OBJ_NEQ_ACCT = {};
var OBJ_PROCESS_ITEMS = {};
var OBJ_PROJECT = {};
var ARR_PROJECTS = [];
var ARR_PROJECT_TYPES = [];

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

        if (stType == 'delete' || (stExecContext != 'userinterface' && stExecContext != 'scheduled')) {
            return;
        }

        //Get script parameters
        var stProjTypes = CONTEXT.getSetting('SCRIPT', 'custscript_ge_project_types');
        var stVendorId = CONTEXT.getSetting('SCRIPT', 'custscript_apco_interco_vendor'); // - 6/10/2016
        //rf
        var stApprovalStatus = CONTEXT.getSetting('SCRIPT', 'custscript_apco_approval_status'); // - 6/21/2016

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
		    '_icje_from_ico_db': CONTEXT.getSetting('SCRIPT', 'custscript_icje_from_ico_db'),
		    '_icje_from_ico_cr': CONTEXT.getSetting('SCRIPT', 'custscript_icje_from_ico_cr'),
		    '_icje_to_cr': CONTEXT.getSetting('SCRIPT', 'custscript_icje_to_cr'),
		    '_icje_mk_to_cr': CONTEXT.getSetting('SCRIPT', 'custscript_icje_mk_to_cr')
		};

        //Validate script parameters
        if (Eval.isEmpty(stProjTypes) || Eval.isEmpty(stVendorId)) {
            throw nlapiCreateError('EMPTY_SCRIPT_PARAMETER', 'Script Parameters should not be empty.');
        }

        validateScriptParamObj([OBJ_EQ_ITEM, OBJ_NEQ_ACCT]);

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

        //Set projects
        setProjectObject();

        //Getters
        var stFromSubsidiary = recTrans.getFieldValue('custbody_apco_vb_from_sub');
        //rf 06-21 for approved bills only 
        var recApprovalStatus = recTrans.getFieldValue('approvalstatus');
        var stToSubName = recTrans.getFieldText('subsidiary');


        var stToSubsidiary = recTrans.getFieldValue('subsidiary');
        //need the original exchange rate to conver to USD.
        var origCurrency = recTrans.getFieldValue('currencysymbol');
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

            //Get Project Subsidiary
            var stProjectSubsidiary = objProject.stSubsidiary;
            nlapiLogExecution('DEBUG', stLogTitle, 'stToSubsidiary = ' + stToSubsidiary + ' | stProjectSubsidiary = ' + stProjectSubsidiary);

            //If project subsidiary is equal to record subsidiary
            if (stToSubsidiary == stProjectSubsidiary) {
                nlapiLogExecution('DEBUG', stLogTitle, 'Subsidiaries are equal.. ');

                //Add expense lines
                addExpenseLines(recTrans, objItem, objProject);

            }
                //If project subsidiary is NOT equal to vendor subsidiary
            else {
                nlapiLogExecution('DEBUG', stLogTitle, 'Subsidiaries are NOT equal..');

                //if vb, use the 'From Subsidiary' field, throw error if different from project sub
                var stVBid = '';
                if (stRecType == 'vendorbill' && recApprovalStatus == stApprovalStatus) {
                    stFromSubsidiary = stProjectSubsidiary; //6/10/2016
                    nlapiLogExecution('DEBUG', stLogTitle, 'stFromSubsidiary =' + stFromSubsidiary);

                    //create 0 amount VB
                    stVBid = createVendorBill(objItem, objProject, stVendorId, stToSubsidiary, origCurrency, stToSubName);
                    arrVB.push(stVBid);
                }
                    //if ER, then use employee subsidiary	
                else {
                    // 06/09/2016 Run the script on create or edit and expense report approval status='t' and custbody_apco_journal_revenue is not null
                    var stApprStat = recTrans.getFieldValue('accountingapproval');
                    var stRevICJE = recTrans.getFieldValue('custbody_apco_journal_revenue');

                    nlapiLogExecution('DEBUG', stLogTitle, 'stApprStat =' + stApprStat + ' | stRevICJE = ' + stRevICJE);

                    if (stApprStat != 'T' || !Eval.isEmpty(stRevICJE)) {
                        nlapiLogExecution('DEBUG', stLogTitle, 'Does not satisfy condition. Do not create ICJE');
                        return;
                    }

                    stFromSubsidiary = stProjectSubsidiary;
                }

                //Create ICJE
                var stICJEid = createICJE(objItem, objProject, stToSubsidiary, stFromSubsidiary, stVBid, stToSubName);
                arrICJE.push(stICJEid);

                if (!Eval.isEmpty(stVBid) && !Eval.isEmpty(stICJEid)) {
                    nlapiSubmitField('vendorbill', stVBid, 'custbody_apco_vb_icje', stICJEid);
                }
            }
        }

        //Link ICJE to the record
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

    //Getters
    var stJobType = objProject.stJobType;
    var flAmt = objItem.flAmount;
    var flMarkupPct = objProject.flMarkUp;
    var flMarkupAmt = Parse.forceFloat((flMarkupPct * flAmt) / 100);

    //Use different Account under specific project types
    var stItem = OBJ_EQ_ITEM._ln_income;
    if (Eval.inArray(stJobType, ARR_PROJECT_TYPES)) {
        stItem = OBJ_EQ_ITEM._ln_income_ret;
    }

    //Create repeating line fields and value
    var objLine = {};
    objLine.location = objItem.stLocation;
    objLine.department = objItem.stDepartment;
   // objLine.customer = objItem.stProject;
    objLine.currency = objItem.stCurrency;

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

    //Loop lines
    var intLength = recTrans.getLineItemCount(stLineType);
    for (var intCtr = 1; intCtr <= intLength; intCtr++) {
        //Process billable lines only
        //RF to process project not cusotmer
        var stProject = recTrans.getLineItemValue(stLineType, 'custcol_apco_ic_project', intCtr);
        // var stProject = recTrans.getLineItemValue(stLineType, 'customer', intCtr);
        if (Eval.isEmpty(stProject)) {
            stProject = recTrans.getLineItemValue(stLineType, 'custcol_apco_ic_project', intCtr);
        }

        if (Eval.isEmpty(stProject)) {
            throw nlapiCreateError('USER_ERROR', 'Project for billable lines should not be empty');
        }

        var stId = stRecId;
        var stEmployee = '';
        if (stRecType == 'expensereport') {
            stEmployee = recTrans.getFieldValue('entity');
        }

        var flAmount = Parse.forceFloat(recTrans.getLineItemValue(stLineType, 'amount', intCtr));
        var stLocation = recTrans.getLineItemValue(stLineType, 'location', intCtr);
        var stDepartment = recTrans.getLineItemValue(stLineType, 'department', intCtr);
        var stBillableOptOut = recTrans.getLineItemValue(stLineType, 'isbillable', intCtr);
        var stCurrency = recTrans.getLineItemValue(stLineType, 'currency', intCtr);
        var stItem = recTrans.getLineItemText(stLineType, 'item', intCtr);

        if (stBillableOptOut == 'F') {
            continue;
        }

        var stKey = stProject + '-' + stLocation + '-' + stDepartment;

        //Group by project , location and deparment
        if (Eval.isEmpty(OBJ_PROCESS_ITEMS[stKey])) {
            OBJ_PROCESS_ITEMS[stKey] = {};
            OBJ_PROCESS_ITEMS[stKey].flAmount = 0;
            OBJ_PROCESS_ITEMS[stKey].stProject = stProject;
            OBJ_PROCESS_ITEMS[stKey].stLocation = stLocation;
            OBJ_PROCESS_ITEMS[stKey].stDepartment = stDepartment;
            OBJ_PROCESS_ITEMS[stKey].stBillableOptOut = stBillableOptOut;
            OBJ_PROCESS_ITEMS[stKey].stCurrency = stCurrency;
            OBJ_PROCESS_ITEMS[stKey].stEmployee = stEmployee;
            OBJ_PROCESS_ITEMS[stKey].stId = stId;
            OBJ_PROCESS_ITEMS[stKey].stItem = stItem;

            //save project array
            if (!Eval.inArray(OBJ_PROCESS_ITEMS[stKey].stProject, ARR_PROJECTS)) {
                ARR_PROJECTS.push(stProject);
            }
        }

        OBJ_PROCESS_ITEMS[stKey].flAmount += flAmount;

    }

}

/**
 * 
 * Set Project list as objects
 * @param arrProjectResults
 * 
 */
function setProjectObject() {
    var stLogTitle = 'afterSubmit_generateJournals.setProjectObject';
    nlapiLogExecution('DEBUG', stLogTitle, 'Setting Project Objects...');

    //Search for the projects
    var arrProjectResults = searchProject();

    if (!Eval.isEmpty(arrProjectResults)) {
        nlapiLogExecution('DEBUG', stLogTitle, 'arrProjectResults.length = ' + arrProjectResults.length);

        //Loop lines
        for (var intCtr = 0; intCtr < arrProjectResults.length; intCtr++) {
            var stId = arrProjectResults[intCtr].getValue('internalid');
            var stJobType = arrProjectResults[intCtr].getValue('jobtype');
            var stSubsidiary = arrProjectResults[intCtr].getValue('subsidiary');
            var flMarkUp = Parse.forceFloat(arrProjectResults[intCtr].getValue('custentity_apco_markup_pct'));
            OBJ_PROJECT[stId] = {};
            OBJ_PROJECT[stId].stJobType = stJobType;
            OBJ_PROJECT[stId].stSubsidiary = stSubsidiary;
            OBJ_PROJECT[stId].flMarkUp = flMarkUp;
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
    recTrans.setCurrentLineItemValue(stLineType, 'category', stItem);
    recTrans.setCurrentLineItemValue(stLineType, 'item', stItem);
    recTrans.setCurrentLineItemValue(stLineType, 'amount', flAmt.toFixed(2));
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
 * @returns stId
 */
function createVendorBill(objItem, objProject, stVendorId, stToSubsidiary, origCurrency, stToSubName) {
    var stLogTitle = 'afterSubmit_generateJournals.createVendorBill';
    nlapiLogExecution('DEBUG', stLogTitle, 'Creating Vendor Bill...' + 'rate = ' + origCurrency);
    var myDate = new Date();
    //Create VB
    var recVB = nlapiCreateRecord('vendorbill',
	{
	    recordmode: 'dynamic'
	});
    recVB.setFieldValue('entity', stVendorId);
    recVB.setFieldValue('custbody_apco_vb_from_sub', stToSubsidiary); //6/10/2016
    recVB.setFieldValue('memo', objItem.stItem);
    recVB.setFieldValue('approvalstatus', 2);

    var objLine = {};


    objLine.location = objItem.stLocation;
    objLine.customer = objItem.stProject;
    objLine.account = OBJ_NEQ_ACCT._vb_suspension_ac;
    objLine.isbillable = 'T';
    var toCur = recVB.getFieldValue('currencysymbol');

    var rate = nlapiExchangeRate( toCur,origCurrency);
  
    //This needs to be converted from the from currecny to the to currency
    //var flExRate = Parse.forceFloat(recVB.getFieldValue('exchangerate'));
    var flExRate = rate;
    var flAmt = objItem.flAmount * (1 / flExRate);
    objLine.rate = flAmt;
    objLine.custcol_apco_vb_invoice_description = "Inter Company Charge From " + stToSubName;

    //Item
    addLine(recVB, 'item', OBJ_NEQ_ACCT._vb_interco_item, flAmt, objLine);

    //Expense
    objLine.customer = null;
    objLine.isbillable = 'F';
    objLine.custcol_apco_ic_project = objItem.stProject;

     addLine(recVB, 'expense', '', Parse.forceNegative(flAmt), objLine);

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
 * @returns stId
 */
function createICJE(objItem, objProject, stToSubsidiary, stFromSubsidiary, stVBId,stFromName) {
    var stLogTitle = 'afterSubmit_generateJournals.createICJE';
    nlapiLogExecution('DEBUG', stLogTitle, 'Creating ICJE...');

    //Search for intercompany vendor
    var arrInterChart = searchInterCoVendor(stToSubsidiary);

    //To Subsidiary
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
    var recJE = nlapiCreateRecord('intercompanyjournalentry', { recordmode: 'dynamic' });

    recJE.setFieldValue('subsidiary', stFromSubsidiary); //FROM Subsidiary
    recJE.setFieldValue('tosubsidiary', stToSubsidiary); //TO Subsidiary

    if (!Eval.isEmpty(stVBId)) {
        recJE.setFieldValue('custbody_apco_link_intco_vb', stVBId); //Link VB
    }
    else {
        recJE.setFieldValue('custbody_apco_link_expense', objItem['stId']); //Link ER
    }

    //Get exchange rate
    var flExRate = Parse.forceFloat(recJE.getFieldValue('exchangerate'));
    nlapiLogExecution('DEBUG', stLogTitle, 'flExRate = ' + flExRate);

    var objFromValues = {};
    objFromValues.entity = objItem['stProject'];
    objFromValues.custcol_apco_employee = objItem['stEmployee'];
    objFromValues.memo = 'Intercompany Charge from ' + stFromName;

    var objToValues = {};
    objToValues.custcol_apco_ic_project = objItem['stProject'];
    objToValues.department = objItem['stDepartment'];
    objToValues.location = objItem['stLocation'];
    objToValues.custcol_apco_employee = objItem['stEmployee'];

    var flAmt = objItem.flAmount * (1 / flExRate);
    var flMarkupPct = objProject.flMarkUp;
    var flMarkupAmt = Parse.forceFloat((flMarkupPct * flAmt) / 100);
    var flTotal = flAmt + flMarkupAmt;

    createJournalLine(recJE, stFromSubsidiary, 'debit', OBJ_NEQ_ACCT._icje_from_db, flTotal, objFromValues);
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

    var stId = nlapiSubmitRecord(recJE, false, true);
    if (Eval.isEmpty(stId)) {
        throw nlapiCreateError('SCRIPT_ERROR', 'ICJE was not created...');
    }

    nlapiLogExecution('AUDIT', stLogTitle, 'ICJE successfully created. stId = ' + stId);

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
    arrColumns.push(new nlobjSearchColumn('custrecord_ic_customer'));//Customer
    arrColumns.push(new nlobjSearchColumn('custrecord_ic_vendor')); //Vendor
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
    }
};