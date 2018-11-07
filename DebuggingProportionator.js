

var arrJEsProcess = 157992;
var arrJournalEntries = searchJournalEntries(stRevRecSearch, arrJEsProcess);
var arrTmpJEId = [];
var objJournalEntry = {};
var arrKeys = new Array();
// first loop
for (var inLineCntr = 0; inLineCntr < arrJournalEntries.length; inLineCntr++) {

    
    var stRevRecSearch = 'customsearch_sl_retainer_plus_time_only';
   

    var intJournalEntryId = arrJournalEntries[inLineCntr].getId();
    nlapiLogExecution('DEBUG', stLogTitle, 'intJournalEntryId = ' + intJournalEntryId);
    // Create JE object
 
    // check for unbilled amount
    var stJobId = arrJournalEntries[inLineCntr].getValue('internalid', 'job');
    var stEndDate = arrJournalEntries[inLineCntr].getValue('custentity_apco_proj_period_end_date', 'job');
    var stProjType = arrJournalEntries[inLineCntr].getValue('jobtype', 'job');
    var stProjCurrency = arrJournalEntries[inLineCntr].getValue('currency', 'job');
    var stProjectSubsidiaryId = arrJournalEntries[inLineCntr].getValue('subsidiary', 'job');
  //  var stProjSubsidiaryCurrency = OBJ_SUBSIDIARIES[stProjectSubsidiaryId].currency;
 
    nlapiLogExecution('DEBUG', stLogTitle, 'stJobId = ' + stJobId + ' | stEndDate =' + stEndDate + ' | stProjType =' + stProjType + ' | stProjCurrency =' + stProjCurrency + ' | stProjSubsidiaryCurrency =' + stProjSubsidiaryCurrency);
 
   // var stUnbilledAmount = getUnbilledAmount(stJobId, stEndDate, stTransactionRetainerLess, stProjType, stProjCurrency, stProjSubsidiaryCurrency);
    nlapiLogExecution('DEBUG', stLogTitle, 'stUnbilledAmount = ' + stUnbilledAmount);
 
 //   markRebillTransactions(stJobId, stEndDate, stTransactionRetainerLess2);
 
    //mj start 7/26/2016
    var stTranDate = arrJournalEntries[inLineCntr].getValue('trandate');
    var stPostingPd = arrJournalEntries[inLineCntr].getValue('postingperiod');
    //mj end 7/26/2016
 
   // nlapiLogExecution('DEBUG', stLogTitle, 'stUnbilledAmount after getUnbilled = ' + stUnbilledAmount);
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
}

 
 
 
 
 
 
function searchJournalEntries(stRevRecSearch, arrJEs) {
    var stLogTitle = 'scheduled_ProcessRevenueRecognition.searchJournalEntries';
    // Filters
    var arrFilters = [];
    arrFilters.push(new nlobjSearchFilter('internalid', null, 'anyof', arrJEs));
 
    // Columns
    var arrColumns = [];
    var arrResults =nlapiSearchRecord('journalentry',stRevRecSearch,  arrFilters, arrColumns);
   //var arrResults = SuiteUtil.search(stRevRecSearch, 'journalentry', arrFilters, arrColumns);
 
   nlapiLogExecution('DEBUG', stLogTitle, 'arrResults.length = ' + arrResults.length);
    return arrResults;
    var stop ='';
}

