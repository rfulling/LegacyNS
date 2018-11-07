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
 * 1.00       	03/10/2016    		mjpascual 			Initial version.
 * 1.10         05/03/2016          mjpascual           Transferred approval of time from suitelet to scheduled
 * 1.11			02/08/2017          rfulling            Added custom field to true when time is approved
 * 1.12			02/10/2017			jjacob				Pagination changes
 * 1.13			02/28/2017			jjacob				1. Script locking
 * 														2. Update time bill link in journal entry	
 * 
 */

var CONTEXT = nlapiGetContext();

var INT_USAGE_LIMIT_THRESHOLD = 500;
var INT_START_TIME = new Date().getTime();

var ARR_ERROR_DETAILS = [];
var OBJ_JE_ACCOUNTS = {};
var OBJ_ICJE_ACCOUNTS = {};
var OBJ_JE1 = {};
var OBJ_JE2 = {};

var ST_APPROVED = '';
var ST_NATIVE_APPR = '';

/**
 * TDD 1: T&M Time Revenue with Intercompany
 * @param type
 */
function scheduled_approveTime(type) {
    // 1.13 | jjacob | Script Locking
    var scriptLockerId = null;

    try {
        var stLogTitle = 'scheduled_approveTime';
        nlapiLogExecution('DEBUG', stLogTitle, '>> Entry <<');

        // Get subsidiary filter selected from the suitelet
        var stFilter_Subsidiary = CONTEXT.getSetting('SCRIPT', 'custscript_sc_fltr_subsidiary');

        // 1.13 | Script Locker
        try {
            scriptLockerId = ScriptLocker.lockOrStart({
                scriptName: CONTEXT.getScriptId() || '',
                subsidiary: stFilter_Subsidiary || '',
                user: nlapiGetUser()
            });
        }
        catch (e) {
            nlapiLogExecution('audit', stLogTitle, e.toString());
            return;
        }

        // 1.12 | Pagination Changes | Start

        // @v1.12 | commented out 
        //var stTimeBillsToProcess = CONTEXT.getSetting('SCRIPT', 'custscript_sc_timebills');

        // @v1.12 | script parameter contains pagination cache id instead of string of Ids
        var cacheId = CONTEXT.getSetting('SCRIPT', 'custscript_sc_timebills');
        nlapiLogExecution('DEBUG', stLogTitle, 'cacheId=' + cacheId);

        if (!cacheId) {
            throw nlapiCreateError('EMPTY_SCRIPT_PARAMETER', 'Missing pagination cache id');
        }

        // Get data from pagination cache record
        var objTimeBillsToProcess = Pagination.getCache({
            id: cacheId
        });

        stTimeBillsToProcess = objTimeBillsToProcess.toString();
        nlapiLogExecution('DEBUG', stLogTitle, 'stTimeBillsToProcess=' + stTimeBillsToProcess);

        // 1.12 | Pagination Changes | End


        // Get script paramaters
        var stTimeMaterialSavedSearch = CONTEXT.getSetting('SCRIPT', 'custscript_sc_time_and_mat_search');

        //Setters
        ST_APPROVED = CONTEXT.getSetting('SCRIPT', 'custscript_apco_appr_status');
        ST_NATIVE_APPR = CONTEXT.getSetting('SCRIPT', 'custscript_apco_appr_status_native');

        //Init JE accts
        OBJ_JE_ACCOUNTS =
		{
		    '_je_labor_db': CONTEXT.getSetting('SCRIPT', 'custscript_ha_unbilled_time'),
		    '_je_labor_cr': CONTEXT.getSetting('SCRIPT', 'custscript_ha_fee_rev_tm'),
		    '_je_disbu_db': CONTEXT.getSetting('SCRIPT', 'custscript_ha_unbilled_disb_fee'),
		    '_je_disbu_cr': CONTEXT.getSetting('SCRIPT', 'custscript_ha_disb_fee_rev'),
		    '_je_disct_db': CONTEXT.getSetting('SCRIPT', 'custscript_ha_volume_discs'),
		    '_je_disct_cr': CONTEXT.getSetting('SCRIPT', 'custscript_ha_unbilled_tm_discs'),
		    '_je_rebat_db': CONTEXT.getSetting('SCRIPT', 'custscript_ha_rebates'),
		    '_je_rebat_cr': CONTEXT.getSetting('SCRIPT', 'custscript_ha_rebate')
		};

        //Init ICJE accts
        OBJ_ICJE_ACCOUNTS =
		{
		    //LABOR ACCTS
		    '_icje_labor_fr_ac_db': CONTEXT.getSetting('SCRIPT', 'custscript_ha_unbilled_time'),
		    '_icje_labor_fr_ic_db': CONTEXT.getSetting('SCRIPT', 'custscript_ha_intercompany_exp'),
		    '_icje_labor_fr_ic_cr': CONTEXT.getSetting('SCRIPT', 'custscript_ha_intercompany_revenue'),
		    '_icje_labor_to_ac_cr': CONTEXT.getSetting('SCRIPT', 'custscript_ha_fee_rev_tm'),
		    //DISBURSEMENT ACCTS
		    '_icje_disbu_fr_ac_db': CONTEXT.getSetting('SCRIPT', 'custscript_ha_unbilled_disb_fee'),
		    '_icje_disbu_fr_ic_db': CONTEXT.getSetting('SCRIPT', 'custscript_ha_intercompany_exp'),
		    '_icje_disbu_fr_ic_cr': CONTEXT.getSetting('SCRIPT', 'custscript_ha_intercompany_revenue'),
		    '_icje_disbu_to_ac_cr': CONTEXT.getSetting('SCRIPT', 'custscript_ha_disb_fee_rev'),
		    //DISCOUNT ACCTS
		    '_icje_disct_fr_ac_cr': CONTEXT.getSetting('SCRIPT', 'custscript_ha_unbilled_tm_discs'),
		    '_icje_disct_fr_ic_db': CONTEXT.getSetting('SCRIPT', 'custscript_ha_intercompany_revenue'),
		    '_icje_disct_fr_ic_cr': CONTEXT.getSetting('SCRIPT', 'custscript_ha_intercompany_exp'),
		    '_icje_disct_to_ac_db': CONTEXT.getSetting('SCRIPT', 'custscript_ha_volume_discs'),
		    //REBATE ACCTS
		    '_icje_rebat_fr_ac_cr': CONTEXT.getSetting('SCRIPT', 'custscript_ha_rebate'),
		    '_icje_rebat_fr_ic_db': CONTEXT.getSetting('SCRIPT', 'custscript_ha_intercompany_revenue'),
		    '_icje_rebat_fr_ic_cr': CONTEXT.getSetting('SCRIPT', 'custscript_ha_intercompany_exp'),
		    '_icje_rebat_to_ac_db': CONTEXT.getSetting('SCRIPT', 'custscript_ha_rebates'),
		};

        OBJ_JE1 =
		{
		    '_unbilled_time': CONTEXT.getSetting('SCRIPT', 'custscript_ha_unbilled_time'),
		    '_intercompany_exp': CONTEXT.getSetting('SCRIPT', 'custscript_ha_intercompany_exp'),
		    '_intercompany_rev': CONTEXT.getSetting('SCRIPT', 'custscript_ha_intercompany_revenue'),
		    '_unbilled_disb': CONTEXT.getSetting('SCRIPT', 'custscript_ha_unbilled_disb_fee'),
		    '_rebate': CONTEXT.getSetting('SCRIPT', 'custscript_ha_rebate')
		};

        OBJ_JE2 =
		{
		    '_fee_rev_tm': CONTEXT.getSetting('SCRIPT', 'custscript_ha_fee_rev_tm'),
		    '_disb_fee_rev': CONTEXT.getSetting('SCRIPT', 'custscript_ha_disb_fee_rev'),
		    '_rebates': CONTEXT.getSetting('SCRIPT', 'custscript_ha_rebates')
		};

        //Validate script parameters
        if (Eval.isEmpty(stTimeBillsToProcess)) {
            throw nlapiCreateError('EMPTY_SCRIPT_PARAMETER', 'No Time bills to process..');
        }

        //Validate script parameters
        if (Eval.isEmpty(stTimeMaterialSavedSearch) || Eval.isEmpty(ST_APPROVED) || Eval.isEmpty(ST_NATIVE_APPR)) {
            throw nlapiCreateError('EMPTY_SCRIPT_PARAMETER', 'No Time bills to process..');
        }

        validateScriptParamObj(
		[
				OBJ_JE_ACCOUNTS, OBJ_ICJE_ACCOUNTS, OBJ_JE1, OBJ_JE2
		]);

        //Split arrays
        var arrTimeBillsToProcess = stTimeBillsToProcess.split(',');
        nlapiLogExecution('DEBUG', stLogTitle, 'arrTimeBillsToProcess =' + arrTimeBillsToProcess);
        nlapiLogExecution('DEBUG', stLogTitle, 'arrTimeBillsToProcess.length ' + arrTimeBillsToProcess.length);

        //TDD 1: Approve Time Entry (any project type)
        approveTimeEntry(arrTimeBillsToProcess);

        // 1.13 | Delete pagination cache record
        if (cacheId) {
            Pagination.deleteCache({ id: cacheId });
        }

        //TDD 1: T&M Time Revenue with Intercompany 
        processTimeAndMaterialsJEs(arrTimeBillsToProcess, stTimeMaterialSavedSearch);

    }
    catch (error) {
        if (error.getDetails != undefined) {
            //nlapiLogExecution('ERROR', 'Process Error', error.getCode() + ': ' + error.getDetails());
            throw error;
        }
        else {
            //nlapiLogExecution('ERROR', 'Unexpected Error', error.toString());
            throw nlapiCreateError('99999', error.toString());
        }
    }
    finally {
        // 1.13 | End script lock (delete custom record) 
        if (scriptLockerId) {
            ScriptLocker.end({
                id: scriptLockerId
            });
        }

        nlapiLogExecution('DEBUG', stLogTitle, '>> Exit <<');
    }

}

/**
 * Validate script parameters
 * @param arrObj
 */
function validateScriptParamObj(arrObj) {
    var stLogTitle = 'scheduled_approveTime.validateScriptParamObj';

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
 * Approve Time
 * @param arrTimeBillsToProcess
 */
function approveTimeEntry(arrTimeBillsToProcess) {
    var stLogTitle = 'scheduled_approveTime.approveTimeEntry';
    nlapiLogExecution('DEBUG', stLogTitle, 'Entering approveTimeEntry');

    //Group per Employee and Project
    for (var intCtr = 0; intCtr < arrTimeBillsToProcess.length; intCtr++) {
        var stTimeId = arrTimeBillsToProcess[intCtr];
        try {
            //RF 02/08/2017 to update the custom field to true when time is approved
            nlapiSubmitField('timebill', stTimeId, ['custcol_time_entry_appr_status', 'approvalstatus', 'custcol_apco_time_hard_approved'], [ST_APPROVED, ST_NATIVE_APPR, 'T']);
            //nlapiSubmitField('timebill', stTimeId, ['custcol_time_entry_appr_status', 'approvalstatus'], [ST_APPROVED, ST_NATIVE_APPR]);
            nlapiLogExecution('AUDIT', stLogTitle, 'Time Id #' + stTimeId + ' was approved');
        }
        catch (error) {
            nlapiLogExecution('ERROR', stLogTitle, 'Time Bill #' + stTimeId + ' not approved. | ' + error.getCode() + ': ' + error.getDetails());
            ARR_ERROR_DETAILS.push('Time Bill #' + stTimeId + ' not approved. | ' + error.getCode() + ': ' + error.getDetails());
            continue;
        }
        //Monitor usage unit / time run
        INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);
    }

}

/**
 * Creation of JEs and ICJEs
 * 
 * @param arrTimeBillsToProcess
 * @param stTimeMaterialSavedSearch
 * 
 */
function processTimeAndMaterialsJEs(arrTimeBillsToProcess, stTimeMaterialSavedSearch) {
    var stLogTitle = 'scheduled_approveTime.processTimeAndMaterialsJEs';
    nlapiLogExecution('DEBUG', stLogTitle, 'Entering processTimeAndMaterialsJEs');

    //Search time bills for project data 
    var arrTimeBills = searchTimeBills(stTimeMaterialSavedSearch, arrTimeBillsToProcess);

    //Initialize
    var objTimeList = {};
    var arrSubsidiaries = [];

    //Group per Employee and Project
    for (var intCtr = 0; intCtr < arrTimeBills.length; intCtr++) {
        var stTimeId = arrTimeBills[intCtr].getValue('internalid'); //TimeBill Internal Id
        var stSubsidiary = arrTimeBills[intCtr].getValue('subsidiary'); //Subsidiary
        var stProj = arrTimeBills[intCtr].getValue('customer'); //Project
        var stProjName = arrTimeBills[intCtr].getText('customer'); //Project
        var stProjSubsidiary = arrTimeBills[intCtr].getValue('subsidiary', 'job'); //Project Subsidiary
        var stProjCurrency = arrTimeBills[intCtr].getValue('currency', 'job'); //Project Currency
        var stProjEndDate = arrTimeBills[intCtr].getValue('custentity_apco_proj_period_end_date', 'job');
        var stEmployee = arrTimeBills[intCtr].getValue('employee'); //Employee
        var stEmployeeName = arrTimeBills[intCtr].getText('employee'); //Employee
        var stEmployeeSub = arrTimeBills[intCtr].getValue('subsidiary', 'employee'); //Employee Subsidiary
        var stEmployeeLoc = arrTimeBills[intCtr].getValue('location', 'employee'); //Employee Location
        var stEmployeeDept = arrTimeBills[intCtr].getValue('department', 'employee'); //Employee Department
        var flProjDisbursementPct = Parse.forceFloat(arrTimeBills[intCtr].getValue('custentity_apco_disbursement_fee_pct', 'job')); //Project Disbursement Fee Pct
        var flProjDiscountPct = Parse.forceFloat(arrTimeBills[intCtr].getValue('custentity_apco_discount_pct', 'job')); //Project Disbursement Fee Pct
        var flProjRebatePct = Parse.forceFloat(arrTimeBills[intCtr].getValue('custentity_apco_rebate_pct', 'job')); //Project Rebate Pct
        var flDuration = Parse.forceFloat(arrTimeBills[intCtr].getValue('durationdecimal')); //TB Hour
        var flRate = Parse.forceFloat(arrTimeBills[intCtr].getValue('rate')); //TB Rate
        var flAmt = flDuration * flRate;
        var stDate = arrTimeBills[intCtr].getValue('date'); //Date
        var stProjSubsidiaryCurr = (!Eval.isEmpty(stSubsidiary)) ? nlapiLookupField('subsidiary', stProjSubsidiary, 'currency') : '';

        if (!objTimeList[stProj + '-' + stEmployee]) {
            objTimeList[stProj + '-' + stEmployee] = {};
            objTimeList[stProj + '-' + stEmployee]['arrTime'] = [];
            objTimeList[stProj + '-' + stEmployee]['flTotalAmt'] = 0;
            objTimeList[stProj + '-' + stEmployee]['flDisbFee'] = 0;
            objTimeList[stProj + '-' + stEmployee]['flDiscFee'] = 0;
            objTimeList[stProj + '-' + stEmployee]['flRebFee'] = 0;
            objTimeList[stProj + '-' + stEmployee]['stProj'] = stProj;
            objTimeList[stProj + '-' + stEmployee]['stProjName'] = stProjName;
            objTimeList[stProj + '-' + stEmployee]['stProjSubsidiary'] = stProjSubsidiary;
            objTimeList[stProj + '-' + stEmployee]['stProjCurrency'] = stProjCurrency;
            objTimeList[stProj + '-' + stEmployee]['stProjEndDate'] = stProjEndDate;
            objTimeList[stProj + '-' + stEmployee]['stEmployee'] = stEmployee;
            objTimeList[stProj + '-' + stEmployee]['stEmployeeName'] = stEmployeeName;
            objTimeList[stProj + '-' + stEmployee]['stEmployeeSub'] = stEmployeeSub;
            objTimeList[stProj + '-' + stEmployee]['stEmployeeLoc'] = stEmployeeLoc;
            objTimeList[stProj + '-' + stEmployee]['stEmployeeDept'] = stEmployeeDept;
            objTimeList[stProj + '-' + stEmployee]['stProjSubsidiaryCurr'] = stProjSubsidiaryCurr;
            objTimeList[stProj + '-' + stEmployee]['stDate'] = stDate;

        }

        objTimeList[stProj + '-' + stEmployee]['arrTime'].push(stTimeId);
        objTimeList[stProj + '-' + stEmployee]['flTotalAmt'] += flAmt;
        objTimeList[stProj + '-' + stEmployee]['flDisbFee'] += ((flAmt * flProjDisbursementPct) / 100);
        objTimeList[stProj + '-' + stEmployee]['flDiscFee'] += ((flAmt * flProjDiscountPct) / 100);
        objTimeList[stProj + '-' + stEmployee]['flRebFee'] += ((flAmt * flProjRebatePct) / 100);

        if (!Eval.inArray(stEmployeeSub, arrSubsidiaries)) {
            arrSubsidiaries.push(stEmployeeSub);
        }
        if (!Eval.inArray(stProjSubsidiary, arrSubsidiaries)) {
            arrSubsidiaries.push(stProjSubsidiary);
        }

    }

    nlapiLogExecution('DEBUG', stLogTitle, 'objTimeList = ' + JSON.stringify(objTimeList));
    nlapiLogExecution('DEBUG', stLogTitle, 'arrSubsidiaries = ' + arrSubsidiaries);

    //Initialize

    var arrInterCoChartResult = [];
    var objInterCoChartList = {};

    //Search the IC Chart custom record
    if (arrSubsidiaries.length > 0) {
        arrInterCoChartResult = searchInterCoChart(arrSubsidiaries);
        objInterCoChartList = createObjInterCoChartList(arrInterCoChartResult);
    }

    //Creation of JE or ICJE
    for (var stKey in objTimeList) {
        var stJEId = '';
        var stJEId2 = '';
        var objTime = objTimeList[stKey];
        var stProjSubsidiary = objTime['stProjSubsidiary'];
        var stEmployeeSub = objTime['stEmployeeSub'];

        var dTimeSheet = nlapiStringToDate(objTime['stDate']);
        var dProjEnd = nlapiStringToDate(objTime['stProjEndDate']);

        var stDate = '';
        if (dTimeSheet > dProjEnd) {
            stDate = nlapiDateToString(dTimeSheet);
        }
        else {
            stDate = nlapiDateToString(dProjEnd);
        }

        nlapiLogExecution('DEBUG', stLogTitle, 'stDate =' + stDate);
        nlapiLogExecution('DEBUG', stLogTitle, 'stProjSubsidiary = ' + stProjSubsidiary + ' | stEmployeeSub = ' + stEmployeeSub);

        if (stProjSubsidiary == stEmployeeSub) {
            stJEId = createJE(objTime, stDate);
        }
        else {
            nlapiLogExecution('DEBUG', stLogTitle, 'objTime[stProjSubsidiaryCurr] ' + objTime['stProjSubsidiaryCurr'] + ' | objTime[stProjCurrency]= ' + objTime['stProjCurrency']);

            if (objTime['stProjSubsidiaryCurr'] != objTime['stProjCurrency']) {
                stJEId = createJE1(objInterCoChartList, objTime, stDate);
                stJEId2 = createJE2(objInterCoChartList, objTime, stDate);
            }
            else {
                stJEId = createICJE(objInterCoChartList, objTime, stDate);
            }
        }

        //Update Time Entries
        if (!Eval.isEmpty(stJEId)) {
            var arrTime = objTime['arrTime'];
            for (var intCtr = 0; intCtr < arrTime.length; intCtr++) {
                try {
                    var stTimeId = nlapiSubmitField('timebill', arrTime[intCtr], ['custcol_apco_timeentyr_je', 'custcol_apco_timeentyr_je2'], [stJEId, stJEId2]);
                    nlapiLogExecution('AUDIT', stLogTitle, 'Time Bill updated. ID = ' + stTimeId);
                }
                catch (error) {
                    nlapiLogExecution('ERROR', stLogTitle, 'Time Bill #' + arrTime[intCtr] + ' not updated. (JE #' + stJEId + ') ' + error.getCode() + ': ' + error.getDetails());
                    ARR_ERROR_DETAILS.push('Time Bill #' + arrTime[intCtr] + ' not updated. (JE #' + stJEId + ') ' + error.getCode() + ': ' + error.getDetails());
                    continue;
                }
            }
        }

        //Monitor usage unit / time run
        INT_START_TIME = SuiteUtil.rescheduleScript(INT_USAGE_LIMIT_THRESHOLD, INT_START_TIME);

    }

    //Send email upon completion
    sendEmail();

}


/**
 * Creation of JEs
 * 
 * @param objTime
 * @param stDate
 * @returns stJEId
 * 
 */
function createJE(objTime, stDate) {

    var stLogTitle = 'processTimeAndMaterialsJEs.createJE';

    nlapiLogExecution('DEBUG', stLogTitle, 'Creating JE...');

    var stJEId = '';

    //Create Journal Entries
    var recJE = nlapiCreateRecord('journalentry');
    recJE.setFieldValue('subsidiary', objTime['stProjSubsidiary']);
    recJE.setFieldValue('currency', objTime['stProjCurrency']);
    recJE.setFieldValue('trandate', stDate);

    // 1.13 | Link time bills
    recJE.setFieldValues('custbody_linked_time_bills', objTime['arrTime']);

    var objSaleStaticValues = {};
    objSaleStaticValues.entity = objTime['stProj'];
    objSaleStaticValues.department = objTime['stEmployeeDept'];
    objSaleStaticValues.location = objTime['stEmployeeLoc'];
    objSaleStaticValues.custcol_apco_employee = objTime['stEmployee']; //Issue 1.0

    //Labor 
    createJournalLine(recJE, null, 'debit', OBJ_JE_ACCOUNTS._je_labor_db, objTime['flTotalAmt'], objSaleStaticValues);
    createJournalLine(recJE, null, 'credit', OBJ_JE_ACCOUNTS._je_labor_cr, objTime['flTotalAmt'], objSaleStaticValues);

    //If there is a disbursement fee
    if (objTime['flDisbFee'] > 0) {
        createJournalLine(recJE, null, 'debit', OBJ_JE_ACCOUNTS._je_disbu_db, objTime['flDisbFee'], objSaleStaticValues);
        createJournalLine(recJE, null, 'credit', OBJ_JE_ACCOUNTS._je_disbu_cr, objTime['flDisbFee'], objSaleStaticValues);
    }

    //If there is a discount fee
    if (objTime['flDiscFee'] > 0) {
        createJournalLine(recJE, null, 'debit', OBJ_JE_ACCOUNTS._je_disct_db, objTime['flDiscFee'], objSaleStaticValues);
        createJournalLine(recJE, null, 'credit', OBJ_JE_ACCOUNTS._je_disct_cr, objTime['flDiscFee'], objSaleStaticValues);
    }

    //If there is a rebate fee
    if (objTime['flRebFee'] > 0) {
        createJournalLine(recJE, null, 'debit', OBJ_JE_ACCOUNTS._je_rebat_db, objTime['flRebFee'], objSaleStaticValues);
        createJournalLine(recJE, null, 'credit', OBJ_JE_ACCOUNTS._je_rebat_cr, objTime['flRebFee'], objSaleStaticValues);
    }

    //Submit Record
    try {
        stJEId = nlapiSubmitRecord(recJE, true, true);
        nlapiLogExecution('AUDIT', stLogTitle, 'JE was created successfully. ID = ' + stJEId);
    }
    catch (error) {
        nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ': JE creation unsuccessful. ' + error.getCode() + ': '
				+ error.getDetails());
        ARR_ERROR_DETAILS.push('Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ': JE creation unsuccessful.' + error.getCode() + ': ' + error.getDetails());
    }

    return stJEId;

}


/**
 * Creation of ICJEs
 * 
 * @param objInterCoChartList
 * @param objTime
 * @param stDate
 * @returns stJEId
 * 
 */
function createICJE(objInterCoChartList, objTime, stDate) {

    var stLogTitle = 'processTimeAndMaterialsJEs.createICJE';

    nlapiLogExecution('DEBUG', stLogTitle, 'Creating ICJE...');

    var stJEId = '';

    var stProjSubsidiary = objTime['stProjSubsidiary'];
    var stEmployeeSub = objTime['stEmployeeSub'];
    var objSubProj = objInterCoChartList[stProjSubsidiary];
    var objSubEmp = objInterCoChartList[stEmployeeSub];

    if (Eval.isEmpty(objSubProj) || Eval.isEmpty(objSubEmp)) {
        nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ': Subsidiary (#' + stProjSubsidiary + ' | #' + stEmployeeSub
				+ ')not existing in the Cross Reference Acct');
        ARR_ERROR_DETAILS.push('Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ': Subsidiary (#' + stProjSubsidiary + ' | #' + stEmployeeSub
				+ ')not existing in the Cross Reference Acct');
        return stJEId;
    }

    //Initialize Cross Reference Table
    var stAccruedAcct = objSubEmp.stAccruedIC;
    var stUnbilledIC = objSubProj.stUnbilledIC;
    if (Eval.isEmpty(stAccruedAcct) || Eval.isEmpty(stUnbilledIC)) {
        nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ': Cannot find subsidiaries in the intercompany chart record.');
        ARR_ERROR_DETAILS.push('Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ':  Cannot find subsidiaries in the intercompany chart record.');
        return stJEId;
    }

    //Create Intercompany Journal Entries
    var recICJE = nlapiCreateRecord('intercompanyjournalentry');

    recICJE.setFieldValue('subsidiary', objTime['stProjSubsidiary']); //FROM Subsidiary
    recICJE.setFieldValue('tosubsidiary', objTime['stEmployeeSub']); //TO Subsidiary
    recICJE.setFieldValue('currency', objTime['stProjCurrency']);
    recICJE.setFieldValue('trandate', stDate);

    var objFromStaticValues = {};
    objFromStaticValues.memo = objTime['stProjName'];
    objFromStaticValues.entity = objTime['stProj'];
    objFromStaticValues.custcol_apco_employee = objTime['stEmployee'];

    var objToStaticValues = {};
    objToStaticValues.memo = objTime['stProjName'];
    objToStaticValues.department = objTime['stEmployeeDept'];
    objToStaticValues.location = objTime['stEmployeeLoc'];
    objToStaticValues.custcol_apco_employee = objTime['stEmployee'];
    objToStaticValues.custcol_apco_ic_project = objTime['stProj'];

    //Labor
    createJournalLine(recICJE, objTime['stProjSubsidiary'], 'debit', OBJ_ICJE_ACCOUNTS._icje_labor_fr_ac_db, objTime['flTotalAmt'], objFromStaticValues);
    createJournalLine(recICJE, objTime['stProjSubsidiary'], 'credit', stAccruedAcct, objTime['flTotalAmt'], objFromStaticValues);
    createJournalLine(recICJE, objTime['stProjSubsidiary'], 'debit', OBJ_ICJE_ACCOUNTS._icje_labor_fr_ic_db, objTime['flTotalAmt'], objFromStaticValues);
    createJournalLine(recICJE, objTime['stProjSubsidiary'], 'credit', OBJ_ICJE_ACCOUNTS._icje_labor_fr_ic_cr, objTime['flTotalAmt'], objFromStaticValues);
    createJournalLine(recICJE, objTime['stEmployeeSub'], 'debit', stUnbilledIC, objTime['flTotalAmt'], objToStaticValues);
    createJournalLine(recICJE, objTime['stEmployeeSub'], 'credit', OBJ_ICJE_ACCOUNTS._icje_labor_to_ac_cr, objTime['flTotalAmt'], objToStaticValues);

    //If there is a disbursement fee
    if (objTime['flDisbFee'] > 0) {
        createJournalLine(recICJE, objTime['stProjSubsidiary'], 'debit', OBJ_ICJE_ACCOUNTS._icje_disbu_fr_ac_db, objTime['flDisbFee'], objFromStaticValues);
        createJournalLine(recICJE, objTime['stProjSubsidiary'], 'credit', stAccruedAcct, objTime['flDisbFee'], objFromStaticValues);
        createJournalLine(recICJE, objTime['stProjSubsidiary'], 'debit', OBJ_ICJE_ACCOUNTS._icje_disbu_fr_ic_db, objTime['flDisbFee'], objFromStaticValues);
        createJournalLine(recICJE, objTime['stProjSubsidiary'], 'credit', OBJ_ICJE_ACCOUNTS._icje_disbu_fr_ic_cr, objTime['flDisbFee'], objFromStaticValues);
        createJournalLine(recICJE, objTime['stEmployeeSub'], 'debit', stUnbilledIC, objTime['flDisbFee'], objToStaticValues);
        createJournalLine(recICJE, objTime['stEmployeeSub'], 'credit', OBJ_ICJE_ACCOUNTS._icje_disbu_to_ac_cr, objTime['flDisbFee'], objToStaticValues);
    }

    //If there is a discount fee
    if (objTime['flDiscFee'] > 0) {
        createJournalLine(recICJE, objTime['stProjSubsidiary'], 'debit', stAccruedAcct, objTime['flDiscFee'], objFromStaticValues);
        createJournalLine(recICJE, objTime['stProjSubsidiary'], 'credit', OBJ_ICJE_ACCOUNTS._icje_disct_fr_ac_cr, objTime['flDiscFee'], objFromStaticValues);
        createJournalLine(recICJE, objTime['stProjSubsidiary'], 'debit', OBJ_ICJE_ACCOUNTS._icje_disct_fr_ic_db, objTime['flDiscFee'], objFromStaticValues);
        createJournalLine(recICJE, objTime['stProjSubsidiary'], 'credit', OBJ_ICJE_ACCOUNTS._icje_disct_fr_ic_cr, objTime['flDiscFee'], objFromStaticValues);
        createJournalLine(recICJE, objTime['stEmployeeSub'], 'debit', OBJ_ICJE_ACCOUNTS._icje_disct_to_ac_db, objTime['flDiscFee'], objToStaticValues);
        createJournalLine(recICJE, objTime['stEmployeeSub'], 'credit', stUnbilledIC, objTime['flDiscFee'], objToStaticValues);
    }

    //If there is a rebate fee
    if (objTime['flRebFee'] > 0) {
        createJournalLine(recICJE, objTime['stProjSubsidiary'], 'debit', stAccruedAcct, objTime['flRebFee'], objFromStaticValues);
        createJournalLine(recICJE, objTime['stProjSubsidiary'], 'credit', OBJ_ICJE_ACCOUNTS._icje_rebat_fr_ac_cr, objTime['flRebFee'], objFromStaticValues);
        createJournalLine(recICJE, objTime['stProjSubsidiary'], 'debit', OBJ_ICJE_ACCOUNTS._icje_rebat_fr_ic_db, objTime['flRebFee'], objFromStaticValues);
        createJournalLine(recICJE, objTime['stProjSubsidiary'], 'credit', OBJ_ICJE_ACCOUNTS._icje_rebat_fr_ic_cr, objTime['flRebFee'], objFromStaticValues);
        createJournalLine(recICJE, objTime['stEmployeeSub'], 'debit', OBJ_ICJE_ACCOUNTS._icje_rebat_to_ac_db, objTime['flRebFee'], objToStaticValues);
        createJournalLine(recICJE, objTime['stEmployeeSub'], 'credit', stUnbilledIC, objTime['flRebFee'], objToStaticValues);
    }

    try {
        stJEId = nlapiSubmitRecord(recICJE, true, true);
        nlapiLogExecution('AUDIT', stLogTitle, 'ICJE was created successfully. ID = ' + stJEId);
    }
    catch (error) {
        nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ': ICJE creation unsuccessful. ' + error.getCode() + ': '
				+ error.getDetails());
        ARR_ERROR_DETAILS.push('Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ': ICJE creation unsuccessful.' + error.getCode() + ': ' + error.getDetails());
    }

    return stJEId;

}




/**
 * Create JE1
 * @param objInterCoChartList
 * @param objTime
 * @param stDate
 * @returns stJEId
 */
function createJE1(objInterCoChartList, objTime, stDate) {

    var stLogTitle = 'processTimeAndMaterialsJEs.createJE1';

    nlapiLogExecution('DEBUG', stLogTitle, 'Creating JE 1...');

    var stJEId = '';

    var stEmployeeSub = objTime['stEmployeeSub'];
    var objSubEmp = objInterCoChartList[stEmployeeSub];

    if (Eval.isEmpty(objSubEmp)) {
        nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ': Subsidiary (#' + stEmployeeSub
				+ ') not existing in the Cross Reference Acct');
        ARR_ERROR_DETAILS.push('Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ': Subsidiary (#' + stEmployeeSub
				+ ') not existing in the Cross Reference Acct');
        return stJEId;
    }

    //Initialize Cross Reference Table
    var stAccruedAcct = objSubEmp.stAccruedIC;

    if (Eval.isEmpty(stAccruedAcct)) {
        nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ': Cannot find subsidiaries in the intercompany chart record.');
        ARR_ERROR_DETAILS.push('Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ':  Cannot find subsidiaries in the intercompany chart record.');
        return stJEId;
    }

    //Create JE 1
    var recJE = nlapiCreateRecord('journalentry',
	{
	    recordmode: 'dynamic'
	});

    recJE.setFieldValue('subsidiary', objTime['stProjSubsidiary']);
    recJE.setFieldValue('currency', objTime['stProjCurrency']);
    recJE.setFieldValue('trandate', stDate);

    // 1.13 | Link time bills
    recJE.setFieldValues('custbody_linked_time_bills', objTime['arrTime']);

    var flAmt = objTime['flTotalAmt'];
    var flDisbAmt = objTime['flDisbFee'];
    var flRebateAmt = objTime['flRebFee'];

    var objValues = {};
    objValues.entity = objTime['stProj'];
    objValues.memo = objTime['stProjName'];
    objValues.custcol_apco_employee = objTime['stEmployee'];

    //TOTAL
    createJournalLine(recJE, null, 'debit', OBJ_JE1._unbilled_time, flAmt, objValues);
    createJournalLine(recJE, null, 'credit', stAccruedAcct, flAmt, objValues);
    createJournalLine(recJE, null, 'debit', OBJ_JE1._intercompany_exp, flAmt, objValues);
    createJournalLine(recJE, null, 'credit', OBJ_JE1._intercompany_rev, flAmt, objValues);

    //DISBURSEMENT
    if (flDisbAmt > 0) {
        createJournalLine(recJE, null, 'debit', OBJ_JE1._unbilled_disb, flDisbAmt, objValues);
        createJournalLine(recJE, null, 'credit', stAccruedAcct, flDisbAmt, objValues);
        createJournalLine(recJE, null, 'debit', OBJ_JE1._intercompany_exp, flDisbAmt, objValues);
        createJournalLine(recJE, null, 'credit', OBJ_JE1._intercompany_rev, flDisbAmt, objValues);
    }

    //REBATE
    if (flRebateAmt > 0) {
        createJournalLine(recJE, null, 'debit', stAccruedAcct, flRebateAmt, objValues);
        createJournalLine(recJE, null, 'credit', OBJ_JE1._rebate, flRebateAmt, objValues);
        createJournalLine(recJE, null, 'debit', OBJ_JE1._intercompany_rev, flRebateAmt, objValues);
        createJournalLine(recJE, null, 'credit', OBJ_JE1._intercompany_exp, flRebateAmt, objValues);
    }

    try {
        stJEId = nlapiSubmitRecord(recJE, false, true);
        nlapiLogExecution('AUDIT', stLogTitle, 'JE1 was created successfully. ID = ' + stJEId);
    }
    catch (error) {
        nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ': JE1 creation unsuccessful. ' + error.getCode() + ': '
				+ error.getDetails());
        ARR_ERROR_DETAILS.push('Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ': JE1 creation unsuccessful.' + error.getCode() + ': ' + error.getDetails());
    }

    return stJEId;

}



/**
 * Create JE2
 * @param objInterCoChartList
 * @param objTime
 * @param stDate
 * @returns stJEId
 */
function createJE2(objInterCoChartList, objTime, stDate) {
    var stLogTitle = 'processTimeAndMaterialsJEs.createJE2';
    nlapiLogExecution('DEBUG', stLogTitle, 'Creating JE2...');

    var stJEId = '';

    var stProjSubsidiary = objTime['stProjSubsidiary'];
    var objSubProj = objInterCoChartList[stProjSubsidiary];

    if (Eval.isEmpty(objSubProj)) {
        nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ': Subsidiary (#' + stProjSubsidiary + ')not existing in the Cross Reference Acct');
        ARR_ERROR_DETAILS.push('Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ': Subsidiary (#' + stProjSubsidiary + ')not existing in the Cross Reference Acct');
        return stJEId;
    }

    //Initialize Cross Reference Table
    var stUnbilledAcct = objSubProj.stUnbilledIC;

    if (Eval.isEmpty(stUnbilledAcct)) {
        nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ': Cannot find subsidiaries in the intercompany chart record.');
        ARR_ERROR_DETAILS.push('Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ':  Cannot find subsidiaries in the intercompany chart record.');
        return stJEId;
    }

    //Create JE2
    var recJE = nlapiCreateRecord('journalentry',
	{
	    recordmode: 'dynamic'
	});

    recJE.setFieldValue('subsidiary', objTime['stEmployeeSub']);
    recJE.setFieldValue('currency', objTime['stProjCurrency']);
    recJE.setFieldValue('trandate', stDate);

    // 1.13 | Link time bills
    recJE.setFieldValues('custbody_linked_time_bills', objTime['arrTime']);

    var flAmt = objTime['flTotalAmt'];
    var flDisbAmt = objTime['flDisbFee'];
    var flRebateAmt = objTime['flRebFee'];

    var objValues = {};
    objValues.custcol_apco_ic_project = objTime['stProj'];
    objValues.memo = objTime['stProjName'];
    objValues.custcol_apco_employee = objTime['stEmployee'];


    //TOTAL
    createJournalLine(recJE, null, 'debit', stUnbilledAcct, flAmt, objValues);
    createJournalLine(recJE, null, 'credit', OBJ_JE2._fee_rev_tm, flAmt, objValues);

    //DISBURSEMENT
    if (flDisbAmt > 0) {
        createJournalLine(recJE, null, 'debit', stUnbilledAcct, flDisbAmt, objValues);
        createJournalLine(recJE, null, 'credit', OBJ_JE2._disb_fee_rev, flDisbAmt, objValues);
    }

    //REBATE
    if (flRebateAmt > 0) {
        createJournalLine(recJE, null, 'debit', OBJ_JE2._rebates, flRebateAmt, objValues);
        createJournalLine(recJE, null, 'credit', stUnbilledAcct, flRebateAmt, objValues);
    }

    try {
        stJEId = nlapiSubmitRecord(recJE, false, true);
        nlapiLogExecution('AUDIT', stLogTitle, 'JE2 was created successfully. ID = ' + stJEId);
    }
    catch (error) {
        nlapiLogExecution('ERROR', stLogTitle, 'Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ': JE2 creation unsuccessful. ' + error.getCode() + ': '
				+ error.getDetails());
        ARR_ERROR_DETAILS.push('Project #' + objTime['stProj'] + ' | Employee #' + objTime['stEmployee'] + ': JE2 creation unsuccessful.' + error.getCode() + ': ' + error.getDetails());
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
    var stLogTitle = 'scheduled_approveTime.createJournalLine';
    nlapiLogExecution('DEBUG', stLogTitle, 'stLineSub = ' + stLineSub + ' | stType = ' + stType + ' | stAcct = ' + stAcct + ' | stAmount = ' + stAmount);

    recTxn.selectNewLineItem('line');
    if (!Eval.isEmpty(stLineSub)) {
        recTxn.setCurrentLineItemValue('line', 'linesubsidiary', stLineSub); // ICJE
    }

    recTxn.setCurrentLineItemValue('line', stType, stAmount.toFixed(2));
    recTxn.setCurrentLineItemValue('line', 'account', stAcct);
    if (objStaticValues != null) {
        for (var stKey in objStaticValues) {
            recTxn.setCurrentLineItemValue('line', stKey, objStaticValues[stKey]);
        }
    }
    recTxn.commitLineItem('line');

}


/**
 * Search for all the Journal Entries
 * 
 * @param stTimeSavedSearch - Saved Search to execute
 * @param arrTimeBillsToProcess - Time Bill Ids to Process
 * @returns arrResults - search result of the saved search executed against transaction
 */
function searchTimeBills(stTimeSavedSearch, arrTimeBillsToProcess) {
    var stLogTitle = 'scheduled_approveTime.processTimeAndMaterialsJEs.searchTimeList';

    //Filters
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('internalid', null, 'anyof', arrTimeBillsToProcess));

    //Columns
    var arrColumns = [];

    //Results
    var arrResults = SuiteUtil.search(stTimeSavedSearch, 'timebill', arrFilters, arrColumns);
    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);

    return arrResults;
}

/**
 * Search for Intercompany Chart Record based on subsidiary
 * 
 * @param arrSubsidiaries - Saved Search to execute
 * @returns arrResults - search result of the saved search executed against transaction
 */
function searchInterCoChart(arrSubsidiaries) {
    var stLogTitle = 'scheduled_approveTime.processTimeAndMaterialsJEs.searchInterCoChart';

    //Filters
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('custrecord_subsidiary', null, 'anyof', arrSubsidiaries));

    //Columns
    var arrColumns = [];
    arrColumns.push(new nlobjSearchColumn('custrecord_subsidiary')); //Subsidiary
    arrColumns.push(new nlobjSearchColumn('custrecord_unbilled_ic_ar')); //Unbilled IC Receivable
    arrColumns.push(new nlobjSearchColumn('custrecord_accrued_ic_ap')); //Accrued IC Payable
    arrColumns.push(new nlobjSearchColumn('custrecord_ic_ar')); //InterCompany AR
    arrColumns.push(new nlobjSearchColumn('custrecord_ic_ap')); //InterCompany AP

    //Results
    var arrResults = SuiteUtil.search(null, 'customrecord_apco_intercompany_chart', arrFilters, arrColumns);
    nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);

    return arrResults;
}

/**
*
* Send error status email
* 
*/
function sendEmail() {
    var stLogTitle = 'scheduled_approveTime.processTimeAndMaterialsJEs.sendEmail';

    var stUser = nlapiGetUser();
    var stSubject = '[Apco] Hard Approve Time';
    var stBody = '';
    stBody += 'Date: ' + new Date() + ' <br/>';
    if (ARR_ERROR_DETAILS.length > 0) {
        stBody += 'Errors: <br/>';
        for (var intCtr = 0; intCtr < ARR_ERROR_DETAILS.length; intCtr++) {
            stBody += ' - ' + ARR_ERROR_DETAILS[intCtr] + '<br/>';
        }
    }
    else {
        stBody += 'Process Status: Successful.';
    }

    nlapiLogExecution('DEBUG', stLogTitle, 'stUser = ' + stUser + '| stBody =' + stBody);

    nlapiSendEmail(stUser, stUser, stSubject, stBody);

    nlapiLogExecution('DEBUG', stLogTitle, 'Email Sent..');
}

/**
 * Save search result to an object
 * 
 * @param arrInterCoChartResult 
 * @returns objInterCoChartList 
 */
function createObjInterCoChartList(arrInterCoChartResult) {
    var stLogTitle = 'scheduled_approveTime.processTimeAndMaterialsJEs.createObjInterCoChartList';

    var objInterCoChartList = {};

    for (var intCtr = 0; intCtr < arrInterCoChartResult.length; intCtr++) {
        var stSubsidiary = arrInterCoChartResult[intCtr].getValue('custrecord_subsidiary');
        var stUnbilledIC = arrInterCoChartResult[intCtr].getValue('custrecord_unbilled_ic_ar');
        var stAccruedIC = arrInterCoChartResult[intCtr].getValue('custrecord_accrued_ic_ap');
        var stICAcctRec = arrInterCoChartResult[intCtr].getValue('custrecord_ic_ar');
        var stICAcctPay = arrInterCoChartResult[intCtr].getValue('custrecord_ic_ap');

        objInterCoChartList[stSubsidiary] = {};
        objInterCoChartList[stSubsidiary].stUnbilledIC = stUnbilledIC;
        objInterCoChartList[stSubsidiary].stAccruedIC = stAccruedIC;
        objInterCoChartList[stSubsidiary].stICAcctRec = stICAcctRec;
        objInterCoChartList[stSubsidiary].stICAcctPay = stICAcctPay;
    }

    nlapiLogExecution('DEBUG', stLogTitle, 'objInterCoChartList = ' + JSON.stringify(objInterCoChartList));
    return objInterCoChartList;
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