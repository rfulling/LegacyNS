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
 *Module Description TDD 2: Retainer Plus Time Only
 * 
 * Version 		Date 	 	Author 		Remarks
 *   1.00	  10 Mar 2016 	lbalboa 	Scheduled Script for Retainer Plus 
 *   1.10 	  23 Mar 2016	mjpascual 	Fix/Clean-up 
 *   2.00 	  13 Apr 2016   lbalboa 	Added Codes for Retainer Less 
 *   2.10 	  18 Apr 2016 	lbalboa 	Added fix for the Retainer Less 
 *   3.00 	  21 Apr 2016 	lbalboa 	Code Review fix for the retainer less
 *   3.50	  29 Apr 2016	lbalboa		Updated the Unbilled Computations. 
 *   									Added the codes to attached unbilled JE and RevRec JE to Time bill
 *   4.00	  10 May 2016	lbalboa		Updated the Accounts using the accounts in the Item.
 *   5.00     26 July 2016  mjpascual   Fix Posting Period
 *   6.00     31 Aug 2016   mjpascual   Divide into 2 JEs
 *   7.00     24 Sept 2016  mjpascual   Create a JE reversal, then compute for new amount based on exchange rate
 *   8.00     12 Oct 2016   mjpascual   Apply the new column created in the retainerless saved search
 */

var CONTEXT = nlapiGetContext();
var INT_USAGE_LIMIT_THRESHOLD = 1000;
var INT_START_TIME = new Date().getTime();

var OBJ_ACCTS = {};
var OBJ_JOBS = {};
var OBJ_ICJE_ACCOUNTS = {};
var OBJ_SUBSIDIARIES = {};
var ARR_ERROR_DETAILS = [];
var ARR_RETAINERLESS = [];

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
        var stJEsToProcess = CONTEXT.getSetting('SCRIPT', 'custscript_je_ids');
        var stRevRecSearch = CONTEXT.getSetting('SCRIPT', 'custscript_rev_rec_savedsearch');
        var stTimeEntrySearch = CONTEXT.getSetting('SCRIPT', 'custscript_time_entry_savedsearch');
        var stTimeEntryGrpSearch = CONTEXT.getSetting('SCRIPT', 'custscript_time_entry_grp_savedsearch');
        var stTransactionRetainerLess = CONTEXT.getSetting('SCRIPT', 'custscript_transaction_retainer_less');
        var stRetainerLessJE = CONTEXT.getSetting('SCRIPT', 'custscript_retainer_less_je');
        var stTransactionRetainerLess2 = CONTEXT.getSetting('SCRIPT', 'custscript_transaction_retainer_less2');

        var stRetainerItem = CONTEXT.getSetting('SCRIPT', 'custscript_apco_retainer_item');
        var stDisbItem = CONTEXT.getSetting('SCRIPT', 'custscript_apco_disb_item');
        var stDiscItem = CONTEXT.getSetting('SCRIPT', 'custscript_apco_disc_item');
        var stRetainerless = CONTEXT.getSetting('SCRIPT', 'custscript_apco_retainerless_proj');

        // Init JE accts
        OBJ_ACCTS.jeRebate = CONTEXT.getSetting('SCRIPT', 'custscript_je_rebate');
        OBJ_ACCTS.jeRebates = CONTEXT.getSetting('SCRIPT', 'custscript_je_rebates');
        OBJ_ACCTS.icjeFeeRev = CONTEXT.getSetting('SCRIPT', 'custscript_icje_fee_revenue');
        OBJ_ACCTS.icjeIncomeVolDisc = CONTEXT.getSetting('SCRIPT', 'custscript_icje_income_accnt_volume');
        OBJ_ACCTS.icjeIncomeRebate = CONTEXT.getSetting('SCRIPT', 'custscript_icje_income_account_reb');
        OBJ_ACCTS.icjeIntercompRev = CONTEXT.getSetting('SCRIPT', 'custscript_icje_intercompany_rev');
        OBJ_ACCTS.unbilledAccount = CONTEXT.getSetting('SCRIPT', 'custscript_unbilled_account');

        // done ---- NEW Variables
        // Validate script parameters
        if (Eval.isEmpty(stJEsToProcess) || Eval.isEmpty(stRevRecSearch) || Eval.isEmpty(stTimeEntrySearch) || Eval.isEmpty(stTimeEntryGrpSearch) || Eval.isEmpty(stTransactionRetainerLess)
				|| Eval.isEmpty(stRetainerItem) || Eval.isEmpty(stDisbItem) || Eval.isEmpty(stDiscItem) || Eval.isEmpty(OBJ_ACCTS.jeRebate) || Eval.isEmpty(OBJ_ACCTS.jeRebates)
				|| Eval.isEmpty(OBJ_ACCTS.icjeFeeRev) || Eval.isEmpty(OBJ_ACCTS.icjeIncomeVolDisc) || Eval.isEmpty(OBJ_ACCTS.icjeIncomeRebate) || Eval.isEmpty(OBJ_ACCTS.icjeIntercompRev)
				|| Eval.isEmpty(OBJ_ACCTS.unbilledAccount) || Eval.isEmpty(stRetainerless) || Eval.isEmpty(stTransactionRetainerLess2)) {
            throw nlapiCreateError('EMPTY_SCRIPT_PARAMETER', 'Script Parameters should not be empty.');
        }

        ARR_RETAINERLESS = stRetainerless.split(',');

        // lbalboa 5/10/16 added to setValues from item look up
        setItemValues(stRetainerItem, stDisbItem, stDiscItem);

        var arrJEsToProcess = stJEsToProcess.split(',');
        nlapiLogExecution('DEBUG', stLogTitle, 'arrJEsToProcess = ' + arrJEsToProcess);

        //7.0 start mjpascual 09/24/16 - check and reverse JE when Subsidiary currency does NOT equal the Job Currency
        getSubsidiaries();
        arrJEsToProcess = checkJEsToProcess(stRetainerLessJE, arrJEsToProcess);
        //7.0 end mjpascual 09/24/16 

        // check if it has unbilled time
        // lbalboa updated 4/29/2016
        var arrKeys = processedJEWithUnbilledAmounts(arrJEsToProcess, stTimeEntrySearch, stRetainerLessJE, stTransactionRetainerLess, stRevRecSearch, stTransactionRetainerLess2);
        // Set Time Entry custom fields
        // Loop jobs that will be processed
        var unbilledJE = null;

        for (var inKey = 0; inKey < arrKeys.length; inKey++) {
            var stKey = arrKeys[inKey];
            var stJobId = OBJ_JOBS[stKey].stJobId;
            var stEndDate = OBJ_JOBS[stKey].stEndDate;
            var stRevRecJEId = OBJ_JOBS[stKey].stRevRecJEId;
            var stUnbilledAmount = OBJ_JOBS[stKey].unbilledAmount;

            //MJ Start 07/26/2016  
            var stTranDate = OBJ_JOBS[stKey].stTranDate;
            var stPostingPd = OBJ_JOBS[stKey].stPostingPd;
            //MJ end 07/26/2016  

            if (Eval.isEmpty(stRevRecJEId)) {
                nlapiLogExecution('DEBUG', stLogTitle, 'EMPTY stRevRecJEId');
                continue;
            }
            var arrTimeEntries = searchTimeBills(stTimeEntryGrpSearch, stJobId, stEndDate);

            // Loop time entrys result to process JE
            for (var intCtr = 0; intCtr < arrTimeEntries.length; intCtr++) {
                var obj = arrTimeEntries[intCtr];

                // Setter
                var objTimeEntry = {};
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
                objTimeEntry.stProjectSubCurr = OBJ_SUBSIDIARIES[objTimeEntry.stProjectSub].currency;
                objTimeEntry.stProjectCurr = obj.getValue('currency', 'job', 'group');
                objTimeEntry.stProjectName = obj.getValue('altname', 'job', 'group');
                objTimeEntry.stProjEndDate = obj.getValue('custentity_apco_proj_period_end_date', 'job', 'group');
                //rf added 
                objTimeEntry.stProjectSubName = obj.getText('subsidiary', 'job', 'group');
                objTimeEntry.stEmpSubName = obj.getText('subsidiary', 'employee', 'group');

                //MJ Start 07/26/2016  
                objTimeEntry.stTranDate = stTranDate;
                objTimeEntry.stPostingPd = stPostingPd;
                //MJ end 07/26/2016  

                // check if unbilledamount is there
                if (Parse.forceFloat(stUnbilledAmount) != 0.00) {
                    unbilledJE = createUnbilledJE(objTimeEntry, stRevRecJEId, stUnbilledAmount, unbilledJE);
                }

                // check if employee sub is equal to project sub
                if (objTimeEntry.stEmpSub == objTimeEntry.stProjectSub) {
                    // create standard Journal
                    createJournalEntry(objTimeEntry, stRevRecJEId);
                }
                else {
                    nlapiLogExecution('DEBUG', stLogTitle, 'objTimeEntry.stProjectCurr = ' + objTimeEntry.stProjectCurr + ' | objTimeEntry.stProjectSubCurr = ' + objTimeEntry.stProjectSubCurr);

                    if (objTimeEntry.stProjectCurr != objTimeEntry.stProjectSubCurr) {
                        //6.00 MJ Start -> Create 2 JEs
                        var stJE1 = createJE1(objTimeEntry, stRevRecJEId);
                        var stJE2 = createJE2(objTimeEntry, stRevRecJEId);

                        var stKey = stRevRecJEId + '-' + objTimeEntry.stProject + '-' + objTimeEntry.stEmployeeId;
                        nlapiLogExecution('DEBUG', stLogTitle, 'stJE1= ' + stJE1 + ' | stJE2 = ' + stJE2);
                        updateTimeBills(stJE1, stKey, stRevRecJEId, stJE2);
                        //6.00 MJ End
                    }
                    else {
                        //Create ICJE
                        createIntercompanyJournalEntry(objTimeEntry, stRevRecJEId);
                    }
                }

                // Monitor usage unit / time run
                INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);

            }

        }

        // Send email upon completion
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
 *Get Subsidiaires and store it in an obj
 * 
 */
function getSubsidiaries() {
    var stLogTitle = 'getSubsidiaries';

    var arrSubsidiaries = searchSubsidiaries();
    for (var intCtr = 0; intCtr < arrSubsidiaries.length; intCtr++) {
        var objSub = arrSubsidiaries[intCtr];
        var stId = objSub.getId();
        var stCurrency = objSub.getValue('currency');

        if (Eval.isEmpty(OBJ_SUBSIDIARIES[stId])) {
            OBJ_SUBSIDIARIES[stId] = {};
            OBJ_SUBSIDIARIES[stId].currency = stCurrency;
        }
    }

    nlapiLogExecution('DEBUG', stLogTitle, 'OBJ_SUBSIDIARIES = ' + JSON.stringify(OBJ_SUBSIDIARIES));

}

/**
 * Check JEs to process
 * 
 * @param arrJEsToProcess
 * @param stTimeEntrySearch
 * @param stRevRecSearch
 */
function checkJEsToProcess(stRetainerLessJE, arrJEsToProcess) {
    var stLogTitle = 'checkJEsToProcess';

    var arrJournalEntries = searchJournalEntries(stRetainerLessJE, arrJEsToProcess);
    nlapiLogExecution('DEBUG', stLogTitle, 'arrJournalEntries.length = ' + arrJournalEntries.length);

    var arrProcessed = [];
    // For each result, check if Subsidiary currency does NOT equal the Job Currency
    for (var intLineCtr = 0; intLineCtr < arrJournalEntries.length; intLineCtr++) {
        var objJE = arrJournalEntries[intLineCtr];
        var stJEId = objJE.getId();
        var stJEDocId = objJE.getValue('tranid');
        var stProjId = objJE.getValue('internalid', 'job');
        var stProjCurrency = objJE.getValue('currency', 'job');
        var stProjectSubsidiaryId = objJE.getValue('subsidiary', 'job');
        var stProjSubsidiaryCurrency = OBJ_SUBSIDIARIES[stProjectSubsidiaryId].currency;
        var stProjType = objJE.getValue('jobtype', 'job');
        var stSubsidiary = objJE.getValue('subsidiary');
        var stDate = objJE.getValue('trandate');
        var stPd = objJE.getValue('postingperiod');

        if (Eval.inArray(stJEId, arrProcessed)) {
            continue;
        }

        nlapiLogExecution('DEBUG', stLogTitle, 'stProjCurrency = ' + stProjCurrency + ' | stProjSubsidiaryCurrency = ' + stProjSubsidiaryCurrency + ' | stProjType = ' + stProjType);

        if (stProjCurrency != stProjSubsidiaryCurrency) {

            nlapiLogExecution('DEBUG', stLogTitle, 'creating reversal JE...');
            var flExcRate = '';

            //Reverse it
            var recReverseJE = nlapiCreateRecord('journalentry', { recordmode: 'dynamic' });
            recReverseJE.setFieldValue('subsidiary', stSubsidiary);
            recReverseJE.setFieldValue('currency', stProjCurrency);
            recReverseJE.setFieldValue('memo', 'Reverse ' + stJEDocId);
            recReverseJE.setFieldValue('trandate', stDate);
            recReverseJE.setFieldValue('postingperiod', stPd);
            recReverseJE.setFieldValue('custbody_apco_processed', 'T');

            //Load JE
            var recRevRec = nlapiLoadRecord('journalentry', stJEId);
            var intRevJELen = recRevRec.getLineItemCount('line');
            nlapiLogExecution('DEBUG', stLogTitle, 'intRevJELen = ' + intRevJELen);

            for (var intCtrx = 1; intCtrx <= intRevJELen; intCtrx++) {

                nlapiLogExecution('DEBUG', stLogTitle, 'stProjId = ' + stProjId);

                //Search for Revenue Commitments
                if (Eval.isEmpty(flExcRate)) {
                    var arrRevCommit = searchRevCommit(stProjId);
                    if (!Eval.isEmpty(arrRevCommit)) {
                        flExcRate = Parse.forceFloat(arrRevCommit[0].getValue('exchangerate', null, 'MAX'));
                    }
                }

                nlapiLogExecution('DEBUG', stLogTitle, 'flExcRate = ' + flExcRate);
                recReverseJE.setFieldValue('exchangerate', flExcRate);

                var stEntity = recRevRec.getLineItemValue('line', 'entity', intCtrx);
                var stAcct = recRevRec.getLineItemValue('line', 'account', intCtrx);
                var stCredit = recRevRec.getLineItemValue('line', 'credit', intCtrx);
                var stDebit = recRevRec.getLineItemValue('line', 'debit', intCtrx);

                var objStaticValues = {};
                objStaticValues.memo = 'Reverse ' + stJEDocId;
                objStaticValues.entity = stEntity;
                objStaticValues.custcol_apco_local_project_fx = 'T';
                nlapiLogExecution('DEBUG', stLogTitle, 'objStaticValues = ' + JSON.stringify(objStaticValues));

                if (!Eval.isEmpty(stCredit)) {
                    var flCredit = Parse.forceFloat(stCredit) / flExcRate;
                    createJournalLine(recReverseJE, null, 'debit', stAcct, flCredit, objStaticValues);
                }
                else {
                    var flDebit = Parse.forceFloat(stDebit) / flExcRate;
                    createJournalLine(recReverseJE, null, 'credit', stAcct, flDebit, objStaticValues);
                }

            }

            if (Eval.isEmpty(flExcRate)) {
                recReverseJE.setFieldValue('exchangerate', 1);
            }

            recReverseJE.setFieldValue('exchangerate', flExcRate);
            nlapiLogExecution('DEBUG', stLogTitle, 'flExcRate = ' + flExcRate);
            nlapiLogExecution('DEBUG', stLogTitle, 'Submit');

            var stRevJE = nlapiSubmitRecord(recReverseJE);
            nlapiLogExecution('AUDIT', stLogTitle, 'Created stRevJE = ' + stRevJE);

            //Create new JE 
            var recCorrectJE = nlapiCopyRecord('journalentry', stRevJE);
            recCorrectJE.setFieldValue('custbody_apco_processed', 'F');
            recCorrectJE.setFieldValue('trandate', stDate);
            recCorrectJE.setFieldValue('postingperiod', stPd);
            recCorrectJE.setFieldValue('memo', 'Revrec restated from ' + stJEDocId);
            recCorrectJE.setFieldValue('exchangerate', flExcRate);

            var intRevJELen = recCorrectJE.getLineItemCount('line');
            for (var intCtr = 1; intCtr <= intRevJELen; intCtr++) {
                var stCredit = recCorrectJE.getLineItemValue('line', 'credit', intCtr);
                var stDebit = recCorrectJE.getLineItemValue('line', 'debit', intCtr);

                if (!Eval.isEmpty(stCredit)) {
                    var flCredit = Parse.forceFloat(stCredit);
                    recCorrectJE.setLineItemValue('line', 'debit', intCtr, flCredit);
                }
                else {
                    var flDebit = Parse.forceFloat(stDebit);
                    recCorrectJE.setLineItemValue('line', 'credit', intCtr, flDebit);
                }

                recCorrectJE.setLineItemValue('line', 'memo', intCtr, 'Revrec restated from ' + stJEDocId);

            }

            var stCorrectJEId = nlapiSubmitRecord(recCorrectJE);
            nlapiLogExecution('AUDIT', stLogTitle, 'Created stCorrectJEId = ' + stCorrectJEId);

            //Remove from the array
            var intIndex = arrJEsToProcess.indexOf(stJEId);
            if (intIndex > -1) {
                arrJEsToProcess.splice(intIndex, 1);
            }
            arrJEsToProcess.push(stCorrectJEId);

            recRevRec.setFieldValue('custbody_apco_processed', 'T');
            var stRevRecId = nlapiSubmitRecord(recRevRec);
            nlapiLogExecution('AUDIT', stLogTitle, 'Updated stRevRecId = ' + stRevRecId);
        }

        arrProcessed.push(stJEId);
    }

    return arrJEsToProcess;
}

/**
 * Set Time Entry Custom Fields: Labor, Disb, Disc, Rebate
 * 
 * @param arrJEsToProcess
 * @param stTimeEntrySearch
 * @param stRevRecSearch
 */
function setTimeEntryCustomFields(arrJEsProcess, stTimeEntrySearch, stRevRecSearch) {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.setTimeEntryCustomFields';
    // Search again for JEs
    var arrJEsToProcess = searchJournalEntries(stRevRecSearch, arrJEsProcess);

    // For each result, save project
    for (var intLineCtr = 0; intLineCtr < arrJEsToProcess.length; intLineCtr++) {
        var stRevRecJEId = arrJEsToProcess[intLineCtr].getId();
        var flAmount = arrJEsToProcess[intLineCtr].getValue('fxamount');
        var stJobId = arrJEsToProcess[intLineCtr].getValue('internalid', 'job');
        var stEndDate = arrJEsToProcess[intLineCtr].getValue('custentity_apco_proj_period_end_date', 'job');

        //mj start 7/26/2016
        var stTranDate = arrJEsToProcess[intLineCtr].getValue('trandate');
        var stPostingPd = arrJEsToProcess[intLineCtr].getValue('postingperiod');
        //mj end 7/26/2016

        var bolProcess = false;

        nlapiLogExecution('DEBUG', stLogTitle, 'stJobId = ' + stJobId + ' | stTranDate = ' + stTranDate + ' | stPostingPd = ' + stPostingPd);

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
        nlapiLogExecution('DEBUG', stLogTitle, 'flTotalRevAmnt = ' + flTotalRevAmnt + ' | flAmount = ' + flAmount + '| arrTimeBills.length = ' + arrTimeBills.length + '| flDuration = ' + flDuration);

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

            nlapiLogExecution('DEBUG', stLogTitle, 'stTimeEntryId = ' + stTimeEntryId + ' | flRevAmnt = ' + flRevAmnt + ' | flDisbFee = ' + flDisbFee + ' | flDiscount = ' + flDiscount
					+ ' | flRebate = ' + flRebate);

            // Compute
            nlapiLogExecution('DEBUG', stLogTitle, 'flRevAmnt = ' + flRevAmnt + ' | flTotalRevAmnt = ' + flTotalRevAmnt + ' | flRevAmnt / flTotalRevAmnt = ' + flRevAmnt / flTotalRevAmnt);
            var flRevPercent = Parse.forceFloat(flRevAmnt / flTotalRevAmnt);
            nlapiLogExecution('DEBUG', stLogTitle, 'flRevPercent = ' + flRevPercent);
            var fLaborFee = flRevPercent * flAmount;
            var flDiscountAmnt = fLaborFee * flDiscount;
            var flDisbAmnt = fLaborFee * flDisbFee;
            var flRebateAmnt = fLaborFee * flRebate;

            try {
                nlapiSubmitField('timebill', stTimeEntryId,
				[
						'custcol_apco_labor_fee_distribution', 'custcol_apco_discount_distr', 'custcol_apco_disb_fee_rev_distr', 'custcol_apco_rebate_distr'
				],
				[
						fLaborFee, flDiscountAmnt, flDisbAmnt, flRebateAmnt
				]);
                nlapiLogExecution('AUDIT', stLogTitle, 'flRevPercent = ' + flRevPercent + ' | fLaborFee = ' + fLaborFee + ' | flDiscountAmnt = ' + flDiscountAmnt + ' | flDisbAmnt = ' + flDisbAmnt
						+ ' | flRebateAmnt = ' + flRebateAmnt);
            }
            catch (err) {
                nlapiLogExecution('ERROR', stLogTitle, 'Setting of Timebill values failed. Id #' + stTimeEntryId);
                ARR_ERROR_DETAILS.push('Setting of Timebill values failed. Id #' + stTimeEntryId);
            }
            // Push Time Entries
            var stKey = stRevRecJEId + '-' + stJobId + '-' + stEmpId;
            if (Eval.isEmpty(OBJ_JOBS[stKey])) {
                OBJ_JOBS[stKey] = {};
                OBJ_JOBS[stKey].stJobId = stJobId;
                OBJ_JOBS[stKey].stEndDate = stEndDate;
                OBJ_JOBS[stKey].stEmpId = stEmpId;
                OBJ_JOBS[stKey].stRevRecJEId = stRevRecJEId;

                //MJ start 07/26/2016  
                OBJ_JOBS[stKey].stTranDate = stTranDate;
                OBJ_JOBS[stKey].stPostingPd = stPostingPd;
                //MJ end 07/26/2016  

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

    }

}

/**
 * Set Time Entry Custom Fields: Labor, Disb, Disc, Rebate
 * 
 * @param arrJEsToProcess
 * @param stTimeEntrySearch
 * @param stRetainerLessJE
 * @param stTransactionRetainerLess
 * @param stRevRecSearch
 * @param stTransactionRetainerLess2
 */
function processedJEWithUnbilledAmounts(arrJEsToProcess, stTimeEntrySearch, stRetainerLessJE, stTransactionRetainerLess, stRevRecSearch, stTransactionRetainerLess2) {

    var stLogTitle = 'scheduled_ProcessRevenueRecognition.checkForUnbilledAmount';
    var arrJournalEntries = searchJournalEntries(stRetainerLessJE, arrJEsToProcess);
    nlapiLogExecution('DEBUG', stLogTitle, 'arrJournalEntries.length = ' + arrJournalEntries.length);

    var arrTmpJEId = [];
    var objJournalEntry = {};
    var arrKeys = new Array();
    // first loop
    for (var inLineCntr = 0; inLineCntr < arrJournalEntries.length; inLineCntr++) {

        var intJournalEntryId = arrJournalEntries[inLineCntr].getId();
        nlapiLogExecution('DEBUG', stLogTitle, 'intJournalEntryId = ' + intJournalEntryId);
        // Create JE object

        // check for unbilled amount
        var stJobId = arrJournalEntries[inLineCntr].getValue('internalid', 'job');
        var stEndDate = arrJournalEntries[inLineCntr].getValue('custentity_apco_proj_period_end_date', 'job');
        var stProjType = arrJournalEntries[inLineCntr].getValue('jobtype', 'job');
        var stProjCurrency = arrJournalEntries[inLineCntr].getValue('currency', 'job');
        var stProjectSubsidiaryId = arrJournalEntries[inLineCntr].getValue('subsidiary', 'job');
        var stProjSubsidiaryCurrency = OBJ_SUBSIDIARIES[stProjectSubsidiaryId].currency;

        nlapiLogExecution('DEBUG', stLogTitle, 'stJobId = ' + stJobId + ' | stEndDate =' + stEndDate + ' | stProjType =' + stProjType + ' | stProjCurrency =' + stProjCurrency + ' | stProjSubsidiaryCurrency =' + stProjSubsidiaryCurrency);

        var stUnbilledAmount = getUnbilledAmount(stJobId, stEndDate, stTransactionRetainerLess, stProjType, stProjCurrency, stProjSubsidiaryCurrency);
        nlapiLogExecution('DEBUG', stLogTitle, 'stUnbilledAmount = ' + stUnbilledAmount);

        markRebillTransactions(stJobId, stEndDate, stTransactionRetainerLess2);

        //mj start 7/26/2016
        var stTranDate = arrJournalEntries[inLineCntr].getValue('trandate');
        var stPostingPd = arrJournalEntries[inLineCntr].getValue('postingperiod');
        //mj end 7/26/2016

        nlapiLogExecution('DEBUG', stLogTitle, 'stUnbilledAmount after getUnbilled = ' + stUnbilledAmount);
        nlapiLogExecution('DEBUG', stLogTitle, 'intJournalEntryId = ' + intJournalEntryId);

        if (!objJournalEntry[intJournalEntryId]) {
            objJournalEntry[intJournalEntryId] = {};
            objJournalEntry[intJournalEntryId].id = intJournalEntryId;
            objJournalEntry[intJournalEntryId].jobid = stJobId;
            objJournalEntry[intJournalEntryId].endDate = stEndDate;
            //mj start 7/26/2016
            objJournalEntry[intJournalEntryId].stTranDate = stTranDate;
            objJournalEntry[intJournalEntryId].stPostingPd = stPostingPd;
            //mj end 7/26/2016
            objJournalEntry[intJournalEntryId].feeRevenue = 0.00;
            objJournalEntry[intJournalEntryId].disbursementRev = 0.00;
            objJournalEntry[intJournalEntryId].discountRev = 0.00;
            objJournalEntry[intJournalEntryId].rebates = 0.00;
            objJournalEntry[intJournalEntryId].unbilledAmount = stUnbilledAmount; // Search unbilled amount
            arrTmpJEId.push(intJournalEntryId);
        }
        objJournalEntry[intJournalEntryId].amount = arrJournalEntries[inLineCntr].getValue('fxamount');
        objJournalEntry[intJournalEntryId].account = arrJournalEntries[inLineCntr].getValue('account');

        // lbalboa 5/10/16 - Change case OBJ_ACCTS.icjeIncomeDisbFee to case
        // OBJ_ACCTS.jeDisbFee
        switch (objJournalEntry[intJournalEntryId].account) {
            case OBJ_ACCTS.jeFeeRetainer:
                objJournalEntry[intJournalEntryId].feeRevenue = objJournalEntry[intJournalEntryId].amount - objJournalEntry[intJournalEntryId].unbilledAmount;
                break;
            case OBJ_ACCTS.jeDisbFee:
                objJournalEntry[intJournalEntryId].disbursementRev = objJournalEntry[intJournalEntryId].amount;
                break;
            case OBJ_ACCTS.jeVolDisc:
                objJournalEntry[intJournalEntryId].discountRev = objJournalEntry[intJournalEntryId].amount;
                break;
            case OBJ_ACCTS.jeRebates:
                objJournalEntry[intJournalEntryId].rebates = objJournalEntry[intJournalEntryId].feeRevenue;
                break;
        }
        INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);
    }
    // second loop
    for (var inLineCtr = 0; inLineCtr < arrTmpJEId.length; inLineCtr++) {
        nlapiLogExecution('DEBUG', stLogTitle, 'arrTmpJEId[intLineCtr] = ' + arrTmpJEId[inLineCtr]);
        var objJE = objJournalEntry[arrTmpJEId[inLineCtr]];

        var arrTimeBills = searchTimeBills(stTimeEntrySearch, objJE.jobid, objJE.endDate);
        var flTotalRevAmnt = 0;

        for (var inLC = 0; inLC < arrTimeBills.length; inLC++) {
            var objRes = arrTimeBills[inLC];
            var flDuration = Parse.forceFloat(objRes.getValue('durationdecimal'));
            var flRate = Parse.forceFloat(objRes.getValue('rate'));
            var flRevAmnt = Parse.forceFloat(flDuration) * Parse.forceFloat(flRate);
            flTotalRevAmnt += flRevAmnt;
        }
        // Get Amount per Type and submit field
        for (var inLineCount = 0; inLineCount < arrTimeBills.length; inLineCount++) {
            // Getters
            // lbalboa updated 4/29/2016 Start
            var objRes = arrTimeBills[inLineCount];
            var stTimeEntryId = objRes.getId();
            var stEmpId = objRes.getValue('internalid', 'employee');
            var flDuration = Parse.forceFloat(objRes.getValue('durationdecimal'));
            var flRate = Parse.forceFloat(objRes.getValue('rate'));
            var flRevAmnt = Parse.forceFloat(flDuration) * Parse.forceFloat(flRate);
            var flDisbFee = Parse.forceFloat(objRes.getValue('custentity_apco_disbursement_fee_pct', 'job')) / 100;
            var flDiscount = Parse.forceFloat(objRes.getValue('custentity_apco_discount_pct', 'job')) / 100;
            var flRebate = Parse.forceFloat(objRes.getValue('custentity_apco_rebate_pct', 'job')) / 100;

            nlapiLogExecution('DEBUG', stLogTitle, 'stTimeEntryId = ' + stTimeEntryId + ' | flRevAmnt = ' + flRevAmnt + ' | flDisbFee = ' + flDisbFee + ' | flDiscount = ' + flDiscount
					+ ' | flRebate = ' + flRebate);
            // Compute
            var flRevPercent = Parse.forceFloat(flRevAmnt / flTotalRevAmnt);
            nlapiLogExecution('DEBUG', stLogTitle, 'flRevPercent = ' + flRevPercent);
            var fLaborFee = flRevPercent * Parse.forceFloat(objJE.feeRevenue);
            var flDiscountAmnt = flRevPercent * Parse.forceFloat(objJE.discountRev);
            var flDisbAmnt = flRevPercent * Parse.forceFloat(objJE.disbursementRev);
            var flRebateAmnt = flRebate * Parse.forceFloat(fLaborFee);
            try {
                nlapiSubmitField('timebill', stTimeEntryId,
				[
						'custcol_apco_labor_fee_distribution', 'custcol_apco_discount_distr', 'custcol_apco_disb_fee_rev_distr', 'custcol_apco_rebate_distr'
				],
				[
						fLaborFee, flDiscountAmnt, flDisbAmnt, flRebateAmnt
				]);
                nlapiLogExecution('AUDIT', stLogTitle, ' | fLaborFee = ' + fLaborFee + ' | flDiscountAmnt = ' + flDiscountAmnt + ' | flDisbAmnt = ' + flDisbAmnt + ' | flRebateAmnt = ' + flRebateAmnt);
            }
            catch (err) {
                nlapiLogExecution('ERROR', stLogTitle, 'Setting of Timebill values failed. Id #' + stTimeEntryId);
                ARR_ERROR_DETAILS.push('Setting of Timebill values failed. Id #' + stTimeEntryId);
            }
            // Push Time Entries
            var stKey =
			[
					objJE.id, objJE.jobid, stEmpId
			].join('-');

            if (Eval.isEmpty(OBJ_JOBS[stKey])) {
                OBJ_JOBS[stKey] = {};
                OBJ_JOBS[stKey].stJobId = objJE.jobid;
                OBJ_JOBS[stKey].stEndDate = objJE.endDate;

                //MJ start 07/26/2016  
                OBJ_JOBS[stKey].stTranDate = objJE.stTranDate;
                OBJ_JOBS[stKey].stPostingPd = objJE.stPostingPd;
                //MJ end 07/26/2016  

                OBJ_JOBS[stKey].stEmpId = stEmpId;
                OBJ_JOBS[stKey].stRevRecJEId = arrTmpJEId[inLineCount];
                OBJ_JOBS[stKey].arrTimeEntries = [];
                OBJ_JOBS[stKey].unbilledAmount = objJE.unbilledAmount
                arrKeys.push(stKey);
            }

            OBJ_JOBS[stKey].arrTimeEntries.push(stTimeEntryId);
            INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);
        }

        nlapiSubmitField('journalentry', arrTmpJEId[inLineCtr], 'custbody_apco_processed', 'T');
        nlapiLogExecution('AUDIT', stLogTitle, 'stRevRecJEId = ' + arrTmpJEId[inLineCtr] + " Processed Checkbox is ticked");
        // lbalboa updated 4/29/2016 End
        INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);
    }
    return arrKeys
}

/**
 * Get Unbilled Amt
 * 
 * @param stJobId
 * @param stEndDate
 * @param stTransactionRetainerLess
 * @param stJobType
 * @param stProjCurrency
 * @param stProjSubsidiaryCurrency
 */
function getUnbilledAmount(stJobId, stEndDate, stTransactionRetainerLess, stJobType, stProjCurrency, stProjSubsidiaryCurrency) {
    var stLogTitle = 'getUnbilledAmount';

    if (Eval.isEmpty(stEndDate)) {
        throw "Set Project End Date (custentity_apco_proj_period_end_date)";
    }

    var arrUnbilledAmount = searchUnbilledTransAmt(stTransactionRetainerLess, stJobId, stEndDate);
    var stUnbilledAmount = 0;

    if (!Eval.isEmpty(arrUnbilledAmount) && arrUnbilledAmount.length > 0) {
        for (var intRes = 0; intRes < arrUnbilledAmount.length; intRes++) {
            var objUnbilledAmt = arrUnbilledAmount[intRes];

            nlapiLogExecution('DEBUG', stLogTitle, 'stJobType = ' + stJobType + " | ARR_RETAINERLESS =" + ARR_RETAINERLESS + ' | stProjSubsidiaryCurrency =' + stProjSubsidiaryCurrency + ' | stProjCurrency =' + stProjCurrency);

            //MJ 10/12/2016 - Retainerless
            if (Eval.inArray(stJobType, ARR_RETAINERLESS) && stProjSubsidiaryCurrency != stProjCurrency) {
                stUnbilledAmount += Parse.forceFloat(objUnbilledAmt.getValue('formulacurrency', null, 'sum'));
            }
            else {
                stUnbilledAmount += Parse.forceFloat(objUnbilledAmt.getValue('fxamount', null, 'sum'));
            }

        }
    }

    return stUnbilledAmount;
}

/**
 * Mark custom field so that the transaction will not show on the PM Approval
 * 
 * @param stJobId
 * @param stEndDate
 * @param stTransactionRetainerLess2
 */
function markRebillTransactions(stJobId, stEndDate, stTransactionRetainerLess2) {
    var stLogTitle = 'markRebillTransactions';

    if (Eval.isEmpty(stEndDate)) {
        throw "Set Project End Date (custentity_apco_proj_period_end_date)";
    }

    var arrUnbilledTrans = searchUnbilledTransAmt(stTransactionRetainerLess2, stJobId, stEndDate);

    if (!Eval.isEmpty(arrUnbilledTrans) && arrUnbilledTrans.length > 0) {
        nlapiLogExecution('DEBUG', stLogTitle, 'arrUnbilledTrans.length = ' + arrUnbilledTrans.length);

        for (var intRes = 0; intRes < arrUnbilledTrans.length; intRes++) {

            var objUnbilledAmt = arrUnbilledTrans[intRes];
            var stTransId = objUnbilledAmt.getId();
            var stTranType = objUnbilledAmt.getValue('type');

            nlapiLogExecution('DEBUG', stLogTitle, 'stTransId = ' + stTransId + " | stTranType =" + stTranType);

            var recTrans = null;
            var arrSubtabs = ['expense'];
            if (stTranType == 'VendBill') {
                recTrans = nlapiLoadRecord('vendorbill', stTransId);
                arrSubtabs.push('item');
            }
            else if (stTranType == 'ExpRept') {
                recTrans = nlapiLoadRecord('expensereport', stTransId);
            }

            if (!Eval.isEmpty(recTrans)) {
                for (var intCtrSubtab = 0; intCtrSubtab < arrSubtabs.length; intCtrSubtab++) {
                    var stSubtab = arrSubtabs[intCtrSubtab];
                    var intSubListCount = recTrans.getLineItemCount(stSubtab);

                    nlapiLogExecution('DEBUG', stLogTitle, 'stSubtab = ' + stSubtab + " | intSubListCount =" + intSubListCount);
                    for (var intCtrTran = 1; intCtrTran <= intSubListCount; intCtrTran++) {
                        recTrans.setLineItemValue(stSubtab, 'custcol_apco_writeoff_processed', intCtrTran, 'T');
                    }
                }

                var stSubId = nlapiSubmitRecord(recTrans);
                nlapiLogExecution('AUDIT', stLogTitle, 'Updated stSubId = ' + stSubId);
            }
        }
    }
}

/**
 * Creation of JE
 * 
 * @param objTimeEntry
 * @param stRevRecJEId
 * 
 */
function createUnbilledJE(objTimeEntry, stRevRecJEId, stUnbilled, unbilledJEs) {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.createUnbilledJE';

    nlapiLogExecution('DEBUG', stLogTitle, 'objTimeEntry = ' + JSON.stringify(objTimeEntry));

    // Set Key
    var stKey = stRevRecJEId + '-' + objTimeEntry.stProject + '-' + objTimeEntry.stEmployeeId;
    nlapiLogExecution('DEBUG', stLogTitle, 'stKey = ' + stKey + ' unbilledJEs =' + unbilledJEs);

    // Create Journal Entries
    if (Eval.isEmpty(unbilledJEs)) {
        var recJE = nlapiCreateRecord('journalentry',
		{
		    recordmode: 'dynamic'
		});

        recJE.setFieldValue('subsidiary', objTimeEntry.stProjectSub);
        recJE.setFieldValue('currency', objTimeEntry.stProjectCurr);
        if (!Eval.isEmpty(stRevRecJEId)) {
            recJE.setFieldValue('custbody_apco_created_from_rev_cmt', stRevRecJEId);
        }

        //mj start 7/26/2016
        recJE.setFieldValue('trandate', objTimeEntry.stTranDate);
        recJE.setFieldValue('postingperiod', objTimeEntry.stPostingPd);
        //mj end 7/26/2016

        var objSaleStaticValues = {};
        objSaleStaticValues.entity = objTimeEntry.stProject;
        //objSaleStaticValues.department = objTimeEntry.stEmpDepartment;
        //objSaleStaticValues.location = objTimeEntry.stEmpLocation;
        //objSaleStaticValues.custcol_apco_employee = objTimeEntry.stEmployeeId;
        objSaleStaticValues.memo = 'Reclass VB for Retainerless Project';
        createJournalLine(recJE, null, 'debit', OBJ_ACCTS.jeFeeRetainer, Parse.forceFloat(stUnbilled), objSaleStaticValues);
        createJournalLine(recJE, null, 'credit', OBJ_ACCTS.unbilledAccount, Parse.forceFloat(stUnbilled), objSaleStaticValues);
        // set header values for rebate

        try {
            var stJEId = nlapiSubmitRecord(recJE, true, true);
            var unbilledJE = updateTimeBillsUnbilled(stJEId, stKey);
            nlapiLogExecution('AUDIT', stLogTitle, 'JE was created successfully. ID = ' + stJEId);
            return unbilledJE;
        }
        catch (error) {
            nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTimeEntry.stProject + ' | Employee #' + objTimeEntry.stEmployeeId + ': JE creation unsuccessful.' + error.getCode() + ': '
					+ error.getDetails());
            ARR_ERROR_DETAILS.push('Project #' + objTimeEntry.stProject + ' | Employee #' + objTimeEntry.stEmployeeId + ': JE creation unsuccessful.' + error.getCode() + ': ' + error.getDetails());
        }
    }
    else {
        var unbilledJE = updateTimeBillsUnbilled(unbilledJEs, stKey);
        nlapiLogExecution('AUDIT', stLogTitle, 'No Creation needed. Used JE= ' + unbilledJE);
        return unbilledJE;
    }

}

/**
 * Creation of JE
 * 
 * @param objTimeEntry
 * @param stRevRecJEId
 * 
 */
function createJournalEntry(objTimeEntry, stRevRecJEId) {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.createJournalEntry';

    nlapiLogExecution('DEBUG', stLogTitle, 'objTimeEntry = ' + JSON.stringify(objTimeEntry));

    // Set Key
    var stKey = stRevRecJEId + '-' + objTimeEntry.stProject + '-' + objTimeEntry.stEmployeeId;
    nlapiLogExecution('DEBUG', stLogTitle, 'stKey = ' + stKey + ' || objTimeEntry.flDisbFeeRevDistr =' + objTimeEntry.flDisbFeeRevDistr + ' || objTimeEntry.flDiscountDistr='
			+ objTimeEntry.flDiscountDistr + '||  objTimeEntry.flRebateDistr=' + objTimeEntry.flRebateDistr);

    // Create Journal Entries
    var recJE = nlapiCreateRecord('journalentry',
	{
	    recordmode: 'dynamic'
	});

    recJE.setFieldValue('subsidiary', objTimeEntry.stProjectSub);
    recJE.setFieldValue('currency', objTimeEntry.stProjectCurr);
    if (!Eval.isEmpty(stRevRecJEId)) {
        recJE.setFieldValue('custbody_apco_created_from_rev_cmt', stRevRecJEId);
    }
    //mj start 7/26/2016
    recJE.setFieldValue('trandate', objTimeEntry.stTranDate);
    recJE.setFieldValue('postingperiod', objTimeEntry.stPostingPd);
    //mj end 7/26/2016

    //mj start 7/27/2016
    var objSaleDebitValues = {};
    objSaleDebitValues.entity = objTimeEntry.stProject;
    //mj end 7/27/2016

    var objSaleStaticValues = {};
    objSaleStaticValues.entity = objTimeEntry.stProject;
    objSaleStaticValues.department = objTimeEntry.stEmpDepartment;
    objSaleStaticValues.location = objTimeEntry.stEmpLocation;
    objSaleStaticValues.custcol_apco_employee = objTimeEntry.stEmployeeId;

    // Labor
    createJournalLine(recJE, null, 'debit', OBJ_ACCTS.jeFeeRetainer, objTimeEntry.flLaborFeeDist, objSaleDebitValues);
    createJournalLine(recJE, null, 'credit', OBJ_ACCTS.jeFeeRetainer, objTimeEntry.flLaborFeeDist, objSaleStaticValues);

    // If there is a disbursement fee
    if (objTimeEntry.flDisbFeeRevDistr > 0) {
        createJournalLine(recJE, null, 'debit', OBJ_ACCTS.jeDisbFee, objTimeEntry.flDisbFeeRevDistr, objSaleDebitValues);
        createJournalLine(recJE, null, 'credit', OBJ_ACCTS.jeDisbFee, objTimeEntry.flDisbFeeRevDistr, objSaleStaticValues);
    }

    // If there is a discount fee
    if (objTimeEntry.flDiscountDistr > 0) {
        // lbalboa 5/10/16 change starts
        createJournalLine(recJE, null, 'debit', OBJ_ACCTS.jeVolDisc, objTimeEntry.flDiscountDistr, objSaleDebitValues);
        createJournalLine(recJE, null, 'credit', OBJ_ACCTS.jeVolDisc, objTimeEntry.flDiscountDistr, objSaleStaticValues);
        // lbalboa 5/10/16 change ends
    }

    // If there is a rebate fee
    if (objTimeEntry.flRebateDistr > 0) {
        createJournalLine(recJE, null, 'credit', OBJ_ACCTS.jeRebate, objTimeEntry.flRebateDistr, objSaleDebitValues);
        createJournalLine(recJE, null, 'debit', OBJ_ACCTS.jeRebates, objTimeEntry.flRebateDistr, objSaleStaticValues);
    }
    // set header values for rebate
    try {
        var stJEId = nlapiSubmitRecord(recJE, true, true);
        updateTimeBills(stJEId, stKey, stRevRecJEId);
        nlapiLogExecution('AUDIT', stLogTitle, 'JE was created successfully. ID = ' + stJEId);
    }
    catch (error) {
        nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTimeEntry.stProject + ' | Employee #' + objTimeEntry.stEmployeeId + ': JE creation unsuccessful.' + error.getCode() + ': '
				+ error.getDetails());
        ARR_ERROR_DETAILS.push('Project #' + objTimeEntry.stProject + ' | Employee #' + objTimeEntry.stEmployeeId + ': JE creation unsuccessful.' + error.getCode() + ': ' + error.getDetails());
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

    nlapiLogExecution('DEBUG', stLogTitle, 'objTimeEntry = ' + JSON.stringify(objTimeEntry));

    // Set Key
    var stKey = stRevRecJEId + '-' + objTimeEntry.stProject + '-' + objTimeEntry.stEmployeeId;
    nlapiLogExecution('DEBUG', stLogTitle, 'stKey = ' + stKey);

    // Search Intercompany Chart
    var arrIntercoAcctSearch = searchInterCoChart(
	[
			objTimeEntry.stProjectSub, objTimeEntry.stEmpSub
	]);

    // Initialize Cross Reference Table
    if (Eval.isEmpty(arrIntercoAcctSearch[0]) || Eval.isEmpty(arrIntercoAcctSearch[1])) {
        throw nlapiCreateError('SCRIPT_ERROR', 'Cannot find subsidiaries in the intercompany chart record.');
    }

    var stAccruedICAcct = '';
    var stUnbilledICAcctTo = '';
    var stUnbilledICAcct = '';
    var stAccruedICAcctTo = '';

    //rf to reverse the accounts.
    for (var intAcctCtr = 0; intAcctCtr < arrIntercoAcctSearch.length; intAcctCtr++) {
        var stId = arrIntercoAcctSearch[intAcctCtr].getValue('custrecord_subsidiary');
        if (stId == objTimeEntry.stProjectSub) {
            stAccruedICAcct = arrIntercoAcctSearch[intAcctCtr].getValue('custrecord_accrued_ic_ap');
            stUnbilledICAcctTo = arrIntercoAcctSearch[intAcctCtr].getValue('custrecord_unbilled_ic_ar');
            nlapiLogExecution('DEBUG', stLogTitle, 'stId =' + stId + ' | objTimeEntry.stProjectSub =' + objTimeEntry.stProjectSub + ' | stAccruedICAcct = ' + stAccruedICAcct + '| stUnbilledICAcctTo = ' + stUnbilledICAcctTo);
        }
        else if (stId == objTimeEntry.stEmpSub) {
            stUnbilledICAcct = arrIntercoAcctSearch[intAcctCtr].getValue('custrecord_unbilled_ic_ar');
            stAccruedICAcctTo = arrIntercoAcctSearch[intAcctCtr].getValue('custrecord_accrued_ic_ap');
            nlapiLogExecution('DEBUG', stLogTitle, 'stId =' + stId + ' | objTimeEntry.stEmpSub =' + objTimeEntry.stEmpSub + ' | stUnbilledICAcct = ' + stUnbilledICAcct + '| stAccruedICAcctTo = ' + stAccruedICAcctTo);
        }

    }

    // Create Intercompany Journal Entries
    var recJE = nlapiCreateRecord('intercompanyjournalentry',
	{
	    recordmode: 'dynamic'
	});
    recJE.setFieldValue('subsidiary', objTimeEntry.stProjectSub); // FROM
    // Subsidiary
    recJE.setFieldValue('tosubsidiary', objTimeEntry.stEmpSub); // TO Subsidiary
    recJE.setFieldValue('currency', objTimeEntry.stProjectCurr);
    if (!Eval.isEmpty(stRevRecJEId)) {
        recJE.setFieldValue('custbody_apco_created_from_rev_cmt', stRevRecJEId);
    }

    //mj start 7/26/2016
    recJE.setFieldValue('trandate', objTimeEntry.stTranDate);
    recJE.setFieldValue('postingperiod', objTimeEntry.stPostingPd);
    //mj end 7/26/2016

    var objFromStaticValues = {};
    //objFromStaticValues.memo = objTimeEntry.stProjectName;
    objFromStaticValues.memo = "Intercompany between " + objTimeEntry.stProjectSubName + "And " + objTimeEntry.stEmpSubName
    objFromStaticValues.entity = objTimeEntry.stProject;
    // objFromStaticValues.department = objTimeEntry.stEmpDepartment;
    objFromStaticValues.custcol_apco_employee = objTimeEntry.stEmployeeId;

    var objToStaticValues = {};
    //objToStaticValues.memo = objTimeEntry.stProjectName;
    objFromStaticValues.memo = "Intercompany between " + objTimeEntry.stProjectSubName + "And " + objTimeEntry.stEmpSubName
    objToStaticValues.department = objTimeEntry.stEmpDepartment;
    objToStaticValues.location = objTimeEntry.stEmpLocation;
    objToStaticValues.custcol_apco_employee = objTimeEntry.stEmployeeId;
    objToStaticValues.custcol_apco_ic_project = objTimeEntry.stProject;

    // Labor
    createJournalLine(recJE, objTimeEntry.stProjectSub, 'debit', OBJ_ACCTS.jeFeeRetainer, objTimeEntry.flLaborFeeDist, objFromStaticValues);
    createJournalLine(recJE, objTimeEntry.stProjectSub, 'credit', OBJ_ACCTS.icjeIntercompRev, objTimeEntry.flLaborFeeDist, objFromStaticValues);
    createJournalLine(recJE, objTimeEntry.stProjectSub, 'debit', OBJ_ACCTS.icjeIntercompExp, objTimeEntry.flLaborFeeDist, objFromStaticValues);
    createJournalLine(recJE, objTimeEntry.stProjectSub, 'credit', stAccruedICAcctTo, objTimeEntry.flLaborFeeDist, objFromStaticValues);
    createJournalLine(recJE, objTimeEntry.stEmpSub, 'debit', stUnbilledICAcctTo, objTimeEntry.flLaborFeeDist, objToStaticValues);
    createJournalLine(recJE, objTimeEntry.stEmpSub, 'credit', OBJ_ACCTS.jeFeeRetainer, objTimeEntry.flLaborFeeDist, objToStaticValues);

    // If there is a disbursement fee
    if (objTimeEntry.flDisbFeeRevDistr > 0) {
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'debit', OBJ_ACCTS.jeDisbFee, objTimeEntry.flDisbFeeRevDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'credit', OBJ_ACCTS.icjeIntercompRev, objTimeEntry.flDisbFeeRevDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'debit', OBJ_ACCTS.icjeIntercompExp, objTimeEntry.flDisbFeeRevDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'credit', stAccruedICAcctTo, objTimeEntry.flDisbFeeRevDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stEmpSub, 'debit', stUnbilledICAcctTo, objTimeEntry.flDisbFeeRevDistr, objToStaticValues);
        createJournalLine(recJE, objTimeEntry.stEmpSub, 'credit', OBJ_ACCTS.jeDisbFee, objTimeEntry.flDisbFeeRevDistr, objToStaticValues);
    }

    // If there is a discount fee
    if (objTimeEntry.flDiscountDistr > 0) {
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'debit', OBJ_ACCTS.jeVolDisc, objTimeEntry.flDiscountDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'credit', OBJ_ACCTS.icjeIntercompRev, objTimeEntry.flDiscountDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'credit', OBJ_ACCTS.icjeIntercompExp, objTimeEntry.flDiscountDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'debit', stAccruedICAcct, objTimeEntry.flDiscountDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stEmpSub, 'credit', stUnbilledICAcct, objTimeEntry.flDiscountDistr, objToStaticValues);
        createJournalLine(recJE, objTimeEntry.stEmpSub, 'debit', OBJ_ACCTS.jeVolDisc, objTimeEntry.flDiscountDistr, objToStaticValues);
    }

    // If there is a rebate fee
    if (objTimeEntry.flRebateDistr > 0) {
        // lbalboa 5/10/16 edit starts
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'debit', OBJ_ACCTS.jeRebates, objTimeEntry.flRebateDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'credit', OBJ_ACCTS.icjeIncomeRebate, objTimeEntry.flRebateDistr, objFromStaticValues);
        // lbalboa 5/10/16 edit ends
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'credit', OBJ_ACCTS.icjeIntercompExp, objTimeEntry.flRebateDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stProjectSub, 'debit', stAccruedICAcctTo, objTimeEntry.flRebateDistr, objFromStaticValues);
        createJournalLine(recJE, objTimeEntry.stEmpSub, 'credit', stUnbilledICAcctTo, objTimeEntry.flRebateDistr, objToStaticValues);
        createJournalLine(recJE, objTimeEntry.stEmpSub, 'debit', OBJ_ACCTS.jeRebates, objTimeEntry.flRebateDistr, objToStaticValues);
    }

    // Submit Record
    try {
        var stJEId = nlapiSubmitRecord(recJE, true, true);
        updateTimeBills(stJEId, stKey, stRevRecJEId);
        nlapiLogExecution('AUDIT', stLogTitle, 'ICJE was created successfully. ID = ' + stJEId);
        nlapiLogExecution('AUDIT', stLogTitle, 'stKey = ' + stKey);
    }
    catch (error) {
        nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTimeEntry.stProject + ' | Employee #' + objTimeEntry.stEmployeeId + ': ICJE creation unsuccessful.' + error.getCode() + ': '
				+ error.getDetails());
        ARR_ERROR_DETAILS.push('Project #' + objTimeEntry.stProject + ' | Employee #' + objTimeEntry.stEmployeeId + ': ICJE creation unsuccessful.' + error.getCode() + ': ' + error.getDetails());
    }

}

/**
 * Creation of JE1
 * 
 * @param objTimeEntry
 * @param stRevRecJEId
 * @returns stJEId
 */
function createJE1(objTimeEntry, stRevRecJEId) {

    var stLogTitle = 'scheduled_ProcessRevenueRecognition.createJE1';

    nlapiLogExecution('DEBUG', stLogTitle, 'objTimeEntry = ' + JSON.stringify(objTimeEntry));

    // Set Key
    var stKey = stRevRecJEId + '-' + objTimeEntry.stProject + '-' + objTimeEntry.stEmployeeId;
    nlapiLogExecution('DEBUG', stLogTitle, 'stKey = ' + stKey);

    // Search Intercompany Chart
    var arrIntercoAcctSearch = searchInterCoChart(
	[
			objTimeEntry.stProjectSub, objTimeEntry.stEmpSub
	]);

    // Initialize Cross Reference Table
    if (Eval.isEmpty(arrIntercoAcctSearch[0]) || Eval.isEmpty(arrIntercoAcctSearch[1])) {
        throw nlapiCreateError('SCRIPT_ERROR', 'Cannot find subsidiaries in the intercompany chart record.');
    }

    var stAccruedICAcct = '';
    var stUnbilledICAcctTo = '';
    var stUnbilledICAcct = '';
    var stAccruedICAcctTo = '';

    //rf to reverse the accounts.
    for (var intAcctCtr = 0; intAcctCtr < arrIntercoAcctSearch.length; intAcctCtr++) {
        var stId = arrIntercoAcctSearch[intAcctCtr].getValue('custrecord_subsidiary');
        if (stId == objTimeEntry.stProjectSub) {
            stAccruedICAcct = arrIntercoAcctSearch[intAcctCtr].getValue('custrecord_accrued_ic_ap');
            stUnbilledICAcctTo = arrIntercoAcctSearch[intAcctCtr].getValue('custrecord_unbilled_ic_ar');
            nlapiLogExecution('DEBUG', stLogTitle, 'stId =' + stId + ' | objTimeEntry.stProjectSub =' + objTimeEntry.stProjectSub + ' | stAccruedICAcct = ' + stAccruedICAcct + '| stUnbilledICAcctTo = ' + stUnbilledICAcctTo);
        }
        else if (stId == objTimeEntry.stEmpSub) {
            stUnbilledICAcct = arrIntercoAcctSearch[intAcctCtr].getValue('custrecord_unbilled_ic_ar');
            stAccruedICAcctTo = arrIntercoAcctSearch[intAcctCtr].getValue('custrecord_accrued_ic_ap');
            nlapiLogExecution('DEBUG', stLogTitle, 'stId =' + stId + ' | objTimeEntry.stEmpSub =' + objTimeEntry.stEmpSub + ' | stUnbilledICAcct = ' + stUnbilledICAcct + '| stAccruedICAcctTo = ' + stAccruedICAcctTo);
        }

    }


    nlapiLogExecution('DEBUG', stLogTitle, 'stUnbilledICAcct = ' + stUnbilledICAcct + '| stAccruedICAcct = ' + stAccruedICAcct);

    // Create JE1
    var recJE = nlapiCreateRecord('journalentry',
	{
	    recordmode: 'dynamic'
	});
    recJE.setFieldValue('subsidiary', objTimeEntry.stProjectSub); // FROM
    recJE.setFieldValue('currency', objTimeEntry.stProjectCurr);
    if (!Eval.isEmpty(stRevRecJEId)) {
        recJE.setFieldValue('custbody_apco_created_from_rev_cmt', stRevRecJEId);
    }

    //mj start 7/26/2016
    recJE.setFieldValue('trandate', objTimeEntry.stTranDate);
    recJE.setFieldValue('postingperiod', objTimeEntry.stPostingPd);
    //mj end 7/26/2016

    var objFromStaticValues = {};
    objFromStaticValues.entity = objTimeEntry.stProject;
    objFromStaticValues.custcol_apco_employee = objTimeEntry.stEmployeeId;

    // Labor
    createJournalLine(recJE, null, 'debit', OBJ_ACCTS.jeFeeRetainer, objTimeEntry.flLaborFeeDist, objFromStaticValues);
    createJournalLine(recJE, null, 'credit', OBJ_ACCTS.icjeIntercompRev, objTimeEntry.flLaborFeeDist, objFromStaticValues);
    createJournalLine(recJE, null, 'debit', OBJ_ACCTS.icjeIntercompExp, objTimeEntry.flLaborFeeDist, objFromStaticValues);
    createJournalLine(recJE, null, 'credit', stAccruedICAcctTo, objTimeEntry.flLaborFeeDist, objFromStaticValues);

    // If there is a disbursement fee
    if (objTimeEntry.flDisbFeeRevDistr > 0) {
        createJournalLine(recJE, null, 'debit', OBJ_ACCTS.jeDisbFee, objTimeEntry.flDisbFeeRevDistr, objFromStaticValues);
        createJournalLine(recJE, null, 'credit', OBJ_ACCTS.icjeIntercompRev, objTimeEntry.flDisbFeeRevDistr, objFromStaticValues);
        createJournalLine(recJE, null, 'debit', OBJ_ACCTS.icjeIntercompExp, objTimeEntry.flDisbFeeRevDistr, objFromStaticValues);
        createJournalLine(recJE, null, 'credit', stAccruedICAcctTo, objTimeEntry.flDisbFeeRevDistr, objFromStaticValues);
    }

    // If there is a discount fee
    if (objTimeEntry.flDiscountDistr > 0) {
        createJournalLine(recJE, null, 'debit', OBJ_ACCTS.jeVolDisc, objTimeEntry.flDiscountDistr, objFromStaticValues);
        createJournalLine(recJE, null, 'credit', OBJ_ACCTS.icjeIntercompRev, objTimeEntry.flDiscountDistr, objFromStaticValues);
        createJournalLine(recJE, null, 'credit', OBJ_ACCTS.icjeIntercompExp, objTimeEntry.flDiscountDistr, objFromStaticValues);
        createJournalLine(recJE, null, 'debit', stAccruedICAcct, objTimeEntry.flDiscountDistr, objFromStaticValues);
    }

    // If there is a rebate fee
    if (objTimeEntry.flRebateDistr > 0) {
        createJournalLine(recJE, null, 'debit', OBJ_ACCTS.jeRebates, objTimeEntry.flRebateDistr, objFromStaticValues);
        createJournalLine(recJE, null, 'credit', OBJ_ACCTS.icjeIncomeRebate, objTimeEntry.flRebateDistr, objFromStaticValues);
        createJournalLine(recJE, null, 'credit', OBJ_ACCTS.icjeIntercompExp, objTimeEntry.flRebateDistr, objFromStaticValues);
        createJournalLine(recJE, null, 'debit', stAccruedICAcctTo, objTimeEntry.flRebateDistr, objFromStaticValues);
    }

    // Submit Record
    var stJEId = '';

    try {
        stJEId = nlapiSubmitRecord(recJE, true, true);
        nlapiLogExecution('AUDIT', stLogTitle, 'JE1 was created successfully. ID = ' + stJEId);
        nlapiLogExecution('AUDIT', stLogTitle, 'stKey = ' + stKey);
    }
    catch (error) {
        nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTimeEntry.stProject + ' | Employee #' + objTimeEntry.stEmployeeId + ': JE1 creation unsuccessful.' + error.getCode() + ': '
				+ error.getDetails());
        ARR_ERROR_DETAILS.push('Project #' + objTimeEntry.stProject + ' | Employee #' + objTimeEntry.stEmployeeId + ': JE1 creation unsuccessful.' + error.getCode() + ': ' + error.getDetails());
    }

    return stJEId;
}

/**
 * Creation of JE2
 * 
 * @param objTimeEntry
 * @param stRevRecJEId
 * @returns stJEId
 */
function createJE2(objTimeEntry, stRevRecJEId) {

    var stLogTitle = 'scheduled_ProcessRevenueRecognition.createJE2';

    nlapiLogExecution('DEBUG', stLogTitle, 'objTimeEntry = ' + JSON.stringify(objTimeEntry));

    // Set Key
    var stKey = stRevRecJEId + '-' + objTimeEntry.stProject + '-' + objTimeEntry.stEmployeeId;
    nlapiLogExecution('DEBUG', stLogTitle, 'stKey = ' + stKey);

    // Search Intercompany Chart
    var arrIntercoAcctSearch = searchInterCoChart(
	[
			objTimeEntry.stProjectSub, objTimeEntry.stEmpSub
	]);

    // Initialize Cross Reference Table
    if (Eval.isEmpty(arrIntercoAcctSearch[0]) || Eval.isEmpty(arrIntercoAcctSearch[1])) {
        throw nlapiCreateError('SCRIPT_ERROR', 'Cannot find subsidiaries in the intercompany chart record.');
    }

    var stAccruedICAcct = '';
    var stUnbilledICAcctTo = '';
    var stUnbilledICAcct = '';
    var stAccruedICAcctTo = '';

    //rf to reverse the accounts.
    for (var intAcctCtr = 0; intAcctCtr < arrIntercoAcctSearch.length; intAcctCtr++) {
        var stId = arrIntercoAcctSearch[intAcctCtr].getValue('custrecord_subsidiary');
        if (stId == objTimeEntry.stProjectSub) {
            stAccruedICAcct = arrIntercoAcctSearch[intAcctCtr].getValue('custrecord_accrued_ic_ap');
            stUnbilledICAcctTo = arrIntercoAcctSearch[intAcctCtr].getValue('custrecord_unbilled_ic_ar');
            nlapiLogExecution('DEBUG', stLogTitle, 'stId =' + stId + ' | objTimeEntry.stProjectSub =' + objTimeEntry.stProjectSub + ' | stAccruedICAcct = ' + stAccruedICAcct + '| stUnbilledICAcctTo = ' + stUnbilledICAcctTo);
        }
        else if (stId == objTimeEntry.stEmpSub) {
            stUnbilledICAcct = arrIntercoAcctSearch[intAcctCtr].getValue('custrecord_unbilled_ic_ar');
            stAccruedICAcctTo = arrIntercoAcctSearch[intAcctCtr].getValue('custrecord_accrued_ic_ap');
            nlapiLogExecution('DEBUG', stLogTitle, 'stId =' + stId + ' | objTimeEntry.stEmpSub =' + objTimeEntry.stEmpSub + ' | stUnbilledICAcct = ' + stUnbilledICAcct + '| stAccruedICAcctTo = ' + stAccruedICAcctTo);
        }

    }

    // Create Intercompany Journal Entries
    var recJE = nlapiCreateRecord('journalentry',
	{
	    recordmode: 'dynamic'
	});
    recJE.setFieldValue('subsidiary', objTimeEntry.stEmpSub);
    recJE.setFieldValue('currency', objTimeEntry.stProjectCurr);
    if (!Eval.isEmpty(stRevRecJEId)) {
        recJE.setFieldValue('custbody_apco_created_from_rev_cmt', stRevRecJEId);
    }
    //mj start 7/26/2016
    recJE.setFieldValue('trandate', objTimeEntry.stTranDate);
    recJE.setFieldValue('postingperiod', objTimeEntry.stPostingPd);
    //mj end 7/26/2016

    var objToStaticValues = {};
    objToStaticValues.department = objTimeEntry.stEmpDepartment;
    objToStaticValues.location = objTimeEntry.stEmpLocation;
    objToStaticValues.custcol_apco_employee = objTimeEntry.stEmployeeId;
    objToStaticValues.custcol_apco_ic_project = objTimeEntry.stProject;

    // Labor
    createJournalLine(recJE, null, 'debit', stUnbilledICAcctTo, objTimeEntry.flLaborFeeDist, objToStaticValues);
    createJournalLine(recJE, null, 'credit', OBJ_ACCTS.jeFeeRetainer, objTimeEntry.flLaborFeeDist, objToStaticValues);

    // If there is a disbursement fee
    if (objTimeEntry.flDisbFeeRevDistr > 0) {
        createJournalLine(recJE, null, 'debit', stUnbilledICAcctTo, objTimeEntry.flDisbFeeRevDistr, objToStaticValues);
        createJournalLine(recJE, null, 'credit', OBJ_ACCTS.jeDisbFee, objTimeEntry.flDisbFeeRevDistr, objToStaticValues);
    }

    // If there is a discount fee
    if (objTimeEntry.flDiscountDistr > 0) {
        createJournalLine(recJE, null, 'credit', stUnbilledICAcct, objTimeEntry.flDiscountDistr, objToStaticValues);
        createJournalLine(recJE, null, 'debit', OBJ_ACCTS.jeVolDisc, objTimeEntry.flDiscountDistr, objToStaticValues);
    }

    // If there is a rebate fee
    if (objTimeEntry.flRebateDistr > 0) {
        createJournalLine(recJE, null, 'credit', stUnbilledICAcctTo, objTimeEntry.flRebateDistr, objToStaticValues);
        createJournalLine(recJE, null, 'debit', OBJ_ACCTS.jeRebates, objTimeEntry.flRebateDistr, objToStaticValues);
    }

    // Submit Record
    var stJEId = '';
    try {
        stJEId = nlapiSubmitRecord(recJE, true, true);

        nlapiLogExecution('AUDIT', stLogTitle, 'JE2 was created successfully. ID = ' + stJEId);
        nlapiLogExecution('AUDIT', stLogTitle, 'stKey = ' + stKey);
    }
    catch (error) {
        nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTimeEntry.stProject + ' | Employee #' + objTimeEntry.stEmployeeId + ': JE2 creation unsuccessful.' + error.getCode() + ': '
				+ error.getDetails());
        ARR_ERROR_DETAILS.push('Project #' + objTimeEntry.stProject + ' | Employee #' + objTimeEntry.stEmployeeId + ': JE2 creation unsuccessful.' + error.getCode() + ': ' + error.getDetails());
    }

    return stJEId;
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
    nlapiLogExecution('DEBUG', stLogTitle, 'stLineSub = ' + stLineSub + ' | stType = ' + stType + ' | stAcct = ' + stAcct + ' | stAmount = ' + stAmount);

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
            }
            catch (error) {
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
function updateTimeBills(stJEId, stKey, stRevRecJEId, stJEId2) {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.updateTimeBills';

    nlapiLogExecution('DEBUG', stLogTitle, 'stJEId ' + stJEId);
    nlapiLogExecution('DEBUG', stLogTitle, 'stJEId2 ' + stJEId2);

    if (!Eval.isEmpty(OBJ_JOBS[stKey])) {
        var arrTimeEntries = OBJ_JOBS[stKey].arrTimeEntries;
        for (var intCtr = 0; intCtr < arrTimeEntries.length; intCtr++) {
            nlapiSubmitField('timebill', arrTimeEntries[intCtr],
			[
					'custcol_apco_timeentyr_je', 'custcol_apco_posted', 'custcol_apco_revcommit_je', 'custcol_apco_timeentyr_je2'
			],
			[
					stJEId, 'T', stRevRecJEId, stJEId2
			]);
            nlapiLogExecution('AUDIT', stLogTitle, 'Updated Timebill # ' + arrTimeEntries[intCtr] + '| stJEId =' + stJEId + ' | stRevRecJEId =' + stRevRecJEId);
        }
    }
}

/**
 * Update Timebill fields:
 * 
 * @param stJEId
 */
function updateTimeBillsUnbilled(stJEId, stKey) {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.updateTimeBillsUnbilled';

    nlapiLogExecution('DEBUG', stLogTitle, 'stJEId ' + stJEId);

    if (!Eval.isEmpty(OBJ_JOBS[stKey])) {
        var arrTimeEntries = OBJ_JOBS[stKey].arrTimeEntries;
        var stRevRecJEId = OBJ_JOBS[stKey].stRevRecJEId;
        for (var intCtr = 0; intCtr < arrTimeEntries.length; intCtr++) {
            nlapiSubmitField('timebill', arrTimeEntries[intCtr],
			[
				'custcol_apco_unbilled_je'
			],
			[
				stJEId
			]);
            nlapiLogExecution('AUDIT', stLogTitle, 'Updated Timebill # ' + arrTimeEntries[intCtr] + '| stJEId =' + stJEId + ' | stRevRecJEId =' + stRevRecJEId);
        }
    }

    return stJEId;
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
    }
    else {
        stBody += 'Process Status: Successful.';
    }

    // Send Email
    nlapiLogExecution('DEBUG', stLogTitle, 'stUser = ' + stUser + '| stBody =' + stBody);
    nlapiSendEmail(stUser, stUser, stSubject, stBody);
}

/**
 * Search for rev commit
 * 
 * @param stProjId
 * @returns arrResults - search result of the saved search executed against
 *          transaction
 */
function searchRevCommit(stProjId) {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.searchJournalEntries';
    nlapiLogExecution('DEBUG', stLogTitle, 'Search..');
    // Filters
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('type', null, 'anyof', 'RevComm'));
    arrFilters.push(new nlobjSearchFilter('name', null, 'anyof', stProjId));

    // Columns
    var arrColumns = [];
    arrColumns.push(new nlobjSearchColumn('exchangerate', null, 'MAX'));

    var arrResults = SuiteUtil.search(null, 'revenuecommitment', arrFilters, arrColumns);

    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);
    return arrResults;
}

/**
 * Search Unbilled Trans
 * 
 * @param stSearch
 * @param stProjectId
 * @returns arrResults - search result of the saved search executed against
 *          transaction
 */
function searchUnbilledTransAmt(stSearch, stJobId, stEndDate) {
    var arrSearchFilter = [];

    arrSearchFilter.push(new nlobjSearchFilter('internalid', 'job', 'anyof', stJobId));
    arrSearchFilter.push(new nlobjSearchFilter('trandate', null, 'onorbefore', stEndDate));
    var arrUnbilledAmount = nlapiSearchRecord('transaction', stSearch, arrSearchFilter, null);

    return arrUnbilledAmount;
}

/**
 * Search for all the Subsidiaries
 * 
 * @param stRevRecSearch
 * @param stProjectId
 * @returns arrResults - search result of the saved search executed against
 *          transaction
 */
function searchSubsidiaries() {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.searchSubsidiaries';
    // Filters
    var arrFilters = [];
    // Columns
    var arrColumns = [];
    arrColumns.push(new nlobjSearchColumn('currency'));

    var arrResults = SuiteUtil.search(null, 'subsidiary', arrFilters, arrColumns);

    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);
    return arrResults;
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

function setItemValues(stRetainerItem, stDisbItem, stDiscItem) {
    var obj_retainer = nlapiLookupField('item', stRetainerItem,
	[
			'incomeaccount', 'intercoincomeaccount', 'intercoexpenseaccount'
	]);
    var obj_disbursement = nlapiLookupField('item', stDisbItem,
	[
			'incomeaccount', 'intercoincomeaccount', 'intercoexpenseaccount'
	]);
    var obj_discount = nlapiLookupField('item', stDiscItem,
	[
			'incomeaccount', 'intercoincomeaccount', 'intercoexpenseaccount'
	]);

    if (!Eval.isEmpty(obj_retainer.incomeaccount) && !Eval.isEmpty(obj_retainer.intercoincomeaccount) && !Eval.isEmpty(obj_retainer.intercoexpenseaccount)
			&& !Eval.isEmpty(obj_disbursement.incomeaccount) && !Eval.isEmpty(obj_disbursement.intercoincomeaccount) && !Eval.isEmpty(obj_disbursement.intercoexpenseaccount)
			&& !Eval.isEmpty(obj_discount.incomeaccount) && !Eval.isEmpty(obj_discount.intercoincomeaccount) && !Eval.isEmpty(obj_discount.intercoexpenseaccount)) {

        OBJ_ACCTS.jeFeeRetainer = obj_retainer.incomeaccount;
        OBJ_ACCTS.icjeFeeRetainers = obj_retainer.intercoincomeaccount;
        OBJ_ACCTS.icjeIntercompExp = obj_retainer.intercoexpenseaccount;

        OBJ_ACCTS.jeDisbFee = obj_disbursement.incomeaccount;
        OBJ_ACCTS.icjeIncomeDisbFee = obj_disbursement.intercoincomeaccount;
        OBJ_ACCTS.icjeFeeDisbIntecoExpense = obj_disbursement.intercoexpenseaccount;
        // not yet
        OBJ_ACCTS.jeVolDisc = obj_discount.incomeaccount;

        OBJ_ACCTS.icjeIncomeVolDisc = obj_discount.intercoincomeaccount;
        OBJ_ACCTS.icjeFeeDiscountIntecoExpense = obj_discount.intercoexpenseaccount;

    }
    else {
        throw nlapiCreateError('EMPTY_SCRIPT_PARAMETER', 'One of the Item Accounts is null. Please Check.');
    }
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

    /**
	 * Checks if Array 1 has the values of Array 2. If it does, it will return
	 * true, otherwise, false
	 * 
	 * @param {Array}
	 *            arr1 - The First array
	 * @param {Array}
	 *            arr2 - The second array
	 * 
	 * 
	 * @returns boolean - True if values of arr1 has the values of 2, false
	 *          other wise.
	 * @memberOf Eval
	 * @author lbalboa
	 */
    compareArray: function (arr1, arr2) {
        var ret = [];
        for (var i in this) {
            if (arr2.indexOf(arr1[i]) > -1) {
                ret.push(arr1[i]);
            }
        }
        return ret.length > 0;
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
        nlapiLogExecution('DEBUG', stLoggerTitle, 'Remaining usage=' + nlapiGetContext().getRemainingUsage());

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
            if (intRemainingUsage < (parseInt(intGovernanceThreshold, 10) + parseInt(20, 10))) {
                var objYield = nlapiYieldScript();
                nlapiLogExecution('DEBUG', stLoggerTitle, 'Status=' + objYield.status);
            }
        }

        if ((intStartTime)) {
            // get current time
            var intCurrentTime = new Date().getTime();

            // check if elapsed time is near the arbitrary value
            var intElapsedTime = intMaxTime - (intCurrentTime - intStartTime);

            if (intElapsedTime < intRequiredTime) {
                // check if we are not reaching the max processing time which is
                // 3600000 seconds
                var objYield = nlapiYieldScript();
                nlapiLogExecution('DEBUG', stLoggerTitle, 'Status=' + objYield.status);

                if (objYield.status != 'FAILURE')
                    intStartTime = new Date().getTime();
            }
        }

        return intStartTime;
    },
};