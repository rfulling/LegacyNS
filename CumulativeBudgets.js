/**
 * Module Description
 * should run anytime a project budget record is updated.
 * it will calculate the running total of all project periods.
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
//Return the rows for a specific project


function cumProjectAmounts(type) {
    if (type == 'edit') {
        //var projectId = nlapiGetFieldValue('entityid');
        var projectId = nlapiGetRecordId();
        var recType = nlapiGetRecordType();
        if (recType == 'customrecord_apco_proj_budget') {
            //projectId = nlapiGetFieldValue("custrecord_apco_project")
            projectId = nlapiLookupField('customrecord_apco_proj_budget', projectId, 'custrecord_apco_project');
        }

        //search by project
        var arrFilters = [];
        var arrColumns = [];
        //if on the project record the filter is 
        //if editing the projectbudget customrecord_apco_proj_budget
        arrFilters.push(new nlobjSearchFilter('custrecord_apco_project', null, 'is', projectId));


        //arrColumns.push(new nlobjSearchColumn('internalid', 'custrecord_period'));
        // arrColumns.push(new nlobjSearchColumn('custrecord_apco_revenue_labor'));
        // arrColumns.push(new nlobjSearchColumn('custrecord_apco_rev_oop'));
        //  arrColumns.push(new nlobjSearchColumn('internalid'));

        var arrREQ = nlapiSearchRecord('customrecord_apco_proj_budget', 'customsearch_apco_ud_cumulative', arrFilters, arrColumns)
        if (arrREQ) {
            //for each row in the result set get the set the internal id of thd custom record with the running total of the budget
            var bTotal = 0;
            var oopTot = 0;
            var intId = '';
            for (var i = 0; i < arrREQ.length; i++) {
                intId = arrREQ[i].getId();
                bTotal = parseFloat(bTotal) + parseFloat(arrREQ[i].getValue('custrecord_apco_revenue_labor'));
                oopTot = parseFloat(oopTot) + parseFloat(arrREQ[i].getValue('custrecord_apco_rev_oop'));
                //update this row in the custom record
                updateCumulativeAmounts(intId, bTotal, oopTot);
            }
        }
    }
}

function updateCumulativeAmounts(intID, bfTot, oopTot) {
    //here loop throug the set and set amount to the amount Plus previous period.
    nlapiSubmitField('customrecord_apco_proj_budget', intID, 'custrecord_apco_cum_budget_fee', parseFloat(bfTot));
    nlapiSubmitField('customrecord_apco_proj_budget', intID, 'custrecord_apco_cum_budget_oop', parseFloat(oopTot));
}
