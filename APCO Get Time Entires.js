/**
 * Module Description
 * This script will be used to populate the time sheets
 * with the weighted average of the revenue allocated to the project
 * 
 * Version    Date            Author           Remarks
 * 1.00       22 Jan 2016     rfulling
 *
 */

/**
 * The recordType (internal id) corresponds to the "Applied To" record in your script deployment. 
 * @appliedtorecord recordType
 * 
 * @param {String} type Sublist internal id
 * @param {String} name Field internal id
 * @param {Number} linenum Optional line item number, starts from 1
 * @returns {Void}
 */

//Globals to be passed as script parameters
{
    //SANDOBX
    var REVENUE_ACCOUNT = 809;
    var UNBILLED_ACCOUNT = 319;
    var DISCOUNT_ACCOUNT=811;
    var DISBURSEMENT_ACCOUNT=400300;

    /*
     var REVENUE_ACCOUNT = 529;
    var UNBILLED_ACCOUNT = 315;
    var DISCOUNT_ACCOUNT='';
    var DISTRIBUTION_ACCOUNT='';
    */
}


//First we need to get a list of the journal entries that have not been processed



processRecognizedRev()

function processRecognizedRev() {
    // process is on hte allocation record.
    //book specific journal entry 
   // var myje = nlapiLoadRecord('journalentry', 8);
    var myje = nlapiLoadRecord('journalentry', 197);
    //next loop through the lines of the joural entry
    var jeLines = myje.getLineItemCount('line')

    for (var i = 1; i <= jeLines; i++) {
        //Now look for the account id for revenue
        var acctId = myje.getLineItemValue('line', 'account', i);
        var projId = myje.getLineItemValue('line', 'entity', i);
        var revAmt = myje.getLineItemValue('line', 'credit', i);
        
        if (acctId == REVENUE_ACCOUNT) {
            //use the project id to distribute revenue
            projectSpecificJe(projId, parseFloat(revAmt));
        }
       // if(acctId)==
    }
}



function projectSpecificJe(projectId, totalRev) {
    var tProjectType = parseInt(nlapiLookupField('job', projectId, 'jobtype'));

    switch (tProjectType) {
        case 1: projectRevenueDistribution(projectId, parseFloat(totalRev),0); break;
        case 2: projectTM(projectId, parseFloat(totalRev), 0); break;
        case 3: retainerLessEntry(projectId, parseFloat(totalRev)); break;
        case 4: projectRevenueDistribution(projectId, parseFloat(totalRev), 0); break;
        case 9: projectRevenueDistribution(projectId, parseFloat(totalRev), 0); break;
          
    }

}



function retainerLessEntry(jobid, revAmt) {
    //if this is retainer less then get the amount for this project in the 
    //121015 account and make an adjusting entry to reverse credit it to revenue
    //DEbit fee for retainiers 400010 credit the 121015 unbilled retainesless
    //once this entry is made the system can distribute the revenue based on the net amount so pass the
    //amount of the 121015 account to the function to distrubute revenue
    //here the instructionsay that the 

    //labor fee = net of unbilled
    //disbursement fee gross
    //discount fee gross 
    //rebate fee = net of unbilled

    var unbilled = 0;
    var projDetails=[];
    var projDetails = nlapiLookupField('job', jobid, ['custentity_apco_proj_period_end_date','subsidiary']);
    var pEndDate = projDetails.custentity_apco_proj_period_end_date;
    var projSub = projDetails.subsidiary;
    var arrFilters = [];

    var arrColumns = [];
    arrFilters.push(new nlobjSearchFilter('internalid', 'job', 'is', jobid));
    arrFilters.push(new nlobjSearchFilter('trandate', null, 'onorbefore', pEndDate));

    arrColumns.push(new nlobjSearchColumn('amount', null, 'sum'));
    arrColumns.push(new nlobjSearchColumn('internalid', null, 'group'));

    var unbilledResult = nlapiSearchRecord('transaction', 'customsearch_apco_unbilled121015_project', arrFilters, arrColumns);
    unbilled = unbilledResult[0].getValue('amount', null, 'sum');
    billId = unbilledResult[0].getValue('internalid', null, 'group');
    //for retainerless the reve amount to distribut has to be net of the unbilled
    revAmt = parseFloat(revAmt) - parseFloat(unbilled);

    //retainerless JE for teh unbilled portion
    var jeid = retainerLessJe(unbilled, jobid, projSub, billId);;
    if (jeid) {
        //distribute the revenue based on the net amount
        //mark the bill as relass journal
        nlapiSubmitField('vendorbill', billId, 'custbody_apco_retainless_reclass_je', jeid);

        projectRevenueDistribution(jobid, parseFloat(revAmt), parseFloat(unbilled));
    }

}

function retainerLessJe(amount, projectId, subsidiary) {

    var recJE = nlapiCreateRecord('journalentry');
    var jeDate = new Date();
    jeDate = nlapiAddMonths(jeDate, -3);
    //CREATE THE HEADER RECORD

    recJE.setFieldValue('trandate', nlapiDateToString(jeDate));
    recJE.setFieldValue('subsidiary', subsidiary);


    // debit line 1 Account feeRetainter 
    recJE.selectNewLineItem('line');
    recJE.setCurrentLineItemValue('line', 'account', REVENUE_ACCOUNT);
    recJE.setCurrentLineItemValue('line', 'debit', nlapiFormatCurrency(parseFloat(amount)));
    recJE.setCurrentLineItemValue('line', 'memo', 'Reclass VB for retainerless project');
     //recJE.setCurrentLineItemValue('line', 'department', dept);
     // recJE.setCurrentLineItemValue('line', 'custcol_apco_ic_project',jobid);
    recJE.setCurrentLineItemValue('line', 'entity', projectId);
    recJE.setCurrentLineItemValue('line', 'location', subsidiary);

    recJE.commitLineItem('line');

    //Line 2 for fee revenue
    recJE.selectNewLineItem('line');
    recJE.setCurrentLineItemValue('line', 'account', UNBILLED_ACCOUNT);
    recJE.setCurrentLineItemValue('line', 'credit', nlapiFormatCurrency(parseFloat(amount)));
    recJE.setCurrentLineItemValue('line', 'memo', 'Reclass VB for retainerless project');
    //recJE.setCurrentLineItemValue('line', 'department', dept);
    recJE.setCurrentLineItemValue('line', 'entity', projectId);
    recJE.setCurrentLineItemValue('line', 'linesubsidiary', subsidiary);
    recJE.commitLineItem('line');

   // var jeid = nlapiSubmitRecord(recJE);
    return 1;
}

function projectRevenueDistribution(jobId, revAmt, unbilled) {
    //var myProj = nlapiLoadRecord('job', jobId);
    //var jresource = nlapiLoadRecord('employee', 4374);
    var approvalStatus = 3;
    var pEndDate = nlapiLookupField('job', jobId, 'custentity_apco_proj_period_end_date');

    //var harApprovedTime = nlapiLookupField('job', jobId, 'custentity_apco_ptd_rev_rec_or_value');
    var discPct = parseInt(nlapiLookupField('job', jobId, 'custentity_apco_discount_pct')) / 100;
    var rebateFee = parseInt(nlapiLookupField('job', jobId, 'custentity_apco_rebate_pct')) / 100;
    var disBPct = parseInt(nlapiLookupField('job', jobId, 'custentity_apco_disbursement_fee_pct')) / 100;
    var hardApprovedTime = fnhardApprovedTime(jobId, pEndDate);
    //var hardApprovedTime = 0;//hardApprovedTime(jobId, pEndDate);
    //revAmt = revAmt - unbilled;


    //search by project
    var arrFilters = [];
    var arrColumns = [];
    arrFilters.push(new nlobjSearchFilter('internalid', 'job', 'is', jobId));
    arrFilters.push(new nlobjSearchFilter('type', null, 'is', 'A'));
    arrFilters.push(new nlobjSearchFilter('date', null, 'onorbefore', pEndDate));
    arrFilters.push(new nlobjSearchFilter('custcol_time_entry_appr_status', null, 'is', approvalStatus));
    //temp for one employee
    //arrFilters.push(new nlobjSearchFilter('employee', null, 'is', 7));

    arrColumns.push(new nlobjSearchColumn('type'));

    arrColumns.push(new nlobjSearchColumn('internalid', null));
    arrColumns.push(new nlobjSearchColumn('location', null));
    arrColumns.push(new nlobjSearchColumn('custcol_time_entry_appr_status', null));
    arrColumns.push(new nlobjSearchColumn("formulanumeric").setFormula("{rate}*({durationdecimal})"));

    //arrColumns.push(new nlobjSearchColumn('custrecord_apco_rev_oop'));
    var arrREQ = nlapiSearchRecord('timebill', null, arrFilters, arrColumns);

    //now update the sub record with the weighted average distribution by passing the 
    //timesheet internal id, hard aproved Time and the revRecValue into the sub record.
    var stLoggerTitle = 'beforeSubmit_overrideTimeEntries';

    for (var i = 0; i < arrREQ.length; i++) {
        nlapiLogExecution('DEBUG', stLoggerTitle, '>>lineNum<<' + i);

            var tsId = arrREQ[i].getValue('internalid', null);
            var actTime = arrREQ[i].getValue('formulanumeric');
            var timeEntryId = arrREQ[i].getId();
            var myLoc = arrREQ[i].getValue('location');

            var revenueDistrubution = (parseFloat(revAmt) / parseFloat(hardApprovedTime)) * parseFloat(actTime)
        
            nlapiSubmitField('timebill', tsId,[ 
                'custcol_apco_labor_fee_distribu',
                'custcol_apco_discount_distr',
                'custcol_apco_disb_fee_rev_distr',
                'custcol_apco_rebate_distr',
                 'location'],
                [
                revenueDistrubution,
                nlapiFormatCurrency((parseFloat(revenueDistrubution) * parseFloat(discPct))),
                nlapiFormatCurrency((parseFloat(revenueDistrubution) * parseFloat(disBPct))),
                nlapiFormatCurrency((parseFloat(revenueDistrubution) * parseFloat(rebateFee))),
                myLoc
                ]);
        /*
            nlapiSubmitField('timebill', tsId, [
                    'custcol_apco_labor_fee_distribu',
                    'custcol_apco_discount_distr',
                    'custcol_apco_disb_fee_rev_distr',
                    'custcol_apco_rebate_distr'], [
                    0,
                    0,
                    0,
                    0

                    ]);
                    */
     //   Rtest(tSId, timeEntryId, 0, 0, 0, 0, 0);
        //Rtest(tSId, timeEntryId, actTime, harApprovedTime, revAmt, discPct, rebateFee);
        
    }

    var stop = '';

}

function Rtest(tsID, timeEntryId, actTime, harApprovedTime, revRecValue, discPct, rebateFee) {
    var ARR_DATE_GRID = [];
    var ARR_TIME_GRID =
    [
            'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
    ];
    var myTS = nlapiLoadRecord('timesheet', tsID, { recordmode: 'dynamic' });

    var intNumberLines = myTS.getLineItemCount('timegrid');
    //loop lines on the time entry
    for (var intLineCounter = 1; intLineCounter <= intNumberLines; intLineCounter++) {
        myTS.selectLineItem('timegrid', intLineCounter);

        //loop days of the week
        for (var intDayCounter = 0; intDayCounter < ARR_TIME_GRID.length; intDayCounter++) {
            var sublistSubrecord = myTS.editCurrentLineItemSubrecord('timegrid', ARR_TIME_GRID[intDayCounter]);
            //if the id's match from the time entry you can update the rev rec with the calculation.
            if ((sublistSubrecord) && sublistSubrecord.getId() == timeEntryId) {
                var empRD = (parseFloat(revRecValue) / parseFloat(harApprovedTime)) * parseFloat(actTime)
                //var empRD = (parseFloat(actTime) / parseFloat(harApprovedTime)) * parseFloat(revRecValue)
                sublistSubrecord.setFieldValue('custrecord_apco_labor_fee_distribution', nlapiFormatCurrency(empRD));
                sublistSubrecord.setFieldValue('custrecord_apco_discount_distr', nlapiFormatCurrency((parseFloat(empRD) * parseFloat(discPct))));
                sublistSubrecord.setFieldValue('custrecord_apco_rebate_distr', nlapiFormatCurrency((parseFloat(empRD) * parseFloat(rebateFee))));
                //sublistSubrecord.setFieldValue('memo', 'funny ha ha');
            }
            if (sublistSubrecord) {
                sublistSubrecord.commit();
            }
        }
        myTS.commitLineItem('timegrid');
    }
    nlapiSubmitRecord(myTS);
}


/**
 * Return true if value is null, empty string, or undefined
 * @param stValue
 * @returns {Boolean}
 */
function isEmpty(stValue) {
    if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
        return true;
    }
    return false;
}

function fnhardApprovedTime(jobid, pendDate) {
    var arrFilters = [];
    var arrColumns = [];
    var timeType = 'A';
    var approvalStatus = 3;
   // var pendDate = '12/31/2015';
  //  var jobid = 4378;


    arrFilters.push(new nlobjSearchFilter('type', null, 'is', timeType));
    arrFilters.push(new nlobjSearchFilter('custcol_time_entry_appr_status', null, 'is', approvalStatus));
    arrFilters.push(new nlobjSearchFilter('custentity_apco_proj_period_end_date', 'job', 'onorbefore', pendDate));
    arrFilters.push(new nlobjSearchFilter('internalid', 'job', 'is', jobid));

   
    arrColumns.push(new nlobjSearchColumn("formulanumeric",null,'sum').setFormula("{rate}*({durationdecimal})"));

    var hardapprovedTime = nlapiSearchRecord('timebill', null, arrFilters, arrColumns);
    var approvedTime = hardapprovedTime[0].getValue('formulanumeric', null, 'sum');
    return approvedTime;
}