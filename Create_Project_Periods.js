/**
 * Module Description
 * this will create records in a custom record called project budget
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
var CONTEXT = nlapiGetContext();
var fiscalCalendar = CONTEXT.getSetting('SCRIPT', 'custscript_fiscal_calendar');
//var actPeriod = nlapiLoadConfiguration("companypreferences").getFieldValue("custscript_apco_acct_period");

function beforeProjectSubmit(type) {
    nlapiLogExecution('DEBUG', "Create periods  ," + type);
    //do not need budget for T&M
    var projectPricing = CONTEXT.getSetting('SCRIPT', 'custscript_apco_project_exclued');

    var projType = nlapiGetFieldValue('jobtype');
    //Only on create and not T&M

    if (type == 'create' || type == 'edit') {
        var intCnt = 0;
        var peid = nlapiGetFieldValue('custentity_apco_proj_period');
        var myProj = nlapiGetRecordId();
        var projType = nlapiGetFieldValue('jobtype');
        //check for budget
        if (projType != projectPricing) {
            intCnt = nlapiGetLineItemCount('recmachcustrecord_apco_project');
        } else {
            intCnt = nlapiGetLineItemCount('recmachcustrecord_apco_pricing_project');
        }

        //only run if there is no budget 

        var startDate = nlapiGetFieldValue('startdate');
        var endDate = nlapiGetFieldValue('projectedenddate');

        if (startDate && endDate && intCnt <= 0) {
            var startP = getperiod(startDate);
            var endP = getperiod(endDate);
            //var endP = nlapiGetFieldValue('custentity_apco_proj_period_end_date');
            startP = parseInt(startP);
            endP = parseInt(endP);

            for (var i = startP ; i <= endP; i++) {
                var peid = i;//nlapiLoadRecord('accountingperiod', parseInt(i));
                nlapiLogExecution('DEBUG', "what Number fails ," + peid);
                var arrAcctDates = nlapiLookupField('accountingperiod', peid, ['isquarter', 'isyear', 'enddate']);
                if (arrAcctDates) {
                    var isQ = arrAcctDates.isquarter;
                    var isYR = arrAcctDates.isyear;
                } else {
                    continue;
                }
                if (isQ == 'T' || isYR == 'T') {
                    continue;
                }

                createBudget(myProj, arrAcctDates.enddate, projType, parseInt(i), projectPricing);

            }
        }
    }
}

// This function must be put into try/catch block by the callers
//pas ini a date if the date is between start date and end date of the period return the period
function getperiod(anyDate) {

    //var myAP = nlapiLoadRecord('accountingperiod', actPeriod);
    // This function must be put into try/catch block by the callers
    //pas ini a date if the date is between start date and end date of the period return the period
    var startDate = new Date(anyDate);

    var endDate = nlapiAddMonths(startDate, 1);
    var endDate = nlapiDateToString(endDate);

    startDate = nlapiAddMonths(startDate, -1);
    startDate = nlapiDateToString(startDate);

    //var myDate =nlapiDateToString(anyDate,'MMM-YYYY');
    var aSearchFilters = new Array();
    aSearchFilters.push(new nlobjSearchFilter('startdate', null, 'after', startDate));
    aSearchFilters.push(new nlobjSearchFilter('enddate', null, 'before', endDate));
    aSearchFilters.push(new nlobjSearchFilter('fiscalcalendar', null, 'is', fiscalCalendar));

    var aSearchColumns = new Array();
    aSearchColumns.push(new nlobjSearchColumn('internalid'));
    aSearchColumns.push(new nlobjSearchColumn('periodName'));

    var aSearchResults = nlapiSearchRecord('accountingperiod', null, aSearchFilters, aSearchColumns);
    if (aSearchResults) {
        return aSearchResults[0].getId();
    }

}

function createBudget(projId, endDate, projectType, period, projectPricing) {
    //create the project budget

    if (projectType != projectPricing) {

        var myAP = nlapiCreateRecord('customrecord_apco_proj_budget')
        myAP.setFieldValue('custrecord_apco_project', projId);
        myAP.setFieldValue('custrecord_period', parseInt(period));
        myAP.setFieldValue('custrecord_date', endDate);
        myAP.setFieldValue('custrecord_apco_revenue_labor', 0.00);
        myAP.setFieldValue('custrecord_apco_rev_oop', 0.00);
        myAP.setFieldValue('custrecord_apco_cum_budget_fee', 0.00);
        myAP.setFieldValue('custrecord_apco_cum_budget_oop', 0.00);
        myAP.setFieldValue('custrecord_apco_total_budget', 0.00);
        myAP.setFieldValue('custrecord_apco_cumm_budget_fee_and_oop', 0.00);
        nlapiSubmitRecord(myAP);
    }
    //Create Project Pricing budget

    if (projectType == projectPricing) {
        var myPP = nlapiCreateRecord('customrecord_project_pricing_budget')
        myPP.setFieldValue('custrecord_apco_pricing_project', projId);
        myPP.setFieldValue('custrecord_posting_period', parseInt(period));
        myPP.setFieldValue('custrecord_date', endDate);
        myPP.setFieldValue('custrecord_budget_percent_pp', 0.00);
        //myAP.setFieldValue('custrecord_budget_value_pp', 0.00);
        nlapiSubmitRecord(myPP);
    }

}



