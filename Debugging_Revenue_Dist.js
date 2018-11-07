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
 * Module Description TDD 2: Retainer Plus Time Only
 * 
 * Version Date Author Remarks 1.00 10 Mar 2016 lbalboa Scheduled Script for
 * Retainer Plus 1.10 23 Mar 2016 mjpascual Fix/Clean-up 2.00 13 Apr 2016
 * lbalboa Added Codes for Retainer Less 2.10 18 Apr 2016 lbalboa Added fix for
 * the Retainer Less
 */

var CONTEXT = nlapiGetContext();
var INT_USAGE_LIMIT_THRESHOLD = 500;
var INT_START_TIME = new Date().getTime();

var stJEsToProcess = "15121";
var stRevRecSearch = 'customsearch_sl_retainer_plus_time_only';
var stTimeEntrySearch = 'customsearch_apco_retainer_plus';
var stTimeEntryGrpSearch = 'customsearch_apco_retainer_plus_schedule';
var stTransactionRetainerLess = 'customsearch_retainer_less_unbilled';
var stRetainerLessJE = 'customsearch_retainer_less';


OBJ_ACCTS.jeFeeRetainer = CONTEXT.getSetting('SCRIPT', 'custscript_je_fee_retainer');
OBJ_ACCTS.jeDisbFee = CONTEXT.getSetting('SCRIPT', 'custscript_je_disb_fee');
OBJ_ACCTS.jeVolDisc = CONTEXT.getSetting('SCRIPT', 'custscript_je_volume_disc');
OBJ_ACCTS.jeRebate = CONTEXT.getSetting('SCRIPT', 'custscript_je_rebate');
OBJ_ACCTS.jeRebates = CONTEXT.getSetting('SCRIPT', 'custscript_je_rebates');
OBJ_ACCTS.icjeFeeRev = CONTEXT.getSetting('SCRIPT', 'custscript_icje_fee_revenue');
OBJ_ACCTS.icjeFeeRetainers = CONTEXT.getSetting('SCRIPT', 'custscript_icje_fee_retainers');
OBJ_ACCTS.icjeIncomeDisbFee = CONTEXT.getSetting('SCRIPT', 'custscript_icje_income_account');
OBJ_ACCTS.icjeIncomeVolDisc = CONTEXT.getSetting('SCRIPT', 'custscript_icje_income_accnt_volume');
OBJ_ACCTS.icjeIncomeRebate = CONTEXT.getSetting('SCRIPT', 'custscript_icje_income_account_reb');
OBJ_ACCTS.icjeIntercompExp = CONTEXT.getSetting('SCRIPT', 'custscript_icje_inter_exp');
OBJ_ACCTS.icjeIntercompRev = CONTEXT.getSetting('SCRIPT', 'custscript_icje_intercompany_rev');
OBJ_ACCTS.unbilledAccount = CONTEXT.getSetting('SCRIPT', 'custscript_unbilled_account');

var OBJ_ACCTS =
{};
var OBJ_JOBS =
{};
var OBJ_ICJE_ACCOUNTS =
{};
var ARR_ERROR_DETAILS = [];

scheduled_ProcessRevenueRecognition('ss');
/**
 * TDD 2: Retainer Plus Time Only
 * 
 * @param type
 */
function scheduled_ProcessRevenueRecognition(type) {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition';
    nlapiLogExecution('DEBUG', stLogTitle, '>> Entry Log <<');

    try {
        // Get script paramaters
        /*
                var stJEsToProcess = CONTEXT.getSetting('SCRIPT', 'custscript_je_ids');
                var stRevRecSearch = CONTEXT.getSetting('SCRIPT', 'custscript_rev_rec_savedsearch');
                var stTimeEntrySearch = CONTEXT.getSetting('SCRIPT', 'custscript_time_entry_savedsearch');
                var stTimeEntryGrpSearch = CONTEXT.getSetting('SCRIPT', 'custscript_time_entry_grp_savedsearch');
                var stTransactionRetainerLess = CONTEXT.getSetting('SCRIPT', 'custscript_transaction_retainer_less');
                var stRetainerLessJE = CONTEXT.getSetting('SCRIPT', 'custscript_retainer_less_je');
        */
        // Init JE accts
        OBJ_ACCTS.jeFeeRetainer = CONTEXT.getSetting('SCRIPT', 'custscript_je_fee_retainer');
        OBJ_ACCTS.jeDisbFee = CONTEXT.getSetting('SCRIPT', 'custscript_je_disb_fee');
        OBJ_ACCTS.jeVolDisc = CONTEXT.getSetting('SCRIPT', 'custscript_je_volume_disc');
        OBJ_ACCTS.jeRebate = CONTEXT.getSetting('SCRIPT', 'custscript_je_rebate');
        OBJ_ACCTS.jeRebates = CONTEXT.getSetting('SCRIPT', 'custscript_je_rebates');
        OBJ_ACCTS.icjeFeeRev = CONTEXT.getSetting('SCRIPT', 'custscript_icje_fee_revenue');
        OBJ_ACCTS.icjeFeeRetainers = CONTEXT.getSetting('SCRIPT', 'custscript_icje_fee_retainers');
        OBJ_ACCTS.icjeIncomeDisbFee = CONTEXT.getSetting('SCRIPT', 'custscript_icje_income_account');
        OBJ_ACCTS.icjeIncomeVolDisc = CONTEXT.getSetting('SCRIPT', 'custscript_icje_income_accnt_volume');
        OBJ_ACCTS.icjeIncomeRebate = CONTEXT.getSetting('SCRIPT', 'custscript_icje_income_account_reb');
        OBJ_ACCTS.icjeIntercompExp = CONTEXT.getSetting('SCRIPT', 'custscript_icje_inter_exp');
        OBJ_ACCTS.icjeIntercompRev = CONTEXT.getSetting('SCRIPT', 'custscript_icje_intercompany_rev');
        OBJ_ACCTS.unbilledAccount = CONTEXT.getSetting('SCRIPT', 'custscript_unbilled_account');

        // Validate script parameters
        if (Eval.isEmpty(stJEsToProcess) || Eval.isEmpty(stRevRecSearch) || Eval.isEmpty(stTimeEntrySearch) || Eval.isEmpty(stTimeEntryGrpSearch)
				|| Eval.isEmpty(OBJ_ACCTS.jeFeeRetainer) || Eval.isEmpty(OBJ_ACCTS.jeDisbFee) || Eval.isEmpty(OBJ_ACCTS.jeVolDisc)
				|| Eval.isEmpty(OBJ_ACCTS.jeRebate) || Eval.isEmpty(OBJ_ACCTS.jeRebates) || Eval.isEmpty(OBJ_ACCTS.icjeFeeRev)
				|| Eval.isEmpty(OBJ_ACCTS.icjeFeeRetainers) || Eval.isEmpty(OBJ_ACCTS.icjeIncomeDisbFee) || Eval.isEmpty(OBJ_ACCTS.icjeIncomeVolDisc)
				|| Eval.isEmpty(OBJ_ACCTS.icjeIncomeRebate) || Eval.isEmpty(OBJ_ACCTS.icjeIntercompExp) || Eval.isEmpty(OBJ_ACCTS.icjeIntercompRev)
				|| Eval.isEmpty(OBJ_ACCTS.unbilledAccount) || Eval.isEmpty(stTransactionRetainerLess)) {
            throw nlapiCreateError('EMPTY_SCRIPT_PARAMETER', 'Script Parameters should not be empty.');
        }

        var arrJEsToProcess = stJEsToProcess.split(',');
        nlapiLogExecution('DEBUG', stLogTitle, 'arrJEsToProcess = ' + arrJEsToProcess);

        // check if it has unbilled time
        var arrUnbilledAmount = processedJEWithUnbilledAmounts(arrJEsToProcess, stTimeEntrySearch, stRetainerLessJE, stTransactionRetainerLess,
				stRevRecSearch);
        // Set Time Entry custom fields
        // Loop jobs that will be processed
        for (var stKey in OBJ_JOBS) {
            var stJobId = OBJ_JOBS[stKey].stJobId;
            var stEndDate = OBJ_JOBS[stKey].stEndDate;
            var stRevRecJEId = OBJ_JOBS[stKey].stRevRecJEId;
            var stUnbilledAmount = arrUnbilledAmount[stKey];
            var arrTimeEntries = searchTimeBills(stTimeEntryGrpSearch, stJobId, stEndDate);
            nlapiLogExecution('DEBUG', stLogTitle, 'stUnbilledAmount = ' + stUnbilledAmount);
            // Loop time entrys result to process JE
            for (var intCtr = 0; intCtr < arrTimeEntries.length; intCtr++) {
                var obj = arrTimeEntries[intCtr];

                // Setter
                var objTimeEntry =
				{};
                objTimeEntry.flLaborFeeDist = Parse.forceFloat(obj.getValue('custcol_apco_labor_fee_distribution', null, 'sum'));
                objTimeEntry.flDisbFeeRevDistr = Parse.forceFloat(obj.getValue('custcol_apco_disb_fee_rev_distr', null, 'sum'));
                objTimeEntry.flDiscountDistr = Parse.forceFloat(obj.getValue('custcol_apco_discount_distr', null, 'sum'));
                objTimeEntry.flRebateDistr = Parse.forceFloat(obj.getValue('custcol_apco_rebate_distr', null, 'sum'));
                objTimeEntry.stEmployeeId = obj.getValue('internalid', 'employee', 'group');
                objTimeEntry.stEmpName = obj.getText('internalid', 'employee', 'group');
                objTimeEntry.stEmpSub = obj.getValue('subsidiary', 'employee', 'group');
                objTimeEntry.stEmpDepartment = obj.getValue('department', 'employee', 'group');
                objTimeEntry.stEmpLocation = obj.getValue('location', 'employee', 'group');
                objTimeEntry.stProject = obj.getValue('internalid', 'job', 'group');
                objTimeEntry.stProjectSub = obj.getValue('subsidiary', 'job', 'group');
                objTimeEntry.stProjectCurr = obj.getValue('currency', 'job', 'group');
                objTimeEntry.stProjectName = obj.getValue('altname', 'job', 'group');
                objTimeEntry.stProjEndDate = obj.getValue('custentity_apco_proj_period_end_date', 'job', 'group');

                nlapiLogExecution('DEBUG', stLogTitle, 'objTimeEntry =' + JSON.stringify(objTimeEntry));

                // check if unbilledamount is there
                if (Parse.forceFloat(stUnbilledAmount) != 0.00) {
                    createUnbilledJE(objTimeEntry, stRevRecJEId, stUnbilledAmount);
                }

                // check if employee sub is equal to project sub
                if (objTimeEntry.stEmpSub == objTimeEntry.stProjectSub) {
                    // create standard Journal
                    createJournalEntry(objTimeEntry, stRevRecJEId);
                } else {
                    // create standard Journal
                    createIntercompanyJournalEntry(objTimeEntry, stRevRecJEId);
                }

                // Monitor usage unit / time run
                INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);

            }

        }
        // Send email upon completion
        sendEmail();
    } catch (error) {
        if (error.getDetails != undefined) {
            nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        } else {
            nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
            throw nlapiCreateError('99999', error.toString());
        }
    }
}

/**
 * Set Time Entry Custom Fields: Labor, Disb, Disc, Rebate
 * 
 * @param arrJEsToProcess
 * @param stTimeEntrySearch
 * @param stRevRecSearch
 */
function setTimeEntryCustomFields(arrJEsToProcess, stTimeEntrySearch, stRevRecSearch) {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.setTimeEntryCustomFields';

    // Search again for JEs
    var arrJEsToProcess = searchJournalEntries(stRevRecSearch, arrJEsToProcess);

    // For each result, save project
    for (var intLineCtr = 0; intLineCtr < arrJEsToProcess.length; intLineCtr++) {
        var stRevRecJEId = arrJEsToProcess[intLineCtr].getId();
        var flAmount = arrJEsToProcess[intLineCtr].getValue('amount');
        var stJobId = arrJEsToProcess[intLineCtr].getValue('internalid', 'job');
        var stEndDate = arrJEsToProcess[intLineCtr].getValue('custentity_apco_proj_period_end_date', 'job');
        var bolProcess = false;

        nlapiLogExecution('DEBUG', stLogTitle, 'stJobId = ' + stJobId);

        // Search for Timebills to process
        var arrTimeBills = searchTimeBills(stTimeEntrySearch, stJobId, stEndDate);

        // Get RevAmt Total
        var flTotalRevAmnt = 0;

        for (var intLineCount = 0; intLineCount < arrTimeBills.length; intLineCount++) {
            var objRes = arrTimeBills[intLineCount];
            var flDuration = Parse.forceFloat(objRes.getValue('durationdecimal'));
            var flRate = Parse.forceFloat(objRes.getValue('rate'));
            var flRevAmnt = Parse.forceFloat(flDuration) * Parse.forceFloat(flRate);
            flTotalRevAmnt += flRevAmnt;
        }
        nlapiLogExecution('DEBUG', stLogTitle, 'flTotalRevAmnt = ' + flTotalRevAmnt + ' | flAmount = ' + flAmount + '| arrTimeBills.length = '
				+ arrTimeBills.length);

        // Get Amount per Type and submit field
        for (var intLineCount = 0; intLineCount < arrTimeBills.length; intLineCount++) {
            // Getters
            var objRes = arrTimeBills[intLineCount];
            var stTimeEntryId = objRes.getId();
            var stEmpId = objRes.getValue('internalid', 'employee');
            var flDuration = Parse.forceFloat(objRes.getValue('durationdecimal'));
            var flRate = Parse.forceFloat(objRes.getValue('rate'));
            var flRevAmnt = Parse.forceFloat(flDuration) * Parse.forceFloat(flRate);
            var flDisbFee = Parse.forceFloat(objRes.getValue('custentity_apco_disbursement_fee_pct', 'job')) / 100;
            var flDiscount = Parse.forceFloat(objRes.getValue('custentity_apco_discount_pct', 'job')) / 100;
            var flRebate = Parse.forceFloat(objRes.getValue('custentity_apco_rebate_pct', 'job')) / 100;

            nlapiLogExecution('DEBUG', stLogTitle, 'stTimeEntryId = ' + stTimeEntryId + ' | flRevAmnt = ' + flRevAmnt + ' | flDisbFee = ' + flDisbFee
					+ ' | flDiscount = ' + flDiscount + ' | flRebate = ' + flRebate);

            // Compute
            var flRevPercent = Parse.forceFloat(flRevAmnt / flTotalRevAmnt);
            var fLaborFee = flRevPercent * flAmount;
            var flDiscountAmnt = fLaborFee * flDiscount;
            var flDisbAmnt = fLaborFee * flDisbFee;
            var flRebateAmnt = fLaborFee * flRebate;

            try {
                nlapiSubmitField('timebill', stTimeEntryId, ['custcol_apco_labor_fee_distribution', 'custcol_apco_discount_distr',
						'custcol_apco_disb_fee_rev_distr', 'custcol_apco_rebate_distr'], [fLaborFee, flDiscountAmnt, flDisbAmnt, flRebateAmnt]);
                nlapiLogExecution('AUDIT', stLogTitle, 'flRevPercent = ' + flRevPercent + ' | fLaborFee = ' + fLaborFee + ' | flDiscountAmnt = '
						+ flDiscountAmnt + ' | flDisbAmnt = ' + flDisbAmnt + ' | flRebateAmnt = ' + flRebateAmnt);
            } catch (err) {
                nlapiLogExecution('ERROR', stLogTitle, 'Setting of Timebill values failed. Id #' + stTimeEntryId);
                ARR_ERROR_DETAILS.push('Setting of Timebill values failed. Id #' + stTimeEntryId);
            }
            // Push Time Entries
            var stKey = stRevRecJEId + '-' + stJobId + '-' + stEmpId;
            if (Eval.isEmpty(OBJ_JOBS[stKey])) {
                OBJ_JOBS[stKey] =
				{};
                OBJ_JOBS[stKey].stJobId = stJobId;
                OBJ_JOBS[stKey].stEndDate = stEndDate;
                OBJ_JOBS[stKey].stEmpId = stEmpId;
                OBJ_JOBS[stKey].stRevRecJEId = stRevRecJEId;
                OBJ_JOBS[stKey].arrTimeEntries = [];
            }
            OBJ_JOBS[stKey].arrTimeEntries.push(stTimeEntryId);

            // set the Processed field to check

            nlapiSubmitField('journalentry', stRevRecJEId, 'custbody_apco_processed', 'T');
            nlapiLogExecution('DEBUG', stLogTitle, 'stRevRecJEId = ' + stRevRecJEId + " Processed Checkbox is ticked");
            bolProcess = true;

        }

        if (arrTimeBills.length == 0 && !bolProcess) {
            nlapiSubmitField('journalentry', stRevRecJEId, 'custbody_apco_processed', 'T');
            nlapiLogExecution('DEBUG', stLogTitle, 'stRevRecJEId = ' + stRevRecJEId + " Processed Checkbox is ticked");
            bolProcess = true;
        }

        // Monitor usage unit / time run
        INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);
    }

}

/**
 * Set Time Entry Custom Fields: Labor, Disb, Disc, Rebate
 * 
 * @param arrJEsToProcess
 * @param stTimeEntrySearch
 * @param stRevRecSearch
 */
function processedJEWithUnbilledAmounts(arrJEsToProcess, stTimeEntrySearch, stRetainerLessJE, stTransactionRetainerLess, stRevRecSearch) {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.checkForUnbilledAmount';
    var arrJournalEntries = searchJournalEntries(stRetainerLessJE, arrJEsToProcess);
    nlapiLogExecution('DEBUG', stLogTitle, 'arrJournalEntries = ' + JSON.stringify(arrJournalEntries));
    nlapiLogExecution('DEBUG', stLogTitle, 'arrJournalEntries.length = ' + arrJournalEntries.length);
    var arrTmpJEId = [];
    var objJournalEntry =
	{};
    var arrNoUnbilledAmountJE = [];
    var arrUnbilledAmount =
	{};
    // first loop
    for (var intLineCtr = 0; intLineCtr < arrJournalEntries.length; intLineCtr++) {

        var intJournalEntryId = arrJournalEntries[intLineCtr].getId();
        nlapiLogExecution('DEBUG', stLogTitle, 'intJournalEntryId = ' + intJournalEntryId);
        // Create JE object
        if (!objJournalEntry[intJournalEntryId]) {

            // check for unbilled amount
            var stJobId = arrJournalEntries[intLineCtr].getValue('internalid', 'job');
            var stEndDate = arrJournalEntries[intLineCtr].getValue('custentity_apco_proj_period_end_date', 'job');
            var stUnbilledAmount = getUnbilledAmount(stJobId, stEndDate, stTransactionRetainerLess);

            if (Eval.isEmpty(stUnbilledAmount) && !Eval.inArray(intJournalEntryId, arrNoUnbilledAmountJE)) {
                arrNoUnbilledAmountJE.push(intJournalEntryId);
                continue;
            }

            nlapiLogExecution('DEBUG', stLogTitle, 'arrJournalEntries[intLineCtr] = ' + JSON.stringify(arrJournalEntries[intLineCtr]));
            nlapiLogExecution('DEBUG', stLogTitle, 'date = ' + stEndDate);
            objJournalEntry[intJournalEntryId] =
			{};
            objJournalEntry[intJournalEntryId].id = intJournalEntryId;
            objJournalEntry[intJournalEntryId].jobid = stJobId;
            objJournalEntry[intJournalEntryId].endDate = stEndDate;
            objJournalEntry[intJournalEntryId].feeRevenue = 0.00;
            objJournalEntry[intJournalEntryId].disbursementRev = 0.00;
            objJournalEntry[intJournalEntryId].discountRev = 0.00;
            objJournalEntry[intJournalEntryId].rebates = 0.00;
            objJournalEntry[intJournalEntryId].unbilledAmount = stUnbilledAmount; // Search
            // unbilled
            // amount
            arrTmpJEId.push(intJournalEntryId);

        }

        objJournalEntry[intJournalEntryId].amount = arrJournalEntries[intLineCtr].getValue('amount');
        objJournalEntry[intJournalEntryId].account = arrJournalEntries[intLineCtr].getValue('account');
        switch (objJournalEntry[intJournalEntryId].account) {
            case OBJ_ACCTS.jeFeeRetainer:
                objJournalEntry[intJournalEntryId].feeRevenue = objJournalEntry[intJournalEntryId].amount
                        - objJournalEntry[intJournalEntryId].unbilledAmount;
                break;
            case OBJ_ACCTS.icjeIncomeDisbFee:
                objJournalEntry[intJournalEntryId].disbursementRev = objJournalEntry[intJournalEntryId].amount;
                break;
            case OBJ_ACCTS.jeVolDisc:
                objJournalEntry[intJournalEntryId].discountRev = objJournalEntry[intJournalEntryId].amount;
                break;
            case OBJ_ACCTS.jeRebates:
                objJournalEntry[intJournalEntryId].rebates = objJournalEntry[intJournalEntryId].feeRevenue;
                break;
        }

        nlapiLogExecution('DEBUG', stLogTitle, 'objJournalEntry[intJournalEntryId] = ' + JSON.stringify(objJournalEntry[intJournalEntryId]));
    }
    nlapiLogExecution('DEBUG', stLogTitle, 'arrTmpJEId = ' + JSON.stringify(arrTmpJEId));
    // second loop
    for (var intLineCtr = 0; intLineCtr < arrTmpJEId.length; intLineCtr++) {
        nlapiLogExecution('DEBUG', stLogTitle, 'arrTmpJEId[intLineCtr] = ' + arrTmpJEId[intLineCtr]);
        var objJE = objJournalEntry[arrTmpJEId[intLineCtr]];
        nlapiLogExecution('DEBUG', stLogTitle, 'objJE = ' + JSON.stringify(objJE));
        var arrTimeBills = searchTimeBills(stTimeEntrySearch, objJE.jobid, objJE.endDate);

        // Get Amount per Type and submit field
        for (var intLineCount = 0; intLineCount < arrTimeBills.length; intLineCount++) {
            // Getters
            var objRes = arrTimeBills[intLineCount];

            var stTimeEntryId = objRes.getId();
            var stEmpId = objRes.getValue('internalid', 'employee');
            nlapiLogExecution('DEBUG', stLogTitle, 'stTimeEntryId = ' + stTimeEntryId + ' stEmpId = ' + stEmpId);
            try {
                nlapiSubmitField('timebill', stTimeEntryId, ['custcol_apco_labor_fee_distribution', 'custcol_apco_discount_distr',
						'custcol_apco_disb_fee_rev_distr', 'custcol_apco_rebate_distr'], [objJE.feeRevenue, objJE.discountRev,
						objJE.disbursementRev, objJE.rebates]);
                nlapiLogExecution('AUDIT', stLogTitle, ' | fLaborFee = ' + objJE.feeRevenue + ' | flDiscountAmnt = ' + objJE.discountRev
						+ ' | flDisbAmnt = ' + objJE.disbursementRev + ' | flRebateAmnt = ' + objJE.rebates);
            } catch (err) {
                nlapiLogExecution('ERROR', stLogTitle, 'Setting of Timebill values failed. Id #' + stTimeEntryId);
                ARR_ERROR_DETAILS.push('Setting of Timebill values failed. Id #' + stTimeEntryId);
            }
            // Push Time Entries
            var stKey = [objJE.id, objJE.jobid, stEmpId].join('-');

            if (Eval.isEmpty(OBJ_JOBS[stKey])) {
                OBJ_JOBS[stKey] =
				{};
                OBJ_JOBS[stKey].stJobId = objJE.jobid;
                OBJ_JOBS[stKey].stEndDate = objJE.endDate;
                OBJ_JOBS[stKey].stEmpId = stEmpId;
                OBJ_JOBS[stKey].stRevRecJEId = arrTmpJEId[intLineCount];
                OBJ_JOBS[stKey].arrTimeEntries = [];
                arrUnbilledAmount[stKey] = objJE.unbilledAmount;
            }

            OBJ_JOBS[stKey].arrTimeEntries.push(stTimeEntryId);
        }
        nlapiLogExecution('DEBUG', stLogTitle, 'arrTmpJEId[intLineCount] = ' + arrTmpJEId[intLineCtr]);
        nlapiSubmitField('journalentry', arrTmpJEId[intLineCtr], 'custbody_apco_processed', 'T');
        nlapiLogExecution('DEBUG', stLogTitle, 'stRevRecJEId = ' + arrTmpJEId[intLineCtr] + " Processed Checkbox is ticked");

    }

    nlapiLogExecution('DEBUG', stLogTitle, 'arrNoUnbilledAmountJE = ' + JSON.stringify(arrNoUnbilledAmountJE));
    if (!Eval.isEmpty(arrNoUnbilledAmountJE)) {
        setTimeEntryCustomFields(arrNoUnbilledAmountJE, stTimeEntrySearch, stRevRecSearch)
    }

    return arrUnbilledAmount
}

function getUnbilledAmount(stJobId, stEndDate, stTransactionRetainerLess) {
    var stLogTitle = 'getUnbilledAmount';
    var arrSearchFilter = [];
    arrSearchFilter.push(new nlobjSearchFilter('internalid', 'job', 'anyof', stJobId));
    arrSearchFilter.push(new nlobjSearchFilter('trandate', null, 'onorbefore', stEndDate));
    var arrUnbilledAmount = nlapiSearchRecord('transaction', stTransactionRetainerLess, arrSearchFilter, null);
    nlapiLogExecution('DEBUG', stLogTitle, 'arrUnbilledAmount = ' + JSON.stringify(arrUnbilledAmount));
    var stUnbilledAmount = 0;
    if (!Eval.isEmpty(arrUnbilledAmount)) {
        stUnbilledAmount = arrUnbilledAmount[0].getValue('amount', null, 'sum');
    }

    return stUnbilledAmount;
}

/**
 * Creation of JE
 * 
 * @param objTimeEntry
 * @param stRevRecJEId
 * 
 */
function createUnbilledJE(objTimeEntry, stRevRecJEId, stUnbilled) {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.createUnbilledJE';

    // Set Key
    var stKey = stRevRecJEId + '-' + objTimeEntry.stProject + '-' + objTimeEntry.stEmployeeId;
    nlapiLogExecution('DEBUG', stLogTitle, 'stKey = ' + stKey);

    // Create Journal Entries
    var recJE = nlapiCreateRecord('journalentry',
	{
	    recordmode: 'dynamic'
	});

    recJE.setFieldValue('subsidiary', objTimeEntry.stProjectSub);
    recJE.setFieldValue('currency', objTimeEntry.stProjectCurr);

    var objSaleStaticValues =
	{};
    objSaleStaticValues.entity = objTimeEntry.stProject;
    objSaleStaticValues.department = objTimeEntry.stEmpDepartment;
    objSaleStaticValues.location = objTimeEntry.stEmpLocation;
    objSaleStaticValues.custcol_apco_employee = objTimeEntry.stEmployeeId;
    nlapiLogExecution('DEBUG', stLogTitle, JSON.stringify(objSaleStaticValues));

    objSaleStaticValues.memo = 'Reclass VB for Retainerless Project'
    createJournalLine(recJE, null, 'debit', OBJ_ACCTS.jeFeeRetainer, Parse.forceFloat(stUnbilled), objSaleStaticValues);
    createJournalLine(recJE, null, 'credit', OBJ_ACCTS.unbilledAccount, Parse.forceFloat(stUnbilled), objSaleStaticValues);
    // set header values for rebate
    try {
        var stJEId = nlapiSubmitRecord(recJE, true, true);
        updateTimeBills(stJEId, stKey);
        nlapiLogExecution('AUDIT', stLogTitle, 'JE was created successfully. ID = ' + stJEId);
    } catch (error) {
        nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTimeEntry.stProject + ' | Employee #' + objTimeEntry.stEmployeeId
				+ ': JE creation unsuccessful.' + error.getCode() + ': ' + error.getDetails());
        ARR_ERROR_DETAILS.push('Project #' + objTimeEntry.stProject + ' | Employee #' + objTimeEntry.stEmployeeId + ': JE creation unsuccessful.'
				+ error.getCode() + ': ' + error.getDetails());
    }

}

/**
 * Creation of JE
 * 
 * @param objTimeEntry
 * @param stRevRecJEId
 * 
 */
function createJournalEntry(objTimeEntry, stRevRecJEId, stUnbilled) {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.createJournalEntry';

    // Set Key
    var stKey = stRevRecJEId + '-' + objTimeEntry.stProject + '-' + objTimeEntry.stEmployeeId;
    nlapiLogExecution('DEBUG', stLogTitle, 'stKey = ' + stKey);

    // Create Journal Entries
    var recJE = nlapiCreateRecord('journalentry',
	{
	    recordmode: 'dynamic'
	});

    recJE.setFieldValue('subsidiary', objTimeEntry.stProjectSub);
    recJE.setFieldValue('currency', objTimeEntry.stProjectCurr);

    var objSaleStaticValues =
	{};
    objSaleStaticValues.entity = objTimeEntry.stProject;
    objSaleStaticValues.department = objTimeEntry.stEmpDepartment;
    objSaleStaticValues.location = objTimeEntry.stEmpLocation;
    objSaleStaticValues.custcol_apco_employee = objTimeEntry.stEmployeeId;
    nlapiLogExecution('DEBUG', stLogTitle, JSON.stringify(objSaleStaticValues));

    // Labor
    createJournalLine(recJE, null, 'debit', OBJ_ACCTS.jeFeeRetainer, objTimeEntry.flLaborFeeDist, objSaleStaticValues);
    createJournalLine(recJE, null, 'credit', OBJ_ACCTS.jeFeeRetainer, objTimeEntry.flLaborFeeDist, objSaleStaticValues);

    // If there is a disbursement fee
    if (objTimeEntry.flDisbFeeRevDistr > 0) {
        createJournalLine(recJE, null, 'debit', OBJ_ACCTS.jeDisbFee, objTimeEntry.flDisbFeeRevDistr, objSaleStaticValues);
        createJournalLine(recJE, null, 'credit', OBJ_ACCTS.jeDisbFee, objTimeEntry.flDisbFeeRevDistr, objSaleStaticValues);
    }

    // If there is a discount fee
    if (objTimeEntry.flDiscountDistr > 0) {
        createJournalLine(recJE, null, 'debit', OBJ_ACCTS.jeVolDisc, objTimeEntry.flDiscountDistr, objSaleStaticValues);
        createJournalLine(recJE, null, 'credit', OBJ_ACCTS.jeVolDisc, objTimeEntry.flDiscountDistr, objSaleStaticValues);
    }

    // If there is a rebate fee
    if (objTimeEntry.flRebateDistr > 0) {
        createJournalLine(recJE, null, 'debit', OBJ_ACCTS.jeRebate, objTimeEntry.flRebateDistr, objSaleStaticValues);
        createJournalLine(recJE, null, 'credit', OBJ_ACCTS.jeRebates, objTimeEntry.flRebateDistr, objSaleStaticValues);
    }
    // set header values for rebate
    try {
        var stJEId = nlapiSubmitRecord(recJE, true, true);
        updateTimeBills(stJEId, stKey);
        nlapiLogExecution('AUDIT', stLogTitle, 'JE was created successfully. ID = ' + stJEId);
    } catch (error) {
        nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTimeEntry.stProject + ' | Employee #' + objTimeEntry.stEmployeeId
				+ ': JE creation unsuccessful.' + error.getCode() + ': ' + error.getDetails());
        ARR_ERROR_DETAILS.push('Project #' + objTimeEntry.stProject + ' | Employee #' + objTimeEntry.stEmployeeId + ': JE creation unsuccessful.'
				+ error.getCode() + ': ' + error.getDetails());
    }

}

/**
 * Creation of ICJE
 * 
 * @param objTimeEntry
 * @param stRevRecJEId
 */
function createIntercompanyJournalEntry(objTimeEntry, stRevRecJEId) {

    var stLogTitle = 'scheduled_ProcessRevenueRecognition.createIntercompanyJournalEntry';

    // Set Key
    var stKey = stRevRecJEId + '-' + objTimeEntry.stProject + '-' + objTimeEntry.stEmployeeId;
    nlapiLogExecution('DEBUG', stLogTitle, 'stKey = ' + stKey);

    // Search Intercompany Chart
    var arrIntercoAcctSearch = searchInterCoChart([objTimeEntry.stProjectSub, objTimeEntry.stEmpSub]);

    // Initialize Cross Reference Table
    if (Eval.isEmpty(arrIntercoAcctSearch[0]) || Eval.isEmpty(arrIntercoAcctSearch[1])) {
        throw nlapiCreateError('SCRIPT_ERROR', 'Cannot find subsidiaries in the intercompany chart record.');
    }

    var stUnbilledICAcct = arrIntercoAcctSearch[0].getValue('custrecord_unbilled_ic_ar');
    var stAccruedICAcct = arrIntercoAcctSearch[1].getValue('custrecord_accrued_ic_ap');
    nlapiLogExecution('DEBUG', stLogTitle, 'stUnbilledICAcct = ' + stUnbilledICAcct + '| stAccruedICAcct = ' + stAccruedICAcct);

    // Create Intercompany Journal Entries
    var recJE = nlapiCreateRecord('intercompanyjournalentry',
	{
	    recordmode: 'dynamic'
	});
    recJE.setFieldValue('subsidiary', objTimeEntry.stProjectSub); // FROM
    // Subsidiary
    recJE.setFieldValue('tosubsidiary', objTimeEntry.stEmpSub); // TO Subsidiary
    recJE.setFieldValue('currency', objTimeEntry.stProjectCurr);

    var objFromStaticValues =
	{};
    objFromStaticValues.memo = objTimeEntry.stProjectName;
    objFromStaticValues.entity = objTimeEntry.stProject;
    objFromStaticValues.department = objTimeEntry.stEmpDepartment;
    objFromStaticValues.custcol_apco_employee = objTimeEntry.stEmployeeId;
    nlapiLogExecution('DEBUG', stLogTitle, JSON.stringify(objFromStaticValues));

    var objToStaticValues =
	{};
    objToStaticValues.memo = objTimeEntry.stProjectName;
    objToStaticValues.department = objTimeEntry.stEmpDepartment;
    objToStaticValues.location = objTimeEntry.stEmpLocation;
    objToStaticValues.custcol_apco_employee = objTimeEntry.stEmployeeId;
    objToStaticValues.custcol_apco_ic_project = objTimeEntry.stProject;
    nlapiLogExecution('DEBUG', stLogTitle, JSON.stringify(objToStaticValues));

    // Labor
    createJournalLine(recJE, objTimeEntry.stProjectSub, 'debit', OBJ_ACCTS.jeFeeRetainer, objTimeEntry.flLaborFeeDist, objFromStaticValues);
    createJournalLine(recJE, objTimeEntry.stProjectSub, 'credit', OBJ_ACCTS.icjeIntercompRev, objTimeEntry.flLaborFeeDist, objFromStaticValues);
    createJournalLine(recJE, objTimeEntry.stProjectSub, 'debit', OBJ_ACCTS.icjeIntercompExp, objTimeEntry.flLaborFeeDist, objFromStaticValues);
    createJournalLine(recJE, objTimeEntry.stProjectSub, 'credit', stAccruedICAcct, objTimeEntry.flLaborFeeDist, objFromStaticValues);
    createJournalLine(recJE, objTimeEntry.stEmpSub, 'debit', stUnbilledICAcct, objTimeEntry.flLaborFeeDist, objToStaticValues);
    createJournalLine(recJE, objTimeEntry.stEmpSub, 'credit', OBJ_ACCTS.jeFeeRetainer, objTimeEntry.flLaborFeeDist, objToStaticValues);

    // If there is a disbursement fee
    if (objTimeEntry.flDisbFeeRevDistr > 0) {
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'debit', OBJ_ACCTS.icjeIncomeDisbFee, objTimeEntry.flDisbFeeRevDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'credit', OBJ_ACCTS.icjeIntercompRev, objTimeEntry.flDisbFeeRevDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'debit', OBJ_ACCTS.icjeIntercompExp, objTimeEntry.flDisbFeeRevDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'credit', stAccruedICAcct, objTimeEntry.flDisbFeeRevDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stEmpSub, 'debit', stUnbilledICAcct, objTimeEntry.flDisbFeeRevDistr, objToStaticValues);
        createJournalLine(recJE, objTimeEntry.stEmpSub, 'credit', OBJ_ACCTS.icjeIncomeDisbFee, objTimeEntry.flDisbFeeRevDistr, objToStaticValues);
    }

    // If there is a discount fee
    if (objTimeEntry.flDiscountDistr > 0) {
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'credit', OBJ_ACCTS.icjeIncomeVolDisc, objTimeEntry.flDiscountDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'debit', OBJ_ACCTS.icjeIntercompRev, objTimeEntry.flDiscountDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'credit', OBJ_ACCTS.icjeIntercompExp, objTimeEntry.flDiscountDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'debit', stAccruedICAcct, objTimeEntry.flDiscountDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stEmpSub, 'credit', stUnbilledICAcct, objTimeEntry.flDiscountDistr, objToStaticValues);
        createJournalLine(recJE, objTimeEntry.stEmpSub, 'debit', OBJ_ACCTS.icjeIncomeVolDisc, objTimeEntry.flDiscountDistr, objToStaticValues);
    }

    // If there is a rebate fee
    if (objTimeEntry.flRebateDistr > 0) {
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'credit', OBJ_ACCTS.icjeIncomeRebate, objTimeEntry.flRebateDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'debit', OBJ_ACCTS.icjeIntercompRev, objTimeEntry.flRebateDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'credit', OBJ_ACCTS.icjeIntercompExp, objTimeEntry.flRebateDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'debit', stAccruedICAcct, objTimeEntry.flRebateDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stEmpSub, 'credit', stUnbilledICAcct, objTimeEntry.flRebateDistr, objToStaticValues);
        createJournalLine(recJE, objTimeEntry.stEmpSub, 'debit', OBJ_ACCTS.icjeIncomeRebate, objTimeEntry.flRebateDistr, objToStaticValues);
    }

    // Submit Record
    try {
        var stJEId = nlapiSubmitRecord(recJE, true, true);
        updateTimeBills(stJEId, stKey);
        nlapiLogExecution('AUDIT', stLogTitle, 'ICJE was created successfully. ID = ' + stJEId);
    } catch (error) {
        nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTimeEntry.stProject + ' | Employee #' + objTimeEntry.stEmployeeId
				+ ': ICJE creation unsuccessful.' + error.getCode() + ': ' + error.getDetails());
        ARR_ERROR_DETAILS.push('Project #' + objTimeEntry.stProject + ' | Employee #' + objTimeEntry.stEmployeeId + ': ICJE creation unsuccessful.'
				+ error.getCode() + ': ' + error.getDetails());
    }

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
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.createJournalLine';
    nlapiLogExecution('DEBUG', stLogTitle, 'stLineSub = ' + stLineSub + ' | stType = ' + stType + ' | stAcct = ' + stAcct + ' | stAmount = '
			+ stAmount);

    recTxn.selectNewLineItem('line');
    if (!Eval.isEmpty(stLineSub)) {
        recTxn.setCurrentLineItemValue('line', 'linesubsidiary', stLineSub); // ICJE
    }

    recTxn.setCurrentLineItemValue('line', stType, stAmount.toFixed(2));
    recTxn.setCurrentLineItemValue('line', 'account', stAcct);

    if (objStaticValues != null) {
        for (var stKeyObj in objStaticValues) {
            try {
                recTxn.setCurrentLineItemValue('line', stKeyObj, objStaticValues[stKeyObj]);
            } catch (error) {
                nlapiLogExecution('ERROR', stLogTitle, 'stKeyObj = ' + stKeyObj + ' | objStaticValues[stKeyObj] = ' + objStaticValues[stKeyObj]);
            }
        }
    }
    recTxn.commitLineItem('line');

}

/**
 * Update Timebill fields:
 * 
 * @param stJEId
 */
function updateTimeBills(stJEId, stKey) {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.updateTimeBills';

    nlapiLogExecution('DEBUG', stLogTitle, 'stJEId ' + stJEId);
    nlapiLogExecution('DEBUG', stLogTitle, JSON.stringify(OBJ_JOBS));

    if (!Eval.isEmpty(OBJ_JOBS[stKey])) {
        var arrTimeEntries = OBJ_JOBS[stKey].arrTimeEntries;
        var stRevRecJEId = OBJ_JOBS[stKey].stRevRecJEId;
        for (var intCtr = 0; intCtr < arrTimeEntries.length; intCtr++) {
            nlapiSubmitField('timebill', arrTimeEntries[intCtr], ['custcol_apco_timeentyr_je', 'custcol_apco_posted'], [stJEId, 'T']);
            nlapiLogExecution('AUDIT', stLogTitle, 'Updated Timebill # ' + arrTimeEntries[intCtr] + '| stJEId =' + stJEId + ' | stRevRecJEId ='
					+ stRevRecJEId);
        }
    }
}

/**
 * Send error status email
 */
function sendEmail() {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.sendEmail';

    // Send Email once done
    var stUser = nlapiGetUser();
    var stSubject = '[Retainer Plus Scheduled Script] Journal Entries Creation';
    var stBody = 'Date: ' + new Date() + ' <br/>';

    if (ARR_ERROR_DETAILS.length > 0) {
        stBody += 'Errors: <br/>';
        for (var intCtr = 0; intCtr < ARR_ERROR_DETAILS.length; intCtr++) {
            stBody += ' - ' + ARR_ERROR_DETAILS[intCtr] + '<br/>';
        }
    } else {
        stBody += 'Process Status: Successful.';
    }

    // Send Email
    nlapiLogExecution('DEBUG', stLogTitle, 'stUser = ' + stUser + '| stBody =' + stBody);
    nlapiSendEmail(stUser, stUser, stSubject, stBody);
}

/**
 * Search for all the Journal Entries
 * 
 * @param stRevRecSearch
 * @param stProjectId
 * @returns arrResults - search result of the saved search executed against
 *          transaction
 */
function searchJournalEntries(stRevRecSearch, arrJEs) {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.searchJournalEntries';

    // Filters
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('internalid', null, 'anyof', arrJEs));

    // Columns
    var arrColumns = [];
    var arrResults = SuiteUtil.search(stRevRecSearch, 'journalentry', arrFilters, arrColumns);

    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);
    return arrResults;
}

/**
 * Search for all Time Bills
 * 
 * @param stTimeEntrySearch
 * @param stJobId
 * @param stEndDate
 * @returns arrResults - search result of the saved search executed against
 *          transaction
 */
function searchTimeBills(stTimeEntrySearch, stJobId, stEndDate) {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.searchTimeBills';
    var arrResults = [];
    if (Eval.isEmpty(stJobId) || (Eval.isEmpty(stEndDate))) {
        nlapiLogExecution('DEBUG', stLogTitle, 'Job ID(' + stJobId + ') or End Date(' + stEndDate + ') is null');
        return arrResults;
    }

    // Filters
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('internalid', 'job', 'anyof', stJobId));
    arrFilters.push(new nlobjSearchFilter('date', null, 'onorbefore', stEndDate));
    nlapiLogExecution('DEBUG', stLogTitle, 'arrFilters = ' + stJobId + ' --- ' + stEndDate);
    // Results
    arrResults = SuiteUtil.search(stTimeEntrySearch, 'timebill', arrFilters, null);

    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);
    return arrResults;
}

/**
 * Search for Intercompany Chart Record based on subsidiary
 * 
 * @param arrSubsidiaries -
 *            Saved Search to execute
 * @returns arrResults - search result of the saved search executed against
 *          transaction
 */
function searchInterCoChart(arrSubsidiaries) {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.searchInterCoChart';

    // Filters
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('custrecord_subsidiary', null, 'anyof', arrSubsidiaries));

    // Columns
    var arrColumns = [];
    arrColumns.push(new nlobjSearchColumn('custrecord_subsidiary')); // Subsidiary
    arrColumns.push(new nlobjSearchColumn('custrecord_unbilled_ic_ar')); // Unbilled
    // IC
    // Receivable
    arrColumns.push(new nlobjSearchColumn('custrecord_accrued_ic_ap')); // Accrued
    // IC
    // Payable
    arrColumns.push(new nlobjSearchColumn('custrecord_ic_ar')); // InterCompany
    // AR
    arrColumns.push(new nlobjSearchColumn('custrecord_ic_ap')); // InterCompany
    // AP

    // Results
    var arrResults = SuiteUtil.search(null, 'customrecord_apco_intercompany_chart', arrFilters, arrColumns);
    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);

    return arrResults;
}

// ------------------------------------------------- UTILITY FUNCTIONS
// -------------------------------------------------

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
        } else {
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
                } else {
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

                // check if we are not reaching the max processing time which is
                // 3600000 seconds
                var objYield = nlapiYieldScript();
                if (objYield.status == 'FAILURE') {
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + 'Unable to Yield.');
                    nlapiLogExecution('DEBUG', stLoggerTitle, 'Script State : ' + JSON.stringify(
					{
					    'Status': objYield.status,
					    'Information': objYield.information,
					    'Reason': objYield.reason
					}));
                } else {
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