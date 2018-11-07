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
var CONTEXT = nlapiGetContext();
var projToProcess = CONTEXT.getSetting('SCRIPT', 'custscript_apco_wfa_project_type');


function wfa_getRevRecAmount() {

    // var myproj = nlapiLoadRecord('job', 4379);
    //  var ptdActualFee = myproj.getFieldValue('custentity_apco_ptd_actual_fee');
    var jobid = nlapiGetRecordId();
    var periodId = nlapiGetFieldValue('custentity_apco_proj_period')
    
   
    var ptdActualFee = nlapiGetFieldValue('custentity_apco_ptd_actual_fee');
    var projectType = nlapiGetFieldValue('jobtype')
    var ptdOOP = nlapiGetFieldValue('custentity_apco_ptd_actual_oop');

    //search for the project budget and the PTD actual fee which is the result of the search called Apco Value of Time V2
    //internal id fo the search is customsearch256

    // Calc1 = (posting period PTD Budget Total Project Value less PTD Actual OOP); if Calc1
    // is greater or equal to PTD Actual value of time, take PTD Actual value of time, otherwise take PTD Budget FEE
    var arrFilters = [];
    var arrColumns = [];

    arrFilters.push(new nlobjSearchFilter('custrecord_apco_project', null, 'is', jobid));
    arrFilters.push(new nlobjSearchFilter('custrecord_period', null, 'is', periodId));
    arrColumns.push(new nlobjSearchColumn('custrecord_apco_cum_budget_fee', null, 'sum'));

    var cumulativeBudget = nlapiSearchRecord('customrecord_apco_proj_budget', null, arrFilters, arrColumns);

    if (cumulativeBudget) {
        var ptdBudgetTotal = cumulativeBudget[0].getValue('custrecord_apco_cum_budget_fee', null, 'sum');
    }

    //now get the project to date
    //if the project type is 
    //retainer plus cum budget fee
    //all others are  fee + ops
    //this is for retainer plus
    //Variable is for Retainer plus which does not use oop to calculate the revenue fee.
    if (projectType == projToProcess) {

        var ptdRevRecFee = parseInt(ptdBudgetTotal) != null ? (parseInt(ptdBudgetTotal)) > parseInt(ptdActualFee) ? ptdActualFee : ptdBudgetTotal : ptdActualFee;
    } else {

        var ptdRevRecFee = (ptdBudgetTotal - ptdOOP) != null ? (ptdBudgetTotal - ptdOOP) > ptdActualFee ? ptdActualFee : ptdBudgetTotal:ptdActualFee  ;
    }
    return ptdRevRecFee;
}