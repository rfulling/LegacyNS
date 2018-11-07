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


function before_submit_billable(type) {
    //get the item if it is hotel
    //get the project type

    var lines = getLineItemCount('item');
    //loop through the item lines
    var proj = getCurrentLineItemValue('item', 'customer');
    var projType = nlapiLookupField('job', proj, 'jobtype');
    //get the accounts based needed from the item record

    if (projType == 1) {


    }





}
