// JavaScript source code


{
    var REVENUE_ACCOUNT = 809;//400010
    var FEE_RETAINER =809;//400010
    var FEE_RETAINER_DISB_FEE =814;//400300
    var FEE_RETAINER_DISCOUNT = 811;//400110
    var FEE_RETAINER_REBATE = 810;//400100
    //IntercompanyAccounts
    var INTERCOMPANY_REVENUE = 815; //400400 Intercompany Revenue
    var INTERCOMPANY_EXPENSE = 819; //500400 Intercompany Exepese
    var REBATES = 810;

    //accounts for T and M 
    var TM_UNBILLED_TIME='';
    var TM_FEE_ = '';

    var TM_UNBILLED_DISBURSMENT = '';
    var TM_DESBURSMENT_REVENUE ='';

    var TM_DISCOUNT_FEE = '';
    var TM_UNBILLED_DISCOUNT='';

    var TM_REBATE_REVENUE = '';
    var TM_REBATE='';
}




//tiemp for one employee
//arrFilters.push(new nlobjSearchFilter('employee', null, 'is', 7));

//arrColumns.push(new nlobjSearchColumn('type').setSort(false));

//arrColumns.push(new nlobjSearchColumn('internalid', 'timesheet'));
/*
arrColumns.push(new nlobjSearchColumn('custrecord_time_entry_appr_status', null,'sum'));
arrColumns.push(new nlobjSearchColumn('custrecord_apco_rev_rec_distribution', null,'sum'));
arrColumns.push(new nlobjSearchColumn('custrecord_apco_discount_distr', null,'sum'));
arrColumns.push(new nlobjSearchColumn('custrecord_apco_rebate_distr', null,'sum'));
arrColumns.push(new nlobjSearchColumn('custrecord_apco_disb_fee_rev_distr', null,'sum'));
arrColumns.push(new nlobjSearchColumn('employee','timesheet','group'));
arrColumns.push(new nlobjSearchColumn('subsidiary', 'job','group'));
arrColumns.push(new nlobjSearchColumn('department', null,'group'));
//arrColumns.push(new nlobjSearchColumn('location', null,'group'));
*/


var jobid = 4378;

var tProjectType = parseInt(nlapiLookupField('job', jobid, 'jobtype'));

//Criteria for Retainer plus=1
//             Retainer less=3
//             retainerless-FF =9
//             Project pricing = 4

//case statement here for the project type.  It determines the type of journals
switch (tProjectType) {
    case 1: jeProcessingRetainerPlus(jobid); break;
    case 2: jeProcessingTandM(jobid); break;
    case 3: jeProcessingRetainerLess(jobid); break;
    case 4: jeProcessingRetainerPlus(jobid); break;
    case 9: jeProcessingRetainerPlus(jobid); break;
        // case 2: process_reversal(); break;
}

//Retainer plus
function jeProcessingRetainerPlus(jobId) {
   
    var pEndDate = '02/29/2016';  //get project end date
    //search by project
    var arrFilters = [];
    var arrColumns = [];
    arrFilters.push(new nlobjSearchFilter('internalid', 'job', 'is', jobId));
    arrFilters.push(new nlobjSearchFilter('type', null, 'is', 'A'));
    arrFilters.push(new nlobjSearchFilter('date', null, 'onorbefore', pEndDate));
    arrFilters.push(new nlobjSearchFilter('custcol_apco_timeentyr_je', null, 'anyof', '@NONE@'));
    //arrColumns.push(new nlobjSearchColumn('custrecord_apco_rev_oop'));


    //this search is not for t and m billing
    var arrREQ = nlapiSearchRecord('timebill', 'customsearch_apco_rev_rec_je', arrFilters, arrColumns);
    var feeRetainer = 0;
    var feeRetainerDisc = 0;
    var feeRebate = 0;
    var feeDisbursement = 0;

    //summary variables 
    var totNonICamt = 0;
    var totIntercoICamt = 0;

    var totNonICDisc = 0;
    var totIntercoDisc = 0;

    var totNonICRebate = 0;
    var totIntercoRebate = 0;

    var totNoICDisb = 0;
    var totIntercoDisb = 0;
    var jeLines = new Array();
    var jeLinesInterCo = new Array();

    var jLines = new Array();
    var jeInterco = new Array();

    var feeRetainer = 0;
    var feeRetainerDisc = 0;
    var feeRebate = 0;
    var feeDisbursement = 0;
    var emp = 0;
    var projectSub = '';
    var dept = '';
//loop one get the totals for the project
    var empItems = new Array();
    var intercoEmployeeLocation = '';
    var projectEmployeeLocation = '';
   
  
    
    for (var i = 0; i < arrREQ.length; i++) {
        // nlapiLogExecution('DEBUG', stLoggerTitle, '>>lineNum<<' + i);

        //var tSId = arrREQ[i].getValue('internalid', 'timesheet');
        feeRetainer = arrREQ[i].getValue('custcol_apco_labor_fee_distribution', null, 'sum');
        feeRetainerDisc = arrREQ[i].getValue('custcol_apco_discount_distr', null, 'sum');
        feeRebate = arrREQ[i].getValue('custcol_apco_rebate_distr', null, 'sum');
        feeDisbursement = arrREQ[i].getValue('custcol_apco_disb_fee_rev_distr', null, 'sum');
         emp = arrREQ[i].getValue('employee', null, 'group');
         projectSub = parseInt(arrREQ[i].getValue('subsidiary','job','group'));
         dept = arrREQ[i].getValue('department',null,'group');
        // var sub = arrREQ[i].getValue('subsidiary');
        //get the employee sub for processing interto

         empItems=nlapiLookupField('employee', emp, ['subsidiary','location']);
         empSub = empItems.subsidiary;
         var empLoc = empItems.location;
        // now make the journal entries.
         if (isEmpty(feeRetainer)) { feeRetainer = 0; }
         if (isEmpty(feeRetainerDisc)) { feeRetainerDisc = 0; }
         if (isEmpty(feeRebate)) { feeRebate = 0; }
         if (isEmpty(feeDisbursement)) { feeDisbursement = 0; }

         if (empSub == projectSub) {
             createJournals(feeRetainer, feeRetainerDisc, feeRebate,feeDisbursement, emp, empSub, dept, projectSub, jobId,empLoc);
        }
         if (empSub != projectSub) {
            createICjournals_V2(feeRetainer, feeRetainerDisc, feeRebate, feeDisbursement, emp, empSub, dept, projectSub, jobId, empLoc)
        }
    }

   

    
    var totalRevenue = 0;
    var totalDiscount = 0;
    var totalRebate = 0;
    var totalDisb = 0;

   
    for (var x = 0; x < arrREQ.length; x++) {
        emp = arrREQ[x].getValue('employee', null, 'group');
        empItems = nlapiLookupField('employee', emp, ['subsidiary', 'location']);
        empSub = empItems.subsidiary;

        // empSub = nlapiLookupField('employee', emp, 'subsidiary');
         projectSub = parseInt(arrREQ[x].getValue('subsidiary', 'job', 'group'));

        if (empSub == projectSub) {
       //    createJournals(feeRetainer, feeRetainerDisc, feeRebate, emp, empSub, dept, projectSub, jobId);
        }
        if (empSub != projectSub) {
        //    var empLoc = empItems.location;
          //  createICjournals_V2(totalRevenue, totNonICamt, totIntercoICamt, totalDiscount, totNonICDisc, totIntercoDisc, totalRebate, totNonICRebate, totIntercoRebate, totalDisb, totNoICDisb, totIntercoDisb, emp, empSub, dept, projectSub, jobId, empLoc)
        }
    }
    //loop 2 get the Non InterCo interco entries
    /*
    function buildJeLinesSameSub(x, sub) {
                    jeLines[x] = {
                    amtFee: arrREQ[x].getValue('custrecord_apco_labor_fee_distribution', null, 'sum'),
                    amtDiscount: arrREQ[x].getValue('custrecord_apco_discount_distr', null, 'sum'),
                    amtRebate: arrREQ[x].getValue('custrecord_apco_rebate_distr', null, 'sum'),
                    amtDisbursement: arrREQ[x].getValue('custrecord_apco_disb_fee_rev_distr', null, 'sum'),
                    subsid: sub //arrREQ[x].getValue("subsidiary", 'job', 'group')
                }
            
                    jeLines = cleanArray(jeLines);
        return jeLines;
    }
    function cleanArray(actual) {
        var newArray = new Array();
        for (var i = 0; i < actual.length; i++) {
            if (actual[i]) {
                newArray.push(actual[i]);
            }
        }
        return newArray;
    }
    */
    //loop 2 get the interco entries
    /*
    function buildIntercoJeLines(y, sub) {
   
     //   for (var y = 0; y < arLength; y++) {
         //   if (sub != projectSub) {
            jeLinesInterCo[y] = {
                amtFee: arrREQ[y].getValue('custrecord_apco_labor_fee_distribution', null, 'sum'),
                amtDiscount: arrREQ[y].getValue('custrecord_apco_discount_distr', null, 'sum'),
                amtRebate: arrREQ[y].getValue('custrecord_apco_rebate_distr', null, 'sum'),
                amtDisbursement: arrREQ[y].getValue('custrecord_apco_disb_fee_rev_distr', null, 'sum'),
                subsid: sub
            }
        //}
   // }
    return jeLinesInterCo;
 }
 */
  //   createICjournals_V2(jeLines, jeLinesInterCo, totalRevenue, totNonICamt, totIntercoICamt, totalDiscount, totNonICDisc, totIntercoDisc, totalRebate, totNonICRebate, totIntercoRebate, totalDisb, totNoICDisb, totIntercoDisb, emp, sub2, dept, projectSub, jobId)
}

function createJournals(feeRetainer, feeRetainerDisc, feeRebate, feeDisbursement, emp, empSub, dept, projectSub, jobId, empLocation) {

    var jeDate = new Date();
    jeDate = nlapiAddMonths(jeDate, -3);
    //CREATE THE HEADER RECORD
    //TEST TO FOR SAM SUBSIDIARY 

    var recJE = nlapiCreateRecord('journalentry');

    //CREATE THE HEADER RECORD
    recJE.setFieldValue('trandate', nlapiDateToString(jeDate));
    recJE.setFieldValue('subsidiary', projectSub);


    // debit line 1 Account feeRetainter 
    recJE.selectNewLineItem('line');
    recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER);
    recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(feeRetainer)));
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
    recJE.setCurrentLineItemValue('line', 'department', dept);
   // recJE.setCurrentLineItemValue('line', 'custcol_apco_ic_project',jobid);
    recJE.setCurrentLineItemValue('line', 'entity', jobId);
    recJE.setCurrentLineItemValue('line', 'location', empLocation);
    
    recJE.commitLineItem('line');

    //Line 2 for fee revenue
    recJE.selectNewLineItem('line');
    recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER);
    recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(feeRetainer)));
    recJE.setCurrentLineItemValue('line', 'employee', emp);
    recJE.setCurrentLineItemValue('line', 'department', dept);
    recJE.setCurrentLineItemValue('line', 'entity', jobId);
    recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
    recJE.commitLineItem('line');

    //line3 for disbursment
    recJE.selectNewLineItem('line');
    recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER_DISB_FEE);
    recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(feeDisbursement)));
    recJE.setCurrentLineItemValue('line', 'employee', emp);
    recJE.setCurrentLineItemValue('line', 'department', dept);
    recJE.setCurrentLineItemValue('line', 'entity', jobId);
    
    recJE.commitLineItem('line');

    //line 4 for disbursment
    recJE.selectNewLineItem('line');
    recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER_DISB_FEE);
    recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(feeDisbursement)));
    recJE.setCurrentLineItemValue('line', 'employee', emp);
    recJE.setCurrentLineItemValue('line', 'department', dept);
    recJE.setCurrentLineItemValue('line', 'entity', jobId);
    
    recJE.commitLineItem('line');

    //line5 for discount
    recJE.selectNewLineItem('line');
    recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER_DISCOUNT);
    recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(feeRetainerDisc)));
    recJE.setCurrentLineItemValue('line', 'employee', emp);
    recJE.setCurrentLineItemValue('line', 'department', dept);
    recJE.setCurrentLineItemValue('line', 'entity', jobId);
    
    recJE.commitLineItem('line');

    //line 6  for discount
    recJE.selectNewLineItem('line');
    recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER_DISCOUNT);
    recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(feeRetainerDisc)));
    recJE.setCurrentLineItemValue('line', 'employee', emp);
    recJE.setCurrentLineItemValue('line', 'department', dept);
    recJE.setCurrentLineItemValue('line', 'entity', jobId);
    
    recJE.commitLineItem('line');


    //line7 for rebate
    recJE.selectNewLineItem('line');
    recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER_REBATE);
    recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(feeRebate)));
    recJE.setCurrentLineItemValue('line', 'employee', emp);
    recJE.setCurrentLineItemValue('line', 'department', dept);
    recJE.setCurrentLineItemValue('line', 'entity', jobId);
    
    recJE.commitLineItem('line');

    //line 8  for rebate
    recJE.selectNewLineItem('line');
    recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER_REBATE);
    recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(feeRebate)));
    recJE.setCurrentLineItemValue('line', 'employee', emp);
    recJE.setCurrentLineItemValue('line', 'department', dept);
    recJE.setCurrentLineItemValue('line', 'entity', jobId);
    
    recJE.commitLineItem('line');

    try {
        var idJE = nlapiSubmitRecord(recJE);
    } catch (e) {
        // SN inconsistent use of exception; in other places I see e.message being used instead of a e.ToString(). Will need to modify for consistency
        var eMessage = e;
        //nlapiSetFieldValue('custrecord_transaction_with_error', 'process_bill(): error creating accrual JE - ' + e.message);
        // nlapiSubmitField('customrecord_billing_transaction', btId, 'custrecord_transaction_with_error', 'process_bill(): error creating accrual JE - ' + e.message);
    }

}

//Test date Rf
//Create i/c Journals
/*
var feeRetainer=438.11;
var feeRetainerDisc = 21.91
var feeDisbursement = 0;
var feeRebate = 0;
var emp = 4374;
var empSub = 10;
var dept = 28;
var projectSub = 1;
var jobId = 4378;

createICjournals(feeRetainer, feeRetainerDisc, feeRebate, feeDisbursement,emp, empSub, dept, projectSub, jobId);
*/



function createICjournals_V2(totIntercoICamt, totIntercoDisc, totIntercoRebate, totIntercoDisb, emp, empSub, dept, projectSub, jobId, empLoc) {
    //here we know that the subs are different so we need to create intercompany journal entries
    //Step one is to retrieve the accounts for the intercompanies
    var intercompanyRev = INTERCOMPANY_REVENUE;
    var intercompanyExp = INTERCOMPANY_EXPENSE;
    var jeDate = new Date();
    jeDate = nlapiAddMonths(jeDate, -2);
    //Intercompany accounts payable is based on Employee Sub
    //select custrecord_ic_ap from customrecord_apco_intercompany_chart  
    //where custrecord_subsidiary = empSub

    //Intercompany accounts payable is based on Employee Sub
    //select custrecord_ic_ar from customrecord_apco_intercompany_chart  
    //where custrecord_subsidiary = projectSub

    //Query the custom record for the custom accounts
    var arrFilters = [];
    var arrColumns = [];
    var searchSubs = [empSub, projectSub];

    arrFilters.push(new nlobjSearchFilter('custrecord_subsidiary', null, 'is', searchSubs));

    arrColumns.push(new nlobjSearchColumn('custrecord_unbilled_ic_ar'));
    arrColumns.push(new nlobjSearchColumn('custrecord_accrued_ic_ap'));
    arrColumns.push(new nlobjSearchColumn('custrecord_ic_ar'));
    arrColumns.push(new nlobjSearchColumn('custrecord_ic_ap'));
    arrColumns.push(new nlobjSearchColumn('custrecord_subsidiary'));

    var icAccts = nlapiSearchRecord('customrecord_apco_intercompany_chart', null, arrFilters, arrColumns);

    var unbilledICAR = 0;
    var intercompanyAR = 0;
    var accruedIntercompanyAP = '';
    var intercompanyCustomer = '';
    var intercompanyVendor = 0;
    var empAccruedInterCoPayable = 0;
    var corpUnbilledICAR = 0;

    var accruedICPayable = 0;
    var unbilledICRAR = 0;
    empSub = parseInt(empSub);
    //now loop through then case on subsidiary to get the correct accounts;
    for (var i = 0; i < icAccts.length; i++) {
        var processSub = parseInt(icAccts[i].getValue('custrecord_subsidiary'));
        switch (processSub) {
            case empSub:   accruedIntercompanyAP = icAccts[i].getValue('custrecord_ic_ap')
                           unbilledICRAR = icAccts[i].getValue('custrecord_unbilled_ic_ar')
                           empAccruedInterCoPayable = icAccts[i].getValue('custrecord_accrued_ic_ap');
                           break;
            case projectSub: intercompanyAR = icAccts[i].getValue('custrecord_ic_ar')
                             corpUnbilledICAR = icAccts[i].getValue('custrecord_unbilled_ic_ar')
                             //unbilledICRAR=icAccts[i].getValue('custrecord_unbilled_ic_ar')
                             accruedICPayable = icAccts[i].getValue('custrecord_accrued_ic_ap'); break;
                ; break;
        }
    }
    //Now create the journals
    var recJE = nlapiCreateRecord('intercompanyjournalentry');

    //CREATE THE HEADER RECORD
    recJE.setFieldValue('trandate', nlapiDateToString(jeDate));
    recJE.setFieldValue('subsidiary', projectSub);
    recJE.setFieldValue('tosubsidiary', empSub);


    // debit line 1 Account feeRetainter 
    recJE.selectNewLineItem('line');
    recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER);
    recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(totIntercoICamt)));
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
    recJE.setCurrentLineItemValue('line', 'department', dept);
    recJE.setCurrentLineItemValue('line', 'entity', jobId);
    recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
  //recJE.setCurrentLineItemValue('line', 'location', empLoc);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
   //recJE.setCurrentLineItemValue('line', 'entity', emp);
    recJE.commitLineItem('line');
        
    //debit line 2 Account feeRetainter 
    
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', intercompanyRev);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(totIntercoICamt)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'entity', jobId);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
 //   recJE.setCurrentLineItemValue('line', 'location', empLoc);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);

        recJE.commitLineItem('line');
    

    //debit line 3 Account Fee Retainer 
    //changed per email on 2-16 to use the amount where 
    //employee  sub <> to project subsidiary
    //use the intercompay 
    recJE.selectNewLineItem('line');
    recJE.setCurrentLineItemValue('line', 'account', intercompanyExp);
    recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(totIntercoICamt)));
    recJE.setCurrentLineItemValue('line', 'employee', emp);
    recJE.setCurrentLineItemValue('line', 'department', dept);
    recJE.setCurrentLineItemValue('line', 'entity', jobId);
    recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
   //recJE.setCurrentLineItemValue('line', 'location', empLoc);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);

    recJE.commitLineItem('line');

    //line4
 
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', empAccruedInterCoPayable);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(totIntercoICamt));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'entity', jobId);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
     //   recJE.setCurrentLineItemValue('line', 'location', empLoc);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
        recJE.commitLineItem('line');

    //line 6
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', corpUnbilledICAR);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(totIntercoICamt)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', empSub);
        recJE.setCurrentLineItemValue('line', 'location', empLoc);
        recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
        recJE.setCurrentLineItemValue('line', 'custcol_apco_ic_project', jobId);
        recJE.commitLineItem('line');

    //line 6

        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(totIntercoICamt)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', empSub);
        recJE.setCurrentLineItemValue('line', 'location', empLoc);
        recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
        recJE.setCurrentLineItemValue('line', 'custcol_apco_ic_project', jobId);

        recJE.commitLineItem('line');
             

    //for Disbursement Fee
    
        //line 1 for Disbursement
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER_DISB_FEE);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(totIntercoDisb));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'entity', jobId);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
        //recJE.setCurrentLineItemValue('line', 'location', empLoc);
       recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
      //  if (totIntercoDisb != 0) {
           recJE.commitLineItem('line');
     //   }
   
          
        //line 2  for Disbursement
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', intercompanyRev);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(totIntercoDisb)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'entity', jobId);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
  //  recJE.setCurrentLineItemValue('line', 'location', empLoc);
        recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
         //    if (totIntercoDisb != 0) {
           recJE.commitLineItem('line');
     //     }


        //line 3 for disbusement
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', intercompanyExp);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(totIntercoDisb)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'entity', jobId);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
 //   recJE.setCurrentLineItemValue('line', 'location', empLoc);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
   //     if (totIntercoDisb != 0) {
            recJE.commitLineItem('line');
    //    }

    //line 4  for disbusement
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', empAccruedInterCoPayable);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(totIntercoDisb)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'entity', jobId);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
 //   recJE.setCurrentLineItemValue('line', 'location', empLoc);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
   //     if (totIntercoDisb != 0) {
            recJE.commitLineItem('line');
  //      }

    //line 5 for disbusement
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', corpUnbilledICAR);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(totIntercoDisb)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
     
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', empSub);
    recJE.setCurrentLineItemValue('line', 'location', empLoc);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
   // recJE.setCurrentLineItemValue('line', 'custcol_apco_ic_project', jobId);
 //  if (totIntercoDisb != 0) {
          recJE.commitLineItem('line');
    //       }

    //line 6 for disbusement
          recJE.selectNewLineItem('line');
          recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER_DISB_FEE);
          recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(totIntercoDisb)));
          recJE.setCurrentLineItemValue('line', 'employee', emp);
          recJE.setCurrentLineItemValue('line', 'department', dept);
     //     recJE.setCurrentLineItemValue('line', 'entity', jobId);
          recJE.setCurrentLineItemValue('line', 'linesubsidiary', empSub);
    //  recJE.setCurrentLineItemValue('line', 'location', empLoc);
          recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
    //    if (totIntercoDisb != 0) {
          recJE.commitLineItem('line');
    //     }

         // var idJE = nlapiSubmitRecord(recJE);

    //line 7  for disbusement
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER_DISB_FEE);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(totIntercoDisb)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', empSub);
    recJE.setCurrentLineItemValue('line', 'location', empLoc);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_ic_project', jobId);


   //if (totIntercoDisb != 0) {
       //     recJE.commitLineItem('line');
  // }

       

    //line 1 for Discount
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER_DISCOUNT);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(totIntercoDisc));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'entity', jobId);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
   // recJE.setCurrentLineItemValue('line', 'location', empLoc);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);


        recJE.commitLineItem('line');
    
    //line 2 for Discount
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', intercompanyRev);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(totIntercoDisc)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'entity', jobId);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
 //   recJE.setCurrentLineItemValue('line', 'location', empLoc);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);


        recJE.commitLineItem('line');

    //line 3  for Discount
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER_DISCOUNT);
       // recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(totNonICDisc)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'entity', jobId);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
     //   recJE.setCurrentLineItemValue('line', 'location', empLoc);
        recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);


       // recJE.commitLineItem('line');

          

    //line 4 for Discount
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', intercompanyExp);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(totIntercoDisc)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'entity', jobId);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
  //  recJE.setCurrentLineItemValue('line', 'location', empLoc);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);


        recJE.commitLineItem('line');

    //line 5  for Discount
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', empAccruedInterCoPayable);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(totIntercoDisc)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'entity', jobId);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
   // recJE.setCurrentLineItemValue('line', 'location', empLoc);
        recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);


        recJE.commitLineItem('line');

    //line 6 for discount
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER_DISCOUNT);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(totIntercoDisc)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);

        recJE.setCurrentLineItemValue('line', 'linesubsidiary', empSub);
        recJE.setCurrentLineItemValue('line', 'location', empLoc);
        recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
        recJE.setCurrentLineItemValue('line', 'custcol_apco_ic_project', jobId);

       recJE.commitLineItem('line');

    //line 7  for discount
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', corpUnbilledICAR);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(totIntercoDisc)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);

        recJE.setCurrentLineItemValue('line', 'linesubsidiary', empSub);
        recJE.setCurrentLineItemValue('line', 'location', empLoc);
        recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
        recJE.setCurrentLineItemValue('line', 'custcol_apco_ic_project', jobId);

        recJE.commitLineItem('line');

      


        

    //line 1 for Rebate
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER_REBATE);
       // recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(totNonICRebate));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'entity', jobId);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
        recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
     //   recJE.commitLineItem('line');

    //line 2 for Rebate
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', intercompanyRev);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(totIntercoRebate)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'entity', jobId);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
  //  recJE.setCurrentLineItemValue('line', 'location', empLoc);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);


        recJE.commitLineItem('line');

    //line 3  for Rebate
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', REBATES);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(totIntercoRebate)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'entity', jobId);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
   // recJE.setCurrentLineItemValue('line', 'location', empLoc);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);


        recJE.commitLineItem('line');

    //line 4 for Rebate
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', intercompanyExp);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(totIntercoRebate)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'entity', jobId);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
   // recJE.setCurrentLineItemValue('line', 'location', empLoc);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);


        recJE.commitLineItem('line');

    //line 5  for Rebate
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', empAccruedInterCoPayable);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(totIntercoRebate)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
        recJE.setCurrentLineItemValue('line', 'entity', jobId);
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', projectSub);
  //  recJE.setCurrentLineItemValue('line', 'location', empLoc);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);


        recJE.commitLineItem('line');



    //line 6 for Rebate
        
     recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', FEE_RETAINER_REBATE);
        recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(totIntercoRebate)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);
      
        recJE.setCurrentLineItemValue('line', 'linesubsidiary', empSub);
    recJE.setCurrentLineItemValue('line', 'location', empLoc);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_ic_project', jobId);

        recJE.commitLineItem('line');

        
    //line 7  for Rebate
        recJE.selectNewLineItem('line');
        recJE.setCurrentLineItemValue('line', 'account', corpUnbilledICAR);
        recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(totIntercoRebate)));
        recJE.setCurrentLineItemValue('line', 'employee', emp);
        recJE.setCurrentLineItemValue('line', 'department', dept);

        recJE.setCurrentLineItemValue('line', 'linesubsidiary', empSub);
    recJE.setCurrentLineItemValue('line', 'location', empLoc);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_employee', emp);
    recJE.setCurrentLineItemValue('line', 'custcol_apco_ic_project', jobId);

        recJE.commitLineItem('line');

       
    //*********************************************************************intero Expense payable******************************************* 
    
    // try {
    var idJE = nlapiSubmitRecord(recJE);
    // } catch (e) {
    // SN inconsistent use of exception; in other places I see e.message being used instead of a e.ToString(). Will need to modify for consistency
    //    var eMessage = e.mesage;
    //nlapiSetFieldValue('custrecord_transaction_with_error', 'process_bill(): error creating accrual JE - ' + e.message);
    //     var stop = '';
    // nlapiSubmitField('customrecord_billing_transaction', btId, 'custrecord_transaction_with_error', 'process_bill(): error creating accrual JE - ' + e.message);
    //  }

}

function jeProcessingTandM(jobId) {
    //HERE WE DO NOT GET THE DISTRIBUTION JUST THE TOTAL VALUE OF TIME
    var pEndDate = '03/31/2016';  //get project end date
    //search by project
    var arrFilters = [];
    var arrColumns = [];
    arrFilters.push(new nlobjSearchFilter('internalid', 'job', 'is', jobId));
    arrFilters.push(new nlobjSearchFilter('type', null, 'is', 'A'));
    arrFilters.push(new nlobjSearchFilter('date', null, 'onorbefore', pEndDate));
    arrFilters.push(new nlobjSearchFilter('custcol_apco_timeentyr_je', null, 'anyof', '@NONE@'));


   
    arrColumns.push(new nlobjSearchColumn("formulacurrency_feeamount", null, "sum").setFormula("NVL({durationdecimal},0)*{rate}"));
    arrColumns.push(new nlobjSearchColumn("formulacurrency_disbursment", null, "sum").setFormula(("NVL({durationdecimal},0)*{custentity_apco_disbursement_fee_pct}")) * {});


    //this search is not for t and m billing
    var arrREQ = nlapiSearchRecord('timebill', 'customsearch_apco_tm_je', arrFilters, arrColumns);
    var feeRetainer = 0;
    var feeRetainerDisc = 0;
    var feeRebate = 0;
    var feeDisbursement = 0;


    for (var i = 0; i < arrREQ.length; i++) {
        // nlapiLogExecution('DEBUG', stLoggerTitle, '>>lineNum<<' + i);

        //var tSId = arrREQ[i].getValue('internalid', 'timesheet');
        feeRetainer = arrREQ[i].getValue('formulacurrency', null, 'sum');
        feeRetainerDisc = arrREQ[i].getValue('custcol_apco_discount_distr', null, 'sum');
        feeRebate = arrREQ[i].getValue('custcol_apco_rebate_distr', null, 'sum');
        feeDisbursement = arrREQ[i].getValue('custcol_apco_disb_fee_rev_distr', null, 'sum');
        emp = arrREQ[i].getValue('employee', null, 'group');
        projectSub = parseInt(arrREQ[i].getValue('subsidiary', 'job', 'group'));
        dept = arrREQ[i].getValue('department', null, 'group');
        // var sub = arrREQ[i].getValue('subsidiary');
        //get the employee sub for processing interto

        empItems = nlapiLookupField('employee', emp, ['subsidiary', 'location']);
        empSub = empItems.subsidiary;
        var empLoc = empItems.location;
        // now make the journal entries.
        if (isEmpty(feeRetainer)) { feeRetainer = 0; }
        if (isEmpty(feeRetainerDisc)) { feeRetainerDisc = 0; }
        if (isEmpty(feeRebate)) { feeRebate = 0; }
        if (isEmpty(feeDisbursement)) { feeDisbursement = 0; }

        if (empSub == projectSub) {
            createJournals(feeRetainer, feeRetainerDisc, feeRebate, feeDisbursement, emp, empSub, dept, projectSub, jobId, empLoc);
        }
        if (empSub != projectSub) {
            createICjournals_V2(feeRetainer, feeRetainerDisc, feeRebate, feeDisbursement, emp, empSub, dept, projectSub, jobId, empLoc)
        }
    }
   
}


/**
 * Return true if value is null, empty string, or undefined
 *
 * @param stValue
 * @returns {Boolean}
 */
function isEmpty(stValue) {
    if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
        return true;
    }
    return false;
}

