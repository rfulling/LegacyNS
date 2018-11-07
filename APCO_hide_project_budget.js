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
// JavaScript source code

var CONTEXT = nlapiGetContext();


function hide_budget_BeforeLoad(type, form, request) {



    var projType = CONTEXT.getSetting('SCRIPT', 'custscript_hidebbudget_projtype');
    var entityStatusParam = CONTEXT.getSetting('SCRIPT', 'custscript_entity_status');
    var statusProcess = [];
    statusProcess = entityStatusParam.split(",");
    var strEntitStatus = nlapiGetFieldValue('entitystatus');
    var projectPricing = nlapiGetFieldValue('jobtype');
    var validProjStatus = statusProcess.indexOf(strEntitStatus);



    if (projType != projectPricing) {
        intCnt = nlapiGetLineItemCount('recmachcustrecord_apco_project');
    } else {
        intCnt = nlapiGetLineItemCount('recmachcustrecord_apco_pricing_project');
    }

    // Fields that will be hidden in Create, Edit mode
    if (type == 'edit' && parseInt(validProjStatus) >= 0 && intCnt > 0) {

        nlapiGetLineItemField('recmachcustrecord_apco_project', 'custrecord_apco_revenue_labor', 1).setDisplayType('inline');
        nlapiGetLineItemField('recmachcustrecord_apco_project', 'custrecord_apco_rev_oop', 1).setDisplayType('inline');

        nlapiGetLineItemField('recmachcustrecord_apco_project', 'custrecord_period', 1).setDisplayType('inline');
        nlapiGetLineItemField('recmachcustrecord_apco_project', 'custrecord_date', 1).setDisplayType('inline');
    }

}
