/**
 * Module Description
 *
 * Version    Date            Author           Remarks
 * 1.00       22 Oct 2014     rfulling
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


function clientGetEndDate(type, name, linenum) {

    if (name == 'custentity_apco_proj_period') {
        nlapiLogExecution('DEBUG', 'Set Dates ', 'User ' + ': ' + name + type);
        var aPeriod = nlapiGetFieldValue('custentity_apco_proj_period');
        var arrprojDates = nlapiLookupField('accountingperiod', aPeriod, ['enddate', 'startdate']);
        nlapiSetFieldValue('custentity_apco_proj_period_end_date', arrprojDates.enddate)
        nlapiSetFieldValue('custentity_apco_proj_period_start_date', arrprojDates.startdate)
    }

    if ((name == 'custentity_apco_acctg_ptd_rev_rec_or_val' || name == 'custentity_apco_proj_period')) {

        if (!isEmpty(nlapiGetFieldValue('custentity_apco_acctg_ptd_rev_rec_or_val'))) {

            nlapiLogExecution('DEBUG', 'Old Percentage  ', ' ' + ': ' + nlapiGetFieldValue('custentity_apco_ptd_rev_rec_or_value'));
            var newPercent = parseInt(nlapiGetFieldValue('custentity_apco_acctg_ptd_rev_rec_or_val')) / parseInt(nlapiGetFieldValue('custentity_apco_project_grand_total'));
            var calPercent = nlapiGetFieldValue('custentity_apco_ptd_rev_rec_or_pct');
            nlapiLogExecution('DEBUG', 'Not is empty ', 'new Percent  ' + ': ' + newPercent * (100));
            // now if either of the two fields above is not empty then use then calculate the new value
            //if they are empty then use the standard calculation
            nlapiSetFieldValue('percentcomplete', newPercent * 100);
            return true;

        }

        if (isEmpty(nlapiGetFieldValue('custentity_apco_acctg_ptd_rev_rec_or_val'))) {
            nlapiLogExecution('DEBUG', 'No Value in   ', 'new Percent  ' + ': ' + newPercent * (100));
            // var newPercent1 = parseInt(nlapiGetFieldValue('custentity_apco_acctg_ptd_rev_rec_or_val')) / parseInt(nlapiGetFieldValue('custentity_apco_project_grand_total'));
            var calPercent1 = nlapiGetFieldValue('custentity_apco_ptd_rev_rec_or_pct');
            nlapiLogExecution('DEBUG', 'empty field change  ', 'set to  ' + ': ' + calPercent1);
            nlapiSetFieldValue('percentcomplete', calPercent1);
            return true;
        }

    }
}

function pageInit(type) {

    var budgetFee = nlapiGetFieldValue('custentity_apco_ptd_budget_fee');
    var projectActual = nlapiGetFieldValue('custentity_apco_ptd_actual_fee');
    var ptdRevRecFee = (budgetFee) < projectActual ? budgetFee : projectActual;

    var calPercent1 = nlapiGetFieldValue('custentity_apco_acctg_ptd_rev_rec_or_pct');
    nlapiLogExecution('DEBUG', 'pageInit  ', 'total amt ' + ': ' + nlapiGetFieldValue('custentity_apco_ptd_rev_rec_or_value'));
    nlapiLogExecution('DEBUG', 'pageInit  ', 'NS Percent  ' + ': ' + calPercent1);
    // nlapiSetFieldValue('percentcomplete', calPercent1);


    if (type == 'create') {
        nlapiLogExecution('DEBUG', 'Set Dates ', 'type ' + ': ' + type);
        var aPeriod = nlapiGetFieldValue('custentity_apco_proj_period');
        var arrprojDates = nlapiLookupField('accountingperiod', aPeriod, ['enddate', 'startdate']);

        nlapiSetFieldValue('custentity_apco_proj_period_end_date', arrprojDates.enddate)
        nlapiSetFieldValue('custentity_apco_proj_period_start_date', arrprojDates.startdate)
    }

}

function onSave(type) {

    if (isEmpty(nlapiGetFieldValue('custentity_apco_acctg_ptd_rev_rec_or_val'))) {

        var newPercent2 = parseInt(nlapiGetFieldValue('custentity_apco_ptd_rev_rec_or_value')) / parseInt(nlapiGetFieldValue('custentity_apco_project_grand_total'));
        var calPercent2 = nlapiGetFieldValue('custentity_apco_ptd_rev_rec_or_pct');
        nlapiLogExecution('DEBUG', 'onsave  ', 'NewPercent' + ': ' + calPercent2);
        nlapiSetFieldValue('percentcomplete', calPercent2);
        return true;
    } else {
        nlapiSetFieldValue('percentcomplete', null);
        return true;
    }
}

function isEmpty(stValue) {
    if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
        return true;
    }

    return false;
}
