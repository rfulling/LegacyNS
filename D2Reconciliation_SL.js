/**
 * Copyright NetSuite, Inc. 2015 All rights reserved. 
 * The following code is a demo prototype. Due to time constraints of a demo,
 * the code may contain bugs, may not accurately reflect user requirements 
 * and may not be the best approach. Actual implementation should not reuse 
 * this code without due verification.
 * 
 * (Module description here. Whole header length should not exceed 
 * 100 characters in width. Use another line if needed.)
 * 
 * Version    Date            Author           Remarks
 * 1.00       25 Nov 2015     rtapulado
 * 
 */
{
    var SBL_JE = 'custpage_sbl_je';
    var COL_RECONCILIATION = 'custpage_col_reconciliation';
    var COL_ACCOUNT = 'custpage_col_acctname';
    var COL_CLASS = 'custpage_col_class';
    var COL_DEBIT = 'custpage_col_debit';
    var COL_CREDIT = 'custpage_col_credit';
    var COL_AMOUNT = 'custpage_col_amount';
    var COL_D2_CLEARED = 'custpage_d2_cleared';
    var COL_DEPARTMENT = 'custpage_department';
    var COL_LOCATION = 'custpage_location';
    var SS_RECONCILIATION_GROUPED = 'customsearch_d2_recon_grouped';
    var SS_RECONCILIATION_BASE = 'customsearch_d2_recon_base';
    var FLD_RECONCILIATION = 'custcol_jm_rtr_d2';
    var FLD_D2_CLEARED = 'custcol_jm_rtr_d2_cleared';
    var SCRIPT_D2_RECONCILIATION = 'customscript_d2_reconciliation_sl';
    var DEPLOY_D2_RECONCILIATION = 'customdeploy_d2_reconciliation_sl';


}
/**
 * @param {nlobjRequest} request Request object
 * @param {nlobjResponse} response Response object
 * @return {void} Any output is written via response object
 */
function loanSystemReconciliationGroupedDisplay(request, response) {
    if (request.getMethod() == 'GET') {
        populateForm(request);
    } else {
        updateD2Cleared(request);
        nlapiSetRedirectURL('SUITELET', SCRIPT_D2_RECONCILIATION, DEPLOY_D2_RECONCILIATION);

    }

}

/**
 * add fields on form
 * @param request
 */
function populateForm(request) {
    var frmJEs = nlapiCreateForm('D2 Reconciliation');
    var sblJEs = frmJEs.addSubList(SBL_JE, "list", "Transactions", null);
    sblJEs.addField(COL_RECONCILIATION, 'text', 'D2 Reconciliation Field');
    sblJEs.addField(COL_ACCOUNT, 'select', 'Account Name', 'Account').setDisplayType('inline');
    sblJEs.addField(COL_CLASS, 'text', 'Class');
    sblJEs.addField(COL_DEPARTMENT, 'text', 'Department');
    sblJEs.addField(COL_LOCATION, 'text', 'Location');
    sblJEs.addField(COL_DEBIT, 'text', 'Debit');
    sblJEs.addField(COL_CREDIT, 'text', 'Credit');
    sblJEs.addField(COL_AMOUNT, 'text', 'Amount');

    var aResults = getJEsGrouped();
    populateSublist(sblJEs, aResults);
    frmJEs.addSubmitButton('Update D2 Cleared');
    response.writePage(frmJEs);

}

function populateSublist(sblJEs, aResults) {
    if (aResults) {
        for (var i = aResults.length - 1, j = 1; i >= 0; i--) {
            var aColumns = aResults[i].getAllColumns();
            var sReconciliation = aResults[i].getValue('custcol_jm_rtr_d2', null, 'group');
            var fSubsidiary = aResults[i].getValue('subsidiary', null, 'group');
            var dAccount = aResults[i].getValue('account', null, 'group');
            var fClass = aResults[i].getValue('class', null, 'group');
              var showClass = aResults[i].getText('class', null, 'group');
            var fDepartment = aResults[i].getValue('department', null, 'group');
                var showDepartment = aResults[i].getText('department', null, 'group');
            var fDebit = aResults[i].getValue('debitamount', null, 'sum');
            var fCredit = aResults[i].getValue('creditamount',null,'sum');
            var fAmount = aResults[i].getValue('amount',null,'sum');
            var fcleared = aResults[i].getValue('custcol_jm_rtr_d2_cleared', null, 'group');
            
            var fLocation = aResults[i].getValue('location',null,'group');
              var showLocation = aResults[i].getText('location',null,'group');


            if (fDebit == fCredit && fcleared == "F") {
                sblJEs.setLineItemValue(COL_RECONCILIATION, j, sReconciliation);
                sblJEs.setLineItemValue(COL_ACCOUNT, j, dAccount);
                sblJEs.setLineItemValue(COL_CLASS, j, showClass);
                sblJEs.setLineItemValue(COL_LOCATION, j, showLocation);
                sblJEs.setLineItemValue(COL_DEPARTMENT, j, showDepartment);
                sblJEs.setLineItemValue(COL_DEBIT, j, fDebit);
                sblJEs.setLineItemValue(COL_CREDIT, j, fCredit);
                sblJEs.setLineItemValue(COL_AMOUNT, j, fAmount);
                j++;
            }
        }
    }
}

/**
 * update journal entry column D2 Cleared checkbox = T
 * @param request
 */
function updateD2Cleared(request) {

    
       //Call the scheduled script
      var stScheduledScriptId = 'customscript_d2_reconciliation_ss';
      var stScheduledDeploymentId = 'customdeploy_d2_reconciliation_ss';
  
      var stLogTitle = 'suitelet_D2suitelet.callScheduledScript';
  
      nlapiLogExecution('DEBUG', stLogTitle, 'Scheduled Script ID = ' + stScheduledScriptId + '| Scheduled Script Deployment ID = ' + stScheduledDeploymentId);
  
      var stSchedStatus = nlapiScheduleScript(stScheduledScriptId, stScheduledDeploymentId, null);
      nlapiLogExecution('DEBUG', stLogTitle, 'Scheduled Script Status : ' + stSchedStatus);
      /*
      while (stSchedStatus != 'QUEUED') {
          nlapiLogExecution('DEBUG', stLogTitle, 'No available Sched Script Deployment found, creating new deployment.');
  
          createNewDeployment(stScheduledDeploymentId);
  
          stSchedStatus = nlapiScheduleScript(stScheduledScriptId, null, arrParams);
          nlapiLogExecution('DEBUG', stLogTitle, 'Scheduled Script Status : ' + stSchedStatus);
      }
       return stSchedStatus;
    /*

    var nLines = request.getLineItemCount(SBL_JE);
    for (var i = 1; i <= nLines; i++) {
        var sReconciliation = request.getLineItemValue(SBL_JE, COL_RECONCILIATION, i);
        //search all affecting transactions
        var aReconciliationBased = getJEsBase(sReconciliation);

        for (var j = 0; j < aReconciliationBased.length; j++) {
            var aColumns = aReconciliationBased[j].getAllColumns();
            var idJE = aReconciliationBased[j].getId();
            var sRecordType = aReconciliationBased[j].getRecordType();

            var recJE = nlapiLoadRecord(sRecordType, idJE);
            var nLineJE = recJE.getLineItemCount('line');

            for (var k = 1; k <= nLineJE; k++) {
                recJE.setLineItemValue('line', FLD_D2_CLEARED, k, 'T');
            }
            nlapiSubmitRecord(recJE);
        }
    }
    */
}




function getJEsGrouped() {
    return nlapiSearchRecord(null, SS_RECONCILIATION_GROUPED);
}

function getJEsBase(sReconciliation) {
    var aSearchFilters = new Array();
    aSearchFilters.push(new nlobjSearchFilter(FLD_RECONCILIATION, null, 'is', sReconciliation));
    return nlapiSearchRecord(null, SS_RECONCILIATION_BASE, aSearchFilters);
}

/**
 * 
 * @param sData
 * @returns true if data supplied is null/empty otherwise false
 */
function isNullOrEmpty(sData) {
    return ((sData == '') || (sData == null) || (typeof (sData) == 'undefined')) ? true : false;
}
